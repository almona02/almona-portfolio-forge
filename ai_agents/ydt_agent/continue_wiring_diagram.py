"""
Continue Wiring Diagram Processing - Process Remaining Pages
Handles free tier quota limits gracefully
"""

import json
import os
import time
from pathlib import Path
from vision_ai_processor import VisionAIWiringProcessor
from dotenv import load_dotenv

load_dotenv()

def get_processed_pages(extraction_file: Path) -> set:
    """Get set of already processed page numbers"""
    if not extraction_file.exists():
        return set()
    
    with open(extraction_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    pages = set()
    for comp in data.get('components', []):
        page = comp.get('page_number', 0)
        if page > 0:
            pages.add(page)
    
    return pages

def process_remaining_pages(machine_id: str, diagram_filename: str, target_pages: list):
    """Process specific remaining pages"""
    print("="*70)
    print("CONTINUING WIRING DIAGRAM PROCESSING")
    print("="*70)
    print(f"\nTarget Pages: {target_pages}")
    print(f"Machine: {machine_id}")
    print(f"Diagram: {diagram_filename}\n")
    
    api_key = os.getenv("GOOGLE_GEMINI_API_KEY")
    if not api_key:
        print("ERROR: GOOGLE_GEMINI_API_KEY not found in environment")
        return
    
    processor = VisionAIWiringProcessor(
        raw_manuals_path=Path(__file__).parent / "knowledge" / "raw_manuals",
        api_key=api_key
    )
    
    if not processor.api_configured:
        print("ERROR: Vision AI API not configured")
        return
    
    # Load existing results
    output_file = Path(__file__).parent / "knowledge" / "processed" / machine_id / "vision_ai_extraction.json"
    
    existing_components = []
    existing_connections = []
    total_pages = 21
    
    if output_file.exists():
        with open(output_file, 'r', encoding='utf-8') as f:
            existing_data = json.load(f)
            existing_components = existing_data.get('components', [])
            existing_connections = existing_data.get('connections', [])
            total_pages = existing_data.get('total_pages', 21)
            print(f"Found existing extraction: {len(existing_components)} components, {len(existing_connections)} connections")
    
    # Convert PDF to images
    diagram_path = processor.raw_manuals_path / "wiring_diagrams" / diagram_filename
    
    if not diagram_path.exists():
        print(f"ERROR: Diagram file not found: {diagram_path}")
        return
    
    try:
        import pdf2image
        print("Converting PDF to images...")
        images = pdf2image.convert_from_path(str(diagram_path), dpi=300)
        print(f"Converted {len(images)} pages to images\n")
    except Exception as e:
        print(f"ERROR: PDF conversion failed: {e}")
        return
    
    # Process target pages
    new_components = []
    new_connections = []
    processing_notes = []
    success_count = 0
    error_count = 0
    
    for page_num in target_pages:
        if page_num < 1 or page_num > len(images):
            print(f"SKIP: Page {page_num} out of range (1-{len(images)})")
            continue
        
        print(f"Processing page {page_num}/{len(images)}...")
        
        try:
            image = images[page_num - 1]  # 0-indexed
            
            # Extract from image
            page_components, page_connections, page_notes = processor._extract_from_image(
                image, page_num, machine_id
            )
            
            new_components.extend(page_components)
            new_connections.extend(page_connections)
            processing_notes.extend(page_notes)
            
            print(f"  Extracted: {len(page_components)} components, {len(page_connections)} connections")
            success_count += 1
            
            # Small delay to avoid rate limits
            if page_num < target_pages[-1]:
                time.sleep(2)
                
        except Exception as e:
            error_msg = f"Page {page_num} failed: {e}"
            print(f"  ERROR: {error_msg}")
            processing_notes.append(error_msg)
            error_count += 1
            
            # Check if it's a quota error
            if "429" in str(e) or "quota" in str(e).lower():
                print(f"\n⚠️  QUOTA LIMIT REACHED")
                print(f"   Free tier: 20 requests/day")
                print(f"   Wait ~1 hour for quota reset")
                print(f"   Or upgrade to paid plan (~$0.02 for all pages)")
                break
    
    # Merge with existing data
    all_components = existing_components + [comp.__dict__ if hasattr(comp, '__dict__') else comp for comp in new_components]
    all_connections = existing_connections + new_connections
    
    # Calculate confidence
    total_processed_pages = len(set(c.get('page_number', 0) if isinstance(c, dict) else c.page_number for c in all_components if (isinstance(c, dict) and c.get('page_number', 0) > 0) or (hasattr(c, 'page_number') and c.page_number > 0)))
    
    confidence = processor._calculate_confidence(
        len(all_components),
        len(all_connections),
        total_pages,
        processing_notes
    )
    
    # Save updated results
    result = {
        "machine_id": machine_id,
        "diagram_filename": diagram_filename,
        "total_pages": total_pages,
        "components": all_components,
        "connections": all_connections,
        "extraction_confidence": confidence,
        "processing_notes": processing_notes,
        "api_used": True
    }
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    
    print("\n" + "="*70)
    print("PROCESSING SUMMARY")
    print("="*70)
    print(f"\nPages Processed: {success_count}/{len(target_pages)}")
    print(f"New Components: {len(new_components)}")
    print(f"New Connections: {len(new_connections)}")
    print(f"\nTotal Components: {len(all_components)}")
    print(f"Total Connections: {len(all_connections)}")
    print(f"Total Pages Processed: {total_processed_pages}/{total_pages}")
    print(f"Confidence: {confidence:.1%}")
    
    if error_count > 0:
        print(f"\nErrors: {error_count}")
    
    print(f"\nResults saved to: {output_file}")
    print("="*70 + "\n")

def main():
    """Main function to continue wiring diagram processing"""
    machine_id = "aim-7510"
    diagram_filename = "1-AIM 7410-7510 3P-v8.pdf"
    
    # Get already processed pages
    extraction_file = Path(__file__).parent / "knowledge" / "processed" / machine_id / "vision_ai_extraction.json"
    processed_pages = get_processed_pages(extraction_file)
    
    # Calculate remaining pages
    all_pages = set(range(1, 22))  # Pages 1-21
    remaining_pages = sorted(all_pages - processed_pages)
    
    if not remaining_pages:
        print("✅ All pages already processed!")
        return
    
    print(f"Processed pages: {sorted(processed_pages)}")
    print(f"Remaining pages: {remaining_pages}")
    print(f"Total remaining: {len(remaining_pages)} pages\n")
    
    # Process remaining pages (try all, will stop on quota limit)
    process_remaining_pages(machine_id, diagram_filename, remaining_pages)

if __name__ == "__main__":
    main()

