"""
Kinematic Collision Detection Engine
=====================================

Simulates tool paths against machine constraints and clamp positions.
Prevents catastrophic machine damage from G-code errors.

The Gap: Standard G-code generators don't know where the clamps are.
If a machine moves the saw blade where a clamp is holding the profile,
you destroy a $50,000 machine.

The Prestige Solution: A Kinematic Simulation Engine that runs a
"Virtual Cut" checking for collisions against the machine's physical
constraints BEFORE a single byte of G-code is exported.

Features:
- Bounding box intersection for tool path simulation
- Clamp position awareness
- Machine travel limit validation
- Spindle interference detection
- Returns critical errors before G-code export
"""

import math
import logging
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
from enum import Enum

logger = logging.getLogger(__name__)


class CollisionSeverity(Enum):
    """Severity levels for detected collisions."""
    INFO = "info"           # Informational, not blocking
    WARNING = "warning"     # Should review but can proceed
    ERROR = "error"         # Must fix before proceeding
    FATAL = "fatal"         # Will cause machine damage


@dataclass
class BoundingBox:
    """
    Axis-aligned bounding box for collision detection.

    All dimensions in millimeters.
    """
    x_min: float
    x_max: float
    y_min: float
    y_max: float
    z_min: float
    z_max: float

    label: str = ""  # For identification (e.g., "Clamp 1", "Tool")

    def __post_init__(self):
        """Validate bounding box dimensions."""
        if self.x_min > self.x_max:
            self.x_min, self.x_max = self.x_max, self.x_min
        if self.y_min > self.y_max:
            self.y_min, self.y_max = self.y_max, self.y_min
        if self.z_min > self.z_max:
            self.z_min, self.z_max = self.z_max, self.z_min
    
    def intersects(self, other: 'BoundingBox') -> bool:
        """
        Check if this bounding box intersects with another.

        Uses separating axis theorem for AABB intersection.
        """
        return (
            self.x_min < other.x_max and self.x_max > other.x_min and
            self.y_min < other.y_max and self.y_max > other.y_min and
            self.z_min < other.z_max and self.z_max > other.z_min
        )

    def contains_point(self, x: float, y: float, z: float) -> bool:
        """Check if a point is inside this bounding box."""
        return (
            self.x_min <= x <= self.x_max and
            self.y_min <= y <= self.y_max and
            self.z_min <= z <= self.z_max
        )
    
    def expand(self, margin: float) -> 'BoundingBox':
        """Return a new bounding box expanded by margin on all sides."""
        return BoundingBox(
            x_min=self.x_min - margin,
            x_max=self.x_max + margin,
            y_min=self.y_min - margin,
            y_max=self.y_max + margin,
            z_min=self.z_min - margin,
            z_max=self.z_max + margin,
            label=self.label
        )
    
    @classmethod
    def from_center_size(
        cls,
        cx: float, cy: float, cz: float,
        sx: float, sy: float, sz: float,
        label: str = ""
    ) -> 'BoundingBox':
        """Create bounding box from center point and dimensions."""
        return cls(
            x_min=cx - sx/2, x_max=cx + sx/2,
            y_min=cy - sy/2, y_max=cy + sy/2,
            z_min=cz - sz/2, z_max=cz + sz/2,
            label=label
        )


@dataclass
class CollisionResult:
    """Result of collision detection for a single operation."""
    operation_index: int
    operation_id: str
    collision_type: str  # "clamp", "travel_limit", "spindle", "workpiece"
    severity: CollisionSeverity
    message: str

    # Position where collision would occur
    collision_x: Optional[float] = None
    collision_y: Optional[float] = None
    collision_z: Optional[float] = None

    # Involved objects
    involved_objects: List[str] = field(default_factory=list)

    # Recommendation
    recommendation: str = ""
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "operation_index": self.operation_index,
            "operation_id": self.operation_id,
            "collision_type": self.collision_type,
            "severity": self.severity.value,
            "message": self.message,
            "position": {
                "x": self.collision_x,
                "y": self.collision_y,
                "z": self.collision_z
            } if self.collision_x is not None else None,
            "involved_objects": self.involved_objects,
            "recommendation": self.recommendation
        }


