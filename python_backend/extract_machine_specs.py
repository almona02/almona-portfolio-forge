#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Extract machine specifications from PDF files and output structured JSON.
"""

import sys
import json
import os
import re
from pathlib import Path
from typing import Dict, Any, Optional

# Set UTF-8 encoding for stdout/stderr
if sys.platform == "win32":
    import io

    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

try:
    import PyPDF2  # type: ignore

    HAS_PYPDF2 = True
except ImportError:
    HAS_PYPDF2 = False
    try:
        import pdfplumber  # type: ignore

        HAS_PDFPLUMBER = True
    except ImportError:
        HAS_PDFPLUMBER = False
        print(
            "Warning: PyPDF2 and pdfplumber not available. Install one: pip install PyPDF2 or pip install pdfplumber"
        )


def extract_text_from_pdf(pdf_path: str) -> str:
    """Extract all text from PDF file."""
    if not os.path.exists(pdf_path):
        return ""

    full_text = ""
    try:
        if HAS_PYPDF2:
            with open(pdf_path, "rb") as file:
                pdf_reader = PyPDF2.PdfReader(file)
                for page in pdf_reader.pages:
                    full_text += page.extract_text() + "\n"
        elif HAS_PDFPLUMBER:
            # pdfplumber already imported in try block above
            with pdfplumber.open(pdf_path) as pdf:  # type: ignore
                for page in pdf.pages:
                    page_text = page.extract_text() or ""
                    full_text += page_text + "\n"
        else:
            print(f"Error: No PDF library available for {pdf_path}")
            return ""
    except Exception as e:
        print(f"Error extracting text from {pdf_path}: {e}")
        return ""

    return full_text


def extract_dimensions(text: str) -> Optional[Dict[str, str]]:
    """Extract dimensions from text."""
    # Patterns for dimensions: L x W x H, L×W×H, etc.
    patterns = [
        r"(\d+(?:\.\d+)?)\s*[×xX]\s*(\d+(?:\.\d+)?)\s*[×xX]\s*(\d+(?:\.\d+)?)\s*mm",
        r"(\d+(?:\.\d+)?)\s*mm\s*[×xX]\s*(\d+(?:\.\d+)?)\s*mm\s*[×xX]\s*(\d+(?:\.\d+)?)\s*mm",
        r"Length[:\s]+(\d+(?:\.\d+)?)\s*mm.*?Width[:\s]+(\d+(?:\.\d+)?)\s*mm.*?Height[:\s]+(\d+(?:\.\d+)?)\s*mm",
        r"L[:\s]+(\d+(?:\.\d+)?)\s*mm.*?W[:\s]+(\d+(?:\.\d+)?)\s*mm.*?H[:\s]+(\d+(?:\.\d+)?)\s*mm",
    ]

    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
        if match:
            return {
                "length": f"{match.group(1)}mm",
                "width": f"{match.group(2)}mm",
                "height": f"{match.group(3)}mm",
            }

    # Try individual dimension extraction
    length_match = re.search(
        r"(?:Length|L)[:\s]+(\d+(?:\.\d+)?)\s*mm", text, re.IGNORECASE
    )
    width_match = re.search(
        r"(?:Width|W)[:\s]+(\d+(?:\.\d+)?)\s*mm", text, re.IGNORECASE
    )
    height_match = re.search(
        r"(?:Height|H)[:\s]+(\d+(?:\.\d+)?)\s*mm", text, re.IGNORECASE
    )

    dims = {}
    if length_match:
        dims["length"] = f"{length_match.group(1)}mm"
    if width_match:
        dims["width"] = f"{width_match.group(1)}mm"
    if height_match:
        dims["height"] = f"{height_match.group(1)}mm"

    return dims if dims else None


def extract_power_spec(text: str) -> Optional[Dict[str, str]]:
    """Extract power specifications."""
    power_spec = {}

    # Voltage
    voltage_patterns = [
        r"(\d+(?:\.\d+)?)\s*V\s*(?:AC|DC)?",
        r"Voltage[:\s]+(\d+(?:\.\d+)?)\s*V",
    ]
    for pattern in voltage_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            power_spec["voltage"] = f"{match.group(1)}V AC"
            break

    # Frequency
    freq_match = re.search(r"(\d+(?:-\d+)?)\s*Hz", text, re.IGNORECASE)
    if freq_match:
        power_spec["frequency"] = f"{freq_match.group(1)}Hz"
    else:
        power_spec["frequency"] = "50-60Hz"  # Default

    # Phase
    phase_match = re.search(r"(\d+)\s*phase", text, re.IGNORECASE)
    if phase_match:
        power_spec["phase"] = phase_match.group(1)
    else:
        # Try to infer from voltage
        if "400" in power_spec.get("voltage", ""):
            power_spec["phase"] = "3"
        else:
            power_spec["phase"] = "1"

    # Power consumption
    power_patterns = [
        r"(\d+(?:\.\d+)?)\s*kW",
        r"Power[:\s]+(\d+(?:\.\d+)?)\s*kW",
        r"Consumption[:\s]+(\d+(?:\.\d+)?)\s*kW",
    ]
    for pattern in power_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            power_spec["consumption"] = f"{match.group(1)} kW"
            break

    return power_spec if power_spec else None


def extract_weight(text: str) -> Optional[Dict[str, str]]:
    """Extract weight information."""
    weight = {}

    # Net weight
    net_patterns = [
        r"Net[:\s]+(\d+(?:\.\d+)?)\s*kg",
        r"Weight[:\s]+(\d+(?:\.\d+)?)\s*kg",
    ]
    for pattern in net_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            weight["net"] = f"{match.group(1)} kg"
            break

    # Gross weight
    gross_match = re.search(r"Gross[:\s]+(\d+(?:\.\d+)?)\s*kg", text, re.IGNORECASE)
    if gross_match:
        weight["gross"] = f"{gross_match.group(1)} kg"

    return weight if weight else None


def extract_air_spec(text: str) -> Optional[Dict[str, str]]:
    """Extract air specifications."""
    air_spec = {}

    # Air consumption
    consumption_patterns = [
        r"(\d+(?:\.\d+)?)\s*L/min",
        r"Air[:\s]+(\d+(?:\.\d+)?)\s*L/min",
        r"Consumption[:\s]+(\d+(?:\.\d+)?)\s*L/min",
    ]
    for pattern in consumption_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            air_spec["consumption"] = f"{match.group(1)} L/min"
            break

    # Air pressure
    pressure_match = re.search(r"(\d+(?:-\d+)?)\s*bar", text, re.IGNORECASE)
    if pressure_match:
        air_spec["pressure"] = f"{pressure_match.group(1)} bar"

    return air_spec if air_spec else None


def extract_saw_blade_spec(text: str) -> Optional[Dict[str, str]]:
    """Extract saw blade specifications."""
    saw_spec = {}

    # Diameter
    diameter_match = re.search(r"Ø(\d+(?:\.\d+)?)\s*mm", text, re.IGNORECASE)
    if diameter_match:
        saw_spec["diameter"] = f"Ø{diameter_match.group(1)} mm"

    # Bore
    bore_match = re.search(r"Bore[:\s]+Ø?(\d+(?:\.\d+)?)\s*mm", text, re.IGNORECASE)
    if bore_match:
        saw_spec["bore"] = f"Ø{bore_match.group(1)} mm"

    # Speed
    speed_match = re.search(r"(\d+(?:,\d+)?)\s*RPM", text, re.IGNORECASE)
    if speed_match:
        saw_spec["speed"] = f"{speed_match.group(1).replace(',', ',')} RPM"

    # Motor power
    motor_power_match = re.search(
        r"Motor[:\s]+(\d+(?:\.\d+)?)\s*kW", text, re.IGNORECASE
    )
    if motor_power_match:
        saw_spec["motorPower"] = f"{motor_power_match.group(1)} kW"

    return saw_spec if saw_spec else None


def extract_machine_info(pdf_path: str) -> Dict[str, Any]:
    """Extract machine information from PDF."""
    filename = os.path.basename(pdf_path)
    machine_name = filename.replace(".pdf", "").replace("_", " ").replace("-", " ")

    print(f"Extracting from: {filename}")

    text = extract_text_from_pdf(pdf_path)

    if not text:
        return {"filename": filename, "error": "Could not extract text from PDF"}

    # Extract machine model/name from text
    model_match = re.search(r"([A-Z]{2,}\s*\d+(?:\s*[A-Z]+)?(?:\s*[-/]\s*\d+)?)", text)
    if model_match:
        machine_name = model_match.group(1).strip()

    result = {
        "filename": filename,
        "name": machine_name,
        "text_preview": text[:500] + "..." if len(text) > 500 else text,
        "specifications": {},
    }

    # Extract dimensions
    dims = extract_dimensions(text)
    if dims:
        result["specifications"]["dimensions"] = dims

    # Extract power spec
    power = extract_power_spec(text)
    if power:
        result["specifications"]["powerSpec"] = power

    # Extract weight
    weight = extract_weight(text)
    if weight:
        result["specifications"]["weight"] = weight

    # Extract air spec
    air = extract_air_spec(text)
    if air:
        result["specifications"]["airSpec"] = air

    # Extract saw blade spec (if applicable)
    saw = extract_saw_blade_spec(text)
    if saw:
        result["specifications"]["sawBlade"] = saw

    # Store full text for manual review
    result["full_text"] = text

    return result


def main():
    """Main extraction function."""
    # PDF files to extract from
    pdf_files = [
        "DK 540.pdf",
        "KD 400 D - 400 PS.pdf",
        "KD_400_D_PS_TR_EN.pdf",
        "MK 420 - 420 PS - 450 (1).pdf",
        "SCM_420_L4-L7_TR_EN.pdf",
        "TK 503.pdf",
        "VK 300.pdf",
        "CA 601.pdf",
        "DC 550 PB.pdf",
    ]

    base_path = Path(__file__).parent.parent / "public" / "documents" / "specs"

    results = {}

    for pdf_file in pdf_files:
        pdf_path = base_path / pdf_file
        if pdf_path.exists():
            result = extract_machine_info(str(pdf_path))
            results[pdf_file] = result
        else:
            print(f"Warning: {pdf_file} not found at {pdf_path}")
            results[pdf_file] = {"error": "File not found"}

    # Save results
    output_file = base_path.parent / "extracted_machine_specs.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    print(f"\n{'='*60}")
    print(f"Results saved to: {output_file}")
    print(f"{'='*60}\n")

    # Print summary
    for filename, result in results.items():
        if "error" in result:
            print(f"{filename}: ERROR - {result['error']}")
        else:
            specs_count = len(result.get("specifications", {}))
            print(f"{filename}: {specs_count} specification categories extracted")

    return results


if __name__ == "__main__":
    main()
