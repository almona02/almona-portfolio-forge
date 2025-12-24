"""
Spare Parts Catalog Processor for AIM 7510
Extracts parts list from spare parts catalog PDF
"""

import json
import re
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
import logging

try:
    import pdfplumber
    import camelot
    PDF_PROCESSING_AVAILABLE = True
except ImportError:
    PDF_PROCESSING_AVAILABLE = False
    logging.warning("PDF processing libraries not available")

logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)


@dataclass
class SparePart:
    """Spare part extracted from catalog"""
    part_number: str
    description: str
    quantity: Optional[int] = None
    unit_price: Optional[float] = None
    category: Optional[str] = None
    page_number: Optional[int] = None
    image_reference: Optional[str] = None


class SparePartsProcessor:
    """Process spare parts catalog PDF"""
    
    def __init__(self, raw_manuals_path: Path):
        self.raw_manuals_path = Path(raw_manuals_path)
    
    def process_catalog(self, machine_id: str, catalog_filename: str) -> Dict[str, Any]:
        """Process spare parts catalog"""
        logger.info(f"[SPARE PARTS] Processing catalog: {catalog_filename}")
        
        catalog_path = self.raw_manuals_path / "spare_part_catalogs" / catalog_filename
        
        if not catalog_path.exists():
            logger.warning(f"[SPARE PARTS] Catalog file not found: {catalog_path}")
            return {
                "machine_id": machine_id,
                "catalog_filename": catalog_filename,
                "status": "file_not_found",
                "parts": []
            }
        
        if not PDF_PROCESSING_AVAILABLE:
            logger.warning("[SPARE PARTS] PDF processing libraries not available")
            return {
                "machine_id": machine_id,
                "catalog_filename": catalog_filename,
                "status": "libraries_not_available",
                "parts": []
            }
        
        parts = []
        
        try:
            # Extract tables from PDF
            with pdfplumber.open(str(catalog_path)) as pdf:
                total_pages = len(pdf.pages)
                logger.info(f"[SPARE PARTS] Processing {total_pages} pages")
                
                for page_num, page in enumerate(pdf.pages, 1):
                    text = page.extract_text()
                    
                    # Extract parts from text (pattern: part number, description, quantity)
                    # Common patterns:
                    # - "1SC170000-0017" or "1SA050000-0854" (YILMAZ part numbers)
                    # - "3UA920030-0044" (component codes)
                    part_pattern = r'([A-Z0-9]{2,3}[A-Z0-9]{6,8}-[A-Z0-9]{4,6})'
                    
                    # Try to extract parts from tables
                    tables = page.extract_tables()
                    for table in tables:
                        for row in table:
                            if row and len(row) >= 2:
                                # Look for part number pattern
                                row_text = ' '.join([str(cell) if cell else '' for cell in row])
                                part_match = re.search(part_pattern, row_text)
                                
                                if part_match:
                                    part_number = part_match.group(1)
                                    description = row_text.replace(part_number, '').strip()
                                    
                                    # Try to extract quantity
                                    quantity = None
                                    qty_match = re.search(r'\b(\d+)\b', row_text)
                                    if qty_match:
                                        try:
                                            quantity = int(qty_match.group(1))
                                        except:
                                            pass
                                    
                                    part = SparePart(
                                        part_number=part_number,
                                        description=description[:200] if description else "No description",
                                        quantity=quantity,
                                        page_number=page_num
                                    )
                                    parts.append(part)
                    
                    # Also extract from text directly
                    if text:
                        for match in re.finditer(part_pattern, text):
                            part_number = match.group(1)
                            # Get context around part number
                            start = max(0, match.start() - 50)
                            end = min(len(text), match.end() + 100)
                            context = text[start:end]
                            
                            # Check if we already have this part
                            if not any(p.part_number == part_number for p in parts):
                                part = SparePart(
                                    part_number=part_number,
                                    description=context.strip()[:200],
                                    page_number=page_num
                                )
                                parts.append(part)
            
            logger.info(f"[SPARE PARTS] Extracted {len(parts)} parts")
            
            return {
                "machine_id": machine_id,
                "catalog_filename": catalog_filename,
                "status": "processed",
                "total_pages": total_pages,
                "parts": [asdict(p) for p in parts],
                "parts_count": len(parts)
            }
            
        except Exception as e:
            logger.error(f"[SPARE PARTS] Processing failed: {e}")
            return {
                "machine_id": machine_id,
                "catalog_filename": catalog_filename,
                "status": "error",
                "error": str(e),
                "parts": []
            }


def main():
    """Process AIM 7510 spare parts catalog"""
    print("="*70)
    print("SPARE PARTS CATALOG PROCESSOR - AIM 7510")
    print("="*70 + "\n")
    
    processor = SparePartsProcessor(
        raw_manuals_path=Path(__file__).parent / "knowledge" / "raw_manuals"
    )
    
    result = processor.process_catalog(
        machine_id="aim-7510",
        catalog_filename="AIM 7510 parts.pdf"
    )
    
    # Save results
    output_file = Path(__file__).parent / "knowledge" / "processed" / "aim-7510" / "spare_parts.json"
    output_file.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    
    print(f"\nStatus: {result['status']}")
    print(f"Parts Extracted: {result.get('parts_count', 0)}")
    
    if result.get('parts'):
        print(f"\nSample Parts:")
        for part in result['parts'][:10]:
            print(f"  {part.get('part_number', 'N/A'):20} - {part.get('description', 'N/A')[:50]}")
    
    print(f"\nResults saved to: {output_file}")
    print("\n" + "="*70 + "\n")


if __name__ == "__main__":
    main()