@dataclass
class MachineConstraints:
    """Physical constraints of the CNC machine."""
    # Travel limits
    min_x: float = 0
    max_x: float = 6500
    min_y: float = 0
    max_y: float = 1200
    min_z: float = -300
    max_z: float = 100

    # Clamp configuration
    clamp_width: float = 50.0  # mm
    clamp_height: float = 100.0  # mm
    clamp_depth: float = 200.0  # mm
    clamp_positions: List[float] = field(default_factory=list)  # X positions

    # Tool configuration
    tool_diameter: float = 10.0
    tool_length: float = 50.0
    spindle_diameter: float = 80.0
    spindle_length: float = 150.0

    # Safety margins
    safety_margin: float = 5.0  # mm
    rapid_safety_height: float = 50.0

    # Workpiece
    workpiece_length: float = 6000.0
    workpiece_width: float = 100.0
    workpiece_height: float = 100.0


@dataclass
class ToolPosition:
    """Current position of the tool tip."""
    x: float = 0
    y: float = 0
    z: float = 100  # Start at safe height

    def distance_to(self, other: 'ToolPosition') -> float:
        """Calculate 3D distance to another position."""
        return math.sqrt(
            (self.x - other.x) ** 2 +
            (self.y - other.y) ** 2 +
            (self.z - other.z) ** 2
        )


