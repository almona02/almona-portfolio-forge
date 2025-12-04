"""
G-Code Generator for CNC Machines with Multi-Brand Support
==========================================================

Generates industry-standard G-code for aluminum profile cutting machines
with security validation and machine-specific post-processors.

Supported Brands:
- Yilmaz (Primary)
- Elumatec (SBZ series)
- FOMM Ultra
- Emmegi Quasar
- Biesse
- Custom/Generic

Features:
- Machine-specific post-processors
- Security validation (integrates with CNCSecurity)
- Estimated machine time calculation
- Toolpath optimization
- Collision detection integration
"""

import logging
import math
from typing import List, Dict, Any, Optional, Tuple
from enum import Enum
from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

logger = logging.getLogger(__name__)


class MachineBrand(Enum):
    """Supported CNC machine brands."""
    YILMAZ = "yilmaz"
    ELUMATEC = "elumatec"
    FOMM = "fomm"
    EMMEGI = "emmegi"
    BIESSE = "biesse"
    CUSTOM = "custom"


class CutType(Enum):
    """Types of cutting operations."""
    MITER_90 = "miter_90"
    MITER_45 = "miter_45"
    MITER_CUSTOM = "miter_custom"
    V_CUT = "v_cut"
    DRILL = "drill"
    MILL = "mill"
    NOTCH = "notch"
    SLOT = "slot"
    POCKET = "pocket"


class GCodeDialect(Enum):
    """G-code dialect variations."""
    FANUC = "fanuc"
    HAAS = "haas"
    SIEMENS = "siemens"
    HEIDENHAIN = "heidenhain"
    CUSTOM = "custom"


@dataclass
class Tool:
    """CNC tool definition."""
    id: str
    number: int  # Tool number in magazine
    diameter: float  # mm
    type: str  # "end_mill", "drill", "saw", "router"
    max_rpm: int
    max_feed: float  # mm/min
    flutes: int = 2
    length: float = 50.0  # mm
    description: str = ""

    def validate(self) -> List[str]:
        """Validate tool parameters."""
        errors = []
        if self.diameter <= 0:
            errors.append(f"Tool {self.id}: diameter must be positive")
        if self.max_rpm <= 0:
            errors.append(f"Tool {self.id}: max_rpm must be positive")
        if self.max_feed <= 0:
            errors.append(f"Tool {self.id}: max_feed must be positive")
        return errors


@dataclass
class CutOperation:
    """Represents a single cutting operation."""
    id: str
    cut_type: CutType
    x: float  # mm - start position
    y: float  # mm
    z: float  # mm - depth of cut
    length: float  # mm - cut length
    angle: float = 90.0  # degrees
    tool_diameter: float = 3.175  # mm
    feed_rate: float = 1000.0  # mm/min
    spindle_speed: int = 12000  # RPM
    coolant: bool = False
    peck_drilling: bool = False
    peck_depth: float = 5.0  # mm per peck
    retract_height: float = 2.0  # mm above surface
    label: str = ""

    def validate(self) -> List[str]:
        """Validate operation parameters."""
        errors = []
        if self.length < 0:
            errors.append(
                f"Operation {self.id}: length cannot be negative"
            )
        if self.feed_rate <= 0:
            errors.append(
                f"Operation {self.id}: feed_rate must be positive"
            )
        if self.spindle_speed <= 0:
            errors.append(
                f"Operation {self.id}: spindle_speed must be positive"
            )
        return errors


