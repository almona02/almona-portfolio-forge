"""
DXF Parser API Endpoint

Week 3 Task 3.1: ProductionDXFParser API
"""

from fastapi import APIRouter, UploadFile, File, Form, Request
from fastapi.responses import JSONResponse
from typing import Optional
import logging

from services.dxf_parser_hardened import get_production_dxf_parser

router = APIRouter(prefix="/dxf", tags=["dxf-parser"])
logger = logging.getLogger(__name__)


@router.post("/parse")
async def parse_dxf_file(
    file: UploadFile = File(...),
    language: str = Form("en"),
    material_type: str = Form("aluminium"),
    request: Request = None
):
    """
    Parse DXF file with production-grade validation.
    
    Features:
    - 0.01mm tolerance validation
    - Circuit breaker for malformed files
    - Geometry sanitization
    - Arabic error messages
    - Accuracy tracking
    """
    try:
        # Read file content
        file_bytes = await file.read()
        
        # Validate material type
        if material_type.lower() not in ['aluminium', 'upvc']:
            return JSONResponse(
                status_code=400,
                content={
                    'status': 'error',
                    'error_type': 'invalid_material_type',
                    'message': f'Invalid material type: {material_type}. Must be "aluminium" or "upvc"',
                    'message_ar': f'نوع المادة غير صالح: {material_type}. يجب أن يكون "aluminium" أو "upvc"',
                    'accuracy': 0.0,
                    'tolerance_validated': False,
                }
            )
        
        # Get parser instance for material type
        parser = get_production_dxf_parser(material_type=material_type.lower())
        
        # Parse with validation
        result = parser.parse_with_validation(
            file_bytes=file_bytes,
            filename=file.filename,
            language=language,
            material_type=material_type.lower()
        )
        
        # Return result
        if result.get('status') == 'error':
            return JSONResponse(
                status_code=400,
                content=result
            )
        
        return JSONResponse(
            status_code=200,
            content=result
        )
        
    except Exception as e:
        logger.error(f"Error parsing DXF file: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                'status': 'error',
                'error_type': 'internal_error',
                'message': f'Internal error: {str(e)}',
                'message_ar': f'خطأ داخلي: {str(e)}',
                'accuracy': 0.0,
                'tolerance_validated': False,
            }
        )

