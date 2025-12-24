"""
G-Code Generator Integration with YDT Agent
Connects Fabricator Pro G-code generator with YDT knowledge base
"""

import json
from pathlib import Path
from typing import Dict, List, Any, Optional
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class YDTGCodeEnhancer:
    """Enhances G-code generation with YDT knowledge"""
    
    def __init__(self, knowledge_base_path: Path):
        self.knowledge_base = knowledge_base_path
        self.machine_id = "aim-7510"
        self._load_machine_knowledge()
    
    def _load_machine_knowledge(self):
        """Load machine knowledge from YDT"""
        processed_dir = self.knowledge_base / "processed" / self.machine_id
        
        # Load specifications
        specs_file = processed_dir / "specifications_gold_tier.json"
        if specs_file.exists():
            with open(specs_file, 'r', encoding='utf-8') as f:
                self.specs = json.load(f)
        else:
            self.specs = {}
        
        # Load capabilities
        capabilities_file = processed_dir / "new_knowledge_nodes.json"
        if capabilities_file.exists():
            with open(capabilities_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                self.capabilities = data.get("summary", {})
        else:
            self.capabilities = {}
        
        logger.info("[G-CODE YDT] Machine knowledge loaded")
    
    def get_machine_specs_for_gcode(self) -> Dict[str, Any]:
        """Get machine specifications for G-code generation"""
        return {
            "max_length": 7500,  # mm
            "max_width": 500,    # mm
            "max_height": 250,   # mm
            "max_feed_rate": 6000,  # mm/min
            "max_spindle_speed": 24000,  # RPM
            "tool_magazine_capacity": 16,
            "supported_angles": [0, 15, 22.5, 30, 45, 60, 67.5, 75, 90, 105, 112.5, 120, 135, 150, 165, 180],
            "supported_operations": self.capabilities.get("operations", []),
            "precision": 0.05  # mm
        }
    
    def validate_gcode_parameters(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Validate G-code parameters against machine capabilities"""
        specs = self.get_machine_specs_for_gcode()
        violations = []
        suggestions = []
        
        # Check feed rate
        if params.get("feed_rate", 0) > specs["max_feed_rate"]:
            violations.append({
                "parameter": "feed_rate",
                "value": params["feed_rate"],
                "max_allowed": specs["max_feed_rate"],
                "message": f"Feed rate {params['feed_rate']} exceeds maximum {specs['max_feed_rate']} mm/min"
            })
            suggestions.append(f"Use feed rate ≤ {specs['max_feed_rate']} mm/min")
        
        # Check spindle speed
        if params.get("spindle_speed", 0) > specs["max_spindle_speed"]:
            violations.append({
                "parameter": "spindle_speed",
                "value": params["spindle_speed"],
                "max_allowed": specs["max_spindle_speed"],
                "message": f"Spindle speed {params['spindle_speed']} exceeds maximum {specs['max_spindle_speed']} RPM"
            })
            suggestions.append(f"Use spindle speed ≤ {specs['max_spindle_speed']} RPM")
        
        # Check length
        if params.get("length", 0) > specs["max_length"]:
            violations.append({
                "parameter": "length",
                "value": params["length"],
                "max_allowed": specs["max_length"],
                "message": f"Length {params['length']}mm exceeds maximum {specs['max_length']}mm"
            })
            suggestions.append(f"Reduce length to ≤ {specs['max_length']}mm or use multiple operations")
        
        # Check angle
        if "angle" in params:
            angle = params["angle"]
            if angle not in specs["supported_angles"]:
                violations.append({
                    "parameter": "angle",
                    "value": angle,
                    "supported": specs["supported_angles"],
                    "message": f"Angle {angle}° not supported. Supported angles: {specs['supported_angles']}"
                })
                # Find closest supported angle
                closest = min(specs["supported_angles"], key=lambda x: abs(x - angle))
                suggestions.append(f"Use closest supported angle: {closest}°")
        
        return {
            "valid": len(violations) == 0,
            "violations": violations,
            "suggestions": suggestions,
            "specs": specs
        }
    
    def suggest_optimal_parameters(self, operation: str, material: str = "aluminum") -> Dict[str, Any]:
        """Suggest optimal G-code parameters based on YDT knowledge"""
        # Default optimal parameters for AIM 7510
        suggestions = {
            "cutting": {
                "feed_rate": 3000,  # mm/min (safe, efficient)
                "spindle_speed": 12000,  # RPM (optimal for aluminum)
                "depth_of_cut": 0.5,  # mm
                "safety_clearance": 5  # mm
            },
            "drilling": {
                "feed_rate": 500,  # mm/min
                "spindle_speed": 8000,  # RPM
                "peck_depth": 2,  # mm
                "retract_height": 5  # mm
            },
            "milling": {
                "feed_rate": 2000,  # mm/min
                "spindle_speed": 15000,  # RPM
                "step_over": 0.5,  # mm
                "safety_clearance": 5  # mm
            },
            "tapping": {
                "feed_rate": 200,  # mm/min
                "spindle_speed": 1000,  # RPM
                "depth": 10,  # mm
                "retract_height": 5  # mm
            }
        }
        
        return suggestions.get(operation, {
            "feed_rate": 2000,
            "spindle_speed": 10000,
            "safety_clearance": 5
        })
    
    def explain_gcode_command(self, command: str) -> Dict[str, Any]:
        """Explain a G-code or M-code command"""
        gcode_explanations = {
            "G00": {
                "name": "Rapid Positioning",
                "description": "Move tool rapidly to specified position without cutting",
                "usage": "G00 X100 Y50 Z10",
                "example": "Move to position (100, 50, 10) at maximum speed"
            },
            "G01": {
                "name": "Linear Interpolation",
                "description": "Move tool in straight line at specified feed rate",
                "usage": "G01 X100 Y50 F3000",
                "example": "Cut to position (100, 50) at 3000 mm/min feed rate"
            },
            "G21": {
                "name": "Metric Units",
                "description": "Set coordinate system to metric (millimeters)",
                "usage": "G21",
                "example": "All coordinates will be in millimeters"
            },
            "G90": {
                "name": "Absolute Positioning",
                "description": "Use absolute coordinates (relative to machine zero)",
                "usage": "G90",
                "example": "X100 means 100mm from machine zero, not relative to current position"
            },
            "G81": {
                "name": "Drilling Cycle",
                "description": "Drill hole at specified position",
                "usage": "G81 X50 Y50 Z-10 R5 F500",
                "example": "Drill to depth -10mm at (50, 50), retract to 5mm above"
            },
            "M03": {
                "name": "Spindle On Clockwise",
                "description": "Start spindle rotation clockwise",
                "usage": "M03 S12000",
                "example": "Start spindle at 12000 RPM clockwise"
            },
            "M05": {
                "name": "Spindle Stop",
                "description": "Stop spindle rotation",
                "usage": "M05",
                "example": "Stop the spindle"
            },
            "M06": {
                "name": "Tool Change",
                "description": "Change to specified tool",
                "usage": "T1 M06",
                "example": "Change to tool number 1"
            },
            "M30": {
                "name": "Program End",
                "description": "End program and rewind",
                "usage": "M30",
                "example": "End program and return to start"
            }
        }
        
        return gcode_explanations.get(command.upper(), {
            "name": "Unknown Command",
            "description": "Command not found in knowledge base",
            "usage": "Check manual for usage",
            "example": "Refer to AIM 7510 manual"
        })


class GCodeYDTValidator:
    """Validates G-code against YDT knowledge"""
    
    def __init__(self, enhancer: YDTGCodeEnhancer):
        self.enhancer = enhancer
    
    def validate_gcode_program(self, gcode: str) -> Dict[str, Any]:
        """Validate complete G-code program"""
        lines = gcode.split('\n')
        violations = []
        warnings = []
        
        for i, line in enumerate(lines, 1):
            line = line.strip()
            if not line or line.startswith('('):  # Comment or empty
                continue
            
            # Check for unsupported commands
            if line.startswith('G') or line.startswith('M'):
                command = line.split()[0] if line.split() else ""
                # Basic validation - could be enhanced
                if command and not self._is_command_supported(command):
                    warnings.append({
                        "line": i,
                        "command": command,
                        "message": f"Command {command} may not be supported. Verify in manual."
                    })
        
        return {
            "valid": len(violations) == 0,
            "violations": violations,
            "warnings": warnings,
            "suggestions": self._generate_suggestions(gcode)
        }
    
    def _is_command_supported(self, command: str) -> bool:
        """Check if command is supported (basic check)"""
        supported = ['G00', 'G01', 'G02', 'G03', 'G17', 'G21', 'G90', 'G91', 
                     'G81', 'G82', 'G83', 'M03', 'M05', 'M06', 'M30']
        return command.upper() in supported
    
    def _generate_suggestions(self, gcode: str) -> List[str]:
        """Generate optimization suggestions"""
        suggestions = []
        
        # Check for safety clearance
        if 'G00' in gcode and 'Z' in gcode:
            suggestions.append("Ensure Z-axis safety clearance (5mm minimum) before cutting")
        
        # Check for tool changes
        if 'M06' not in gcode and 'T' in gcode:
            suggestions.append("Use M06 after T command for proper tool change")
        
        # Check for feed rates
        if 'G01' in gcode and 'F' not in gcode:
            suggestions.append("Specify feed rate (F) for G01 commands")
        
        return suggestions

