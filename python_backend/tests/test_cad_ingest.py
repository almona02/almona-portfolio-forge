import ezdxf
import io

from core.cad_ingest import CadProfileIngestor


def test_square_dxf_ingestion():
    doc = ezdxf.new()
    msp = doc.modelspace()
    points = [(0, 0), (100, 0), (100, 100), (0, 100)]
    msp.add_lwpolyline(points, close=True)

    buffer = io.BytesIO()
    doc.write(buffer)
    dxf_bytes = buffer.getvalue()

    ingestor = CadProfileIngestor()
    result = ingestor.process_dxf(dxf_bytes)

    assert result["status"] == "success"
    metrics = result["profile_metrics"]
    assert abs(metrics["area_mm2"] - 10000.0) < 0.1
    assert abs(metrics["perimeter_mm"] - 400.0) < 0.1
    assert metrics["is_closed"] is True


def test_invalid_dxf_returns_error():
    ingestor = CadProfileIngestor()

    result = ingestor.process_dxf(b"")
    assert result["status"] == "error"
    assert result["accuracy_score"] == 0.0
