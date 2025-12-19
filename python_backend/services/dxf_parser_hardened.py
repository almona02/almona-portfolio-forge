"""
Hardened DXF Parser for Production Use

Week 3 Task 3.1: ProductionDXFParser Implementation

Features:
- 0.01mm tolerance validation
- Circuit breaker for malformed files
- Geometry sanitization and validation
- Arabic error messages
- Accuracy tracking integration
"""

import io
import logging
from typing import Dict, Any, Optional, List, Tuple
from dataclasses import dataclass
from enum import Enum
import numpy as np
import ezdxf
from ezdxf.math import Vec2
from ezdxf.path import make_path

from core.cad_ingest import CadProfileIngestor, CadProfileMetrics
from services.security_gateway import get_security_gateway, SecurityGateway
from core.security_logger import SecurityLogger, SecurityEvent, SecurityEventType

logger = logging.getLogger(__name__)


class ParserErrorType(str, Enum):
    """Types of parser errors"""
    TOLERANCE_EXCEEDED = "tolerance_exceeded"
    MALFORMED_FILE = "malformed_file"
    EMPTY_FILE = "empty_file"
    INVALID_GEOMETRY = "invalid_geometry"
    CIRCUIT_BREAKER_TRIGGERED = "circuit_breaker_triggered"
    ACCURACY_BELOW_THRESHOLD = "accuracy_below_threshold"


@dataclass
class ParsedGeometry:
    """Parsed geometry with validation metadata"""
    polygons: List[np.ndarray]
    metrics: CadProfileMetrics
    accuracy: float
    tolerance_validated: bool
    warnings: List[str]
    errors: List[str]


@dataclass
class CircuitBreakerState:
    """Circuit breaker state for malformed files"""
    failure_count: int = 0
    last_failure_time: Optional[float] = None
    is_open: bool = False
    threshold: int = 5  # Open after 5 failures
    timeout: float = 60.0  # Reset after 60 seconds