class KinematicSimulator:
    """
    Kinematic simulation engine for CNC tool paths.

    Simulates G-code operations against machine constraints
    to detect potential collisions before execution.
    """

    def __init__(self, constraints: Optional[MachineConstraints] = None):
        """
        Initialize the kinematic simulator.

        Args:
            constraints: Machine physical constraints
        """
        self.constraints = constraints or MachineConstraints()
        self._clamp_zones: List[BoundingBox] = []
        self._spindle_zone: Optional[BoundingBox] = None
        self._workpiece_zone: Optional[BoundingBox] = None

        self._build_collision_zones()
    
    def _build_collision_zones(self):
        """Build bounding boxes for all collision zones."""
        # Create clamp zones
        self._clamp_zones = []
        for i, x_pos in enumerate(self.constraints.clamp_positions):
            clamp_box = BoundingBox.from_center_size(
                cx=x_pos,
                cy=self.constraints.workpiece_width / 2,
                cz=self.constraints.clamp_height / 2,
                sx=self.constraints.clamp_width,
                sy=self.constraints.clamp_depth,
                sz=self.constraints.clamp_height,
                label=f"Clamp_{i+1}"
            )
            self._clamp_zones.append(clamp_box)

        # Create spindle danger zone (simplified)
        self._spindle_zone = BoundingBox.from_center_size(
            cx=0, cy=0, cz=self.constraints.tool_length + 50,
            sx=self.constraints.spindle_diameter,
            sy=self.constraints.spindle_diameter,
            sz=self.constraints.spindle_length,
            label="Spindle"
        )

        # Create workpiece zone
        self._workpiece_zone = BoundingBox(
            x_min=0,
            x_max=self.constraints.workpiece_length,
            y_min=0,
            y_max=self.constraints.workpiece_width,
            z_min=-self.constraints.workpiece_height,
            z_max=0,
            label="Workpiece"
        )
    
    def simulate_tool_path(
        self,
        gcode_operations: List[Dict[str, Any]],
        tool_diameter: Optional[float] = None
    ) -> List[CollisionResult]:
        """
        Run a virtual simulation of the G-Code.

        Args:
            gcode_operations: List of parsed G-code operations
                Each operation should have:
                {'command': 'G01', 'X': 100, 'Y': 50, 'Z': -10, ...}
            tool_diameter: Optional tool diameter override

        Returns:
            List of collision results (empty if no collisions detected)
        """
        collisions: List[CollisionResult] = []

        tool_dia = tool_diameter or self.constraints.tool_diameter
        current_pos = ToolPosition()

        logger.info(
            f"Simulating {len(gcode_operations)} G-code operations"
        )

        for op_idx, operation in enumerate(gcode_operations):
            op_id = operation.get('id', f'op_{op_idx}')

            # Extract target position
            target_pos = ToolPosition(
                x=operation.get('X', current_pos.x),
                y=operation.get('Y', current_pos.y),
                z=operation.get('Z', current_pos.z)
            )

            # Create tool path bounding box (sweep volume)
            tool_path_box = self._create_sweep_volume(
                current_pos, target_pos, tool_dia
            )

            # Check machine travel limits
            limit_collision = self._check_travel_limits(
                op_idx, op_id, target_pos
            )
            if limit_collision:
                collisions.append(limit_collision)

            # Only check other collisions when tool is below safety height
            if target_pos.z < self.constraints.rapid_safety_height:
                # Check clamp collisions
                clamp_collisions = self._check_clamp_collisions(
                    op_idx, op_id, tool_path_box
                )
                collisions.extend(clamp_collisions)

                # Check spindle interference
                spindle_collision = self._check_spindle_collision(
                    op_idx, op_id, current_pos, target_pos
                )
                if spindle_collision:
                    collisions.append(spindle_collision)

            # Update current position
            current_pos = target_pos

        logger.info(
            f"Simulation complete: {len(collisions)} issues detected"
        )
        return collisions
    
    def _create_sweep_volume(
        self,
        start: ToolPosition,
        end: ToolPosition,
        tool_diameter: float
    ) -> BoundingBox:
        """Create bounding box for tool movement from start to end."""
        radius = tool_diameter / 2 + self.constraints.safety_margin
        
        return BoundingBox(
            x_min=min(start.x, end.x) - radius,
            x_max=max(start.x, end.x) + radius,
            y_min=min(start.y, end.y) - radius,
            y_max=max(start.y, end.y) + radius,
            z_min=min(start.z, end.z) - radius,
            z_max=max(start.z, end.z) + radius,
            label="ToolPath"
        )
    
    def _check_travel_limits(
        self,
        op_idx: int,
        op_id: str,
        target: ToolPosition
    ) -> Optional[CollisionResult]:
        """Check if target position exceeds machine travel limits."""
        violations = []

        if target.x < self.constraints.min_x:
            violations.append(
                f"X={target.x:.1f} < min_x={self.constraints.min_x}"
            )
        if target.x > self.constraints.max_x:
            violations.append(
                f"X={target.x:.1f} > max_x={self.constraints.max_x}"
            )
        if target.y < self.constraints.min_y:
            violations.append(
                f"Y={target.y:.1f} < min_y={self.constraints.min_y}"
            )
        if target.y > self.constraints.max_y:
            violations.append(
                f"Y={target.y:.1f} > max_y={self.constraints.max_y}"
            )
        if target.z < self.constraints.min_z:
            violations.append(
                f"Z={target.z:.1f} < min_z={self.constraints.min_z}"
            )
        if target.z > self.constraints.max_z:
            violations.append(
                f"Z={target.z:.1f} > max_z={self.constraints.max_z}"
            )

        if violations:
            return CollisionResult(
                operation_index=op_idx,
                operation_id=op_id,
                collision_type="travel_limit",
                severity=CollisionSeverity.ERROR,
                message=(
                    f"Machine travel limit exceeded: {', '.join(violations)}"
                ),
                collision_x=target.x,
                collision_y=target.y,
                collision_z=target.z,
                involved_objects=["machine_limits"],
                recommendation=(
                    "Adjust tool path to stay within machine limits"
                )
            )

        return None
    
    def _check_clamp_collisions(
        self,
        op_idx: int,
        op_id: str,
        tool_path: BoundingBox
    ) -> List[CollisionResult]:
        """Check for collisions with clamps."""
        collisions = []
        
        for clamp in self._clamp_zones:
            if tool_path.intersects(clamp):
                # Calculate approximate collision point
                collision_x = (
                    max(tool_path.x_min, clamp.x_min) +
                    min(tool_path.x_max, clamp.x_max)
                ) / 2
                
                collisions.append(CollisionResult(
                    operation_index=op_idx,
                    operation_id=op_id,
                    collision_type="clamp",
                    severity=CollisionSeverity.FATAL,
                    message=(
                        f"FATAL: Tool collision detected with {clamp.label} "
                        f"at X={collision_x:.1f}"
                    ),
                    collision_x=collision_x,
                    collision_y=(clamp.y_min + clamp.y_max) / 2,
                    collision_z=(clamp.z_min + clamp.z_max) / 2,
                    involved_objects=[clamp.label, "tool"],
                    recommendation=(
                        f"Move clamp {clamp.label} or adjust cut sequence. "
                        f"Clamp occupies X={clamp.x_min:.0f} to "
                        f"X={clamp.x_max:.0f}"
                    )
                ))

        return collisions
    
    def _check_spindle_collision(
        self,
        op_idx: int,
        op_id: str,
        start: ToolPosition,
        end: ToolPosition
    ) -> Optional[CollisionResult]:
        """Check for spindle interference with workpiece during plunge."""
        # Only check on Z-plunge moves
        if start.z <= end.z:
            return None
        
        # Check if spindle body would hit workpiece during plunge
        spindle_z = end.z + self.constraints.tool_length
        
        if spindle_z < 0:  # Spindle body below workpiece surface
            # Check if we're within workpiece bounds
            wp_length = self.constraints.workpiece_length
            wp_width = self.constraints.workpiece_width
            if (0 <= end.x <= wp_length and 0 <= end.y <= wp_width):

                return CollisionResult(
                    operation_index=op_idx,
                    operation_id=op_id,
                    collision_type="spindle",
                    severity=CollisionSeverity.WARNING,
                    message=(
                        f"Spindle body may interfere with workpiece at "
                        f"Z={end.z:.1f} (spindle bottom at Z={spindle_z:.1f})"
                    ),
                    collision_x=end.x,
                    collision_y=end.y,
                    collision_z=spindle_z,
                    involved_objects=["spindle", "workpiece"],
                    recommendation="Use shorter tool or reduce plunge depth"
                )

        return None
    
    def add_clamp(self, x_position: float):
        """Add a clamp at the specified X position."""
        self.constraints.clamp_positions.append(x_position)
        self._build_collision_zones()
    
    def remove_clamp(self, index: int):
        """Remove clamp at specified index."""
        if 0 <= index < len(self.constraints.clamp_positions):
            self.constraints.clamp_positions.pop(index)
            self._build_collision_zones()
    
    def set_workpiece_dimensions(
        self,
        length: float,
        width: float,
        height: float
    ):
        """Update workpiece dimensions."""
        self.constraints.workpiece_length = length
        self.constraints.workpiece_width = width
        self.constraints.workpiece_height = height
        self._build_collision_zones()