@dataclass
class MachineProfile:
    """Machine configuration profile."""
    brand: MachineBrand
    model: str
    max_x: float = 6500.0  # mm
    max_y: float = 1200.0  # mm
    max_z: float = 300.0  # mm
    max_spindle_speed: int = 24000
    max_feed_rate: float = 15000.0
    rapid_feed_rate: float = 30000.0
    safety_height: float = 50.0  # mm
    work_offset: str = "G54"
    gcode_dialect: GCodeDialect = GCodeDialect.FANUC
    tool_change_command: str = "M06"
    coolant_on: str = "M08"
    coolant_off: str = "M09"
    spindle_cw: str = "M03"
    spindle_ccw: str = "M04"
    spindle_stop: str = "M05"
    program_end: str = "M30"

    @classmethod
    def get_preset(cls, brand: MachineBrand) -> 'MachineProfile':
        """Get preset profile for a brand."""
        presets = {
            MachineBrand.YILMAZ: cls(
                brand=MachineBrand.YILMAZ,
                model="CNC-101",
                max_x=6500.0,
                max_y=1200.0,
                max_z=300.0,
                max_spindle_speed=18000,
                max_feed_rate=15000.0,
                gcode_dialect=GCodeDialect.FANUC
            ),
            MachineBrand.ELUMATEC: cls(
                brand=MachineBrand.ELUMATEC,
                model="SBZ 151",
                max_x=7000.0,
                max_y=1500.0,
                max_z=350.0,
                max_spindle_speed=24000,
                max_feed_rate=20000.0,
                gcode_dialect=GCodeDialect.SIEMENS,
                safety_height=100.0
            ),
            MachineBrand.FOMM: cls(
                brand=MachineBrand.FOMM,
                model="Ultra",
                max_x=6000.0,
                max_y=1000.0,
                max_z=250.0,
                max_spindle_speed=18000,
                max_feed_rate=12000.0,
                gcode_dialect=GCodeDialect.FANUC
            ),
            MachineBrand.EMMEGI: cls(
                brand=MachineBrand.EMMEGI,
                model="Quasar",
                max_x=6500.0,
                max_y=1200.0,
                max_z=300.0,
                max_spindle_speed=21000,
                max_feed_rate=18000.0,
                gcode_dialect=GCodeDialect.FANUC
            ),
            MachineBrand.BIESSE: cls(
                brand=MachineBrand.BIESSE,
                model="Rover",
                max_x=7000.0,
                max_y=1400.0,
                max_z=350.0,
                max_spindle_speed=24000,
                max_feed_rate=25000.0,
                gcode_dialect=GCodeDialect.HEIDENHAIN
            ),
        }
        return presets.get(brand, cls(
            brand=MachineBrand.CUSTOM,
            model="Generic",
            gcode_dialect=GCodeDialect.FANUC
        ))


@dataclass
class GCodeResult:
    """Result of G-code generation."""
    gcode: str
    metadata: Dict[str, Any]
    warnings: List[str] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)

    @property
    def is_valid(self) -> bool:
        """Check if generation was successful."""
        return len(self.errors) == 0


