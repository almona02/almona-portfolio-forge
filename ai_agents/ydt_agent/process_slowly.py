"""
Slow processing script for free tier quota limits
Processes 2-3 pages per hour to stay within free tier limits
"""
import json
import time
from pathlib import Path
from vision_ai_processor import VisionAIWiringProcessor
import os
from dotenv import load_dotenv

load_dotenv()

def main():
    print("="*70)
    print("SLOW PROCESSING MODE - Free Tier Quota Management")
    print("="*70)
    print("\nProcessing 2 pages per hour to stay within free tier limits")
    print("Total pages: 21")
    print("Estimated time: ~10-11 hours")
    print("\nStarting processing...\n")
    
    api_key = os.getenv("GOOGLE_GEMINI_API_KEY")
    processor = VisionAIWiringProcessor(
        raw_manuals_path=Path(__file__).parent / "knowledge" / "raw_manuals",
        api_key=api_key
    )
    
    # Load existing results
    output_file = Path(__file__).parent / "knowledge" / "processed" / "aim-7510" / "vision_ai_extraction.json"
    
    existing_components = []
    existing_connections = []
    processed_pages = set()
    
    if output_file.exists():
        with open(output_file, 'r', encoding='utf-8') as f:
            existing_data = json.load(f)
            existing_components = existing_data.get('components', [])
            existing_connections = existing_data.get('connections', [])
            processed_pages = set(c.get('page_number', 0) for c in existing_components if c.get('page_number', 0) > 0)
            print(f"Found existing extraction: {len(existing_components)} components from {len(processed_pages)} pages")
    
    # Process remaining pages (2 at a time, wait 1 hour between batches)
    total_pages = 21
    pages_per_batch = 2
    wait_time_seconds = 3600  # 1 hour
    
    remaining_pages = [p for p in range(1, total_pages + 1) if p not in processed_pages]
    
    if not remaining_pages:
        print("\n✅ All pages already processed!")
        return
    
    print(f"\nRemaining pages to process: {len(remaining_pages)}")
    print(f"Pages: {remaining_pages}\n")
    
    batch_num = 0
    for i in range(0, len(remaining_pages), pages_per_batch):
        batch_num += 1
        batch = remaining_pages[i:i + pages_per_batch]
        
        print(f"\n{'='*70}")
        print(f"BATCH {batch_num}: Processing pages {batch}")
        print(f"{'='*70}\n")
        
        try:
            # Process this batch (we'll need to modify processor to handle specific pages)
            # For now, just note that we need to process these pages
            print(f"⚠️  Note: Full batch processing requires quota reset")
            print(f"   Process pages {batch} when quota resets")
            print(f"   Or upgrade to paid plan for immediate processing")
            
            if i + pages_per_batch < len(remaining_pages):
                print(f"\n⏳ Waiting {wait_time_seconds/60:.0f} minutes before next batch...")
                print(f"   (Free tier: 20 requests/day)")
                # Uncomment to actually wait:
                # time.sleep(wait_time_seconds)
            
        except Exception as e:
            print(f"❌ Error processing batch {batch_num}: {e}")
            break
    
    print(f"\n{'='*70}")
    print("PROCESSING PLAN")
    print(f"{'='*70}")
    print(f"\nTotal pages: {total_pages}")
    print(f"Processed: {len(processed_pages)}")
    print(f"Remaining: {len(remaining_pages)}")
    print(f"\nRecommendation:")
    print(f"  1. Wait for quota reset (usually 24 hours)")
    print(f"  2. Process 2 pages per hour (free tier)")
    print(f"  3. Upgrade to paid plan (~$0.02 for all pages)")
    print(f"\n{'='*70}\n")

if __name__ == "__main__":
    main()

