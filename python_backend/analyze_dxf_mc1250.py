#!/usr/bin/env python3
"""
Analyze MC 1250 DXF file to extract correct dimensions for K-Factor calculation
"""
import sys
import io
import numpy as np
import ezdxf
from ezdxf.path import make_path
from core.cad_ingest import CadProfileIngestor


def analyze_dxf(filepath: str):
    """Analyze DXF file and extract profile dimensions"""
    print(f"Analyzing DXF file: {filepath}\n")

    # Read DXF file
    try:
        with open(filepath, "rb") as f:
            file_bytes = f.read()

        buffer = io.BytesIO(file_bytes)
        text_stream = io.TextIOWrapper(buffer, encoding="utf-8", errors="ignore")
        doc = ezdxf.read(text_stream)
        msp = doc.modelspace()
        print(f"DXF Version: {doc.dxfversion}")
        print(f"Total entities: {len(list(msp))}\n")
    except Exception as e:
        print(f"Error reading DXF: {e}")
        import traceback

        traceback.print_exc()
        return

    # Extract closed polylines
    polygons = []
    for entity in msp.query("LWPOLYLINE POLYLINE"):
        try:
            if entity.is_closed:
                p = make_path(entity)
                verts = list(p.flattening(distance=0.01))
                if len(verts) > 2:
                    polygons.append(np.array(verts))
        except Exception as e:
            print(f"Warning: Failed to process polyline: {e}")
            continue

    print(f"Found {len(polygons)} closed polygon(s)\n")

    if not polygons:
        print("No closed polygons found in DXF!")
        return

    # Calculate bounding box
    all_points = np.vstack(polygons)
    min_vals = np.min(all_points, axis=0)
    max_vals = np.max(all_points, axis=0)

    width = max_vals[0] - min_vals[0]
    height = max_vals[1] - min_vals[1]

    print("=" * 60)
    print("EXTRACTED DIMENSIONS FROM DXF:")
    print("=" * 60)
    print(f"Bounding Box Min: ({min_vals[0]:.2f}, {min_vals[1]:.2f})")
    print(f"Bounding Box Max: ({max_vals[0]:.2f}, {max_vals[1]:.2f})")
    print(f"Profile Width:  {width:.2f} mm")
    print(f"Profile Height: {height:.2f} mm")
    print("=" * 60)

    # Calculate area and perimeter
    from core.cad_ingest import CadProfileIngestor

    ingestor = CadProfileIngestor("aluminium")

    with open(filepath, "rb") as f:
        file_bytes = f.read()

    result = ingestor.process_dxf(file_bytes)

    if result.get("status") == "success":
        metrics = result.get("profile_metrics", {})
        print("\nPROFILE METRICS:")
        print("=" * 60)
        print(f"Area: {metrics.get('area_mm2', 0):.2f} mm²")
        print(f"Perimeter: {metrics.get('perimeter_mm', 0):.2f} mm")
        print(f"Weight per meter: {metrics.get('weight_kg_per_m', 0):.4f} kg/m")
        print(f"Is Thermal Break: {metrics.get('is_thermal_break', False)}")
        print("=" * 60)

        # Estimate material thickness from area and perimeter
        area_mm2 = metrics.get("area_mm2", 0)
        perimeter_mm = metrics.get("perimeter_mm", 0)

        if area_mm2 > 0 and perimeter_mm > 0:
            # Approximate wall thickness for hollow profile
            # Area ≈ Perimeter × Thickness (simplified)
            estimated_thickness = area_mm2 / perimeter_mm if perimeter_mm > 0 else 0
            print(f"\nEstimated Material Thickness: {estimated_thickness:.2f} mm")

    # Calculate K-Factor recommendations
    print("\n" + "=" * 60)
    print("K-FACTOR CALCULATION RECOMMENDATIONS:")
    print("=" * 60)

    # For 50x50mm aluminum profile, typical thickness is 1.2-2.0mm
    # But we need to use actual extracted dimensions
    actual_width = width
    actual_height = height

    # Common material thicknesses for aluminum profiles
    thickness_options = [1.0, 1.2, 1.5, 2.0, 2.5]

    print(f"\nFor Profile Width: {actual_width:.1f}mm")
    print(f"For Profile Height: {actual_height:.1f}mm")
    print("\nK-Factor calculations for 45° Miter Joint:")
    print("-" * 60)

    for thickness in thickness_options:
        # K = (W / tan(22.5°)) - (T / sin(22.5°))
        tan_half = np.tan(np.radians(22.5))
        sin_half = np.sin(np.radians(22.5))
        k_factor = (actual_width / tan_half) - (thickness / sin_half)

        print(f"Material Thickness {thickness:.1f}mm -> K-Factor: {k_factor:.2f}mm")

    print("\n" + "=" * 60)
    print("RECOMMENDED PARAMETERS FOR PROFILE TUNING STUDIO:")
    print("=" * 60)
    print(f"Profile Width: {actual_width:.1f} mm")
    print(f"Profile Height: {actual_height:.1f} mm")
    print(f"Material Thickness: 1.5 mm (typical for 50x50mm aluminum)")
    print(f"Joint Type: 45° Miter")
    print("\nNOTE: If K-Factor is positive and unusually large (>50mm),")
    print("      verify that Profile Width is correct.")
    print("      For 50x50mm profiles, K-Factor should typically be")
    print("      between -2mm to -5mm (negative = deduction).")
    print("=" * 60)


if __name__ == "__main__":
    filepath = "../public/PROFILES/MC 1250 .dxf"
    analyze_dxf(filepath)
