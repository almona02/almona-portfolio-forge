"""
Enhanced health check endpoints with OCR and SmartScan diagnostics.
"""

from datetime import datetime
from typing import Any, Dict, Optional
import logging
import os

from fastapi import APIRouter

try:
    import psutil

    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False
    psutil = None  # type: ignore

logger = logging.getLogger(__name__)

if not PSUTIL_AVAILABLE:
    logger.warning("psutil not available. System metrics will be limited.")

router = APIRouter()


def check_ocr_service() -> Dict[str, Any]:
    try:
        from ai_services.vision.ocr_service import TechnicalOCRService

        ocr_service = TechnicalOCRService()
        if getattr(ocr_service, "reader", None):
            engine = "easyocr"
            status_detail = "available"
        else:
            engine = "tesseract"
            status_detail = "available (fallback)"
        return {
            "status": "healthy",
            "engine": engine,
            "status_detail": status_detail,
            "timestamp": datetime.utcnow().isoformat(),
        }
    except Exception as exc:  # pragma: no cover - diagnostic only
        return {
            "status": "unhealthy",
            "engine": "none",
            "status_detail": f"Failed to initialize: {exc}",
            "timestamp": datetime.utcnow().isoformat(),
        }


def check_scale_detector() -> Dict[str, Any]:
    try:
        from ai_services.scanning.scale_detector import ScaleDetectorService

        detector = ScaleDetectorService(use_gpu=False)
        detail = {"status": "available"}
        if hasattr(detector, "reader"):
            detail["ocr_backend"] = "easyocr"
        return {
            "status": "healthy",
            "service": "ScaleDetectorService",
            "detail": detail,
            "timestamp": datetime.utcnow().isoformat(),
        }
    except Exception as exc:  # pragma: no cover - diagnostic only
        return {
            "status": "unhealthy",
            "service": "ScaleDetectorService",
            "detail": f"Failed to initialize: {exc}",
            "timestamp": datetime.utcnow().isoformat(),
        }


def get_system_metrics() -> Dict[str, Any]:
    if PSUTIL_AVAILABLE and psutil is not None:
        try:
            process = psutil.Process(os.getpid())
            return {
                "cpu_percent": process.cpu_percent(interval=0.1),
                "memory_mb": round(process.memory_info().rss / 1024 / 1024, 2),
                "memory_percent": round(process.memory_percent(), 2),
                "open_files": len(process.open_files()),
                "threads": process.num_threads(),
                "uptime_seconds": int(
                    (
                        datetime.utcnow()
                        - datetime.fromtimestamp(process.create_time())
                    ).total_seconds()
                ),
            }
        except Exception as e:
            logger.warning(f"Failed to get system metrics: {e}")
            return {
                "status": "limited",
                "note": "psutil metrics unavailable",
                "error": str(e),
            }
    else:
        return {
            "status": "limited",
            "note": ("psutil not available - system metrics disabled"),
        }


@router.get("/health")
async def health_check():
    checks = {
        "api": {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
        },
        "ocr_service": check_ocr_service(),
        "scale_detector": check_scale_detector(),
        "system": get_system_metrics(),
        "services": {
            "smartscan_basic": "available",
            "smartscan_enhanced": "available",
            "file_conversion": "available",
        },
    }
    unhealthy = [
        k
        for k, v in checks.items()
        if isinstance(v, dict) and v.get("status") == "unhealthy"
    ]
    overall = "unhealthy" if unhealthy else "healthy"
    return {
        "status": overall,
        "timestamp": datetime.utcnow().isoformat(),
        "version": "smartscan-v2.0",
        "checks": checks,
        "unhealthy_services": unhealthy or None,
    }


@router.get("/health/simple")
async def simple_health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}


@router.get("/health/ocr")
async def ocr_health():
    return check_ocr_service()


@router.get("/health/metrics")
async def metrics_endpoint():
    metrics = {
        "smartscan_requests_total": 0,
        "smartscan_requests_by_type": {"basic": 0, "enhanced": 0},
        "smartscan_processing_time_ms": {"basic_avg": 0, "enhanced_avg": 0},
        "ocr_extraction_success_rate": 0.0,
        "egyptian_standard_match_rate": 0.0,
    }
    try:
        import sqlite3

        conn = sqlite3.connect("smartscan_metrics.db")
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT
                scan_type,
                COUNT(*) as total,
                AVG(confidence) as avg_confidence,
                AVG(processing_time_ms) as avg_time_ms
            FROM smartscan_metrics
            WHERE timestamp > datetime('now', '-1 hour')
            GROUP BY scan_type
            """
        )
        for scan_type, total, avg_conf, avg_time in cursor.fetchall():
            metrics["smartscan_requests_by_type"][scan_type] = total
            metrics["smartscan_processing_time_ms"][f"{scan_type}_avg"] = avg_time
        conn.close()
    except Exception:
        pass
    return metrics
