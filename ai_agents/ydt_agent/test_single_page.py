"""Test processing a single page to verify Vision AI is working"""
import os
from pathlib import Path
from vision_ai_processor import VisionAIWiringProcessor
from dotenv import load_dotenv
import pdf2image

load_dotenv()

def test_single_page():
    """Test processing page 1"""
    print("="*70)
    print("TESTING SINGLE PAGE PROCESSING")
    print("="*70 + "\n")
    
    api_key = os.getenv("GOOGLE_GEMINI_API_KEY")
    if not api_key:
        print("ERROR: API key not found")
        return
    
    processor = VisionAIWiringProcessor(
        raw_manuals_path=Path(__file__).parent / "knowledge" / "raw_manuals",
        api_key=api_key
    )
    
    if not processor.api_configured:
        print("ERROR: API not configured")
        return
    
    # Load page 1
    diagram_path = processor.raw_manuals_path / "wiring_diagrams" / "1-AIM 7410-7510 3P-v8.pdf"
    
    if not diagram_path.exists():
        print(f"ERROR: Diagram not found: {diagram_path}")
        return
    
    try:
        print("Converting PDF to images...")
        images = pdf2image.convert_from_path(str(diagram_path), dpi=300)
        print(f"Converted {len(images)} pages\n")
        
        # Test page 1
        print("Processing page 1 with Vision AI...")
        page_1_image = images[0]
        
        components, connections, notes = processor._extract_from_image(
            page_1_image, 1, "aim-7510"
        )
        
        print(f"\n[SUCCESS] Page 1 processed!")
        print(f"Components extracted: {len(components)}")
        print(f"Connections extracted: {len(connections)}")
        
        if components:
            print(f"\nSample components:")
            for comp in components[:5]:
                comp_dict = comp.__dict__ if hasattr(comp, '__dict__') else comp
                print(f"  {comp_dict.get('component_id', 'N/A'):20} - {comp_dict.get('component_type', 'N/A')}")
        
        if connections:
            print(f"\nSample connections:")
            for conn in connections[:5]:
                print(f"  {conn.get('from', 'N/A')} -> {conn.get('to', 'N/A')}")
        
        print(f"\nNotes: {len(notes)}")
        for note in notes[:3]:
            print(f"  - {note}")
        
        print("\n" + "="*70)
        print("[SUCCESS] Vision AI is working!")
        print("="*70 + "\n")
        
    except Exception as e:
        error_str = str(e)
        print(f"\n[ERROR] Processing failed: {error_str}")
        
        if "429" in error_str or "quota" in error_str.lower():
            print("\n⚠️  QUOTA LIMIT REACHED")
            print("   Free tier: 20 requests/day")
            print("   Wait ~1 hour for quota reset")
        elif "404" in error_str:
            print("\n⚠️  MODEL NOT FOUND")
            print("   Check model name in vision_ai_processor.py")
        else:
            print(f"\n⚠️  UNKNOWN ERROR")
            print(f"   Error type: {type(e).__name__}")

if __name__ == "__main__":
    test_single_page()

