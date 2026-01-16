import google.generativeai as genai
import os
import json
import io
import logging
from PIL import Image, ImageOps
from dotenv import load_dotenv

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
model = genai.GenerativeModel('gemini-2.5-flash')

def optimize_image_for_gemini(image_bytes: bytes, target_size=(1024, 1024), quality=85) -> bytes:
    """Optimizes image to reduce token usage and latency."""
    try:
        with Image.open(io.BytesIO(image_bytes)) as img:
            img = ImageOps.exif_transpose(img)
            if img.mode != 'RGB':
                img = img.convert('RGB')
            img.thumbnail(target_size, Image.Resampling.LANCZOS)
            output_buffer = io.BytesIO()
            img.save(output_buffer, format='JPEG', quality=quality, optimize=True)
            return output_buffer.getvalue()
    except Exception as e:
        logger.warning(f"Image Optimization Failed: {e}")
        return image_bytes

async def analyze_multiple_images(image_byte_list: list[bytes]):
    """
    Analyzes MULTIPLE images in a SINGLE request so Gemini can 'synthesize' them.
    """
    
    # 1. Prepare Content List: [Prompt, Image1, Image2, Image3]
    content_payload = []
    
    # Add the Prompt first
    prompt = """
        You are an expert **EV Infrastructure Auditor** for "SnapCharge". 
        Your task is to analyze a **set of images** representing a **SINGLE** charging station location and extract technical specifications.

        ### SELECTIVE EXTRACTION STRATEGY (Critical):
        You may receive a mix of images (e.g., a petrol pump, a wide street view, and a specific EV charger).
        1. **Relevance Filter**: Scan all images. **Ignore** images that ONLY show petrol pumps, trees, or generic buildings *IF* another image shows an EV Charger.
        2. **Targeted Extraction**: Extract technical details (Socket Type, Power) *only* from the images containing actual EV equipment. 
        3. **Fall-back**: Only report "No Charger Found" if **ZERO** images contain EV equipment.

        ### ANALYSIS PROTOCOL:
        1. **Scan for Labels**: Search ALL images for a nameplate/sticker. EXTRACT Voltage (V), Amperage (A), or Power (kW).
        2. **Visual Identification**: Identify the connector shape from the clearest image showing a socket.
        3. **Safety Scan**: Check only the relevant EV equipment for hazards (burns, rust, exposed wires).

        ### TECHNICAL DECISION MATRIX:
        | Visual Cue | Type Enum | Max Power | Vehicle Support |
        | :--- | :--- | :--- | :--- |
        | 3 Round Pins (Triangle) | `SOCKET_16A_3PIN` | ~3.3 kW | `["2W", "4W"]` (Slow) |
        | 7 Holes (Mennekes) | `TYPE_2_AC` | ~7.2 kW | `["4W"]` (2W needs adapter) |
        | 5 Pins (Red Industrial) | `IEC_60309` | ~11.0 kW | `["2W", "4W"]` |
        | Large Combo (Type 2 + DC) | `CCS_2_DC` | ~30.0 kW+ | `["4W"]` |
        | Round "Shower Head" | `GB_T` | ~15.0 kW | `["4W"]` |

        ### HALLUCINATION CONTROLS:
        - **Partial Data is OK**: If you see a socket but no label, fill `socket_type` and use the "Conservative Minimum" for power.
        - **Unsure?**: If NO image contains EV equipment, set `socket_type: "UNKNOWN"` and `confidence_score: 0.0`.
        - **Description**: `marketing_description` must be based ONLY on the identified EV equipment (e.g. "50kW CCS2 charger available at fuel station").

        ### OUTPUT FORMAT:
        Return **ONLY** a single raw JSON object (no markdown, no code blocks):
        {
        "socket_type": "Enum",
        "power_kw": Float,
        "is_safe": Boolean,
        "marketing_description": "String",
        "confidence_score": Float (0.0 to 1.0),
        "vehicle_compatibility": ["String"],
        "visual_evidence": "String (Explain: 'Ignored Image 2 (Petrol Pump), found CCS2 socket in Image 1')"
        }
    """
    content_payload.append(prompt)
    
    # Add Images
    for jpeg_bytes in image_byte_list:
        content_payload.append({
            "mime_type": "image/jpeg", 
            "data": jpeg_bytes
        })

    try:
        # 2. Call Gemini with the LIST of contents
        response = model.generate_content(content_payload)
        
        # 3. Parse Response
        text_response = response.text.strip()
        if text_response.startswith("```"):
            text_response = text_response.strip("`").replace("json\n", "").replace("json", "")
            
        return json.loads(text_response)
        
    except Exception as e:
        logger.error(f"Gemini Analysis Error: {e}")
        return None