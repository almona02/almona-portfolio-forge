"""
Tests for Smart Nesting Algorithms
===================================

Comprehensive tests for the nesting optimization algorithms
used in Fabricator Pro for aluminum profile cutting.
"""

import sys
from pathlib import Path

import pytest

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from ai_services.nesting.smart_nesting import (
    SmartNestingOptimizer,
    NestingStrategy,
    CutPiece,
    StockPiece,
    OptimizationResult,
)


class TestCutPiece:
    """Tests for CutPiece dataclass."""
    
    def test_valid_cut_piece(self):
        """Test creating a valid cut piece."""
        cut = CutPiece(
            id="cut1",
            length=1200.0,
            quantity=4,
            material_type="aluminum",
            profile_id="60mm"
        )
        assert cut.length == 1200.0
        assert cut.quantity == 4
    
    def test_invalid_length_raises(self):
        """Test that negative length raises error."""
        with pytest.raises(ValueError, match="length must be positive"):
            CutPiece(
                id="cut1",
                length=-100.0,
                quantity=1,
                material_type="aluminum",
                profile_id="60mm"
            )
    
    def test_invalid_quantity_raises(self):
        """Test that zero quantity raises error."""
        with pytest.raises(ValueError, match="Quantity must be positive"):
            CutPiece(
                id="cut1",
                length=100.0,
                quantity=0,
                material_type="aluminum",
                profile_id="60mm"
            )


class TestStockPiece:
    """Tests for StockPiece dataclass."""
    
    def test_stock_piece_properties(self):
        """Test stock piece properties."""
        stock = StockPiece(
            id="stock1",
            length=6000.0,
            quantity=10,
            material_type="aluminum",
            profile_id="60mm",
            remnant_id="rem_001"
        )
        assert stock.is_remnant is True
        assert stock.get_usable_length() == 6000.0
    
    def test_usable_length_with_defects(self):
        """Test usable length calculation with defects."""
        stock = StockPiece(
            id="stock1",
            length=6000.0,
            quantity=1,
            material_type="aluminum",
            profile_id="60mm",
            defects=[
                {"start": 100, "end": 200},  # 100mm defect
                {"start": 3000, "end": 3150}  # 150mm defect
            ]
        )
        assert stock.get_usable_length() == 5750.0  # 6000 - 100 - 150


