"""
Tests for G-Code Generation and Security Validation
====================================================

Tests for the G-code generator service including
multi-brand support and security validation.
"""

import sys
from pathlib import Path

import pytest

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.gcode_generator import (
    GCodeGenerator,
    MachineBrand,
    MachineProfile,
    CutOperation,
    CutType,
    Tool,
    GCodeResult,
    generate_gcode_for_machine,
)  # noqa: E402
from core.cnc_security import CNCSecurity  # noqa: E402


class TestTool:
    """Tests for Tool dataclass."""
    
    def test_valid_tool(self):
        """Test creating a valid tool."""
        tool = Tool(
            id="T1",
            number=1,
            diameter=3.175,
            type="end_mill",
            max_rpm=24000,
            max_feed=5000,
            flutes=2
        )
        assert tool.diameter == 3.175
        assert tool.max_rpm == 24000
    
    def test_tool_validation(self):
        """Test tool validation."""
        tool = Tool(
            id="T1",
            number=1,
            diameter=3.175,
            type="end_mill",
            max_rpm=24000,
            max_feed=5000
        )
        errors = tool.validate()
        assert len(errors) == 0
    
    def test_invalid_tool(self):
        """Test invalid tool validation."""
        tool = Tool(
            id="T1",
            number=1,
            diameter=-1,  # Invalid
            type="end_mill",
            max_rpm=0,  # Invalid
            max_feed=5000
        )
        errors = tool.validate()
        assert len(errors) == 2


class TestCutOperation:
    """Tests for CutOperation dataclass."""
    
    def test_valid_operation(self):
        """Test creating a valid cut operation."""
        op = CutOperation(
            id="cut1",
            cut_type=CutType.MITER_90,
            x=0.0,
            y=0.0,
            z=10.0,
            length=1000.0,
            feed_rate=1000.0,
            spindle_speed=12000
        )
        assert op.length == 1000.0
        assert op.cut_type == CutType.MITER_90
    
    def test_operation_validation(self):
        """Test operation validation."""
        op = CutOperation(
            id="cut1",
            cut_type=CutType.MITER_90,
            x=0.0,
            y=0.0,
            z=10.0,
            length=1000.0,
            feed_rate=1000.0,
            spindle_speed=12000
        )
        errors = op.validate()
        assert len(errors) == 0


class TestMachineProfile:
    """Tests for MachineProfile."""
    
    def test_yilmaz_preset(self):
        """Test YILMAZ machine preset."""
        profile = MachineProfile.get_preset(MachineBrand.YILMAZ)
        assert profile.brand == MachineBrand.YILMAZ
        assert profile.max_x == 6500.0
        assert profile.max_spindle_speed == 18000
    
    def test_elumatec_preset(self):
        """Test Elumatec machine preset."""
        profile = MachineProfile.get_preset(MachineBrand.ELUMATEC)
        assert profile.brand == MachineBrand.ELUMATEC
        assert profile.safety_height == 100.0


