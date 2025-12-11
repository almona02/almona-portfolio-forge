#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Extract information from MDB and PDF profile files.
"""

import sys
import json
import os
from pathlib import Path
from typing import Dict, List, Any

# Set UTF-8 encoding for stdout/stderr
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

try:
    import pyodbc
    HAS_PYODBC = True
except ImportError:
    HAS_PYODBC = False
    try:
        # Try alternative: mdb-export from mdb-tools (Linux/Mac)
        import subprocess
        result = subprocess.run(['which', 'mdb-export'], capture_output=True, text=True)
        HAS_MDB_TOOLS = result.returncode == 0
    except:
        HAS_MDB_TOOLS = False
    if not HAS_PYODBC and not HAS_MDB_TOOLS:
        print("Warning: pyodbc not available. MDB extraction may not work.")

try:
    import PyPDF2
    HAS_PYPDF2 = True
except ImportError:
    HAS_PYPDF2 = False
    try:
        import pdfplumber
        HAS_PDFPLUMBER = True
    except ImportError:
        HAS_PDFPLUMBER = False
        print("Warning: PyPDF2 and pdfplumber not available. PDF extraction may not work.")


def extract_mdb_info(mdb_path: str) -> Dict[str, Any]:
    """Extract information from Microsoft Access MDB file."""
    result = {
        "file": mdb_path,
        "tables": [],
        "error": None
    }
    
    if not HAS_PYODBC:
        result["error"] = "pyodbc not installed. Install with: pip install pyodbc"
        return result
    
    if not os.path.exists(mdb_path):
        result["error"] = f"File not found: {mdb_path}"
        return result
    
    try:
        # Connection string for MDB file
        # Note: On Windows, this typically requires Microsoft Access Database Engine
        conn_str = (
            r'DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};'
            f'DBQ={mdb_path};'
        )
        
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()
        
        # Get all table names
        tables = cursor.tables(tableType='TABLE')
        table_names = [table.table_name for table in tables]
        
        result["tables"] = []
        
        # Extract data from each table
        for table_name in table_names:
            try:
                cursor.execute(f"SELECT * FROM [{table_name}]")
                columns = [column[0] for column in cursor.description]
                rows = cursor.fetchall()
                
                table_data = {
                    "name": table_name,
                    "columns": columns,
                    "row_count": len(rows),
                    "sample_rows": []
                }
                
                # Get sample rows (first 10)
                for row in rows[:10]:
                    row_dict = {}
                    for i, col in enumerate(columns):
                        value = row[i]
                        # Convert to JSON-serializable format
                        if value is None:
                            row_dict[col] = None
                        elif isinstance(value, (int, float, str, bool)):
                            row_dict[col] = value
                        else:
                            row_dict[col] = str(value)
                    table_data["sample_rows"].append(row_dict)
                
                result["tables"].append(table_data)
                
            except Exception as e:
                result["tables"].append({
                    "name": table_name,
                    "error": str(e)
                })
        
        conn.close()
        
    except Exception as e:
        result["error"] = str(e)
        # Try alternative method using mdb-tools if available
        try:
            import subprocess
            # Try using mdb-export if mdb-tools is installed
            result["alternative_method"] = "Attempting mdb-tools..."
            # This would require mdb-tools to be installed on the system
        except:
            pass
    
    return result


def extract_pdf_info(pdf_path: str) -> Dict[str, Any]:
    """Extract information from PDF file."""
    result = {
        "file": pdf_path,
        "pages": [],
        "text": "",
        "metadata": {},
        "error": None
    }
    
    if not os.path.exists(pdf_path):
        result["error"] = f"File not found: {pdf_path}"
        return result
    
    try:
        if HAS_PYPDF2:
            with open(pdf_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                
                result["metadata"] = {
                    "num_pages": len(pdf_reader.pages),
                    "title": pdf_reader.metadata.get("/Title", "") if pdf_reader.metadata else "",
                    "author": pdf_reader.metadata.get("/Author", "") if pdf_reader.metadata else "",
                    "subject": pdf_reader.metadata.get("/Subject", "") if pdf_reader.metadata else "",
                }
                
                # Extract text from all pages
                full_text = ""
                for i, page in enumerate(pdf_reader.pages):
                    page_text = page.extract_text()
                    full_text += f"\n--- Page {i+1} ---\n{page_text}\n"
                    result["pages"].append({
                        "page_number": i + 1,
                        "text": page_text[:1000] + "..." if len(page_text) > 1000 else page_text,
                        "text_length": len(page_text)
                    })
                
                result["text"] = full_text
                
        elif HAS_PDFPLUMBER:
            import pdfplumber
            with pdfplumber.open(pdf_path) as pdf:
                result["metadata"] = {
                    "num_pages": len(pdf.pages),
                }
                
                full_text = ""
                for i, page in enumerate(pdf.pages):
                    page_text = page.extract_text() or ""
                    full_text += f"\n--- Page {i+1} ---\n{page_text}\n"
                    result["pages"].append({
                        "page_number": i + 1,
                        "text": page_text[:1000] + "..." if len(page_text) > 1000 else page_text,
                        "text_length": len(page_text)
                    })
                
                result["text"] = full_text
        else:
            result["error"] = "No PDF library available. Install PyPDF2 or pdfplumber."
            
    except Exception as e:
        result["error"] = str(e)
    
    return result


def main():
    """Main extraction function."""
    if len(sys.argv) < 2:
        print("Usage: python extract_profile_info.py <mdb_file> [pdf_file]")
        print("       python extract_profile_info.py <pdf_file>")
        print("Example: python extract_profile_info.py 'ALM PIM TEST PVC.mdb' 'ALM 6510 Alüminyum Profile Process_Eng.pdf'")
        print("Example: python extract_profile_info.py 'AIM 3410 Technical File.pdf'")
        sys.exit(1)
    
    base_path = Path(__file__).parent.parent / "public" / "PROFILES"
    
    results = {}
    
    # Check if first argument is PDF or MDB
    first_file = sys.argv[1]
    first_path = base_path / first_file if not os.path.isabs(first_file) else Path(first_file)
    
    # Determine file type by extension
    if first_path.suffix.lower() == '.pdf':
        # PDF-only extraction
        pdf_path = first_path
        print(f"\n{'='*60}")
        print(f"Extracting from PDF: {pdf_path}")
        print(f"{'='*60}")
        pdf_result = extract_pdf_info(str(pdf_path))
        results["pdf"] = pdf_result
    else:
        # MDB extraction (and optional PDF)
        mdb_path = first_path
        print(f"\n{'='*60}")
        print(f"Extracting from MDB: {mdb_path}")
        print(f"{'='*60}")
        mdb_result = extract_mdb_info(str(mdb_path))
        results["mdb"] = mdb_result
    
    # Extract from PDF if provided
    if len(sys.argv) > 2:
        pdf_file = sys.argv[2]
        if os.path.isabs(pdf_file):
            pdf_path = Path(pdf_file)
        else:
            # Try to find the file with proper encoding
            pdf_path = base_path / pdf_file
            if not pdf_path.exists():
                # Try to find files matching the pattern (handle special characters)
                pattern = "ALM 6510*.pdf"
                matching_files = list(base_path.glob(pattern))
                if matching_files:
                    pdf_path = matching_files[0]
        
        print(f"\n{'='*60}")
        try:
            print(f"Extracting from PDF: {pdf_path}")
        except UnicodeEncodeError:
            print(f"Extracting from PDF: {str(pdf_path).encode('ascii', 'replace').decode()}")
        print(f"{'='*60}")
        pdf_result = extract_pdf_info(str(pdf_path))
        results["pdf"] = pdf_result
    
    # Output results
    output_file = base_path / "extracted_info.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    
    print(f"\n{'='*60}")
    print(f"Results saved to: {output_file}")
    print(f"{'='*60}\n")
    
    # Print summary
    if "mdb" in results:
        mdb = results["mdb"]
        if mdb.get("error"):
            print(f"MDB Error: {mdb['error']}")
        else:
            print(f"MDB Tables found: {len(mdb.get('tables', []))}")
            for table in mdb.get('tables', []):
                print(f"  - {table.get('name')}: {table.get('row_count', 0)} rows")
    
    if "pdf" in results:
        pdf = results["pdf"]
        if pdf.get("error"):
            print(f"PDF Error: {pdf['error']}")
        else:
            print(f"PDF Pages: {pdf.get('metadata', {}).get('num_pages', 0)}")
            print(f"PDF Text length: {len(pdf.get('text', ''))} characters")
    
    return results


if __name__ == "__main__":
    main()