class TestSmartNestingOptimizer:
    """Tests for SmartNestingOptimizer class."""
    
    @pytest.fixture
    def sample_cuts(self):
        """Sample cut pieces for testing."""
        return [
            CutPiece(
                id="cut1",
                length=1200.0,
                quantity=4,
                material_type="aluminum",
                profile_id="60mm",
                priority=1
            ),
            CutPiece(
                id="cut2",
                length=800.0,
                quantity=8,
                material_type="aluminum",
                profile_id="60mm",
                priority=1
            ),
            CutPiece(
                id="cut3",
                length=600.0,
                quantity=6,
                material_type="aluminum",
                profile_id="60mm",
                priority=2
            ),
        ]
    
    @pytest.fixture
    def sample_stock(self):
        """Sample stock pieces for testing."""
        return [
            StockPiece(
                id="stock1",
                length=6000.0,
                quantity=10,
                material_type="aluminum",
                profile_id="60mm",
                cost_per_mm=0.02
            ),
            StockPiece(
                id="stock2",
                length=4500.0,
                quantity=3,
                material_type="aluminum",
                profile_id="60mm",
                cost_per_mm=0.015,
                remnant_id="remnant_001"
            ),
        ]
    
    def test_first_fit_optimization(self, sample_cuts, sample_stock):
        """Test first-fit decreasing algorithm."""
        optimizer = SmartNestingOptimizer(strategy=NestingStrategy.FIRST_FIT)
        result = optimizer.optimize_1d_cutting(
            sample_cuts,
            sample_stock,
            kerf=3.0,
            min_remnant=100.0
        )
        
        assert isinstance(result, OptimizationResult)
        assert len(result.plans) > 0
        assert result.overall_utilization > 0
        assert result.total_waste >= 0
    
    def test_best_fit_optimization(self, sample_cuts, sample_stock):
        """Test best-fit decreasing algorithm."""
        optimizer = SmartNestingOptimizer(strategy=NestingStrategy.BEST_FIT)
        result = optimizer.optimize_1d_cutting(
            sample_cuts,
            sample_stock,
            kerf=3.0,
            min_remnant=100.0
        )
        
        assert isinstance(result, OptimizationResult)
        assert result.overall_utilization > 0
    
    def test_genetic_optimization(self, sample_cuts, sample_stock):
        """Test genetic algorithm optimization."""
        optimizer = SmartNestingOptimizer(strategy=NestingStrategy.GENETIC)
        result = optimizer.optimize_1d_cutting(
            sample_cuts,
            sample_stock,
            kerf=3.0,
            min_remnant=100.0,
            max_time_seconds=5.0  # Limit time for test
        )
        
        assert isinstance(result, OptimizationResult)
        # Genetic should achieve good utilization
        assert result.overall_utilization >= 0.7
    
    def test_all_cuts_allocated(self, sample_cuts, sample_stock):
        """Test that all cuts are allocated."""
        optimizer = SmartNestingOptimizer(strategy=NestingStrategy.BEST_FIT)
        result = optimizer.optimize_1d_cutting(
            sample_cuts,
            sample_stock,
            kerf=3.0,
            min_remnant=100.0
        )
        
        # Count total cuts in plans
        total_cuts_in_plans = sum(len(plan.cuts) for plan in result.plans)
        total_required_cuts = sum(cut.quantity for cut in sample_cuts)
        
        assert total_cuts_in_plans == total_required_cuts
    
    def test_no_plan_exceeds_stock_length(self, sample_cuts, sample_stock):
        """Test that no cutting plan exceeds stock length."""
        optimizer = SmartNestingOptimizer(strategy=NestingStrategy.FIRST_FIT)
        result = optimizer.optimize_1d_cutting(
            sample_cuts,
            sample_stock,
            kerf=3.0,
            min_remnant=100.0
        )
        
        for plan in result.plans:
            total_cut_length = sum(cut.length for cut in plan.cuts)
            assert total_cut_length <= plan.stock_length
    
    def test_empty_input(self):
        """Test with empty input."""
        optimizer = SmartNestingOptimizer()
        result = optimizer.optimize_1d_cutting([], [], kerf=3.0, min_remnant=100.0)
        
        assert result.plans == []
        assert result.total_waste == 0
    
    def test_single_cut(self, sample_stock):
        """Test with single cut piece."""
        single_cut = [CutPiece(
            id="single",
            length=2000.0,
            quantity=1,
            material_type="aluminum",
            profile_id="60mm",
            priority=1
        )]
        
        optimizer = SmartNestingOptimizer()
        result = optimizer.optimize_1d_cutting(
            single_cut,
            sample_stock,
            kerf=3.0,
            min_remnant=100.0
        )
        
        assert len(result.plans) == 1
        assert len(result.plans[0].cuts) == 1
        assert result.plans[0].cuts[0].length == 2000.0
    
    def test_cut_longer_than_stock(self, sample_stock):
        """Test cut piece longer than any stock - should not allocate."""
        long_cut = [CutPiece(
            id="too_long",
            length=7000.0,  # Longer than 6000mm stock
            quantity=1,
            material_type="aluminum",
            profile_id="60mm",
            priority=1
        )]
        
        optimizer = SmartNestingOptimizer()
        result = optimizer.optimize_1d_cutting(
            long_cut,
            sample_stock,
            kerf=3.0,
            min_remnant=100.0
        )
        
        # Should not allocate the cut
        total_allocated = sum(len(plan.cuts) for plan in result.plans)
        assert total_allocated == 0
    
    def test_material_mismatch(self, sample_stock):
        """Test cuts with different material than stock."""
        steel_cut = [CutPiece(
            id="steel_cut",
            length=2000.0,
            quantity=1,
            material_type="steel",  # Different material
            profile_id="60mm",
            priority=1
        )]
        
        optimizer = SmartNestingOptimizer()
        result = optimizer.optimize_1d_cutting(
            steel_cut,
            sample_stock,  # Aluminum stock
            kerf=3.0,
            min_remnant=100.0
        )
        
        # Should not allocate due to material mismatch
        total_allocated = sum(len(plan.cuts) for plan in result.plans)
        assert total_allocated == 0
    
    def test_profile_mismatch(self, sample_stock):
        """Test cuts with different profile than stock."""
        different_profile_cut = [CutPiece(
            id="different_profile",
            length=2000.0,
            quantity=1,
            material_type="aluminum",
            profile_id="100mm",  # Different profile
            priority=1
        )]
        
        optimizer = SmartNestingOptimizer()
        result = optimizer.optimize_1d_cutting(
            different_profile_cut,
            sample_stock,  # 60mm profile stock
            kerf=3.0,
            min_remnant=100.0
        )
        
        # Should not allocate due to profile mismatch
        total_allocated = sum(len(plan.cuts) for plan in result.plans)
        assert total_allocated == 0
    
    def test_optimization_result_serialization(self, sample_cuts, sample_stock):
        """Test that optimization result can be serialized."""
        optimizer = SmartNestingOptimizer()
        result = optimizer.optimize_1d_cutting(
            sample_cuts,
            sample_stock,
            kerf=3.0,
            min_remnant=100.0
        )
        
        # Should be able to convert to dict
        result_dict = result.to_dict()
        assert "plans" in result_dict
        assert "summary" in result_dict
        assert "metadata" in result_dict
    
    def test_performance_large_input(self, sample_stock):
        """Test performance with large input."""
        import time
        
        # Generate many cuts
        many_cuts = []
        for i in range(100):
            many_cuts.append(CutPiece(
                id=f"cut_{i}",
                length=100.0 + (i * 10),
                quantity=1,
                material_type="aluminum",
                profile_id="60mm",
                priority=1 if i < 50 else 2
            ))
        
        optimizer = SmartNestingOptimizer(strategy=NestingStrategy.GENETIC)
        
        start_time = time.time()
        result = optimizer.optimize_1d_cutting(
            many_cuts,
            sample_stock,
            kerf=3.0,
            min_remnant=100.0,
            max_time_seconds=10.0
        )
        end_time = time.time()
        
        assert result is not None
        assert (end_time - start_time) < 15.0  # Should complete within 15 seconds


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

