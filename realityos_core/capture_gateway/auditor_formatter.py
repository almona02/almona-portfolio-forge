"""
Auditor-Friendly Output Formatter
Formats validation results for auditor consumption with neutral, legally-safe language.
"""

import json
from typing import Dict, Any
from realityos_core.capture_gateway.types import CaptureValidationResult


class AuditorOutputFormatter:
    """
    Formats validation results for auditor consumption.
    
    Uses neutral, legally-safe language.
    """
    
    @staticmethod
    def format_validation_result(result: CaptureValidationResult) -> str:
        """
        Format validation result for audit logs.
        
        Args:
            result: CaptureValidationResult to format
            
        Returns:
            Formatted string for audit logs
        """
        lines = [
            f"VALIDATION RESULT: {'PASS' if result.overall_passed else 'FAIL'}",
            f"Confidence Score: {result.confidence:.2f}",
            f"Proof Hash: {result.proof_hash or 'N/A'}",
        ]
        
        if result.errors:
            lines.append("\nERRORS:")
            for error in result.errors:
                lines.append(f"  [{error.severity}] {error.validator}.{error.field}: {error.message}")
                if error.evidence:
                    lines.append(f"    Evidence: {json.dumps(error.evidence, indent=2)}")
        
        if result.warnings:
            lines.append("\nWARNINGS:")
            for warning in result.warnings:
                lines.append(f"  [{warning.severity}] {warning.validator}.{warning.field}: {warning.message}")
        
        # Always include absence explanation
        if not result.overall_passed and not result.errors:
            lines.append("\nABSENCE EXPLANATION:")
            lines.append("  No events recorded because: No human verification occurred")
            lines.append("  System does not infer truth")
        
        return "\n".join(lines)
    
    @staticmethod
    def format_absence_explanation(
        start_time: str,
        end_time: str,
        entity_id: str
    ) -> str:
        """
        Format absence explanation for auditor queries.
        
        Args:
            start_time: Start of absence period (ISO 8601)
            end_time: End of absence period (ISO 8601)
            entity_id: Entity with no events
            
        Returns:
            Formatted absence explanation
        """
        return f"""ABSENCE EXPLANATION
Period: {start_time} to {end_time}
Entity: {entity_id}
Reason: No human verification occurred
System does not infer truth"""

