"""
Structured logging and metric helpers for SmartScan.
"""
import time
import uuid
from datetime import datetime
from typing import List, Optional

import structlog
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware


logger = structlog.get_logger()


class SmartScanLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware for structured SmartScan request logging."""

    async def dispatch(self, request: Request, call_next):
        request_id = str(uuid.uuid4())[:8]
        start_time = time.time()

        try:
            response = await call_next(request)
            process_time = time.time() - start_time
            self._log_request(
                request_id=request_id,
                request=request,
                response=response,
                process_time=process_time,
            )
            response.headers["X-Request-ID"] = request_id
            return response
        except Exception as exc:
            process_time = time.time() - start_time
            logger.error(
                "smartscan_request_error",
                request_id=request_id,
                method=request.method,
                path=request.url.path,
                process_time_ms=round(process_time * 1000, 2),
                error=str(exc),
                timestamp=datetime.utcnow().isoformat(),
            )
            raise

    def _log_request(
        self, request_id: str, request: Request, response: Response, process_time: float
    ):
        log_data = {
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "process_time_ms": round(process_time * 1000, 2),
            "timestamp": datetime.utcnow().isoformat(),
            "user_agent": request.headers.get("user-agent", ""),
            "client_ip": request.client.host if request.client else None,
        }

        if "/smart-scan/" in request.url.path:
            scan_type = "enhanced" if "/enhanced" in request.url.path else "basic"
            log_data["scan_type"] = scan_type
            content_length = request.headers.get("content-length")
            if content_length:
                try:
                    log_data["file_size_bytes"] = int(content_length)
                except ValueError:
                    pass

        if response.status_code >= 400:
            logger.warning("smartscan_request", **log_data)
        else:
            logger.info("smartscan_request", **log_data)


class SmartScanMetricLogger:
    """Logger for SmartScan-specific metrics."""

    @staticmethod
    def log_scan_start(scan_type: str, filename: str, file_size: int):
        logger.info(
            "smartscan_start",
            scan_type=scan_type,
            filename=filename,
            file_size_bytes=file_size,
            timestamp=datetime.utcnow().isoformat(),
        )

    @staticmethod
    def log_scan_complete(
        scan_type: str,
        filename: str,
        success: bool,
        processing_time_ms: float,
        confidence_score: Optional[float] = None,
        accuracy_tier: Optional[str] = None,
        ocr_success: Optional[bool] = None,
        standard_match: Optional[bool] = None,
        error: Optional[str] = None,
    ):
        logger.info(
            "smartscan_complete",
            scan_type=scan_type,
            filename=filename,
            success=success,
            processing_time_ms=round(processing_time_ms, 2),
            confidence_score=confidence_score,
            accuracy_tier=accuracy_tier,
            ocr_success=ocr_success,
            standard_match=standard_match,
            error=error,
            timestamp=datetime.utcnow().isoformat(),
        )

    @staticmethod
    def log_ocr_extraction(
        filename: str,
        profile_name: Optional[str] = None,
        confidence: Optional[float] = None,
        materials: Optional[List[str]] = None,
        brands: Optional[List[str]] = None,
    ):
        logger.info(
            "ocr_extraction",
            filename=filename,
            profile_name=profile_name,
            confidence=confidence,
            materials=materials,
            brands=brands,
            timestamp=datetime.utcnow().isoformat(),
        )

    @staticmethod
    def log_egyptian_standard_match(
        filename: str,
        standard_name: str,
        match_score: float,
        width_mm: float,
        height_mm: float,
    ):
        logger.info(
            "egyptian_standard_match",
            filename=filename,
            standard_name=standard_name,
            match_score=match_score,
            width_mm=width_mm,
            height_mm=height_mm,
            timestamp=datetime.utcnow().isoformat(),
        )

