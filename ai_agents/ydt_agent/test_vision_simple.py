"""Simple test to verify Vision AI is working"""
import os
from dotenv import load_dotenv
from PIL import Image
import google.generativeai as genai

load_dotenv()
api_key = os.getenv("GOOGLE_GEMINI_API_KEY")

if not api_key:
    print("ERROR: API key not found")
    exit(1)

print("API Key found: Yes")
print("Configuring Gemini...")

try:
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-2.5-flash')
    print("Model configured: gemini-2.5-flash")
    
    # Create a simple test image (white square with text)
    from PIL import Image, ImageDraw, ImageFont
    img = Image.new('RGB', (400, 200), color='white')
    draw = ImageDraw.Draw(img)
    draw.text((50, 80), "Test Diagram\nK1 Relay\nM1 Motor", fill='black')
    
    print("Testing Vision AI with simple test image...")
    response = model.generate_content([
        "What components do you see in this wiring diagram? List them.",
        img
    ])
    
    print("\nSUCCESS! Vision AI is working!")
    print("Response:", response.text[:200])
    
except Exception as e:
    print(f"ERROR: {e}")