class TestGCodeGenerator:
    """Tests for GCodeGenerator class."""
    
    @pytest.fixture
    def tool(self):
        """Sample tool for testing."""
        return Tool(
            id="T1",
            number=1,
            diameter=3.175,
            type="end_mill",
            max_rpm=18000,
            max_feed=5000,
            flutes=2,
            description="Standard end mill"
        )
    
    @pytest.fixture
    def sample_operations(self):
        """Sample cut operations for testing."""
        return [
            CutOperation(
                id="cut1",
                cut_type=CutType.MITER_90,
                x=0.0,
                y=0.0,
                z=10.0,
                length=1000.0,
                feed_rate=1000.0,
                spindle_speed=12000,
                coolant=True,
                label="Test cut 1"
            ),
            CutOperation(
                id="cut2",
                cut_type=CutType.DRILL,
                x=500.0,
                y=50.0,
                z=20.0,
                length=0.0,
                feed_rate=500.0,
                spindle_speed=8000,
                peck_drilling=True,
                label="Drain hole"
            ),
        ]
    
    def test_yilmaz_gcode_generation(self, tool, sample_operations):
        """Test G-code generation for YILMAZ machines."""
        generator = GCodeGenerator(machine_brand=MachineBrand.YILMAZ)
        result = generator.generate_from_cut_plan(
            cut_plan=sample_operations,
            material_thickness=10.0,
            stock_dimensions=(100, 100, 6000),
            tool=tool,
            job_name="TEST_JOB"
        )
        
        assert isinstance(result, GCodeResult)
        assert result.is_valid
        assert len(result.gcode) > 0
        
        # Check for required G-code commands
        assert "G21" in result.gcode  # Metric
        assert "G90" in result.gcode  # Absolute positioning
        assert "G00" in result.gcode or "G01" in result.gcode  # Movement
        
        # Check metadata
        assert result.metadata["machine_brand"] == "yilmaz"
        assert result.metadata["total_operations"] == 2
    
    def test_elumatec_gcode_generation(self, tool, sample_operations):
        """Test G-code generation for Elumatec machines."""
        generator = GCodeGenerator(machine_brand=MachineBrand.ELUMATEC)
        result = generator.generate_from_cut_plan(
            cut_plan=sample_operations,
            material_thickness=10.0,
            stock_dimensions=(100, 100, 6000),
            tool=tool
        )
        
        assert result.is_valid
        assert "G71" in result.gcode  # Elumatec uses G71 for metric
    
    def test_gcode_header_content(self, tool, sample_operations):
        """Test G-code header contains required information."""
        generator = GCodeGenerator(machine_brand=MachineBrand.YILMAZ)
        result = generator.generate_from_cut_plan(
            cut_plan=sample_operations,
            material_thickness=10.0,
            stock_dimensions=(100, 100, 6000),
            tool=tool,
            job_name="HEADER_TEST",
            operator="Test Operator"
        )
        
        assert "HEADER_TEST" in result.gcode
        assert "Test Operator" in result.gcode
        assert "Fabricator Pro" in result.gcode
    
    def test_machine_time_estimation(self, tool, sample_operations):
        """Test machine time estimation."""
        generator = GCodeGenerator()
        result = generator.generate_from_cut_plan(
            cut_plan=sample_operations,
            material_thickness=10.0,
            stock_dimensions=(100, 100, 6000),
            tool=tool
        )
        
        assert "estimated_time_minutes" in result.metadata
        assert result.metadata["estimated_time_minutes"] > 0
    
    def test_travel_limit_warning(self, tool):
        """Test that exceeding travel limits generates warning."""
        # Operation that exceeds X travel limit
        exceeding_op = [CutOperation(
            id="exceeds",
            cut_type=CutType.MITER_90,
            x=7000.0,  # Exceeds 6500 max for YILMAZ
            y=0.0,
            z=10.0,
            length=100.0,
            feed_rate=1000.0,
            spindle_speed=12000
        )]
        
        generator = GCodeGenerator(machine_brand=MachineBrand.YILMAZ)
        result = generator.generate_from_cut_plan(
            cut_plan=exceeding_op,
            material_thickness=10.0,
            stock_dimensions=(100, 100, 6000),
            tool=tool
        )
        
        assert len(result.warnings) > 0
        assert any("travel limit" in w.lower() or "limit" in w.lower() for w in result.warnings)
    
    def test_empty_operations(self, tool):
        """Test with empty operations list."""
        generator = GCodeGenerator()
        result = generator.generate_from_cut_plan(
            cut_plan=[],
            material_thickness=10.0,
            stock_dimensions=(100, 100, 6000),
            tool=tool
        )
        
        # Should still generate valid header/footer
        assert result.is_valid
        assert "%" in result.gcode
    
    def test_convenience_function(self):
        """Test the convenience function for G-code generation."""
        operations = [
            {
                "id": "op1",
                "cut_type": "miter_90",
                "x": 0,
                "y": 0,
                "z": 10,
                "length": 500,
                "feed_rate": 1000,
                "spindle_speed": 12000
            }
        ]
        
        tool_config = {
            "id": "T1",
            "number": 1,
            "diameter": 3.175,
            "type": "end_mill",
            "max_rpm": 18000,
            "max_feed": 5000
        }
        
        result = generate_gcode_for_machine(
            operations=operations,
            machine_brand="yilmaz",
            tool_config=tool_config,
            job_name="CONV_TEST"
        )
        
        assert result["is_valid"]
        assert "gcode" in result
        assert len(result["gcode"]) > 0


class TestCNCSecurity:
    """Tests for CNC file security validation."""
    
    def test_valid_dxf_file(self, tmp_path):
        """Test validating a valid DXF file."""
        # Create a simple valid DXF file
        dxf_content = """0
SECTION
  2
HEADER
  0
ENDSEC
  0
SECTION
  2
ENTITIES
  0
ENDSEC
  0
EOF"""
        
        dxf_file = tmp_path / "test_valid.dxf"
        dxf_file.write_text(dxf_content)
        
        is_valid = CNCSecurity.validate_dxf_file(dxf_file)
        assert is_valid is True
    
    def test_invalid_dxf_file(self, tmp_path):
        """Test rejecting invalid DXF file."""
        invalid_file = tmp_path / "test_invalid.txt"
        invalid_file.write_text("This is not a DXF file")
        
        is_valid = CNCSecurity.validate_dxf_file(invalid_file)
        assert is_valid is False
    
    def test_oversized_file_rejection(self, tmp_path):
        """Test that oversized files are rejected."""
        # Create a large file (11MB)
        large_file = tmp_path / "test_large.dxf"
        with open(large_file, 'wb') as f:
            f.write(b'0' * (11 * 1024 * 1024))
        
        is_valid = CNCSecurity.validate_dxf_file(large_file)
        assert is_valid is False
    
    def test_dangerous_gcode_detection(self, tmp_path):
        """Test detection of dangerous G-code patterns."""
        dangerous_gcode = """G00 X0 Y0
M99
M30 M30
G91 G90
M98 P1000
"""
        
        gcode_file = tmp_path / "test_dangerous.nc"
        gcode_file.write_text(dangerous_gcode)
        
        warnings = CNCSecurity.validate_gcode_file(gcode_file)
        
        assert len(warnings) > 0
        # Should detect M99, M30, and M98 patterns
        pattern_found = any(
            "M99" in w or "M30" in w or "M98" in w 
            for w in warnings
        )
        assert pattern_found
    
    def test_safe_gcode_file(self, tmp_path):
        """Test that safe G-code passes validation."""
        safe_gcode = """(Safe G-code program)
G21
G90
G00 X0 Y0 Z50
G01 Z-10 F500
G01 X100 F1000
G00 Z50
M05
M30
"""
        
        gcode_file = tmp_path / "test_safe.nc"
        gcode_file.write_text(safe_gcode)
        
        warnings = CNCSecurity.validate_gcode_file(gcode_file)

        # M30 alone is flagged but should only have 1 warning
        assert len(warnings) <= 1


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

