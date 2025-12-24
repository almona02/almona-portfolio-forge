"""
Convert Gold Tier extracted specifications to yilmazMachines.ts format
Ensures perfect integration with existing machine type definitions.
"""

import json
from pathlib import Path
from typing import Dict, Any, Optional


def convert_to_yilmaz_format(specs_file: Path) -> Dict[str, Any]:
    """
    Convert Gold Tier extracted specs to yilmazMachines.ts Machine interface format.
    
    Args:
        specs_file: Path to specifications_gold_tier.json
        
    Returns:
        Dictionary matching yilmazMachines.ts Machine interface
    """
    with open(specs_file, 'r', encoding='utf-8') as f:
        specs = json.load(f)
    
    machine_id = specs['machine_id']
    model_code = specs['model_code']
    
    # Build yilmazMachines.ts format
    machine_data = {
        "id": machine_id,
        "name": model_code,
        "description": f"4-axis CNC aluminium profile machining center - {model_code}",
        "imageUrl": f"/images/machines/{machine_id}.jpg",
        "specPdf": f"/documents/specs/{model_code.replace(' ', '-')}.pdf",
        "category": "processing-centers",
        "subcategory": "profile-machining",
        "featured": True,
        "releaseDate": "2020-07-20",  # From manual revision date
        "type": "Aluminium Profile Machining Center",
        "tags": ["CNC", "4-Axis", "Aluminium", "Profile Machining"],
        "specifications": [],
        "certifications": ["CE"],
        "safetyFeatures": []
    }
    
    # Power Specification
    if specs.get('power_consumption'):
        power_val = specs['power_consumption'].replace(' kW', '')
        machine_data["powerSpec"] = {
            "voltage": specs.get('power_voltage') or "400V AC",
            "frequency": specs.get('power_frequency') or "50-60Hz",
            "phase": specs.get('power_phase') or "3",
            "consumption": specs['power_consumption'],
            "amperage": specs.get('power_amperage')
        }
    
    # Air Specification
    if specs.get('air_consumption'):
        machine_data["airSpec"] = {
            "consumption": specs['air_consumption'],
            "pressure": specs.get('air_pressure')
        }
    
    # Dimensions
    if specs.get('dimension_length'):
        machine_data["dimensions"] = {
            "length": specs['dimension_length'],
            "width": specs.get('dimension_width', ''),
            "height": specs.get('dimension_height', '')
        }
    
    # Weight
    if specs.get('weight_net'):
        machine_data["weight"] = {
            "net": specs['weight_net'],
            "gross": specs.get('weight_gross', specs['weight_net'])
        }
    
    # Working Capacity
    if specs.get('working_x1'):
        machine_data["workingCapacity"] = {}
        if specs.get('working_x1'):
            machine_data["workingCapacity"]["x1"] = specs['working_x1']
        if specs.get('working_x2'):
            machine_data["workingCapacity"]["x2"] = specs['working_x2']
        if specs.get('working_y1'):
            machine_data["workingCapacity"]["y1"] = specs['working_y1']
        if specs.get('working_y2'):
            machine_data["workingCapacity"]["y2"] = specs['working_y2']
        if specs.get('working_z1'):
            machine_data["workingCapacity"]["z1"] = specs['working_z1']
        if specs.get('working_z2'):
            machine_data["workingCapacity"]["z2"] = specs['working_z2']
    
    # Saw Blade
    if specs.get('saw_diameter'):
        machine_data["sawBlade"] = {
            "diameter": f"Ø{specs['saw_diameter'].replace(' mm', '')} mm",
            "bore": f"Ø{specs.get('saw_bore', '').replace(' mm', '')} mm" if specs.get('saw_bore') else None,
            "speed": specs.get('saw_speed'),
            "motorPower": specs.get('saw_motor_power')
        }
    
    # CNC Axes
    if specs.get('cnc_axes'):
        machine_data["cncAxes"] = specs['cnc_axes']
    
    # Clamping Capacity
    if specs.get('clamping_width_max'):
        machine_data["clampingCapacity"] = {
            "widthMax": specs.get('clamping_width_max'),
            "widthMin": specs.get('clamping_width_min'),
            "heightMax": specs.get('clamping_height_max'),
            "heightMin": specs.get('clamping_height_min'),
            "lengthMax": specs.get('clamping_length_max'),
            "lengthMin": specs.get('clamping_length_min')
        }
    
    # Add validation metadata
    machine_data["_extraction_metadata"] = {
        "confidence": specs.get('extraction_confidence', 0.0),
        "is_gold_tier": specs.get('validation_report', {}).get('is_gold_tier', False),
        "source_pages": specs.get('source_pages', []),
        "extraction_date": "2025-01-27"
    }
    
    return machine_data


def main():
    """Convert AIM 7510 specs to yilmazMachines.ts format"""
    specs_file = Path(__file__).parent / "knowledge" / "processed" / "aim-7510" / "specifications_gold_tier.json"
    
    if not specs_file.exists():
        print(f"Error: {specs_file} not found. Run specification_extractor.py first.")
        return
    
    machine_data = convert_to_yilmaz_format(specs_file)
    
    output_file = Path(__file__).parent / "knowledge" / "processed" / "aim-7510" / "yilmaz_format.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(machine_data, f, indent=2, ensure_ascii=False)
    
    print(f"[SUCCESS] Converted to yilmazMachines.ts format")
    print(f"Output: {output_file}")
    print(f"\nKey Specifications:")
    print(f"  Power: {machine_data.get('powerSpec', {}).get('consumption')}")
    print(f"  Working: X={machine_data.get('workingCapacity', {}).get('x1')}, Y={machine_data.get('workingCapacity', {}).get('y1')}, Z={machine_data.get('workingCapacity', {}).get('z1')}")
    print(f"  Saw: {machine_data.get('sawBlade', {}).get('diameter')} @ {machine_data.get('sawBlade', {}).get('speed')}")
    print(f"  Weight: {machine_data.get('weight', {}).get('net')} / {machine_data.get('weight', {}).get('gross')}")
    print(f"\nGold Tier: {machine_data.get('_extraction_metadata', {}).get('is_gold_tier', False)}")


if __name__ == "__main__":
    main()

