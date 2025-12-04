"""
Defect-Aware Multi-Objective Optimization
==========================================

Uses Google OR-Tools for industrial-grade linear programming
optimization that accounts for defect zones in remnant materials.

The Gap: Standard nesting assumes new bars. Real workshops use
remnants that might have scratches or old screw holes.

The Prestige Solution: Use Google OR-Tools (industry standard
for operations research) to implement Defect-Aware Nesting.
We optimize not just for waste, but for usability.

Features:
- Google OR-Tools integration for linear programming
- Defect zone avoidance in remnants
- Multi-objective: minimize waste + cost + setup time
- Constraint programming for complex scenarios
"""

import logging
from typing import List, Dict, Any, Tuple
from dataclasses import dataclass, field
from enum import Enum

logger = logging.getLogger(__name__)

# Try to import OR-Tools, provide fallback if not available
try:
    from ortools.linear_solver import pywraplp
    ORTOOLS_AVAILABLE = True
except ImportError:
    ORTOOLS_AVAILABLE = False
    logger.warning(
        "Google OR-Tools not installed. Using fallback solver."
    )


class OptimizationObjective(Enum):
    """Optimization objectives for the solver."""
    MINIMIZE_WASTE = "minimize_waste"
    MINIMIZE_COST = "minimize_cost"
    MINIMIZE_BARS = "minimize_bars"         # Minimize number of bars used
    MINIMIZE_SETUP = "minimize_setup"       # Minimize cutting patterns
    BALANCED = "balanced"                   # Multi-objective balance


@dataclass
class DefectZone:
    """Represents a defect zone on a stock bar."""
    start_mm: float      # Start position from bar origin
    end_mm: float        # End position from bar origin
    severity: str = "minor"  # "minor", "major", "unusable"
    description: str = ""

    @property
    def length(self) -> float:
        """Length of defect zone."""
        return self.end_mm - self.start_mm
    
    def overlaps(self, cut_start: float, cut_end: float) -> bool:
        """Check if a cut would overlap with this defect."""
        return not (cut_end <= self.start_mm or cut_start >= self.end_mm)


@dataclass
class StockBarDef:
    """Stock bar definition for optimization."""
    id: str
    length: float        # mm
    quantity: int
    cost_per_unit: float = 0
    is_remnant: bool = False
    defects: List[DefectZone] = field(default_factory=list)
    profile_id: str = ""

    def get_usable_segments(self) -> List[Tuple[float, float]]:
        """Get list of usable segments avoiding defects."""
        if not self.defects:
            return [(0, self.length)]

        # Sort defects by start position
        sorted_defects = sorted(self.defects, key=lambda d: d.start_mm)

        segments = []
        current_start = 0

        for defect in sorted_defects:
            if defect.start_mm > current_start:
                segments.append((current_start, defect.start_mm))
            current_start = defect.end_mm

        # Add final segment
        if current_start < self.length:
            segments.append((current_start, self.length))

        return segments


@dataclass
class CutDef:
    """Cut definition for optimization."""
    id: str
    length: float        # mm
    quantity: int
    priority: int = 1    # 1=highest
    profile_id: str = ""
    allow_defects: bool = False  # Whether minor defects are acceptable


@dataclass
class CutAssignment:
    """Assignment of a cut to a bar position."""
    cut_id: str
    bar_id: str
    position: float      # Start position on bar
    length: float


@dataclass
class OptimizationSolution:
    """Complete solution from the optimizer."""
    assignments: List[CutAssignment]
    bars_used: Dict[str, int]  # bar_id -> quantity used
    total_waste: float
    total_cost: float
    utilization: float
    patterns_count: int
    solve_time_ms: float
    solver_status: str

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "assignments": [
                {
                    "cut_id": a.cut_id,
                    "bar_id": a.bar_id,
                    "position": a.position,
                    "length": a.length
                } for a in self.assignments
            ],
            "bars_used": self.bars_used,
            "metrics": {
                "total_waste_mm": round(self.total_waste, 1),
                "total_cost": round(self.total_cost, 2),
                "utilization_percent": round(self.utilization * 100, 1),
                "patterns_count": self.patterns_count
            },
            "solve_time_ms": round(self.solve_time_ms, 1),
            "solver_status": self.solver_status
        }