class ToolPathValidator:
    """
    High-level validator that combines kinematic simulation
    with other safety checks.
    """

    def __init__(self, machine_profile: Dict[str, Any]):
        """
        Initialize validator with machine profile.

        Args:
            machine_profile: Machine configuration dictionary
        """
        safety_limits = machine_profile.get('safety_limits', {})

        self.constraints = MachineConstraints(
            min_x=safety_limits.get('min_x', 0),
            max_x=machine_profile.get('max_x_travel', 6500),
            min_y=safety_limits.get('min_y', 0),
            max_y=machine_profile.get('max_y_travel', 1200),
            min_z=safety_limits.get('min_z', -300),
            max_z=machine_profile.get('max_z_travel', 100),
            clamp_positions=safety_limits.get(
                'clamp_positions', [500, 3000, 5500]
            )
        )

        self.simulator = KinematicSimulator(self.constraints)
    
    def validate_gcode(
        self,
        gcode_string: str,
        tool_diameter: float = 10.0
    ) -> Dict[str, Any]:
        """
        Validate G-code string for safety issues.

        Args:
            gcode_string: Complete G-code program
            tool_diameter: Tool diameter in mm

        Returns:
            Validation results dictionary
        """
        # Parse G-code into operations
        operations = self._parse_gcode(gcode_string)

        # Run simulation
        collisions = self.simulator.simulate_tool_path(
            operations, tool_diameter
        )

        # Categorize results
        fatal_count = sum(
            1 for c in collisions
            if c.severity == CollisionSeverity.FATAL
        )
        error_count = sum(
            1 for c in collisions
            if c.severity == CollisionSeverity.ERROR
        )
        warning_count = sum(
            1 for c in collisions
            if c.severity == CollisionSeverity.WARNING
        )

        is_safe = fatal_count == 0 and error_count == 0

        return {
            "is_safe": is_safe,
            "can_proceed": is_safe,
            "summary": {
                "total_issues": len(collisions),
                "fatal": fatal_count,
                "errors": error_count,
                "warnings": warning_count
            },
            "collisions": [c.to_dict() for c in collisions],
            "operations_checked": len(operations),
            "recommendation": (
                "G-code is safe to execute" if is_safe
                else f"Fix {fatal_count + error_count} critical issues "
                f"before execution"
            )
        }
    
    def _parse_gcode(self, gcode_string: str) -> List[Dict[str, Any]]:
        """Parse G-code string into operation dictionaries."""
        operations = []

        for line_num, line in enumerate(gcode_string.split('\n')):
            line = line.strip()

            # Skip empty lines and comments
            if not line or line.startswith('(') or line.startswith(';'):
                continue

            # Skip program markers
            if line == '%' or line.startswith('O'):
                continue

            operation = {
                'id': f'line_{line_num}',
                'raw': line
            }

            # Parse G/M codes and coordinates
            parts = line.replace('(', ' (').split()

            for part in parts:
                if part.startswith('('):
                    break  # Start of comment

                if len(part) < 2:
                    continue

                code = part[0].upper()
                try:
                    value = float(part[1:])

                    if code == 'G':
                        operation['G'] = int(value)
                        operation['command'] = f'G{int(value):02d}'
                    elif code == 'M':
                        operation['M'] = int(value)
                    elif code in 'XYZIJKFSR':
                        operation[code] = value
                except ValueError:
                    pass

            has_coords = (
                'G' in operation or 'X' in operation or
                'Y' in operation or 'Z' in operation
            )
            if has_coords:
                operations.append(operation)

        return operations