class GCodeGenerator:
    """
    Generate G-code for different CNC machines.

    Provides machine-specific post-processing and security validation.
    """

    def __init__(
        self,
        machine_profile: Optional[MachineProfile] = None,
        machine_brand: MachineBrand = MachineBrand.YILMAZ
    ):
        """
        Initialize the G-code generator.

        Args:
            machine_profile: Custom machine profile (optional)
            machine_brand: Machine brand for preset profile
        """
        self.profile = (
            machine_profile or MachineProfile.get_preset(machine_brand)
        )
        self.precision = 3  # Decimal places for coordinates
        self._warnings: List[str] = []
        self._errors: List[str] = []

    def generate_from_cut_plan(
        self,
        cut_plan: List[CutOperation],
        material_thickness: float,
        stock_dimensions: Tuple[float, float, float],
        tool: Tool,
        job_name: str = "FABRICATOR_JOB",
        operator: str = "System"
    ) -> GCodeResult:
        """
        Generate complete G-code from cut plan.

        Args:
            cut_plan: List of cut operations
            material_thickness: Material thickness in mm
            stock_dimensions: (width, height, length) in mm
            tool: Tool to use for cutting
            job_name: Name for the job/program
            operator: Operator name for header

        Returns:
            GCodeResult with G-code string and metadata
        """
        self._warnings = []
        self._errors = []

        logger.info(
            f"Generating G-code for {self.profile.brand.value} "
            f"{self.profile.model}: {len(cut_plan)} operations"
        )

        # Validate inputs
        self._validate_inputs(cut_plan, tool, stock_dimensions)

        if self._errors:
            return GCodeResult(
                gcode="",
                metadata={},
                warnings=self._warnings,
                errors=self._errors
            )

        # Build G-code
        gcode_lines = []

        # Header
        gcode_lines.extend(self._generate_header(job_name, operator))

        # Safety initialization
        gcode_lines.extend(self._generate_safety_init())

        # Tool change
        gcode_lines.extend(self._generate_tool_change(tool))

        # Work offset
        gcode_lines.extend(self._generate_work_offset())

        # Start spindle
        gcode_lines.extend(self._start_spindle(tool))

        # Execute operations
        for idx, operation in enumerate(cut_plan):
            gcode_lines.append("")
            op_label = operation.label or operation.id
            gcode_lines.append(
                f"(Operation {idx + 1}: {operation.cut_type.value} - "
                f"{op_label})"
            )

            # Move to safe height
            gcode_lines.append(
                f"G00 Z{self._fmt(self.profile.safety_height)}"
            )

            # Rapid to position
            gcode_lines.append(
                f"G00 X{self._fmt(operation.x)} Y{self._fmt(operation.y)}"
            )

            # Execute cut based on type
            op_gcode = self._generate_operation(
                operation, tool, material_thickness
            )
            gcode_lines.extend(op_gcode)

            # Coolant control
            if operation.coolant:
                # Turn off at end of operation
                gcode_lines.append(self.profile.coolant_off)

        # Cleanup and end
        gcode_lines.extend(self._generate_cleanup())

        gcode = "\n".join(gcode_lines)

        # Run security validation
        security_warnings = self._validate_gcode_security(gcode)
        self._warnings.extend(security_warnings)

        # Calculate metadata
        estimated_time = self._estimate_machine_time(cut_plan, tool)

        metadata = {
            "machine_brand": self.profile.brand.value,
            "machine_model": self.profile.model,
            "total_operations": len(cut_plan),
            "estimated_time_minutes": round(estimated_time, 2),
            "tool_used": tool.id,
            "tool_number": tool.number,
            "material_thickness_mm": material_thickness,
            "stock_dimensions_mm": list(stock_dimensions),
            "gcode_line_count": len(gcode_lines),
            "generated_at": datetime.utcnow().isoformat(),
            "job_name": job_name,
            "operator": operator
        }

        logger.info(f"Generated {len(gcode_lines)} lines of G-code")

        return GCodeResult(
            gcode=gcode,
            metadata=metadata,
            warnings=self._warnings,
            errors=self._errors
        )
    
    def _validate_inputs(
        self,
        operations: List[CutOperation],
        tool: Tool,
        stock_dims: Tuple[float, float, float]
    ):
        """Validate all inputs before generation."""
        # Validate tool
        tool_errors = tool.validate()
        self._errors.extend(tool_errors)
        
        # Validate operations
        for op in operations:
            op_errors = op.validate()
            self._errors.extend(op_errors)
            
            # Check machine limits
            if op.x > self.profile.max_x:
                self._warnings.append(
                    f"Operation {op.id}: X={op.x} exceeds machine limit "
                    f"{self.profile.max_x}"
                )
            if op.y > self.profile.max_y:
                self._warnings.append(
                    f"Operation {op.id}: Y={op.y} exceeds machine limit "
                    f"{self.profile.max_y}"
                )
            if op.z > self.profile.max_z:
                self._warnings.append(
                    f"Operation {op.id}: Z={op.z} exceeds machine limit "
                    f"{self.profile.max_z}"
                )

            # Check spindle speed
            if op.spindle_speed > self.profile.max_spindle_speed:
                self._warnings.append(
                    f"Operation {op.id}: Spindle speed {op.spindle_speed} "
                    f"exceeds max {self.profile.max_spindle_speed}"
                )

            # Check feed rate
            if op.feed_rate > self.profile.max_feed_rate:
                self._warnings.append(
                    f"Operation {op.id}: Feed rate {op.feed_rate} exceeds "
                    f"max {self.profile.max_feed_rate}"
                )
    
    def _generate_header(self, job_name: str, operator: str) -> List[str]:
        """Generate G-code header with program info."""
        header = [
            "%",  # Program start (tape format)
            f"O{abs(hash(job_name)) % 10000:04d} ({job_name})",
            "(Generated by Fabricator Pro)",
            f"(Machine: {self.profile.brand.value.upper()} "
            f"{self.profile.model})",
            f"(Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} "
            f"UTC)",
            f"(Operator: {operator})",
            "",
        ]

        # Machine-specific headers
        if self.profile.brand == MachineBrand.ELUMATEC:
            header.insert(1, "(ELUMATEC SBZ PROGRAM)")
        elif self.profile.brand == MachineBrand.BIESSE:
            header.insert(1, "(BIESSE ROVER PROGRAM)")

        return header
    
    def _generate_safety_init(self) -> List[str]:
        """Generate safety initialization commands."""
        init = [
            "(Safety Initialization)",
        ]
        
        if self.profile.gcode_dialect == GCodeDialect.SIEMENS:
            init.extend([
                "G71",      # Metric
                "G90",      # Absolute positioning
                "G94",      # Feed per minute
                "G40",      # Cutter compensation cancel
                "G17",      # XY plane
            ])
        elif self.profile.gcode_dialect == GCodeDialect.HEIDENHAIN:
            init.extend([
                "BEGIN PGM FABRICATOR MM",
                "BLK FORM 0.1 Z X+0 Y+0 Z-100",
                "BLK FORM 0.2 X+300 Y+100 Z+0",
            ])
        else:  # FANUC / HAAS / Default
            init.extend([
                "G21",      # Millimeters
                "G90",      # Absolute positioning
                "G40",      # Cutter compensation cancel
                "G49",      # Tool length compensation cancel
                "G80",      # Cancel canned cycles
                "G17",      # XY plane selection
            ])
        
        init.append("")
        return init
    
    def _generate_tool_change(self, tool: Tool) -> List[str]:
        """Generate tool change commands."""
        return [
            f"(Tool Change: {tool.description or tool.type})",
            f"T{tool.number:02d} {self.profile.tool_change_command}",
            f"G43 H{tool.number:02d} (Tool length compensation)",
            ""
        ]
    
    def _generate_work_offset(self) -> List[str]:
        """Generate work coordinate offset commands."""
        return [
            "(Work Offset)",
            self.profile.work_offset,
            "",
        ]
    
    def _start_spindle(self, tool: Tool) -> List[str]:
        """Generate spindle start commands."""
        max_rpm = min(tool.max_rpm, self.profile.max_spindle_speed)
        return [
            "(Start Spindle)",
            f"S{max_rpm} {self.profile.spindle_cw}",
            "G04 P1.0 (Dwell for spindle ramp-up)",
            ""
        ]
    
    def _generate_operation(
        self,
        operation: CutOperation,
        tool: Tool,
        material_thickness: float
    ) -> List[str]:
        """Generate G-code for a single operation."""
        
        # Turn on coolant if needed
        commands = []
        if operation.coolant:
            commands.append(self.profile.coolant_on)
        
        if operation.cut_type == CutType.MITER_90:
            commands.extend(self._miter_90_cut(operation, tool, material_thickness))
        elif operation.cut_type == CutType.MITER_45:
            commands.extend(self._miter_45_cut(operation, tool, material_thickness))
        elif operation.cut_type == CutType.MITER_CUSTOM:
            commands.extend(self._miter_custom_cut(operation, tool, material_thickness))
        elif operation.cut_type == CutType.DRILL:
            commands.extend(self._drill_operation(operation, tool))
        elif operation.cut_type == CutType.MILL:
            commands.extend(self._mill_operation(operation, tool, material_thickness))
        elif operation.cut_type == CutType.SLOT:
            commands.extend(self._slot_operation(operation, tool, material_thickness))
        elif operation.cut_type == CutType.POCKET:
            commands.extend(self._pocket_operation(operation, tool, material_thickness))
        elif operation.cut_type == CutType.NOTCH:
            commands.extend(self._notch_operation(operation, tool, material_thickness))
        else:
            op_type = operation.cut_type.value
            commands.append(f"(Unsupported operation type: {op_type})")
            self._warnings.append(f"Unsupported operation type: {op_type}")
        
        return commands
    
    def _miter_90_cut(
        self,
        op: CutOperation,
        tool: Tool,
        thickness: float
    ) -> List[str]:
        """Generate 90-degree miter cut."""
        feed = min(op.feed_rate, self.profile.max_feed_rate)
        plunge_feed = feed * 0.5  # Slower plunge
        
        return [
            "(90° Miter Cut)",
            f"G00 Z{self._fmt(op.retract_height)}",
            f"G01 Z{self._fmt(-thickness)} F{self._fmt(plunge_feed)}",
            f"G01 X{self._fmt(op.x + op.length)} F{self._fmt(feed)}",
            f"G00 Z{self._fmt(self.profile.safety_height)}"
        ]
    
    def _miter_45_cut(
        self,
        op: CutOperation,
        tool: Tool,
        thickness: float
    ) -> List[str]:
        """Generate 45-degree miter cut."""
        feed = min(op.feed_rate, self.profile.max_feed_rate)
        
        # Calculate offset for 45° angle
        z_offset = thickness * math.tan(math.radians(45))
        
        return [
            "(45° Miter Cut)",
            f"G00 Z{self._fmt(op.retract_height)}",
            f"G01 Z{self._fmt(-thickness)} F{self._fmt(feed * 0.5)}",
            f"G01 X{self._fmt(op.x + op.length)} "
            f"Z{self._fmt(-thickness + z_offset)} F{self._fmt(feed)}",
            f"G00 Z{self._fmt(self.profile.safety_height)}"
        ]
    
    def _miter_custom_cut(
        self,
        op: CutOperation,
        tool: Tool,
        thickness: float
    ) -> List[str]:
        """Generate custom angle miter cut."""
        feed = min(op.feed_rate, self.profile.max_feed_rate)
        angle_rad = math.radians(op.angle)
        z_offset = thickness * math.tan(angle_rad)
        
        return [
            f"({op.angle}° Miter Cut)",
            f"G00 Z{self._fmt(op.retract_height)}",
            f"G01 Z{self._fmt(-thickness)} F{self._fmt(feed * 0.5)}",
            f"G01 X{self._fmt(op.x + op.length)} "
            f"Z{self._fmt(-thickness + z_offset)} F{self._fmt(feed)}",
            f"G00 Z{self._fmt(self.profile.safety_height)}"
        ]
    
    def _drill_operation(self, op: CutOperation, tool: Tool) -> List[str]:
        """Generate drilling operation."""
        feed = min(op.feed_rate, self.profile.max_feed_rate)
        
        if op.peck_drilling:
            # Peck drilling cycle (G83)
            return [
                f"(Peck Drill - Depth: {op.z}mm)",
                f"G83 X{self._fmt(op.x)} Y{self._fmt(op.y)} "
                f"Z{self._fmt(-op.z)} Q{self._fmt(op.peck_depth)} "
                f"R{self._fmt(op.retract_height)} F{self._fmt(feed)}",
                "G80 (Cancel canned cycle)"
            ]
        else:
            # Standard drilling cycle (G81)
            return [
                f"(Drill - Depth: {op.z}mm)",
                f"G81 X{self._fmt(op.x)} Y{self._fmt(op.y)} "
                f"Z{self._fmt(-op.z)} R{self._fmt(op.retract_height)} "
                f"F{self._fmt(feed)}",
                "G80 (Cancel canned cycle)"
            ]
    
    def _mill_operation(
        self,
        op: CutOperation,
        tool: Tool,
        thickness: float
    ) -> List[str]:
        """Generate milling operation."""
        feed = min(op.feed_rate, self.profile.max_feed_rate)
        
        return [
            f"(Mill Operation - Length: {op.length}mm)",
            f"G00 Z{self._fmt(op.retract_height)}",
            f"G01 Z{self._fmt(-op.z)} F{self._fmt(feed * 0.5)}",
            f"G01 X{self._fmt(op.x + op.length)} F{self._fmt(feed)}",
            f"G00 Z{self._fmt(self.profile.safety_height)}"
        ]
    
    def _slot_operation(
        self,
        op: CutOperation,
        tool: Tool,
        thickness: float
    ) -> List[str]:
        """Generate slot cutting operation."""
        feed = min(op.feed_rate, self.profile.max_feed_rate)
        
        return [
            f"(Slot - Length: {op.length}mm, Depth: {op.z}mm)",
            f"G00 Z{self._fmt(op.retract_height)}",
            f"G01 Z{self._fmt(-op.z)} F{self._fmt(feed * 0.3)}",
            f"G01 X{self._fmt(op.x + op.length)} F{self._fmt(feed)}",
            f"G01 Z{self._fmt(-op.z - 1)}",  # Extra depth at end
            f"G01 X{self._fmt(op.x)} F{self._fmt(feed)}",
            f"G00 Z{self._fmt(self.profile.safety_height)}"
        ]
    
    def _pocket_operation(
        self,
        op: CutOperation,
        tool: Tool,
        thickness: float
    ) -> List[str]:
        """Generate pocket milling operation."""
        feed = min(op.feed_rate, self.profile.max_feed_rate)
        stepover = tool.diameter * 0.6  # 60% stepover
        
        commands = [
            f"(Pocket - {op.length}mm x {op.z}mm depth)",
            f"G00 Z{self._fmt(op.retract_height)}",
        ]
        
        # Simple rectangular pocket - would need more complex logic for real pockets
        current_depth = 0
        depth_per_pass = tool.diameter * 0.5
        
        while current_depth < op.z:
            current_depth = min(current_depth + depth_per_pass, op.z)
            commands.append(f"G01 Z{self._fmt(-current_depth)} F{self._fmt(feed * 0.3)}")
            commands.append(f"G01 X{self._fmt(op.x + op.length)} F{self._fmt(feed)}")
            commands.append(f"G01 Y{self._fmt(op.y + stepover)}")
            commands.append(f"G01 X{self._fmt(op.x)}")
            commands.append(f"G01 Y{self._fmt(op.y)}")
        
        commands.append(f"G00 Z{self._fmt(self.profile.safety_height)}")
        return commands
    
    def _notch_operation(
        self,
        op: CutOperation,
        tool: Tool,
        thickness: float
    ) -> List[str]:
        """Generate notch cutting operation."""
        feed = min(op.feed_rate, self.profile.max_feed_rate)
        
        return [
            f"(Notch - {op.length}mm)",
            f"G00 Z{self._fmt(op.retract_height)}",
            f"G01 Z{self._fmt(-op.z)} F{self._fmt(feed * 0.4)}",
            f"G01 X{self._fmt(op.x + op.length)} F{self._fmt(feed)}",
            f"G01 Y{self._fmt(op.y + tool.diameter)} F{self._fmt(feed)}",
            f"G01 X{self._fmt(op.x)}",
            f"G01 Y{self._fmt(op.y)}",
            f"G00 Z{self._fmt(self.profile.safety_height)}"
        ]
    
    def _generate_cleanup(self) -> List[str]:
        """Generate cleanup and program end commands."""
        return [
            "",
            "(Program End)",
            self.profile.coolant_off,
            self.profile.spindle_stop,
            f"G00 Z{self._fmt(self.profile.safety_height)} (Retract)",
            "G00 X0 Y0 (Return to home)",
            "G49 (Cancel tool length comp)",
            self.profile.program_end,
            "%"
        ]
    
    def _validate_gcode_security(self, gcode: str) -> List[str]:
        """Validate generated G-code for security issues."""
        warnings = []
        
        try:
            from core.cnc_security import CNCSecurity
            
            # Write to temp file for validation
            import tempfile
            with tempfile.NamedTemporaryFile(
                mode='w', suffix='.nc', delete=False
            ) as f:
                f.write(gcode)
                temp_path = Path(f.name)

            try:
                security_warnings = CNCSecurity.validate_gcode_file(
                    temp_path
                )
                warnings.extend(security_warnings)
            finally:
                temp_path.unlink()

        except ImportError:
            logger.warning(
                "CNCSecurity not available - skipping security validation"
            )
        except Exception as e:
            logger.error(f"Security validation error: {e}")
            warnings.append(f"Security validation error: {str(e)}")

        return warnings
    
    def _estimate_machine_time(
        self,
        operations: List[CutOperation],
        tool: Tool
    ) -> float:
        """
        Estimate machine time in minutes.
        
        Accounts for:
        - Cutting time at feed rate
        - Rapid moves between operations
        - Tool changes
        - Spindle ramp-up
        """
        total_time = 0.0
        
        # Setup time
        total_time += 2.0  # 2 minutes for initialization
        
        prev_x, prev_y = 0.0, 0.0
        
        for op in operations:
            # Rapid move time
            rapid_distance = math.sqrt(
                (op.x - prev_x) ** 2 + (op.y - prev_y) ** 2
            )
            rapid_time = rapid_distance / self.profile.rapid_feed_rate
            total_time += rapid_time
            
            # Cutting time
            miter_types = [
                CutType.MITER_90, CutType.MITER_45, CutType.MITER_CUSTOM
            ]
            if op.cut_type in miter_types:
                cut_time = op.length / op.feed_rate
            elif op.cut_type == CutType.DRILL:
                cut_time = (op.z * 2) / op.feed_rate  # Down and up
            else:
                cut_time = op.length / op.feed_rate

            total_time += cut_time

            # Retract time
            total_time += 0.02  # Approximate retract time

            prev_x, prev_y = op.x + op.length, op.y

        return total_time
    
    def _fmt(self, value: float) -> str:
        """Format number to required precision."""
        return str(Decimal(str(value)).quantize(
            Decimal('1.' + '0' * self.precision),
            rounding=ROUND_HALF_UP
        ))