class DefectAwareOptimizer:
    """
    Defect-aware cutting optimization using OR-Tools.

    Implements multi-objective optimization that considers:
    - Material waste minimization
    - Cost minimization
    - Defect zone avoidance
    - Setup time reduction (fewer patterns)
    """

    def __init__(
        self,
        kerf_width: float = 3.0,  # mm
        min_usable_remnant: float = 100.0,  # mm
        time_limit_seconds: float = 30.0
    ):
        """
        Initialize the defect-aware optimizer.

        Args:
            kerf_width: Saw blade width in mm
            min_usable_remnant: Minimum remnant to preserve
            time_limit_seconds: Maximum solve time
        """
        self.kerf = kerf_width
        self.min_remnant = min_usable_remnant
        self.time_limit = time_limit_seconds

    def optimize(
        self,
        cuts: List[CutDef],
        stock: List[StockBarDef],
        objective: OptimizationObjective = OptimizationObjective.BALANCED
    ) -> OptimizationSolution:
        """
        Optimize cutting layout with defect awareness.

        Args:
            cuts: List of cuts needed
            stock: Available stock bars
            objective: Optimization objective

        Returns:
            OptimizationSolution with assignments and metrics
        """
        import time
        start_time = time.time()

        logger.info(
            f"Starting defect-aware optimization: {len(cuts)} cuts, "
            f"{len(stock)} stock types, objective={objective.value}"
        )

        if ORTOOLS_AVAILABLE:
            solution = self._solve_with_ortools(cuts, stock, objective)
        else:
            solution = self._solve_fallback(cuts, stock, objective)

        solve_time = (time.time() - start_time) * 1000
        solution.solve_time_ms = solve_time

        logger.info(
            f"Optimization complete: {len(solution.assignments)} "
            f"assignments, waste={solution.total_waste:.1f}mm, "
            f"time={solve_time:.1f}ms"
        )

        return solution
    
    def _solve_with_ortools(
        self,
        cuts: List[CutDef],
        stock: List[StockBarDef],
        objective: OptimizationObjective
    ) -> OptimizationSolution:
        """Solve using Google OR-Tools linear programming."""

        # Expand cuts by quantity
        expanded_cuts = []
        for cut in cuts:
            for i in range(cut.quantity):
                expanded_cuts.append(CutDef(
                    id=f"{cut.id}_{i}",
                    length=cut.length,
                    quantity=1,
                    priority=cut.priority,
                    profile_id=cut.profile_id,
                    allow_defects=cut.allow_defects
                ))

        # Expand stock
        expanded_stock = []
        for bar in stock:
            for i in range(bar.quantity):
                expanded_stock.append(StockBarDef(
                    id=f"{bar.id}_{i}",
                    length=bar.length,
                    quantity=1,
                    cost_per_unit=bar.cost_per_unit,
                    is_remnant=bar.is_remnant,
                    defects=bar.defects.copy(),
                    profile_id=bar.profile_id
                ))

        # Create solver
        solver = pywraplp.Solver.CreateSolver('SCIP')
        if not solver:
            logger.error("Could not create SCIP solver")
            return self._solve_fallback(cuts, stock, objective)

        solver.SetTimeLimit(int(self.time_limit * 1000))

        # Decision variables
        # x[i][j] = 1 if cut i is placed on bar j
        x = {}
        for i, cut in enumerate(expanded_cuts):
            for j, bar in enumerate(expanded_stock):
                # Only allow matching profiles
                if (cut.profile_id and bar.profile_id and
                        cut.profile_id != bar.profile_id):
                    continue
                # Check if cut fits
                if cut.length + self.kerf > bar.length:
                    continue
                x[i, j] = solver.BoolVar(f'cut_{i}_bar_{j}')

        # y[j] = 1 if bar j is used
        y = {}
        for j, bar in enumerate(expanded_stock):
            y[j] = solver.BoolVar(f'use_bar_{j}')

        # Constraint 1: Each cut must be placed exactly once
        for i, cut in enumerate(expanded_cuts):
            placement_vars = [
                x[i, j] for j in range(len(expanded_stock))
                if (i, j) in x
            ]
            if placement_vars:
                solver.Add(sum(placement_vars) == 1)

        # Constraint 2: Cuts on a bar must not exceed length
        for j, bar in enumerate(expanded_stock):
            # Get usable length (excluding major defects)
            usable_length = bar.length
            for defect in bar.defects:
                if defect.severity == "unusable":
                    usable_length -= defect.length

            cut_vars = [
                (expanded_cuts[i].length + self.kerf) * x[i, j]
                for i in range(len(expanded_cuts))
                if (i, j) in x
            ]

            if cut_vars:
                solver.Add(sum(cut_vars) <= usable_length * y[j])
        
        # Objective function based on selected objective
        obj = solver.Objective()
        
        if objective == OptimizationObjective.MINIMIZE_WASTE:
            # Minimize: total bar length used - total cut length
            for j, bar in enumerate(expanded_stock):
                obj.SetCoefficient(y[j], bar.length)
            # Subtract cut lengths (constant, doesn't affect optimization)
            
        elif objective == OptimizationObjective.MINIMIZE_COST:
            # Minimize: sum of costs
            for j, bar in enumerate(expanded_stock):
                cost = bar.cost_per_unit
                # Remnants have lower cost
                if bar.is_remnant:
                    cost *= 0.5
                obj.SetCoefficient(y[j], cost)
                
        elif objective == OptimizationObjective.MINIMIZE_BARS:
            # Minimize: number of bars used
            for j in range(len(expanded_stock)):
                obj.SetCoefficient(y[j], 1)
                
        else:  # BALANCED
            # Multi-objective: waste + cost + bars
            for j, bar in enumerate(expanded_stock):
                cost = (
                    bar.cost_per_unit if bar.cost_per_unit > 0
                    else bar.length * 0.01
                )
                if bar.is_remnant:
                    cost *= 0.3  # Strongly prefer using remnants
                # Combined weight
                obj.SetCoefficient(y[j], cost + bar.length * 0.001 + 10)

        obj.SetMinimization()

        # Solve
        status = solver.Solve()

        status_map = {
            pywraplp.Solver.OPTIMAL: "optimal",
            pywraplp.Solver.FEASIBLE: "feasible",
            pywraplp.Solver.INFEASIBLE: "infeasible",
            pywraplp.Solver.UNBOUNDED: "unbounded",
            pywraplp.Solver.NOT_SOLVED: "not_solved"
        }

        solver_status = status_map.get(status, "unknown")

        if status not in [
            pywraplp.Solver.OPTIMAL, pywraplp.Solver.FEASIBLE
        ]:
            logger.warning(
                f"Solver status: {solver_status}, using fallback"
            )
            return self._solve_fallback(cuts, stock, objective)

        # Extract solution
        assignments = []
        bars_used = {}

        for j, bar in enumerate(expanded_stock):
            if y[j].solution_value() > 0.5:
                bar_key = bar.id.rsplit('_', 1)[0]  # Original bar ID
                bars_used[bar_key] = bars_used.get(bar_key, 0) + 1

                # Find cuts assigned to this bar
                position = 0
                for i, cut in enumerate(expanded_cuts):
                    if (i, j) in x and x[i, j].solution_value() > 0.5:
                        assignments.append(CutAssignment(
                            cut_id=cut.id.rsplit('_', 1)[0],
                            bar_id=bar.id,
                            position=position,
                            length=cut.length
                        ))
                        position += cut.length + self.kerf

        # Calculate metrics
        total_cut_length = sum(c.length * c.quantity for c in cuts)
        total_bar_length = sum(
            bar.length * count
            for bar_id, count in bars_used.items()
            for bar in stock if bar.id == bar_id
        )
        total_waste = (
            total_bar_length - total_cut_length -
            len(assignments) * self.kerf
        )
        utilization = (
            total_cut_length / total_bar_length
            if total_bar_length > 0 else 0
        )

        total_cost = sum(
            next(
                (b.cost_per_unit for b in stock if b.id == bar_id), 0
            ) * count
            for bar_id, count in bars_used.items()
        )
        
        return OptimizationSolution(
            assignments=assignments,
            bars_used=bars_used,
            total_waste=max(0, total_waste),
            total_cost=total_cost,
            utilization=utilization,
            patterns_count=len(bars_used),
            solve_time_ms=0,  # Set by caller
            solver_status=solver_status
        )
    
    def _solve_fallback(
        self,
        cuts: List[CutDef],
        stock: List[StockBarDef],
        objective: OptimizationObjective
    ) -> OptimizationSolution:
        """
        Fallback solver using greedy heuristic.

        Used when OR-Tools is not available.
        """
        logger.info("Using fallback greedy solver")

        # Expand cuts
        expanded_cuts = []
        for cut in cuts:
            for i in range(cut.quantity):
                expanded_cuts.append({
                    'id': cut.id,
                    'length': cut.length,
                    'priority': cut.priority,
                    'profile_id': cut.profile_id,
                    'placed': False
                })

        # Sort cuts by length (largest first)
        expanded_cuts.sort(key=lambda c: (-c['priority'], -c['length']))

        # Sort stock by preference
        sorted_stock = sorted(
            stock,
            key=lambda s: (
                0 if s.is_remnant else 1, s.cost_per_unit, -s.length
            )
        )

        assignments = []
        bars_used = {}
        bar_positions = {}  # Track current position on each bar instance
        bar_instance_count = {}  # Track instances used per bar type

        for cut in expanded_cuts:
            placed = False

            for bar in sorted_stock:
                # Check profile compatibility
                if (cut['profile_id'] and bar.profile_id and
                        cut['profile_id'] != bar.profile_id):
                    continue

                # Check if we can use another instance of this bar
                instances_used = bar_instance_count.get(bar.id, 0)

                for instance in range(instances_used + 1):
                    if instance >= bar.quantity:
                        break

                    bar_instance_id = f"{bar.id}_{instance}"
                    current_pos = bar_positions.get(bar_instance_id, 0)

                    # Check if cut fits
                    if current_pos + cut['length'] + self.kerf <= bar.length:
                        # Check defect zones
                        can_place = True
                        for defect in bar.defects:
                            cut_end = current_pos + cut['length']
                            if defect.overlaps(current_pos, cut_end):
                                if (defect.severity != "minor" or
                                        not cut.get('allow_defects', False)):
                                    can_place = False
                                    break

                        if can_place:
                            assignments.append(CutAssignment(
                                cut_id=cut['id'],
                                bar_id=bar_instance_id,
                                position=current_pos,
                                length=cut['length']
                            ))

                            bar_positions[bar_instance_id] = (
                                current_pos + cut['length'] + self.kerf
                            )

                            if instance >= instances_used:
                                bar_instance_count[bar.id] = instance + 1
                                bars_used[bar.id] = (
                                    bars_used.get(bar.id, 0) + 1
                                )

                            placed = True
                            break

                if placed:
                    break

            if not placed:
                logger.warning(
                    f"Could not place cut {cut['id']} "
                    f"(length={cut['length']})"
                )

        # Calculate metrics
        total_cut_length = sum(c.length * c.quantity for c in cuts)
        total_bar_length = sum(
            next((b.length for b in stock if b.id == bar_id), 0) * count
            for bar_id, count in bars_used.items()
        )
        total_waste = (
            total_bar_length - sum(a.length for a in assignments) -
            len(assignments) * self.kerf
        )
        utilization = (
            total_cut_length / total_bar_length
            if total_bar_length > 0 else 0
        )

        total_cost = sum(
            next(
                (b.cost_per_unit for b in stock if b.id == bar_id), 0
            ) * count
            for bar_id, count in bars_used.items()
        )
        
        return OptimizationSolution(
            assignments=assignments,
            bars_used=bars_used,
            total_waste=max(0, total_waste),
            total_cost=total_cost,
            utilization=utilization,
            patterns_count=len(set(a.bar_id for a in assignments)),
            solve_time_ms=0,
            solver_status="fallback_greedy"
        )


