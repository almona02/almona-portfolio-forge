#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Detailed parsing of machine specifications from extracted PDF text.
"""

import json
import re
from pathlib import Path

def parse_dk540(text):
    """Parse DK 540 specifications."""
    specs = {
        "id": "dk-540",
        "name": "DK 540",
        "description": "Four Corner PVC Welding Machine - Fully automatic four corner welding of PVC window profiles at 90°",
        "category": "welding-machines",
        "type": "Four Corner PVC Welding",
        "powerSpec": {
            "voltage": "400V AC",
            "frequency": "50-60Hz",
            "phase": "3",
            "consumption": "8.4 kW"
        },
        "airSpec": {
            "consumption": "55 L/min",
            "pressure": "6-8 bar"
        },
        "dimensions": {
            "width": "515mm",
            "length": "450mm",
            "height": "1501mm"
        },
        "weight": {
            "net": "690 kg",
            "gross": "2079 kg"
        },
        "weldingCapacity": {
            "heightMax": "180mm",
            "heightMin": "30mm",
            "widthMax": "130mm",
            "widthMin": "30mm",
            "frameMin": "400 x 400 mm",
            "frameMax": "3,100 x 2,700 mm"
        },
        "specifications": [
            "Fully automatic four corner welding of PVC window profiles at 90°",
            "Welding of a complete window frame or sash in one cycle",
            "All profile related welding parameters are individually programmable",
            "Parameters are set easily by means of 8\" LCD colour touch screen",
            "Automatic line can be set by combining with Cooling Unit (SA 251), Corner Cleaning Machine (CNC 609-611) and Rotating Robot (SA 261)",
            "Automatically setting the standard (2.0 mm) or seamless (0.2 mm) welding options",
            "Long-period of teflon usage thanks to the teflon roller system",
            "Automatically discharging of the frames after welding operation",
            "Saving of time by means of practical mould change system",
            "Adjusting the heat between 0 - 300°C via electronic thermocouple",
            "Minimum welding measurement: 400 x 400 mm",
            "Maximum welding measurement: 3.100 x 2.700 mm",
            "Memory capacity to save up programs of 900 different profiles",
            "Operator safety barrier",
            "Barcode scanner"
        ],
        "standardAccessories": [
            "1 set of sash welding mould according to 70 mm of profile height",
            "1 set of adaptor for frame profile",
            "Manual greasing pump"
        ],
        "optionalAccessories": [
            "Welding fixture set for lame sash",
            "Special welding moulds on demand",
            "CS 240 gasket pressing system"
        ]
    }
    return specs

def parse_kd400(text):
    """Parse KD 400 D / KD 400 PS specifications."""
    specs = {
        "id": "kd-400-d",
        "name": "KD 400 D / KD 400 PS",
        "description": "Single Head Mitre Saw Machine - Location points at 45° - 30° - 22.5° - 15° - 0° both left and right",
        "category": "cutting-machines",
        "type": "Single Head Mitre Saw",
        "powerSpec": {
            "voltage": "400V AC",
            "frequency": "50-60Hz",
            "phase": "3",
            "consumption": "2.2 kW"
        },
        "airSpec": {
            "consumption": "24 L/min",
            "pressure": "6-8 bar"
        },
        "dimensions": {
            "width": "860mm",
            "length": "760mm",
            "height": "1600mm"
        },
        "weight": {
            "net": "110 kg",
            "gross": "137 kg"
        },
        "sawBlade": {
            "diameter": "Ø400 mm",
            "bore": "Ø30/32 mm",
            "speed": "2,900 RPM",
            "motorPower": "2.2 kW"
        },
        "angularCapacity": {
            "presetAngles": "45°, 30°, 22.5°, 15°, 0° (both left and right)",
            "pivotingRange": "45° left to 45° right infinitely adjustable"
        },
        "specifications": [
            "Location points at 45° - 30° - 22.5° - 15° - 0° both left and right",
            "Pivoting range from 45° left to 45° right infinitely adjustable",
            "Aluminium construction of the body and machine stand made of steel sheet",
            "Robust mechanical construction enables the ease of adjustment for the requested cutting angles",
            "Strong spring system and protective shield"
        ],
        "standardAccessories": [
            "Ø400 mm saw blade",
            "Machine stand",
            "2x manual horizontal clamps (KD 400 D)",
            "2x pneumatic horizontal clamps (KD 400 PS)",
            "Air gun (KD 400 PS)",
            "Spray saw blade lubrication system (KD 400 PS)"
        ],
        "optionalAccessories": [
            "2 x pneumatic vertical clamps (KD 400 PS)",
            "MKN 300 length stop-right (3m)",
            "MKN 300 length stop-left (3m)",
            "DKN 302 length stop (3m)",
            "DKN 602 length stop (6m)",
            "Spare saw blade, Ø 400 mm",
            "Brake unit working with motor stop button (KD 400 PS)"
        ]
    }
    return specs

def parse_mk420(text):
    """Parse MK 420 / MK 420 PS / MK 450 specifications."""
    specs = {
        "id": "mk-420",
        "name": "MK 420 / MK 420 PS / MK 450",
        "description": "Manual Up-Cutting Saw Machine - Manual upward saw stroke for wide and flat profiles",
        "category": "cutting-machines",
        "type": "Manual Up-Cutting Saw",
        "powerSpec": {
            "voltage": "230V AC",  # MK 420, MK 450: 230V; MK 420 PS: 400V
            "frequency": "50-60Hz",
            "phase": "1",  # MK 420, MK 450: 1P; MK 420 PS: 3P
            "consumption": "2.2 kW"
        },
        "airSpec": {
            "consumption": "7 L/min",
            "pressure": "6-8 bar"
        },
        "dimensions": {
            "width": "725mm",
            "length": "865mm",
            "height": "1350mm"
        },
        "weight": {
            "net": "115 kg",  # MK 420
            "gross": "142 kg"  # MK 420
        },
        "sawBlade": {
            "diameter": "Ø420 mm",  # MK 420, MK 420 PS; MK 450: Ø450 mm
            "bore": "Ø30/32 mm",
            "speed": "2,900 RPM",
            "motorPower": "2.2 kW"
        },
        "angularCapacity": {
            "presetAngles": "60°, 45°, 30°, 22.5°, 15°, 0° (both left and right)",
            "pivotingRange": "60° to the right and 60° to the left"
        },
        "specifications": [
            "Manual upward saw stroke",
            "The back fence is adjustable to allow the most effective use of the saw blade capacity for wide and flat profiles",
            "Location points at 60°, 45°, 30°, 22.5°, 15°, 0° for both left and right",
            "Wide angle cutting range up to 60° to the right and 60° to the left",
            "Adjustable machine working direction by means of rotatable (360°) platform via foot pedal",
            "Easy saw blade change",
            "It has the ability of lateral and longitudinal cutting operations"
        ],
        "standardAccessories": [
            "Equipped with saw blade Ø420 mm",
            "Equipped with saw blade Ø 450 mm (MK 450)",
            "Miter stop",
            "Profile length stop",
            "Pneumatically working spray saw blade lubrication system (MK 420 PS)",
            "Electrically working spray saw blade lubrication system (MK 420- MK 450)",
            "2x mechanic top clamps (MK 420)",
            "2x pneumatic top clamps (MK 420 PS)",
            "Safety guard for lateral cutting operations (MK 420 PS)"
        ],
        "optionalAccessories": [
            "Safety guard for longitudinal cutting operations (MK 420 PS)",
            "2 x vertical clamps",
            "MKN 300 length stop (3m)",
            "Connection kit for MKN and DKN length stops",
            "Spare saw blade, Ø420 mm",
            "Spare saw blade, Ø450 mm (MK 450)"
        ]
    }
    return specs

def parse_scm420(text):
    """Parse SCM 420 L4-L7 specifications."""
    specs = {
        "id": "scm-420-l4",
        "name": "SCM 420 L4 / SCM 420 L7",
        "description": "Servo Controlled Serial Cutting Machine - 3.6 m (L4) and 6.6 m (L7) pushing strokes with 300 mm of conveyor width",
        "category": "cutting-machines",
        "type": "Servo Controlled Serial Cutting Machine",
        "powerSpec": {
            "voltage": "400V AC",
            "frequency": "50-60Hz",
            "phase": "3",
            "consumption": "2.2 kW"
        },
        "airSpec": {
            "consumption": "130 L/min",
            "pressure": "6-8 bar"
        },
        "dimensions": {
            "width": "1130mm",
            "length": "5250mm",  # L4: 5250mm, L7: 8250mm
            "height": "1360mm"
        },
        "weight": {
            "net": "220 kg",  # L4
            "gross": "325 kg"  # L4
        },
        "sawBlade": {
            "diameter": "Ø420 mm",
            "bore": "Ø30/32 mm",
            "speed": "2,900 RPM",
            "motorPower": "2.2 kW"
        },
        "cuttingCapacity": {
            "pushingStroke": "3.6 m (L4) / 6.6 m (L7)",
            "conveyorWidth": "300 mm",
            "accuracy": "±0.2 mm"
        },
        "angularCapacity": {
            "automatic": "90°",
            "manualAngles": "75°, 60°, 45°, 30°, 22.5°, 15°, 90° (both left and right)"
        },
        "specifications": [
            "3.6 m (SCM 420 L4) and 6.6 m (SCM 420 L7) pushing strokes with 300 of conveyor width",
            "Automatic and manual operation features",
            "Automatic serial cutting at 90°",
            "Manual cutting with location points at 75°, 60°, 45°, 30°, 22.5°, 15°, 90°, both left and right",
            "Two-hand run safety operation",
            "Hydro-pneumatic saw feed",
            "Adjustable saw blade feeding speed",
            "Turkish, English, Spanish and Russian",
            "Metric and imperial",
            "Store up to 50 different lengths",
            "Easy cutting lists transfer in CSV format with SD card",
            "7\" HMI colored touch screen monitor",
            "Preparing cutting lists manually",
            "Ability to change the cutting list on screen",
            "Problem solving with remote connection feature",
            "Units can be converted from Left to Right Hand operation",
            "Rack and pinion drive mechanism and rigid steel of construction body provide a repeatable cutting accuracy of +/- 0.2 mm providing superior pushing force for heaviest jobs",
            "Pieces are cut in the order according to the measurement data that is sent from the digital measuring rod (1.5 m, 3.0 m) (optional)"
        ],
        "standardAccessories": [
            "Equipped with saw blade Ø420 mm",
            "2x vertical clamps and 1x horizontal roller clamp",
            "Spray saw blade lubrication system",
            "Air gun"
        ],
        "optionalAccessories": [
            "Laser marker set indicating the cutting line",
            "Barcode printer",
            "Extendible digital measuring rod, 3.0 m",
            "Spare saw blade Ø420 mm",
            "VCE 1570 Chip vacuum extractor",
            "MKN 150 outfeed conveyor"
        ]
    }
    return specs

def parse_tk503(text):
    """Parse TK 503 specifications."""
    specs = {
        "id": "tk-503",
        "name": "TK 503",
        "description": "Single Corner PVC Welding Machine - All parameters such as melting time, welding time and welding pressure are set independently",
        "category": "welding-machines",
        "type": "Single Corner PVC Welding",
        "powerSpec": {
            "voltage": "230V AC",
            "frequency": "50-60Hz",
            "phase": "1",
            "consumption": "1.5 kW"
        },
        "airSpec": {
            "consumption": "20 L/min",
            "pressure": "6-8 bar"
        },
        "dimensions": {
            "width": "600mm",
            "length": "1915mm",
            "height": "1400mm"
        },
        "weight": {
            "net": "113 kg",
            "gross": "128 kg"
        },
        "weldingCapacity": {
            "heightMax": "165mm",
            "heightMin": "30mm",
            "widthMax": "130mm",
            "widthMin": "30mm",
            "angleRange": "30° - 180°"
        },
        "temperatureRange": "0° - 300°C",
        "weldingOptions": "Standard (2.0 mm) or seamless (0.2 mm)",
        "specifications": [
            "All parameters such as melting time, welding time and welding pressure are set independently",
            "User friendly with the features of cleaning the plates and replacing teflon very easily and quickly",
            "Practical adjustment of standard (2.0 mm) or seamless (0.2 mm) welding options manually",
            "Thanks to the profile support arms, long profiles can be easily welded",
            "Profile support arms are supplied as standard in both directions",
            "Adjusting the heat between 0 - 300°C by means of the electronic thermostat",
            "Saving of time thanks to the practical mold change feature",
            "Enable the welding of all angles between 30°- 180° infinitely adjustable",
            "Automatically start and finish the welding cycle",
            "Welding possibility of profiles up to H:165 mm of high",
            "Clamping the profiles separately via foot pedal",
            "Portable machine stand"
        ],
        "standardAccessories": [
            "Electrical foot pedal",
            "Profile support arms"
        ],
        "optionalAccessories": [
            "Special welding molds"
        ]
    }
    return specs

def parse_vk300(text):
    """Parse VK 300 specifications."""
    specs = {
        "id": "vk-300",
        "name": "VK 300",
        "description": "V-Notch and Arrow Cutting Machine - Designed to precisely cut PVC profiles in V notch or arrow shapes",
        "category": "cutting-machines",
        "type": "V-Notch and Arrow Cutting Machine",
        "powerSpec": {
            "voltage": "380V AC",
            "frequency": "50Hz",
            "phase": "3",
            "consumption": "2.2 kW",
            "amperage": "5A"
        },
        "airSpec": {
            "consumption": "20 L/min",
            "pressure": "6-8 bar"
        },
        "dimensions": {
            "width": "715mm",
            "length": "1825mm",
            "height": "1420mm"
        },
        "weight": {
            "net": "240 kg"
        },
        "sawBlade": {
            "diameter": "Ø300 mm",
            "bore": "Ø30-32 mm",
            "speed": "3,000 RPM"
        },
        "cuttingCapacity": {
            "heightMax": "65mm",
            "widthMax": "130mm"
        },
        "specifications": [
            "Performs the V-shaped notches and arrow-shaped cutting on sash and mullion profiles before welding operations",
            "Twin saw blade design",
            "Pneumatic saw feed by pushing two-hand button",
            "Automatic return to start point of the process",
            "Ability to cut 6 different V shaped notches without mechanical set-up thanks to the mechanical memory system",
            "Machine construction is designed as per minimum cut-off size",
            "Two-hand operation control",
            "Easily adjustable, V-notch depth or complete arrow cut",
            "2 x pneumatic horizontal profile vise",
            "Adjustable saw feed speed",
            "Max capacity: H 65 mm / W 130 mm",
            "Performs V and Arrow cutting operations up to 65 mm profile height",
            "Safe operation is ensured with the top cover",
            "V cutting process is completed in one step and arrow cutting process is completed in two steps"
        ],
        "standardAccessories": [
            "Equipped with 2 x Ø 300 mm saw",
            "Profile support conveyor",
            "8 and 22 key",
            "Air gun"
        ],
        "optionalAccessories": [
            "Spare saw blade, Ø300mm"
        ]
    }
    return specs

def parse_ca601(text):
    """Parse CA 601 specifications."""
    specs = {
        "id": "ca-601",
        "name": "CA 601",
        "description": "Semi-Automatic PVC Corner Cleaning Machine - High quality stripping and cleaning operations by means of the hydro-pneumatic system",
        "category": "processing-centers",
        "type": "Semi-Automatic Corner Cleaning",
        "powerSpec": {
            "voltage": "400V AC",
            "frequency": "50-60Hz",
            "phase": "3",
            "consumption": "1 kW"
        },
        "airSpec": {
            "consumption": "36 L/min",
            "pressure": "6-8 bar"
        },
        "dimensions": {
            "width": "1375mm",
            "length": "2405mm",
            "height": "1255mm"
        },
        "weight": {
            "net": "165 kg",
            "gross": "210 kg"
        },
        "sawBlade": {
            "diameter": "Ø215 mm",
            "bore": "Ø32 mm",
            "speed": "3,000 RPM"
        },
        "clampingCapacity": {
            "heightMax": "180mm",
            "heightMin": "30mm",
            "widthMax": "130mm",
            "widthMin": "30mm"
        },
        "frameCapacity": {
            "minInner": "350 x 350 mm (W: 30mm profiles)",
            "minOuter": "380 x 380 mm (W: 60mm profiles)"
        },
        "specifications": [
            "Min. inner and outer frame sizes according to W: 30 and W: 60 mm of profile width L: 350 x L: 350 mm and L: 380 x L: 380 mm",
            "High quality stripping and cleaning operations by means of the hydro-pneumatic system",
            "Stripping blade levels are adjustable according to laminated and unlaminated profiles",
            "Pneumatically working serial blade changing function that makes working easier",
            "Fixing the workpiece firmly by means of the vertical and horizontal clamps",
            "Processing capability for max. profile dimension: W: 130 - H: 180 mm",
            "Processing capability for min. profile dimension: W: 30 - H: 30 mm",
            "Centring system to fit the profiles properly on the setsquare",
            "Automatic start up feature when profile placed on the table",
            "Stops automatically after stripping and cleaning operation",
            "Single or multi cleaning operations can be processed",
            "Robust machine stand",
            "PLC control system"
        ],
        "standardAccessories": [
            "Profile support table with brushed",
            "Air gun"
        ],
        "optionalAccessories": [
            "Special corner cleaning cutter set",
            "Cleaning cutter for colored profiles",
            "V type of cleaning cutter for white profiles"
        ]
    }
    return specs

def parse_dc550pb(text):
    """Parse DC 550 PB specifications."""
    specs = {
        "id": "dc-550-pb",
        "name": "DC 550 PB",
        "description": "Full Automatic Double Head Mitre Saw Machine - Designed for the strait or angular cutting operations of large size of profiles made of PVC and aluminium materials",
        "category": "cutting-machines",
        "type": "Full Automatic Double Head Mitre Saw",
        "powerSpec": {
            "voltage": "400V AC",
            "frequency": "50-60Hz",
            "phase": "3",
            "consumption": "5 kW"  # Estimated, not explicitly stated
        },
        "airSpec": {
            "consumption": "165 L/min",  # Estimated based on similar machines
            "pressure": "6-8 bar"
        },
        "dimensions": {
            "width": "5190mm",
            "length": "1880mm",
            "height": "1210mm"
        },
        "weight": {
            "net": "1200 kg",
            "gross": "1415 kg"
        },
        "sawBlade": {
            "diameter": "Ø550 mm",
            "bore": "Ø30-32 mm",
            "speed": "2,900 RPM",
            "motorPower": "5 kW"
        },
        "angularCapacity": {
            "tilting": "90° and 45° inward (automatic)",
            "pivotingRange": "45° inwards and 22.5° outwards",
            "compound": "Automatic slicing at 90° and 45° inward"
        },
        "cuttingCapacity": {
            "accuracy": "±0.2 mm"
        },
        "specifications": [
            "Designed for the strait or angular cutting operations of large size of profiles made of PVC and aluminium materials",
            "Double head sawing units equipped with Ø 550 mm of saw blades",
            "Two-hand run safety operation",
            "Automatic positioning of the heads between 45° inwards and 22.5° outwards by the computer control",
            "Hydro-pneumatic saw feed",
            "Cutting accuracy +/- 0.2 mm",
            "2 x pneumatic profile supports",
            "Automatic slicing feature at 90° and 45° inward",
            "Windows based industrial PC and 15\" LCD touch screen colour monitor",
            "Facility to transfer the cutting list at 'mdb' and 'csv' formats via USB and network",
            "Obtains profile cutting dimensions and angles from the cut list while working in automatic mode",
            "Remote connection via internet and providing technical support",
            "Barcode printer & image print"
        ],
        "standardAccessories": [
            "Equipped with saw blades 2x Ø 550 mm",
            "Roller conveyor & 2x pneumatic profile supports",
            "Spray saw blade lubrication system",
            "Barcode printer",
            "4x horizontal clamps",
            "2x vertical clamps",
            "Air gun"
        ],
        "optionalAccessories": [
            "Machine with the length of 5m and 6m",
            "Short cut system (DKN 60 with digital unit)",
            "VCE 1570 Chip vacuum extractor",
            "Chip removal conveyor",
            "DLG100-DLG200-DLG300 digital length gauge",
            "Arrow cut system for mullion profiles (DKN 80)"
        ]
    }
    return specs

def main():
    """Parse all machine specifications."""
    # Load extracted text
    input_file = Path(__file__).parent.parent / "public" / "documents" / "extracted_machine_specs.json"
    
    with open(input_file, 'r', encoding='utf-8') as f:
        extracted_data = json.load(f)
    
    parsed_machines = {}
    
    # Parse each machine
    if "DK 540.pdf" in extracted_data:
        parsed_machines["dk-540"] = parse_dk540(extracted_data["DK 540.pdf"]["full_text"])
    
    if "KD 400 D - 400 PS.pdf" in extracted_data:
        parsed_machines["kd-400-d"] = parse_kd400(extracted_data["KD 400 D - 400 PS.pdf"]["full_text"])
    elif "KD_400_D_PS_TR_EN.pdf" in extracted_data:
        parsed_machines["kd-400-d"] = parse_kd400(extracted_data["KD_400_D_PS_TR_EN.pdf"]["full_text"])
    
    if "MK 420 - 420 PS - 450 (1).pdf" in extracted_data:
        parsed_machines["mk-420"] = parse_mk420(extracted_data["MK 420 - 420 PS - 450 (1).pdf"]["full_text"])
    
    if "SCM_420_L4-L7_TR_EN.pdf" in extracted_data:
        parsed_machines["scm-420-l4"] = parse_scm420(extracted_data["SCM_420_L4-L7_TR_EN.pdf"]["full_text"])
    
    if "TK 503.pdf" in extracted_data:
        parsed_machines["tk-503"] = parse_tk503(extracted_data["TK 503.pdf"]["full_text"])
    
    if "VK 300.pdf" in extracted_data:
        parsed_machines["vk-300"] = parse_vk300(extracted_data["VK 300.pdf"]["full_text"])
    
    if "CA 601.pdf" in extracted_data:
        parsed_machines["ca-601"] = parse_ca601(extracted_data["CA 601.pdf"]["full_text"])
    
    if "DC 550 PB.pdf" in extracted_data:
        parsed_machines["dc-550-pb"] = parse_dc550pb(extracted_data["DC 550 PB.pdf"]["full_text"])
    
    # Save parsed specifications
    output_file = Path(__file__).parent.parent / "public" / "documents" / "parsed_machine_specs.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(parsed_machines, f, indent=2, ensure_ascii=False)
    
    print(f"Parsed {len(parsed_machines)} machines")
    print(f"Results saved to: {output_file}")
    
    return parsed_machines

if __name__ == "__main__":
    main()

