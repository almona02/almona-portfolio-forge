"""
Extract text from new AIM 7510 PDFs for YDT knowledge base
- AIM-7510-00026692.pdf: Technical specifications and capabilities
- AIM-7510-s.pdf: Marketing and applications brochure
"""

import pdfplumber
import json
from pathlib import Path
from typing import Dict, List, Any
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def extract_pdf_content(pdf_path: str) -> Dict[str, Any]:
    """Extract all text content from PDF"""
    logger.info(f"Extracting content from: {pdf_path}")
    
    content = {
        "filename": Path(pdf_path).name,
        "pages": [],
        "full_text": "",
        "tables": []
    }
    
    try:
        with pdfplumber.open(pdf_path) as pdf:
            content["total_pages"] = len(pdf.pages)
            
            for i, page in enumerate(pdf.pages):
                page_text = page.extract_text()
                if page_text:
                    content["pages"].append({
                        "page_number": i + 1,
                        "text": page_text
                    })
                    content["full_text"] += f"\n\n--- PAGE {i + 1} ---\n\n{page_text}"
                
                # Extract tables
                tables = page.extract_tables()
                if tables:
                    for j, table in enumerate(tables):
                        content["tables"].append({
                            "page": i + 1,
                            "table_number": j + 1,
                            "data": table
                        })
        
        logger.info(f"Extracted {len(content['pages'])} pages, {len(content['tables'])} tables")
        return content
    
    except Exception as e:
        logger.error(f"Error extracting PDF: {e}")
        return content


def analyze_capabilities(text: str) -> Dict[str, Any]:
    """Analyze text to extract machine capabilities and applications"""
    capabilities = {
        "operations": [],
        "applications": [],
        "features": [],
        "specifications": {}
    }
    
    # Keywords for operations
    operation_keywords = [
        "cutting", "drilling", "milling", "tapping", "engraving",
        "threading", "chamfering", "grooving", "pocketing"
    ]
    
    # Keywords for applications
    application_keywords = [
        "window", "door", "curtain wall", "facade", "profile",
        "aluminum", "UPVC", "composite", "glass", "framing"
    ]
    
    text_lower = text.lower()
    
    # Extract operations
    for keyword in operation_keywords:
        if keyword in text_lower:
            capabilities["operations"].append(keyword)
    
    # Extract applications
    for keyword in application_keywords:
        if keyword in text_lower:
            capabilities["applications"].append(keyword)
    
    return capabilities


def main():
    """Process both PDFs"""
    pdfs = [
        r"C:\Users\bobbi\Downloads\AIM-7510-00026692.pdf",
        r"C:\Users\bobbi\Downloads\AIM-7510-s.pdf"
    ]
    
    output_dir = Path("knowledge/processed/aim-7510")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    results = {}
    
    for pdf_path in pdfs:
        if not Path(pdf_path).exists():
            logger.warning(f"PDF not found: {pdf_path}")
            continue
        
        filename = Path(pdf_path).stem
        logger.info(f"Processing: {filename}")
        
        # Extract content
        content = extract_pdf_content(pdf_path)
        
        # Analyze capabilities
        if content["full_text"]:
            capabilities = analyze_capabilities(content["full_text"])
            content["capabilities"] = capabilities
        
        # Save extracted content
        output_file = output_dir / f"{filename}_extracted.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(content, f, indent=2, ensure_ascii=False)
        
        results[filename] = {
            "pages": len(content.get("pages", [])),
            "tables": len(content.get("tables", [])),
            "operations": capabilities.get("operations", []),
            "applications": capabilities.get("applications", [])
        }
        
        logger.info(f"Saved to: {output_file}")
    
    # Save summary
    summary_file = output_dir / "new_pdfs_summary.json"
    with open(summary_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    
    logger.info(f"Summary saved to: {summary_file}")
    print("\n=== EXTRACTION COMPLETE ===")
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()

