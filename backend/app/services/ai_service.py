import google.generativeai as genai
import os
import json
from dotenv import load_dotenv

load_dotenv()

genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
model = genai.GenerativeModel('gemini-1.5-flash')

async def analyze_charger_image(image_bytes: bytes):
    prompt = """
    You are an EV Charging Expert. Analyze this image of an electrical socket/charger.
    Return ONLY a raw JSON object (no markdown) with these fields:
    - "socket_type": Choose one ["SOCKET_16A_3PIN", "TYPE_2_AC", "CCS_2_DC", "UNKNOWN"]
    - "power_kw": Estimate float (e.g. 3.3 for 3-pin, 7.2 for wallbox)
    - "is_safe": boolean (look for burn marks or damage)
    - "marketing_description": A short, catchy 1-sentence description for a listing.
    """
    
    try:
        response = model.generate_content([
            prompt,
            {"mime_type": "image/jpeg", "data": image_bytes}
        ])
        
        # Cleanup response to get pure JSON
        json_str = response.text.replace('```json', '').replace('```', '').strip()
        return json.loads(json_str)
        
    except Exception as e:
        print(f"AI Error: {e}")
        return {
            "socket_type": "UNKNOWN",
            "power_kw": 0.0,
            "is_safe": False,
            "marketing_description": "Manual Entry Required"
        }