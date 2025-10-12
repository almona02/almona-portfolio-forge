"""
Global error handler middleware for v2 APIs.

This middleware provides comprehensive error handling with internationalization
support and consistent error response formatting.
"""
import logging
import traceback
from datetime import datetime

from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from apis.v2.core.errors import (
    V2APIError,
    error_translator,
    V2ErrorCode
)

logger = logging.getLogger(__name__)


class V2ErrorHandlerMiddleware(BaseHTTPMiddleware):
    """Global error handler middleware for v2 APIs."""
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.app = app

    async def dispatch(self, request: Request, call_next):
        """Process request and handle any errors."""
        try:
            response = await call_next(request)
            return response
        except V2APIError as e:
            # Handle our custom V2 API errors
            return e.to_json_response(request)
        except RequestValidationError as e:
            # Handle Pydantic validation errors
            return await self._handle_validation_error(request, e)
        except Exception as e:
            # Handle unexpected errors
            return await self._handle_unexpected_error(request, e)
    
    async def _handle_validation_error(
        self, request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        """Handle Pydantic validation errors."""
        errors = []
        for error in exc.errors():
            errors.append({
                "field": ".".join(str(x) for x in error["loc"]),
                "message": error["msg"],
                "type": error["type"],
                "input": error.get("input")
            })

        # Get language from request
        language = self._get_language_from_request(request)

        # Get localized messages
        localized_messages = error_translator.get_localized_error(
            "VALIDATION_ERROR", language=language
        )

        response_data = {
            "error": {
                "code": V2ErrorCode.VALIDATION_ERROR.value,
                "message": localized_messages.get(
                    language, "Request validation failed"
                ),
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "path": str(request.url.path),
                "method": request.method,
                "request_id": getattr(request.state, 'request_id', None),
                "details": {
                    "validation_errors": errors
                }
            }
        }

        # Include all language versions
        if localized_messages:
            response_data["error"]["messages"] = localized_messages

        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=response_data
        )
    
    async def _handle_unexpected_error(
        self, request: Request, exc: Exception
    ) -> JSONResponse:
        """Handle unexpected errors."""
        # Log the full exception for debugging
        logger.exception(f"Unexpected error in v2 API: {str(exc)}")

        # Get language from request
        language = self._get_language_from_request(request)

        # Get localized messages
        localized_messages = error_translator.get_localized_error(
            "INTERNAL_ERROR", language=language
        )

        response_data = {
            "error": {
                "code": V2ErrorCode.INTERNAL_ERROR.value,
                "message": localized_messages.get(
                    language, "An unexpected error occurred"
                ),
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "path": str(request.url.path),
                "method": request.method,
                "request_id": getattr(request.state, 'request_id', None)
            }
        }

        # Include all language versions
        if localized_messages:
            response_data["error"]["messages"] = localized_messages

        # Only include error details in development
        if logger.level <= logging.DEBUG:
            response_data["error"]["details"] = {
                "type": type(exc).__name__,
                "traceback": traceback.format_exc()
            }

        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=response_data
        )
    
    def _get_language_from_request(self, request: Request) -> str:
        """Extract language preference from request headers."""
        accept_language = request.headers.get('Accept-Language', 'en')
        if 'ar' in accept_language.lower():
            return 'ar'
        return 'en'


# FastAPI exception handlers
async def v2_error_handler(request: Request, exc: V2APIError) -> JSONResponse:
    """Handle V2 API errors."""
    return exc.to_json_response(request)


async def v2_validation_error_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Handle Pydantic validation errors for v2 APIs."""
    errors = []
    for error in exc.errors():
        errors.append({
            "field": ".".join(str(x) for x in error["loc"]),
            "message": error["msg"],
            "type": error["type"],
            "input": error.get("input")
        })

        # Get language from request
        language = "ar" if "ar" in request.headers.get(
            'Accept-Language', ''
        ).lower() else "en"

        # Get localized messages
        localized_messages = error_translator.get_localized_error(
            "VALIDATION_ERROR", language=language
        )

        response_data = {
            "error": {
                "code": V2ErrorCode.VALIDATION_ERROR.value,
                "message": localized_messages.get(
                    language, "Request validation failed"
                ),
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "path": str(request.url.path),
                "method": request.method,
                "request_id": getattr(request.state, 'request_id', None),
                "details": {
                    "validation_errors": errors
                }
            }
        }

    # Include all language versions
    if localized_messages:
        response_data["error"]["messages"] = localized_messages

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=response_data
    )


async def v2_general_exception_handler(
    request: Request, exc: Exception
) -> JSONResponse:
    """Handle unexpected errors for v2 APIs."""
    # Log the full exception for debugging
    logger.exception(f"Unexpected error in v2 API: {str(exc)}")

    # Get language from request
    language = "ar" if "ar" in request.headers.get(
        'Accept-Language', ''
    ).lower() else "en"

    # Get localized messages
    localized_messages = error_translator.get_localized_error(
        "INTERNAL_ERROR", language=language
    )

    response_data = {
        "error": {
            "code": V2ErrorCode.INTERNAL_ERROR.value,
            "message": localized_messages.get(
                language, "An unexpected error occurred"
            ),
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "path": str(request.url.path),
            "method": request.method,
            "request_id": getattr(request.state, 'request_id', None)
        }
    }

    # Include all language versions
    if localized_messages:
        response_data["error"]["messages"] = localized_messages

    # Only include error details in development
    if logger.level <= logging.DEBUG:
        response_data["error"]["details"] = {
            "type": type(exc).__name__,
            "traceback": traceback.format_exc()
        }

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=response_data
    )
