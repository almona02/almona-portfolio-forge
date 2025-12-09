"""
Creates test DXF files for CAD ingestion verification.
"""

import os

import ezdxf


def create_square_test_dxf() -> str:
    """Basic 100x100mm square for unit tests."""
    doc = ezdxf.new()
    msp = doc.modelspace()
    points = [(0, 0), (100, 0), (100, 100), (0, 100)]
    msp.add_lwpolyline(points, close=True)
    path = os.path.join("tests", "test_square.dxf")
    doc.saveas(path)
    print(f"✅ Created: {path}")
    return path


def create_egyptian_profile_60mm() -> str:
    """Simulated 60mm Egyptian window profile."""
    doc = ezdxf.new()
    msp = doc.modelspace()
    points = [
        (0, 0), (60, 0), (60, 30), (55, 30),
        (55, 25), (50, 25), (50, 28), (45, 28),
        (45, 25), (40, 25), (40, 30), (35, 30),
        (35, 25), (30, 25), (30, 30), (25, 30),
        (25, 25), (20, 25), (20, 30), (15, 30),
        (15, 25), (10, 25), (10, 30), (5, 30),
        (5, 25), (0, 25),
    ]
    msp.add_lwpolyline(points, close=True)
    doc.header["$LASTSAVEDBY"] = "PS Egypt - Caluminium PS 5600"
    path = os.path.join("tests", "test_egyptian_60mm.dxf")
    doc.saveas(path)
    print(f"✅ Created: {path}")
    return path


def create_invalid_dxf() -> str:
    """Malformed DXF content for error testing."""
    path = os.path.join("tests", "test_invalid.dxf")
    with open(path, "w", encoding="utf-8") as f:
        f.write("NOT A VALID DXF FILE\nJust text content")
    print(f"✅ Created: {path}")
    return path


if __name__ == "__main__":
    os.makedirs("tests", exist_ok=True)
    create_square_test_dxf()
    create_egyptian_profile_60mm()
    create_invalid_dxf()
    print("\n🎯 Test DXFs ready. Run verification:")
    print("   pytest tests/test_cad_ingest.py -v")