class ProductionDXFParser:
    """
    Hardened DXF parser with production-grade validation and error handling.
    
    Features:
    - 0.01mm tolerance validation
    - Circuit breaker for malformed files
    - Geometry sanitization
    - Arabic error messages
    - Accuracy tracking
    """
    
    TOLERANCE_MM = 0.01  # 0.01mm tolerance for 99.5-99.8% accuracy
    MIN_ACCURACY_THRESHOLD = 99.5  # Minimum accuracy percentage
    MAX_FILE_SIZE_MB = 10  # Maximum file size in MB
    
    # Error messages (English/Arabic)
    ERROR_MESSAGES = {
        ParserErrorType.TOLERANCE_EXCEEDED: {
            'en': 'Geometry tolerance exceeded 0.01mm',
            'ar': 'تجاوز التسامح الهندسي 0.01 مم'
        },
        ParserErrorType.MALFORMED_FILE: {
            'en': 'Malformed DXF file detected',
            'ar': 'تم اكتشاف ملف DXF تالف'
        },
        ParserErrorType.EMPTY_FILE: {
            'en': 'DXF file is empty or contains no geometry',
            'ar': 'ملف DXF فارغ أو لا يحتوي على هندسة'
        },
        ParserErrorType.INVALID_GEOMETRY: {
            'en': 'Invalid geometry detected in DXF file',
            'ar': 'تم اكتشاف هندسة غير صالحة في ملف DXF'
        },
        ParserErrorType.CIRCUIT_BREAKER_TRIGGERED: {
            'en': 'Circuit breaker triggered - too many malformed files',
            'ar': 'تم تفعيل قاطع الدائرة - عدد كبير من الملفات التالفة'
        },
        ParserErrorType.ACCURACY_BELOW_THRESHOLD: {
            'en': f'Accuracy below {MIN_ACCURACY_THRESHOLD}% threshold',
            'ar': f'الدقة أقل من عتبة {MIN_ACCURACY_THRESHOLD}%'
        },
    }
    
    def __init__(self, material_type: str = 'aluminium'):
        """
        Initialize parser with material type.
        
        Args:
            material_type: 'aluminium' or 'upvc' - affects density calculations
        """
        self.material_type = material_type.lower()
        if self.material_type not in ['aluminium', 'upvc']:
            self.material_type = 'aluminium'  # Default to aluminium
        
        self.ingestor = CadProfileIngestor(material_type=self.material_type)
        self.security_gateway: SecurityGateway = get_security_gateway()
        self.security_logger = SecurityLogger()
        self.circuit_breaker = CircuitBreakerState()
    
    def parse_with_validation(
        self,
        file_bytes: bytes,
        filename: Optional[str] = None,
        language: str = 'en',
        material_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Parse DXF file with comprehensive validation.
        
        Args:
            file_bytes: DXF file content as bytes
            filename: Optional filename for error messages
            language: Language for error messages ('en' or 'ar')
            material_type: Override material type ('aluminium' or 'upvc')
        
        Returns:
            Dictionary with parsing results and validation data
        """
        try:
            # Use provided material type or default
            if material_type:
                material = material_type.lower()
                if material in ['aluminium', 'upvc']:
                    # Create new ingestor with specified material type
                    ingestor = CadProfileIngestor(material_type=material)
                else:
                    ingestor = self.ingestor
            else:
                ingestor = self.ingestor
            
            # Check circuit breaker
            if self.circuit_breaker.is_open:
                return self._create_error_response(
                    ParserErrorType.CIRCUIT_BREAKER_TRIGGERED,
                    language,
                    filename
                )
            
            # Validate file size
            file_size_mb = len(file_bytes) / (1024 * 1024)
            if file_size_mb > self.MAX_FILE_SIZE_MB:
                return self._create_error_response(
                    ParserErrorType.MALFORMED_FILE,
                    language,
                    filename,
                    details={'file_size_mb': file_size_mb, 'max_size_mb': self.MAX_FILE_SIZE_MB}
                )
            
            # Parse with ingestor (using correct material type)
            result = ingestor.process_dxf(file_bytes)
            
            if result.get('status') == 'error':
                self._record_failure()
                return self._create_error_response(
                    ParserErrorType.MALFORMED_FILE,
                    language,
                    filename,
                    details={'error': result.get('error', 'Unknown error')}
                )
            
            # Extract geometry and validate tolerance
            geometry = self._extract_geometry(file_bytes)
            if not geometry:
                self._record_failure()
                return self._create_error_response(
                    ParserErrorType.EMPTY_FILE,
                    language,
                    filename
                )
            
            # Validate tolerance
            tolerance_result = self._validate_tolerance(geometry)
            if not tolerance_result['valid']:
                self._record_failure()
                return self._create_error_response(
                    ParserErrorType.TOLERANCE_EXCEEDED,
                    language,
                    filename,
                    details=tolerance_result
                )
            
            # Calculate accuracy
            accuracy = self._calculate_accuracy(geometry, result)
            if accuracy < self.MIN_ACCURACY_THRESHOLD:
                self._record_failure()
                return self._create_error_response(
                    ParserErrorType.ACCURACY_BELOW_THRESHOLD,
                    language,
                    filename,
                    details={'accuracy': accuracy, 'threshold': self.MIN_ACCURACY_THRESHOLD}
                )
            
            # Reset circuit breaker on success
            self._reset_circuit_breaker()
            
            # Track accuracy checkpoint
            self._track_accuracy_checkpoint(accuracy, filename)
            
            return {
                'status': 'success',
                'accuracy': accuracy,
                'tolerance_validated': True,
                'geometry': {
                    'polygon_count': len(geometry.polygons),
                    'vertex_count': sum(len(p) for p in geometry.polygons),
                },
                'metrics': result.get('profile_metrics', {}),
                'warnings': geometry.warnings,
                'egyptian_standard_compliant': result.get('egyptian_standard_compliant', False),
                'material_type': self.material_type,
            }
            
        except ezdxf.DXFStructureError as e:
            self._record_failure()
            logger.error(f"DXF structure error: {e}", exc_info=True)
            return self._create_error_response(
                ParserErrorType.MALFORMED_FILE,
                language,
                filename,
                details={'error': str(e)}
            )
        except Exception as e:
            self._record_failure()
            logger.error(f"Unexpected error parsing DXF: {e}", exc_info=True)
            return self._create_error_response(
                ParserErrorType.MALFORMED_FILE,
                language,
                filename,
                details={'error': str(e)}
            )
    
    def _extract_geometry(self, file_bytes: bytes) -> Optional[ParsedGeometry]:
        """Extract and validate geometry from DXF file"""
        try:
            buffer = io.BytesIO(file_bytes)
            text_stream = io.TextIOWrapper(buffer, encoding='utf-8', errors='ignore')
            doc = ezdxf.read(text_stream)
            msp = doc.modelspace()
            
            polygons = []
            warnings = []
            errors = []
            
            # Extract closed polylines
            for entity in msp.query('LWPOLYLINE POLYLINE'):
                try:
                    if entity.is_closed:
                        p = make_path(entity)
                        verts = list(p.flattening(distance=self.TOLERANCE_MM))
                        if len(verts) > 2:
                            polygons.append(np.array(verts))
                except Exception as e:
                    warnings.append(f"Failed to process polyline: {e}")
                    continue
            
            if not polygons:
                errors.append("No closed geometry found")
                return None
            
            # Calculate metrics
            total_area = sum(self._calculate_area(p) for p in polygons)
            total_perimeter = sum(self._calculate_perimeter(p) for p in polygons)
            
            all_points = np.vstack(polygons) if polygons else np.array([])
            if len(all_points) == 0:
                return None
            
            min_x, min_y = np.min(all_points, axis=0)
            max_x, max_y = np.max(all_points, axis=0)
            
            metrics = CadProfileMetrics(
                area_mm2=float(total_area),
                perimeter_mm=float(total_perimeter),
                weight_kg_per_m=0.0,  # Will be calculated by ingestor
                is_thermal_break=len(polygons) > 1,
                bounding_box=(float(min_x), float(min_y), float(max_x), float(max_y)),
                vertex_count=sum(len(p) for p in polygons),
                is_closed=True,
            )
            
            return ParsedGeometry(
                polygons=polygons,
                metrics=metrics,
                accuracy=100.0,  # Will be calculated later
                tolerance_validated=False,  # Will be validated
                warnings=warnings,
                errors=errors,
            )
            
        except Exception as e:
            logger.error(f"Error extracting geometry: {e}", exc_info=True)
            return None
    
    def _validate_tolerance(self, geometry: ParsedGeometry) -> Dict[str, Any]:
        """Validate geometry tolerance (0.01mm)"""
        tolerance_violations = []
        
        for i, polygon in enumerate(geometry.polygons):
            # Check polygon closure (start and end points should be close)
            if len(polygon) > 2:
                start = polygon[0]
                end = polygon[-1]
                distance = np.linalg.norm(start - end)
                
                if distance > self.TOLERANCE_MM:
                    tolerance_violations.append({
                        'polygon_index': i,
                        'closure_distance_mm': float(distance),
                        'tolerance_mm': self.TOLERANCE_MM,
                    })
            
            # Check for degenerate segments (too short)
            for j in range(len(polygon)):
                next_j = (j + 1) % len(polygon)
                segment_length = np.linalg.norm(polygon[next_j] - polygon[j])
                
                if segment_length < 0.001:  # 1 micron minimum
                    tolerance_violations.append({
                        'polygon_index': i,
                        'segment_index': j,
                        'segment_length_mm': float(segment_length),
                        'issue': 'degenerate_segment',
                    })
        
        return {
            'valid': len(tolerance_violations) == 0,
            'violations': tolerance_violations,
        }
    
    def _calculate_accuracy(
        self,
        geometry: ParsedGeometry,
        ingestor_result: Dict[str, Any]
    ) -> float:
        """Calculate accuracy score based on validation results"""
        base_accuracy = ingestor_result.get('accuracy_score', 100.0)
        
        # Reduce accuracy for warnings
        warning_penalty = len(geometry.warnings) * 0.1
        error_penalty = len(geometry.errors) * 1.0
        
        accuracy = max(0.0, base_accuracy - warning_penalty - error_penalty)
        
        return round(accuracy, 2)
    
    def _calculate_area(self, points: np.ndarray) -> float:
        """Calculate polygon area using Shoelace formula"""
        if len(points) < 3:
            return 0.0
        x, y = points[:, 0], points[:, 1]
        return 0.5 * abs(np.dot(x, np.roll(y, 1)) - np.dot(y, np.roll(x, 1)))
    
    def _calculate_perimeter(self, points: np.ndarray) -> float:
        """Calculate polygon perimeter"""
        if len(points) < 2:
            return 0.0
        return float(np.sum(np.sqrt(np.sum(np.diff(
            np.vstack([points, points[0:1]]), axis=0
        )**2, axis=1))))
    
    def _create_error_response(
        self,
        error_type: ParserErrorType,
        language: str,
        filename: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Create standardized error response with Arabic support"""
        messages = self.ERROR_MESSAGES.get(error_type, {
            'en': 'Unknown error',
            'ar': 'خطأ غير معروف'
        })
        
        message = messages.get(language, messages['en'])
        
        response = {
            'status': 'error',
            'error_type': error_type.value,
            'message': message,
            'message_ar': messages.get('ar', message),
            'message_en': messages.get('en', message),
            'accuracy': 0.0,
            'tolerance_validated': False,
        }
        
        if filename:
            response['filename'] = filename
        
        if details:
            response['details'] = details
        
        # Log security event
        self._log_parser_error(error_type, filename, details)
        
        return response
    
    def _record_failure(self):
        """Record a parsing failure for circuit breaker"""
        import time
        self.circuit_breaker.failure_count += 1
        self.circuit_breaker.last_failure_time = time.time()
        
        if self.circuit_breaker.failure_count >= self.circuit_breaker.threshold:
            self.circuit_breaker.is_open = True
            logger.warning(
                f"Circuit breaker opened after {self.circuit_breaker.failure_count} failures"
            )
    
    def _reset_circuit_breaker(self):
        """Reset circuit breaker on successful parse"""
        import time
        current_time = time.time()
        
        # Reset if timeout has passed
        if (self.circuit_breaker.last_failure_time and
            current_time - self.circuit_breaker.last_failure_time > self.circuit_breaker.timeout):
            self.circuit_breaker.failure_count = 0
            self.circuit_breaker.is_open = False
            self.circuit_breaker.last_failure_time = None
    
    def _track_accuracy_checkpoint(self, accuracy: float, filename: Optional[str]):
        """Track accuracy checkpoint for monitoring"""
        # This would integrate with AccuracyTracker from Week 2
        # For now, just log
        logger.info(f"DXF parsing accuracy: {accuracy}% for file: {filename}")
    
    def _log_parser_error(
        self,
        error_type: ParserErrorType,
        filename: Optional[str],
        details: Optional[Dict[str, Any]]
    ):
        """Log parser error as security event"""
        event = SecurityEvent(
            event_type=SecurityEventType.SUSPICIOUS_REQUEST,
            timestamp=__import__('datetime').datetime.utcnow(),
            user_id=None,
            ip_address=None,
            user_agent=None,
            details={
                'parser_error': error_type.value,
                'filename': filename,
                'details': details or {},
            },
            severity='WARNING'
        )
        self.security_logger.log_event(event)


# Global instance
_parser_instance: Optional[ProductionDXFParser] = None


def get_production_dxf_parser(material_type: str = 'aluminium') -> ProductionDXFParser:
    """
    Get ProductionDXFParser instance for specified material type.
    
    Args:
        material_type: 'aluminium' or 'upvc'
    
    Returns:
        ProductionDXFParser instance configured for material type
    """
    # Create new instance for each material type to ensure correct density
    return ProductionDXFParser(material_type=material_type)

