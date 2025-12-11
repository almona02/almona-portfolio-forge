#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Verify AIM 3410 PDF extraction accuracy.
"""

import json
import os
from pathlib import Path

try:
    import PyPDF2
    HAS_PYPDF2 = True
except ImportError:
    HAS_PYPDF2 = False

def verify_aim3410_extraction(pdf_path: str, extracted_data: dict) -> dict:
    """Verify AIM 3410 PDF extraction accuracy."""
    results = {
        "file_exists": os.path.exists(pdf_path),
        "pages_found": 0,
        "pages_extracted": len(extracted_data.get("pages", [])),
        "text_extracted": len(extracted_data.get("text", "")),
        "metadata_extracted": bool(extracted_data.get("metadata")),
        "accuracy_score": 0.0,
        "issues": [],
        "key_content_verified": {}
    }
    
    if not results["file_exists"]:
        results["issues"].append("PDF file not found")
        return results
    
    if not HAS_PYPDF2:
        results["issues"].append("PyPDF2 not available for verification")
        return results
    
    try:
        with open(pdf_path, 'rb') as f:
            reader = PyPDF2.PdfReader(f)
            results["pages_found"] = len(reader.pages)
            
            # Check page count match
            page_count_match = results["pages_found"] == results["pages_extracted"]
            
            # Sample text extraction from key pages
            first_page_text = reader.pages[0].extract_text()
            page_5_text = reader.pages[4].extract_text() if len(reader.pages) > 4 else ""
            page_10_text = reader.pages[9].extract_text() if len(reader.pages) > 9 else ""
            last_page_text = reader.pages[-1].extract_text()
            
            extracted_text = extracted_data.get("text", "")
            
            # Verify key content
            key_phrases = [
                "AIM 3410",
                "ISO",
                "G code",
                "AIMCAM",
                "macro",
                "24.000",
                "3200",
                "HSK F63",
                "Tool Table",
                "CNC Setting Tables"
            ]
            
            found_phrases = []
            for phrase in key_phrases:
                if phrase.lower() in extracted_text.lower():
                    found_phrases.append(phrase)
            
            # Check first page content
            first_page_in_extracted = first_page_text[:200] in extracted_text if first_page_text else False
            
            # Check last page content
            last_page_in_extracted = last_page_text[:200] in extracted_text if last_page_text else False
            
            # Check key technical specs (page 5)
            specs_found = False
            if "3200" in extracted_text and "24.000" in extracted_text and "HSK F63" in extracted_text:
                specs_found = True
            
            # Check G-code/macro content (page 10-11)
            gcode_found = False
            if "ISO programming language" in extracted_text and "G and M codes" in extracted_text:
                gcode_found = True
            
            # Calculate accuracy
            score = 0.0
            if page_count_match:
                score += 0.3
            if first_page_in_extracted:
                score += 0.15
            if last_page_in_extracted:
                score += 0.15
            if specs_found:
                score += 0.2
            if gcode_found:
                score += 0.2
            
            results["accuracy_score"] = score
            results["first_page_verified"] = first_page_in_extracted
            results["last_page_verified"] = last_page_in_extracted
            results["specs_verified"] = specs_found
            results["gcode_content_verified"] = gcode_found
            results["key_phrases_found"] = len(found_phrases)
            results["key_phrases_total"] = len(key_phrases)
            results["key_phrases_ratio"] = len(found_phrases) / len(key_phrases) if key_phrases else 0
            
            # Check text length reasonableness
            if results["text_extracted"] > 0:
                estimated_text = sum(len(reader.pages[i].extract_text()) for i in range(len(reader.pages)))
                text_ratio = min(results["text_extracted"], estimated_text) / max(results["text_extracted"], estimated_text) if max(results["text_extracted"], estimated_text) > 0 else 0
                results["text_length_ratio"] = text_ratio
                if text_ratio < 0.7:
                    results["issues"].append(f"Text length mismatch: extracted {results['text_extracted']} vs estimated {estimated_text}")
            
    except Exception as e:
        results["issues"].append(f"Verification error: {str(e)}")
    
    return results


def main():
    """Main verification function."""
    base_path = Path(__file__).parent.parent / "public" / "PROFILES"
    json_path = base_path / "extracted_info.json"
    
    if not json_path.exists():
        print("Error: extracted_info.json not found")
        return
    
    with open(json_path, 'r', encoding='utf-8') as f:
        extracted_data = json.load(f)
    
    pdf_pattern = "AIM 3410*.pdf"
    pdf_files = list(base_path.glob(pdf_pattern))
    pdf_path = str(pdf_files[0]) if pdf_files else None
    
    print("=" * 70)
    print("AIM 3410 PDF EXTRACTION ACCURACY VERIFICATION")
    print("=" * 70)
    
    if pdf_path:
        print(f"\nFile: AIM 3410 Technical File.pdf")
        pdf_results = verify_aim3410_extraction(pdf_path, extracted_data.get("pdf", {}))
        
        print(f"  File exists: {pdf_results['file_exists']}")
        print(f"  Pages found: {pdf_results['pages_found']}")
        print(f"  Pages extracted: {pdf_results['pages_extracted']}")
        print(f"  Text extracted: {pdf_results['text_extracted']} characters")
        print(f"  Metadata extracted: {pdf_results['metadata_extracted']}")
        if 'first_page_verified' in pdf_results:
            print(f"  First page verified: {'[OK]' if pdf_results['first_page_verified'] else '[MISMATCH]'}")
            print(f"  Last page verified: {'[OK]' if pdf_results['last_page_verified'] else '[MISMATCH]'}")
            print(f"  Technical specs verified: {'[OK]' if pdf_results.get('specs_verified') else '[MISMATCH]'}")
            print(f"  G-code/macro content verified: {'[OK]' if pdf_results.get('gcode_content_verified') else '[MISMATCH]'}")
            print(f"  Key phrases found: {pdf_results.get('key_phrases_found', 0)}/{pdf_results.get('key_phrases_total', 0)}")
        if 'text_length_ratio' in pdf_results:
            print(f"  Text length ratio: {pdf_results['text_length_ratio']:.1%}")
        print(f"  Accuracy Score: {pdf_results['accuracy_score']:.1%}")
        if pdf_results['issues']:
            print(f"  Issues: {', '.join(pdf_results['issues'])}")
        
        # Overall assessment
        print("\n" + "=" * 70)
        print("[ACCURACY ASSESSMENT]")
        
        if pdf_results['accuracy_score'] >= 0.95:
            grade = "A+ (Excellent)"
        elif pdf_results['accuracy_score'] >= 0.90:
            grade = "A (Very Good)"
        elif pdf_results['accuracy_score'] >= 0.85:
            grade = "B+ (Good)"
        elif pdf_results['accuracy_score'] >= 0.80:
            grade = "B (Acceptable)"
        elif pdf_results['accuracy_score'] >= 0.70:
            grade = "C (Needs Improvement)"
        else:
            grade = "D (Poor)"
        
        print(f"Accuracy Score: {pdf_results['accuracy_score']:.1%}")
        print(f"Grade: {grade}")
        print("=" * 70)
        
        # Save report
        report = {
            "aim3410_verification": pdf_results,
            "accuracy": pdf_results['accuracy_score'],
            "grade": grade
        }
        
        report_path = base_path / "aim3410_extraction_accuracy_report.json"
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        print(f"\nDetailed report saved to: {report_path}")
    else:
        print("  PDF file not found")


if __name__ == "__main__":
    main()

