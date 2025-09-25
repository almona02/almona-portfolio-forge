from fastapi import APIRouter
from fastapi.exceptions import RequestValidationError, HTTPException

# Import individual v2 routers
from apis.v2.tickets import router as tickets_router
from apis.v2.quotes import router as quotes_router
from apis.v2.auth_fastapi import router as auth_router
from apis.v2.part_detection_fastapi import router as part_detection_router

# Import v2 error handlers
from apis.v2.core.errors import (
    v2_error_handler,
    v2_validation_error_handler,
    v2_http_exception_handler,
    v2_general_exception_handler,
    V2APIError
)


router = APIRouter(prefix="/api/v2")

# Add error handlers to the router
router.add_exception_handler(V2APIError, v2_error_handler)
router.add_exception_handler(
    RequestValidationError, v2_validation_error_handler
)
router.add_exception_handler(HTTPException, v2_http_exception_handler)
router.add_exception_handler(Exception, v2_general_exception_handler)

# Mount sub-routers under the unified v2 router
router.include_router(
    auth_router, prefix="/auth", tags=["Auth"]
)  # token endpoints
router.include_router(tickets_router)  # tickets already has /tickets prefix
router.include_router(quotes_router)   # quotes already has /quotes prefix
router.include_router(
    part_detection_router, prefix="/ai", tags=["AI"]
)  # optional namespacing