# Convenience functions

def generate_gcode_for_machine(
    operations: List[Dict[str, Any]],
    machine_brand: str,
    tool_config: Dict[str, Any],
    material_thickness: float = 10.0,
    stock_dimensions: Tuple[float, float, float] = (100, 100, 6000),
    job_name: str = "FABRICATOR_JOB"
) -> Dict[str, Any]:
    """
    Convenience function to generate G-code.

    Args:
        operations: List of operation dictionaries
        machine_brand: Machine brand name
        tool_config: Tool configuration dictionary
        material_thickness: Material thickness in mm
        stock_dimensions: Stock dimensions (w, h, l)
        job_name: Job name

    Returns:
        Dictionary with G-code and metadata
    """
    # Convert brand string to enum
    try:
        brand = MachineBrand(machine_brand.lower())
    except ValueError:
        brand = MachineBrand.CUSTOM

    # Create tool
    tool = Tool(
        id=tool_config.get('id', 'T1'),
        number=tool_config.get('number', 1),
        diameter=tool_config.get('diameter', 3.175),
        type=tool_config.get('type', 'end_mill'),
        max_rpm=tool_config.get('max_rpm', 18000),
        max_feed=tool_config.get('max_feed', 5000),
        flutes=tool_config.get('flutes', 2),
        description=tool_config.get('description', '')
    )

    # Convert operation dicts to CutOperation objects
    cut_operations = []
    for op_dict in operations:
        try:
            cut_type = CutType(op_dict.get('cut_type', 'miter_90'))
        except ValueError:
            cut_type = CutType.MITER_90

        cut_operations.append(CutOperation(
            id=op_dict.get('id', f'op_{len(cut_operations)}'),
            cut_type=cut_type,
            x=op_dict.get('x', 0),
            y=op_dict.get('y', 0),
            z=op_dict.get('z', 10),
            length=op_dict.get('length', 100),
            angle=op_dict.get('angle', 90),
            feed_rate=op_dict.get('feed_rate', 1000),
            spindle_speed=op_dict.get('spindle_speed', 12000),
            coolant=op_dict.get('coolant', False),
            label=op_dict.get('label', '')
        ))

    # Generate G-code
    generator = GCodeGenerator(machine_brand=brand)
    result = generator.generate_from_cut_plan(
        cut_plan=cut_operations,
        material_thickness=material_thickness,
        stock_dimensions=stock_dimensions,
        tool=tool,
        job_name=job_name
    )

    return {
        "gcode": result.gcode,
        "metadata": result.metadata,
        "warnings": result.warnings,
        "errors": result.errors,
        "is_valid": result.is_valid
    }

