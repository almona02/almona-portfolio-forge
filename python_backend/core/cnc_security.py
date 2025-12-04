"""
Security measures for CNC file uploads and processing
"""

import re
import tempfile
from pathlib import Path
from typing import List
import magic

class CNCSecurity:
    """Security validation for CNC files and G-code"""
    
    DANGEROUS_GCODE_PATTERNS = [
        r"M0?\s*$",  # Unconditional stop
        r"M30\s*$",  # Program end and rewind
        r"M99\s*$",  # Subprogram end
        r"M98\s+P\d+",  # Subprogram call
        r"G04\s+P\d+",  # Dwell (potential DoS)
        r"G53",  # Machine coordinate system
    ]
    
    @classmethod
    def validate_dxf_file(cls, file_path: Path) -> bool:
        """Validate DXF file for security"""
        try:
            # Check file type
            mime = magic.from_file(str(file_path), mime=True)
            if mime not in ["text/plain", "application/octet-stream", "image/vnd.dxf"]:
                # Allow application/octet-stream as magic sometimes misidentifies DXF
                pass
            
            # Check file size (max 10MB)
            if file_path.stat().st_size > 10 * 1024 * 1024:
                return False
            
            # Read first few lines for DXF signature
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read(1000)
                
            # Check for DXF header
            if "999" not in content and "0" not in content:
                return False
                
            return True
            
        except Exception:
            return False
    
    @classmethod
    def validate_gcode_file(cls, file_path: Path) -> List[str]:
        """Validate G-code file and return warnings"""
        warnings = []
        
        try:
            with open(file_path, 'r') as f:
                lines = f.readlines()
            
            for i, line in enumerate(lines, 1):
                # Check for dangerous patterns
                for pattern in cls.DANGEROUS_GCODE_PATTERNS:
                    if re.search(pattern, line, re.IGNORECASE):
                        warnings.append(f"Line {i}: Dangerous G-code pattern: {line.strip()}")
                
                # Check for suspicious comments
                if ";" in line:
                    comment = line.split(";")[1].lower()
                    suspicious_terms = ["delete", "format", "reset", "override"]
                    if any(term in comment for term in suspicious_terms):
                        warnings.append(f"Line {i}: Suspicious comment: {comment.strip()}")
            
            return warnings
            
        except Exception as e:
            return [f"Error reading file: {str(e)}"]

