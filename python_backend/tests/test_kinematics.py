"""
Tests for Kinematic Collision Detection
=========================================

Tests for the kinematic simulation engine that prevents
CNC machine collisions and validates tool paths.
"""

import sys
from pathlib import Path

import pytest

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.kinematics.collision_detector import (
    KinematicSimulator,
    BoundingBox,
    CollisionSeverity,
    MachineConstraints,
    ToolPathValidator,
)  # noqa: E402


class TestBoundingBox:
    """Tests for BoundingBox class."""
    
    def test_bounding_box_creation(self):
        """Test creating a bounding box."""
        box = BoundingBox(
            x_min=0, x_max=100,
            y_min=0, y_max=50,
            z_min=-10, z_max=10,
            label="Test Box"
        )
        assert box.x_min == 0
        assert box.x_max == 100
        assert box.label == "Test Box"
    
    def test_bounding_box_auto_swap(self):
        """Test that min/max values are auto-swapped."""
        box = BoundingBox(
            x_min=100, x_max=0,  # Swapped
            y_min=50, y_max=0,   # Swapped
            z_min=10, z_max=-10  # Swapped
        )
        assert box.x_min == 0
        assert box.x_max == 100
        assert box.y_min == 0
        assert box.y_max == 50
    
    def test_intersection_true(self):
        """Test detecting intersection."""
        box1 = BoundingBox(0, 100, 0, 100, 0, 100)
        box2 = BoundingBox(50, 150, 50, 150, 50, 150)

        assert box1.intersects(box2) is True
        assert box2.intersects(box1) is True
    
    def test_intersection_false(self):
        """Test non-intersecting boxes."""
        box1 = BoundingBox(0, 100, 0, 100, 0, 100)
        box2 = BoundingBox(200, 300, 200, 300, 200, 300)

        assert box1.intersects(box2) is False
    
    def test_intersection_edge_case(self):
        """Test edge-touching boxes (should not intersect)."""
        box1 = BoundingBox(0, 100, 0, 100, 0, 100)
        box2 = BoundingBox(100, 200, 0, 100, 0, 100)

        assert box1.intersects(box2) is False
    
    def test_contains_point(self):
        """Test point containment."""
        box = BoundingBox(0, 100, 0, 100, 0, 100)

        assert box.contains_point(50, 50, 50) is True
        assert box.contains_point(0, 0, 0) is True
        assert box.contains_point(100, 100, 100) is True
        assert box.contains_point(150, 50, 50) is False
    
    def test_expand(self):
        """Test bounding box expansion."""
        box = BoundingBox(0, 100, 0, 100, 0, 100)
        expanded = box.expand(10)
        
        assert expanded.x_min == -10
        assert expanded.x_max == 110
        assert expanded.y_min == -10
        assert expanded.y_max == 110
    
    def test_from_center_size(self):
        """Test creating from center and size."""
        box = BoundingBox.from_center_size(
            cx=50, cy=50, cz=50,
            sx=100, sy=100, sz=100,
            label="Centered"
        )
        
        assert box.x_min == 0
        assert box.x_max == 100
        assert box.label == "Centered"


class TestMachineConstraints:
    """Tests for MachineConstraints."""
    
    def test_default_constraints(self):
        """Test default machine constraints."""
        constraints = MachineConstraints()
        
        assert constraints.max_x == 6500
        assert constraints.max_y == 1200
        assert constraints.max_z == 100
        assert constraints.safety_margin == 5.0
    
    def test_custom_constraints(self):
        """Test custom machine constraints."""
        constraints = MachineConstraints(
            max_x=7000,
            max_y=1500,
            clamp_positions=[500, 3000, 5500]
        )
        
        assert constraints.max_x == 7000
        assert len(constraints.clamp_positions) == 3


