"""
SecurityGateway - Backend Security Gateway

Provides input validation, sanitization, and Arabic error message translation
with graceful degradation for invalid inputs.

Week 2 Task 2.1: Security Implementation
"""

import re
import json
from typing import Any, Dict, Optional, Union, List
from datetime import datetime
from enum import Enum

from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, validator

from core.security_logger import SecurityLogger, SecurityEvent, SecurityEventType


class SecurityErrorSeverity(str, Enum):
    """Security error severity levels"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class SecurityError(BaseModel):
    """Security error model with Arabic translation"""
    code: str
    message: str
    message_ar: str  # Arabic translation
    severity: SecurityErrorSeverity = SecurityEventType.ERROR
    field: Optional[str] = None
    details: Optional[Dict[str, Any]] = None


class ValidationResult(BaseModel):
    """Validation result model"""
    valid: bool
    sanitized: Optional[Any] = None
    error: Optional[SecurityError] = None


class SecurityGateway:
    """Backend security gateway for input validation and sanitization"""
    
    # Dangerous patterns for XSS detection
    XSS_PATTERNS = [
        re.compile(r'<script', re.IGNORECASE),
        re.compile(r'javascript:', re.IGNORECASE),
        re.compile(r'onerror=', re.IGNORECASE),
        re.compile(r'onload=', re.IGNORECASE),
        re.compile(r'eval\(', re.IGNORECASE),
        re.compile(r'expression\(', re.IGNORECASE),
        re.compile(r'data:text/html', re.IGNORECASE),
    ]
    
    # SQL injection patterns
    SQL_PATTERNS = [
        re.compile(r'\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b', re.IGNORECASE),
        re.compile(r"('|(\\')|(;)|(\\)|(\/\*)|(\*\/)|(--)|(#))"),
    ]
    
    def __init__(self):
        self.security_logger = SecurityLogger()
        self._error_messages = self._load_error_messages()
    
    def _load_error_messages(self) -> Dict[str, Dict[str, str]]:
        """Load error messages from locale files"""
        messages = {
            'INVALID_INPUT': {
                'en': 'Input is required',
                'ar': 'المدخل مطلوب'
            },
            'XSS_ATTEMPT': {
                'en': 'Input contains potentially dangerous content',
                'ar': 'المدخل يحتوي على محتوى خطير محتمل'
            },
            'SQL_INJECTION_ATTEMPT': {
                'en': 'Input contains potentially dangerous SQL patterns',
                'ar': 'المدخل يحتوي على أنماط SQL خطيرة محتملة'
            },
            'MIN_LENGTH': {
                'en': 'Input must be at least {min} characters',
                'ar': 'يجب أن يكون المدخل {min} أحرف على الأقل'
            },
            'MAX_LENGTH': {
                'en': 'Input must be no more than {max} characters',
                'ar': 'يجب ألا يتجاوز المدخل {max} حرف'
            },
            'INVALID_NUMBER': {
                'en': 'Input must be a valid number',
                'ar': 'يجب أن يكون المدخل رقماً صحيحاً'
            },
            'VALIDATION_ERROR': {
                'en': 'Validation failed: {error}',
                'ar': 'فشل التحقق: {error}'
            },
        }
        return messages
    
    def get_error_message(self, code: str, language: str = 'en', **kwargs) -> str:
        """Get localized error message"""
        messages = self._error_messages.get(code, {})
        template = messages.get(language, messages.get('en', code))
        
        try:
            return template.format(**kwargs)
        except (KeyError, ValueError):
            return template
    
    def validate_input(
        self,
        input_data: Any,
        min_length: Optional[int] = None,
        max_length: Optional[int] = None,
        min_value: Optional[float] = None,
        max_value: Optional[float] = None,
        pattern: Optional[re.Pattern] = None,
        required: bool = True
    ) -> ValidationResult:
        """
        Validate and sanitize input data
        
        Args:
            input_data: Input to validate
            min_length: Minimum length for strings
            max_length: Maximum length for strings
            min_value: Minimum value for numbers
            max_value: Maximum value for numbers
            pattern: Regex pattern for string validation
            required: Whether input is required
        
        Returns:
            ValidationResult with validation status and sanitized data
        """
        try:
            # Check if required
            if required and (input_data is None or input_data == ''):
                return ValidationResult(
                    valid=False,
                    error=SecurityError(
                        code='INVALID_INPUT',
                        message=self.get_error_message('INVALID_INPUT', 'en'),
                        message_ar=self.get_error_message('INVALID_INPUT', 'ar'),
                        severity=SecurityErrorSeverity.ERROR
                    )
                )
            
            # String validation
            if isinstance(input_data, str):
                return self._validate_string(
                    input_data, min_length, max_length, pattern
                )
            
            # Number validation
            if isinstance(input_data, (int, float)):
                return self._validate_number(
                    input_data, min_value, max_value
                )
            
            # List validation
            if isinstance(input_data, list):
                return self._validate_list(input_data)
            
            # Dict validation
            if isinstance(input_data, dict):
                return self._validate_dict(input_data)
            
            # Default: valid
            return ValidationResult(valid=True, sanitized=input_data)
            
        except Exception as e:
            error_msg = str(e)
            return ValidationResult(
                valid=False,
                error=SecurityError(
                    code='VALIDATION_ERROR',
                    message=self.get_error_message('VALIDATION_ERROR', 'en', error=error_msg),
                    message_ar=self.get_error_message('VALIDATION_ERROR', 'ar', error=error_msg),
                    severity=SecurityErrorSeverity.ERROR
                )
            )
    
    def _validate_string(
        self,
        input_str: str,
        min_length: Optional[int] = None,
        max_length: Optional[int] = None,
        pattern: Optional[re.Pattern] = None
    ) -> ValidationResult:
        """Validate string input"""
        # Check for XSS patterns
        for pattern_check in self.XSS_PATTERNS:
            if pattern_check.search(input_str):
                self._log_security_event(
                    SecurityEventType.SUSPICIOUS_REQUEST,
                    'XSS_ATTEMPT',
                    {'input_preview': input_str[:100]}
                )
                return ValidationResult(
                    valid=False,
                    error=SecurityError(
                        code='XSS_ATTEMPT',
                        message=self.get_error_message('XSS_ATTEMPT', 'en'),
                        message_ar=self.get_error_message('XSS_ATTEMPT', 'ar'),
                        severity=SecurityErrorSeverity.ERROR
                    )
                )
        
        # Check for SQL injection patterns
        for sql_pattern in self.SQL_PATTERNS:
            if sql_pattern.search(input_str):
                self._log_security_event(
                    SecurityEventType.SUSPICIOUS_REQUEST,
                    'SQL_INJECTION_ATTEMPT',
                    {'input_preview': input_str[:100]}
                )
                return ValidationResult(
                    valid=False,
                    error=SecurityError(
                        code='SQL_INJECTION_ATTEMPT',
                        message=self.get_error_message('SQL_INJECTION_ATTEMPT', 'en'),
                        message_ar=self.get_error_message('SQL_INJECTION_ATTEMPT', 'ar'),
                        severity=SecurityErrorSeverity.ERROR
                    )
                )
        
        # Check length constraints
        if min_length is not None and len(input_str) < min_length:
            return ValidationResult(
                valid=False,
                error=SecurityError(
                    code='MIN_LENGTH',
                    message=self.get_error_message('MIN_LENGTH', 'en', min=min_length),
                    message_ar=self.get_error_message('MIN_LENGTH', 'ar', min=min_length),
                    severity=SecurityErrorSeverity.ERROR
                )
            )
        
        if max_length is not None and len(input_str) > max_length:
            return ValidationResult(
                valid=False,
                error=SecurityError(
                    code='MAX_LENGTH',
                    message=self.get_error_message('MAX_LENGTH', 'en', max=max_length),
                    message_ar=self.get_error_message('MAX_LENGTH', 'ar', max=max_length),
                    severity=SecurityErrorSeverity.ERROR
                )
            )
        
        # Check pattern
        if pattern is not None and not pattern.match(input_str):
            return ValidationResult(
                valid=False,
                error=SecurityError(
                    code='PATTERN_MISMATCH',
                    message='Input does not match required pattern',
                    message_ar='المدخل لا يطابق النمط المطلوب',
                    severity=SecurityErrorSeverity.ERROR
                )
            )
        
        # Sanitize
        sanitized = self._sanitize_string(input_str)
        
        return ValidationResult(valid=True, sanitized=sanitized)
    
    def _validate_number(
        self,
        input_num: Union[int, float],
        min_value: Optional[float] = None,
        max_value: Optional[float] = None
    ) -> ValidationResult:
        """Validate number input"""
        if not isinstance(input_num, (int, float)) or not (isinstance(input_num, float) and input_num.is_integer() or isinstance(input_num, int)):
            if isinstance(input_num, float) and input_num.is_integer():
                input_num = int(input_num)
        
        if min_value is not None and input_num < min_value:
            return ValidationResult(
                valid=False,
                error=SecurityError(
                    code='MIN_VALUE',
                    message=f'Input must be at least {min_value}',
                    message_ar=f'يجب أن يكون المدخل {min_value} على الأقل',
                    severity=SecurityErrorSeverity.ERROR
                )
            )
        
        if max_value is not None and input_num > max_value:
            return ValidationResult(
                valid=False,
                error=SecurityError(
                    code='MAX_VALUE',
                    message=f'Input must be no more than {max_value}',
                    message_ar=f'يجب ألا يتجاوز المدخل {max_value}',
                    severity=SecurityErrorSeverity.ERROR
                )
            )
        
        return ValidationResult(valid=True, sanitized=input_num)
    
    def _validate_list(self, input_list: List[Any]) -> ValidationResult:
        """Validate list input"""
        sanitized = []
        errors = []
        
        for i, item in enumerate(input_list):
            result = self.validate_input(item, required=False)
            if result.valid:
                sanitized.append(result.sanitized)
            elif result.error:
                errors.append({
                    'index': i,
                    'error': result.error.dict()
                })
        
        if errors:
            return ValidationResult(
                valid=False,
                error=SecurityError(
                    code='ARRAY_VALIDATION_FAILED',
                    message='Array validation failed',
                    message_ar='فشل التحقق من المصفوفة',
                    severity=SecurityErrorSeverity.ERROR,
                    details={'errors': errors}
                )
            )
        
        return ValidationResult(valid=True, sanitized=sanitized)
    
    def _validate_dict(self, input_dict: Dict[str, Any]) -> ValidationResult:
        """Validate dictionary input"""
        sanitized = {}
        errors = []
        
        for key, value in input_dict.items():
            # Validate key
            key_result = self.validate_input(key, max_length=100)
            if not key_result.valid:
                errors.append({
                    'field': f'key:{key}',
                    'error': key_result.error.dict() if key_result.error else {}
                })
                continue
            
            # Validate value
            value_result = self.validate_input(value, required=False)
            if value_result.valid:
                sanitized[key_result.sanitized] = value_result.sanitized
            elif value_result.error:
                errors.append({
                    'field': key,
                    'error': value_result.error.dict()
                })
        
        if errors:
            return ValidationResult(
                valid=False,
                error=SecurityError(
                    code='OBJECT_VALIDATION_FAILED',
                    message='Object validation failed',
                    message_ar='فشل التحقق من الكائن',
                    severity=SecurityErrorSeverity.ERROR,
                    details={'errors': errors}
                )
            )
        
        return ValidationResult(valid=True, sanitized=sanitized)
    
    def _sanitize_string(self, input_str: str) -> str:
        """Sanitize string input"""
        # Remove dangerous characters
        sanitized = input_str
        sanitized = re.sub(r'[<>]', '', sanitized)  # Remove < and >
        sanitized = re.sub(r'javascript:', '', sanitized, flags=re.IGNORECASE)
        sanitized = re.sub(r'on\w+=', '', sanitized, flags=re.IGNORECASE)  # Remove event handlers
        sanitized = sanitized.strip()
        
        return sanitized
    
    def _log_security_event(
        self,
        event_type: SecurityEventType,
        error_code: str,
        details: Dict[str, Any]
    ):
        """Log security event"""
        event = SecurityEvent(
            event_type=event_type,
            timestamp=datetime.utcnow(),
            user_id=None,  # Will be set by caller if available
            ip_address=None,  # Will be set by caller if available
            user_agent=None,  # Will be set by caller if available
            details={
                'error_code': error_code,
                **details
            },
            severity='WARNING' if event_type == SecurityEventType.SUSPICIOUS_REQUEST else 'ERROR'
        )
        self.security_logger.log_event(event)
    
    def create_error_response(
        self,
        error: SecurityError,
        request: Optional[Request] = None,
        status_code: int = status.HTTP_400_BAD_REQUEST
    ) -> JSONResponse:
        """Create standardized error response with Arabic support"""
        # Detect language from request
        language = 'en'
        if request:
            accept_language = request.headers.get('Accept-Language', 'en')
            if 'ar' in accept_language.lower():
                language = 'ar'
        
        # Select message based on language
        message = error.message_ar if language == 'ar' else error.message
        
        response_data = {
            "error": {
                "code": error.code,
                "message": message,
                "message_ar": error.message_ar,
                "message_en": error.message,
                "severity": error.severity.value,
                "timestamp": datetime.utcnow().isoformat() + "Z",
            }
        }
        
        if error.field:
            response_data["error"]["field"] = error.field
        
        if error.details:
            response_data["error"]["details"] = error.details
        
        if request:
            response_data["error"]["path"] = str(request.url.path)
            response_data["error"]["method"] = request.method
        
        return JSONResponse(
            status_code=status_code,
            content=response_data
        )


# Global instance
_security_gateway_instance: Optional[SecurityGateway] = None


def get_security_gateway() -> SecurityGateway:
    """Get global SecurityGateway instance"""
    global _security_gateway_instance
    if _security_gateway_instance is None:
        _security_gateway_instance = SecurityGateway()
    return _security_gateway_instance

