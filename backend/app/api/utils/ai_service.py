import google.generativeai as genai
import os
import json
import io
import logging
from PIL import Image, ImageOps
from dotenv import load_dotenv

# Setup Production Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

# Configuration Validation
API_KEY = os.getenv("GOOGLE_API_KEY")
if not API_KEY:
    logger.error("GOOGLE_API_KEY is missing from environment variables.")
    raise ValueError("Missing GOOGLE_API_KEY")

genai.configure(api_key=API_KEY)

# Use Flash for low latency, or Pro for complex reasoning
# 'gemini-1.5-flash' is the best for high-volume production
MODEL_NAME = 'gemini-2.5-flash' 
model = genai.GenerativeModel(MODEL_NAME)

def optimize_image_for_gemini(image_bytes: bytes, target_size=(1024, 1024), quality=85) -> bytes:
    """
    PRODUCTION PIPELINE:
    1. Sanitize: Handles PNG, WebP, HEIC (if supported), and stripped metadata.
    2. Normalize: Converts to RGB (standard 3-channel).
    3. Smart Resize: Fits within 1024x1024 (Gemini's 4-tile boundary) to cap token usage.
    4. Compress: Outputs optimized JPEG to reduce network latency.
    """
    try:

        with Image.open(io.BytesIO(image_bytes)) as img:
            # Auto-rotate based on EXIF (common bug with phone camera uploads)
            img = ImageOps.exif_transpose(img)
            
            # Convert to standard RGB (fixes PNG transparency/RGBA issues)
            if img.mode != 'RGB':
                img = img.convert('RGB')
            
            # Smart Resize: Maintain aspect ratio, but cap max dimension
            # This ensures we don't accidentally send a 4000px image (costing $$$ in tokens)
            img.thumbnail(target_size, Image.Resampling.LANCZOS)
            
            # Save to buffer as optimized JPEG
            output_buffer = io.BytesIO()
            img.save(
                output_buffer, 
                format='JPEG', 
                quality=quality, 
                optimize=True,
                subsampling=0 # Keeps sharp edges for text (important for labels)
            )
            
            optimized_size = output_buffer.getbuffer().nbytes
            original_size = len(image_bytes)
            logger.info(f"Image Optimized: {original_size/1024:.1f}KB -> {optimized_size/1024:.1f}KB")
            
            return output_buffer.getvalue()
            
    except Exception as e:
        logger.warning(f"Image Optimization Failed: {e}. Using original bytes.")
        return image_bytes

async def analyze_charger_image(raw_image_bytes: bytes):
    """
    Full AI Pipeline: Upload -> Optimize -> Tokenize -> Analyze
    """
    
    # 1. Run Internal Optimization Pipeline
    jpeg_bytes = optimize_image_for_gemini(raw_image_bytes)
    
    # 2. Define Strict JSON Schema Prompt
    # We ask for a "confidence_score" to flag manual reviews in production
    prompt = """
    You are a backend API for an EV Charging Infrastructure system.
    Analyze the provided image of an electrical point.
    Extract these technical details into a valid JSON object:
    - "socket_type": Enum ["SOCKET_16A_3PIN", "TYPE_2_AC", "CCS_2_DC", "IEC_60309", "UNKNOWN"]
    - "power_kw": Float (Estimate based on type. 3-pin=3.3, Type2=7.2, CCS2=25+)
    - "is_safe": Boolean (False if burn marks, exposed wires, or rust are visible)
    - "marketing_description": String (A clean, 1-sentence listing title)
    - "confidence_score": Float (0.0 to 1.0 - How sure are you?)
    - "vehicle_compatibility": List of Enums ["2W", "4W", "UNKNOWN"]
    
    Return ONLY raw JSON. No markdown formatting.
    """
    
    try:
        # 3. Call Gemini with MIME type enforcement
        response = model.generate_content([
            prompt,
            {"mime_type": "image/jpeg", "data": jpeg_bytes}
        ])
        
        # 4. Usage Metrics (For Monitoring)
        if hasattr(response, 'usage_metadata'):
            usage = response.usage_metadata
            
            # Extract specific counts (default to 0 if missing)
            prompt_tokens = usage.prompt_token_count
            cached_tokens = getattr(usage, 'cached_content_token_count', 0)
            output_tokens = usage.candidates_token_count
            total_tokens = usage.total_token_count
            
            logger.info(f"📊 TOKEN USAGE REPORT:")
            logger.info(f"   • Input (Prompt):  {prompt_tokens}")
            logger.info(f"   • Cached Input:    {cached_tokens} (Money Saved!)")
            logger.info(f"   • Output (Model):  {output_tokens}")
            logger.info(f"   • Total Billed:    {total_tokens}")
        # 5. Robust JSON Parsing
        text_response = response.text.strip()
        # Strip ```json fences if model adds them
        if text_response.startswith("```"):
            text_response = text_response.strip("`").replace("json\n", "").replace("json", "")
            
        return json.loads(text_response)
        
    except json.JSONDecodeError:
        logger.error("Gemini returned invalid JSON.")
        return None
    except Exception as e:
        logger.error(f"Gemini API Error: {e}")
        # Return specific error state for frontend handling
        return {
            "socket_type": "UNKNOWN",
            "error": "AI Analysis Failed",
            "marketing_description": "Manual verification required."
        }