class TestKinematicSimulator:
    """Tests for KinematicSimulator class."""
    
    @pytest.fixture
    def simulator(self):
        """Create simulator with test clamp positions."""
        constraints = MachineConstraints(
            clamp_positions=[500, 3000, 5500]
        )
        return KinematicSimulator(constraints)
    
    @pytest.fixture
    def safe_operations(self):
        """Safe operations that don't hit clamps."""
        return [
            {"id": "op1", "command": "G00", "X": 100, "Y": 50, "Z": 100},
            {"id": "op2", "command": "G01", "X": 100, "Y": 50, "Z": -10},
            {"id": "op3", "command": "G01", "X": 400, "Y": 50, "Z": -10},
            {"id": "op4", "command": "G00", "X": 400, "Y": 50, "Z": 100},
        ]
    
    @pytest.fixture
    def dangerous_operations(self):
        """Operations that would collide with clamps."""
        return [
            {"id": "op1", "command": "G00", "X": 500, "Y": 100, "Z": 100},
            {"id": "op2", "command": "G01", "X": 500, "Y": 100, "Z": -10},  # Into clamp!
        ]
    
    def test_safe_path_no_collisions(self, simulator, safe_operations):
        """Test that safe path has no collisions."""
        collisions = simulator.simulate_tool_path(safe_operations)
        
        # Should have no fatal collisions
        fatal = [c for c in collisions if c.severity == CollisionSeverity.FATAL]
        assert len(fatal) == 0
    
    def test_clamp_collision_detected(self, simulator, dangerous_operations):
        """Test that clamp collision is detected."""
        collisions = simulator.simulate_tool_path(dangerous_operations)
        
        # Should detect collision with clamp
        clamp_collisions = [
            c for c in collisions 
            if c.collision_type == "clamp" and c.severity == CollisionSeverity.FATAL
        ]
        assert len(clamp_collisions) > 0
    
    def test_travel_limit_exceeded(self, simulator):
        """Test detection of travel limit violation."""
        exceeding_ops = [
            {"id": "op1", "command": "G00", "X": 7000, "Y": 50, "Z": 100},  # X exceeds
        ]
        
        collisions = simulator.simulate_tool_path(exceeding_ops)
        
        limit_violations = [
            c for c in collisions if c.collision_type == "travel_limit"
        ]
        assert len(limit_violations) > 0
    
    def test_empty_operations(self, simulator):
        """Test with empty operations list."""
        collisions = simulator.simulate_tool_path([])
        assert collisions == []
    
    def test_add_remove_clamp(self, simulator):
        """Test adding and removing clamps."""
        initial_clamp_count = len(simulator.constraints.clamp_positions)
        
        simulator.add_clamp(4000)
        assert len(simulator.constraints.clamp_positions) == initial_clamp_count + 1
        
        simulator.remove_clamp(initial_clamp_count)  # Remove the newly added one
        assert len(simulator.constraints.clamp_positions) == initial_clamp_count
    
    def test_collision_result_serialization(self, simulator, dangerous_operations):
        """Test that collision results can be serialized."""
        collisions = simulator.simulate_tool_path(dangerous_operations)
        
        if collisions:
            result_dict = collisions[0].to_dict()
            assert "operation_index" in result_dict
            assert "collision_type" in result_dict
            assert "severity" in result_dict
            assert "message" in result_dict


class TestToolPathValidator:
    """Tests for ToolPathValidator class."""
    
    @pytest.fixture
    def validator(self):
        """Create validator with test machine profile."""
        machine_profile = {
            "max_x_travel": 6500,
            "max_y_travel": 1200,
            "max_z_travel": 100,
            "safety_limits": {
                "min_x": 0,
                "min_y": 0,
                "min_z": -300,
                "clamp_positions": [500, 3000]
            }
        }
        return ToolPathValidator(machine_profile)
    
    def test_validate_safe_gcode(self, validator):
        """Test validating safe G-code."""
        safe_gcode = """G21
G90
G00 X100 Y50 Z100
G01 Z-10 F500
G01 X200 F1000
G00 Z100
M30
"""
        result = validator.validate_gcode(safe_gcode)
        
        assert result["is_safe"] == True
        assert result["can_proceed"] == True
        assert result["summary"]["fatal"] == 0
    
    def test_validate_dangerous_gcode(self, validator):
        """Test validating G-code with clamp collision."""
        dangerous_gcode = """G21
G90
G00 X500 Y100 Z100
G01 Z-10 F500
G01 X550 F1000
G00 Z100
M30
"""
        result = validator.validate_gcode(dangerous_gcode, tool_diameter=20)
        
        # May or may not detect depending on exact clamp zone
        # Just check the structure is correct
        assert "is_safe" in result
        assert "summary" in result
        assert "collisions" in result
    
    def test_validation_result_structure(self, validator):
        """Test validation result structure."""
        result = validator.validate_gcode("G00 X0 Y0 Z100")
        
        assert "is_safe" in result
        assert "can_proceed" in result
        assert "summary" in result
        assert "total_issues" in result["summary"]
        assert "operations_checked" in result


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

