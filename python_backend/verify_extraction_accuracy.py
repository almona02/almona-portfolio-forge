#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Verify extraction accuracy by comparing extracted data with source files.
"""

import json
import os
from pathlib import Path

try:
    import pyodbc
    HAS_PYODBC = True
except ImportError:
    HAS_PYODBC = False

try:
    import PyPDF2
    HAS_PYPDF2 = True
except ImportError:
    HAS_PYPDF2 = False

def verify_mdb_extraction(mdb_path: str, extracted_data: dict) -> dict:
    """Verify MDB extraction accuracy."""
    results = {
        "file_exists": os.path.exists(mdb_path),
        "tables_found": 0,
        "tables_verified": [],
        "total_rows_verified": 0,
        "columns_verified": 0,
        "data_integrity": "unknown",
        "accuracy_score": 0.0,
        "issues": []
    }
    
    if not results["file_exists"]:
        results["issues"].append("MDB file not found")
        return results
    
    if not HAS_PYODBC:
        results["issues"].append("pyodbc not available for verification")
        results["data_integrity"] = "partial"
        return results
    
    try:
        conn = pyodbc.connect(
            f'DRIVER={{Microsoft Access Driver (*.mdb, *.accdb)}};'
            f'DBQ={mdb_path};'
        )
        cursor = conn.cursor()
        
        # Get actual table count
        tables = [t.table_name for t in cursor.tables(tableType='TABLE')]
        results["tables_found"] = len(tables)
        
        extracted_tables = extracted_data.get("tables", [])
        
        # Verify each table
        for table_name in tables:
            cursor.execute(f'SELECT COUNT(*) FROM [{table_name}]')
            actual_row_count = cursor.fetchone()[0]
            
            cursor.execute(f'SELECT TOP 1 * FROM [{table_name}]')
            actual_columns = [d[0] for d in cursor.description]
            actual_column_count = len(actual_columns)
            
            # Find matching extracted table
            extracted_table = next(
                (t for t in extracted_tables if t.get("name") == table_name),
                None
            )
            
            table_verification = {
                "table_name": table_name,
                "actual_rows": actual_row_count,
                "extracted_rows": extracted_table.get("row_count", 0) if extracted_table else 0,
                "actual_columns": actual_column_count,
                "extracted_columns": len(extracted_table.get("columns", [])) if extracted_table else 0,
                "row_match": False,
                "column_match": False,
                "column_names_match": False
            }
            
            # Check row count match
            if table_verification["actual_rows"] == table_verification["extracted_rows"]:
                table_verification["row_match"] = True
                results["total_rows_verified"] += actual_row_count
            
            # Check column count match
            if table_verification["actual_columns"] == table_verification["extracted_columns"]:
                table_verification["column_match"] = True
                results["columns_verified"] += actual_column_count
            
            # Check column names match
            if extracted_table:
                extracted_cols = extracted_table.get("columns", [])
                if set(actual_columns) == set(extracted_cols):
                    table_verification["column_names_match"] = True
            
            results["tables_verified"].append(table_verification)
        
        conn.close()
        
        # Calculate accuracy score
        if results["tables_found"] > 0:
            table_scores = []
            for tv in results["tables_verified"]:
                score = 0.0
                if tv["row_match"]:
                    score += 0.4
                if tv["column_match"]:
                    score += 0.3
                if tv["column_names_match"]:
                    score += 0.3
                table_scores.append(score)
            
            results["accuracy_score"] = sum(table_scores) / len(table_scores) if table_scores else 0.0
        
        if results["accuracy_score"] >= 0.95:
            results["data_integrity"] = "excellent"
        elif results["accuracy_score"] >= 0.85:
            results["data_integrity"] = "good"
        elif results["accuracy_score"] >= 0.70:
            results["data_integrity"] = "acceptable"
        else:
            results["data_integrity"] = "poor"
            
    except Exception as e:
        results["issues"].append(f"Verification error: {str(e)}")
        results["data_integrity"] = "error"
    
    return results


def verify_pdf_extraction(pdf_path: str, extracted_data: dict) -> dict:
    """Verify PDF extraction accuracy."""
    results = {
        "file_exists": os.path.exists(pdf_path),
        "pages_found": 0,
        "pages_extracted": len(extracted_data.get("pages", [])),
        "text_extracted": len(extracted_data.get("text", "")),
        "metadata_extracted": bool(extracted_data.get("metadata")),
        "accuracy_score": 0.0,
        "issues": []
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
            
            # Sample text extraction from first and last pages
            first_page_text = reader.pages[0].extract_text()
            last_page_text = reader.pages[-1].extract_text()
            
            extracted_text = extracted_data.get("text", "")
            first_page_in_extracted = first_page_text[:200] in extracted_text if first_page_text else False
            last_page_in_extracted = last_page_text[:200] in extracted_text if last_page_text else False
            
            # Calculate accuracy
            score = 0.0
            if page_count_match:
                score += 0.5
            if first_page_in_extracted:
                score += 0.25
            if last_page_in_extracted:
                score += 0.25
            
            results["accuracy_score"] = score
            results["first_page_verified"] = first_page_in_extracted
            results["last_page_verified"] = last_page_in_extracted
            
            # Check text length reasonableness (should be similar)
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
    
    print("=" * 70)
    print("EXTRACTION ACCURACY VERIFICATION")
    print("=" * 70)
    
    # Verify MDB
    mdb_path = str(base_path / "ALM PIM TEST PVC.mdb")
    print("\n[MDB FILE VERIFICATION]")
    print(f"File: ALM PIM TEST PVC.mdb")
    mdb_results = verify_mdb_extraction(mdb_path, extracted_data.get("mdb", {}))
    
    print(f"  File exists: {mdb_results['file_exists']}")
    print(f"  Tables found: {mdb_results['tables_found']}")
    print(f"  Tables verified: {len(mdb_results['tables_verified'])}")
    
    for tv in mdb_results['tables_verified']:
        print(f"\n  Table: {tv['table_name']}")
        print(f"    Rows: {tv['extracted_rows']}/{tv['actual_rows']} {'[OK]' if tv['row_match'] else '[MISMATCH]'}")
        print(f"    Columns: {tv['extracted_columns']}/{tv['actual_columns']} {'[OK]' if tv['column_match'] else '[MISMATCH]'}")
        print(f"    Column names match: {'[OK]' if tv['column_names_match'] else '[MISMATCH]'}")
    
    print(f"\n  Data Integrity: {mdb_results['data_integrity'].upper()}")
    print(f"  Accuracy Score: {mdb_results['accuracy_score']:.1%}")
    if mdb_results['issues']:
        print(f"  Issues: {', '.join(mdb_results['issues'])}")
    
    # Verify PDF
    pdf_pattern = "ALM 6510*.pdf"
    pdf_files = list(base_path.glob(pdf_pattern))
    pdf_path = str(pdf_files[0]) if pdf_files else None
    
    print("\n[PDF FILE VERIFICATION]")
    if pdf_path:
        pdf_name = "ALM 6510 Aluminyum Profile Process_Eng.pdf"  # Safe ASCII version
        print(f"File: {pdf_name}")
        pdf_results = verify_pdf_extraction(pdf_path, extracted_data.get("pdf", {}))
        
        print(f"  File exists: {pdf_results['file_exists']}")
        print(f"  Pages found: {pdf_results['pages_found']}")
        print(f"  Pages extracted: {pdf_results['pages_extracted']}")
        print(f"  Text extracted: {pdf_results['text_extracted']} characters")
        print(f"  Metadata extracted: {pdf_results['metadata_extracted']}")
        if 'first_page_verified' in pdf_results:
            print(f"  First page verified: {'[OK]' if pdf_results['first_page_verified'] else '[MISMATCH]'}")
            print(f"  Last page verified: {'[OK]' if pdf_results['last_page_verified'] else '[MISMATCH]'}")
        if 'text_length_ratio' in pdf_results:
            print(f"  Text length ratio: {pdf_results['text_length_ratio']:.1%}")
        print(f"  Accuracy Score: {pdf_results['accuracy_score']:.1%}")
        if pdf_results['issues']:
            print(f"  Issues: {', '.join(pdf_results['issues'])}")
    else:
        print("  PDF file not found")
        pdf_results = {"accuracy_score": 0.0}
    
    # Overall score
    print("\n" + "=" * 70)
    print("[OVERALL ACCURACY ASSESSMENT]")
    overall_score = (mdb_results['accuracy_score'] + pdf_results['accuracy_score']) / 2
    print(f"Overall Accuracy Score: {overall_score:.1%}")
    
    if overall_score >= 0.95:
        grade = "A+ (Excellent)"
    elif overall_score >= 0.90:
        grade = "A (Very Good)"
    elif overall_score >= 0.85:
        grade = "B+ (Good)"
    elif overall_score >= 0.80:
        grade = "B (Acceptable)"
    elif overall_score >= 0.70:
        grade = "C (Needs Improvement)"
    else:
        grade = "D (Poor)"
    
    print(f"Grade: {grade}")
    print("=" * 70)
    
    # Save verification report
    report = {
        "mdb_verification": mdb_results,
        "pdf_verification": pdf_results,
        "overall_accuracy": overall_score,
        "grade": grade
    }
    
    report_path = base_path / "extraction_accuracy_report.json"
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    
    print(f"\nDetailed report saved to: {report_path}")


if __name__ == "__main__":
    main()

