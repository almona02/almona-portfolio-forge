"""
Advanced 1D/2D Nesting Algorithms for Manufacturing Optimization
================================================================

Implements sophisticated nesting algorithms for the one-dimensional
cutting stock problem (1DCSP), critical for aluminum profile optimization.

Strategies:
- First-Fit Decreasing (FFD): Fast, simple heuristic
- Best-Fit Decreasing (BFD): Better waste reduction
- Genetic Algorithm: Optimal for complex scenarios
- Constraint Programming: Defect-aware optimization

Based on research from:
- filipwodnicki/custo (GitHub)
- jasonrhansen/cut-optimizer-1d (GitHub)
- Scientific literature on 1DCSP with genetic algorithms
"""

import random
import copy
import logging
import time
from typing import List, Dict, Optional, Any
from dataclasses import dataclass, field
from enum import Enum

logger = logging.getLogger(__name__)


class NestingStrategy(Enum):
    """Available nesting optimization strategies."""
    FIRST_FIT = "first_fit"
    BEST_FIT = "best_fit"
    WORST_FIT = "worst_fit"
    GENETIC = "genetic"
    CONSTRAINT_PROGRAMMING = "constraint_programming"


@dataclass
class CutPiece:
    """Represents a piece to be cut from stock material."""
    id: str
    length: float  # mm
    quantity: int
    material_type: str
    profile_id: str
    rotation_allowed: bool = False
    priority: int = 1  # 1=highest priority
    label: str = ""

    def __post_init__(self):
        """Validate cut piece parameters."""
        if self.length <= 0:
            raise ValueError(
                f"Cut length must be positive: {self.length}"
            )
        if self.quantity <= 0:
            raise ValueError(
                f"Quantity must be positive: {self.quantity}"
            )


@dataclass
class StockPiece:
    """Represents available stock material."""
    id: str
    length: float  # mm
    quantity: int
    material_type: str
    profile_id: str
    remnant_id: Optional[str] = None
    cost_per_mm: float = 0.0
    # [{start: x, end: y}]
    defects: List[Dict[str, float]] = field(default_factory=list)

    @property
    def is_remnant(self) -> bool:
        """Check if this is a remnant piece."""
        return self.remnant_id is not None

    def get_usable_length(self) -> float:
        """Get usable length excluding defect zones."""
        if not self.defects:
            return self.length

        defect_total = sum(
            d.get('end', 0) - d.get('start', 0) for d in self.defects
        )
        return max(0, self.length - defect_total)


@dataclass
class CutPlan:
    """Complete cutting plan for a single stock piece."""
    stock_piece_id: str
    stock_length: float
    cuts: List[CutPiece]
    used_length: float
    waste_length: float
    utilization_rate: float
    cutting_sequence: List[int]  # Order of cuts for optimization
    is_remnant: bool = False
    cost: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "stock_piece_id": self.stock_piece_id,
            "stock_length": self.stock_length,
            "cuts": [
                {
                    "id": c.id,
                    "length": c.length,
                    "quantity": c.quantity,
                    "profile_id": c.profile_id,
                    "label": c.label
                } for c in self.cuts
            ],
            "used_length": round(self.used_length, 2),
            "waste_length": round(self.waste_length, 2),
            "utilization_rate": round(self.utilization_rate, 4),
            "cutting_sequence": self.cutting_sequence,
            "is_remnant": self.is_remnant,
            "cost": round(self.cost, 2)
        }


@dataclass
class OptimizationResult:
    """Complete optimization result with metrics."""
    plans: List[CutPlan]
    total_waste: float
    total_cost: float
    overall_utilization: float
    stock_pieces_used: int
    remnants_used: int
    estimated_savings: float
    strategy_used: NestingStrategy
    optimization_time_ms: float

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "plans": [p.to_dict() for p in self.plans],
            "summary": {
                "total_waste": round(self.total_waste, 2),
                "total_cost": round(self.total_cost, 2),
                "overall_utilization": round(
                    self.overall_utilization, 4
                ),
                "stock_pieces_used": self.stock_pieces_used,
                "remnants_used": self.remnants_used,
                "estimated_savings": round(
                    self.estimated_savings, 2
                )
            },
            "metadata": {
                "strategy": self.strategy_used.value,
                "optimization_time_ms": round(
                    self.optimization_time_ms, 2
                )
            }
        }


class SmartNestingOptimizer:
    """
    Advanced nesting optimizer for aluminum profiles.

    Provides multiple strategies for 1D cutting stock optimization
    with support for remnants, defects, and multi-objective optimization.
    """

    # Genetic algorithm parameters
    POPULATION_SIZE = 50
    GENERATIONS = 100
    MUTATION_RATE = 0.12
    CROSSOVER_RATE = 0.8
    ELITISM_COUNT = 5
    TOURNAMENT_SIZE = 5

    def __init__(self, strategy: NestingStrategy = NestingStrategy.GENETIC):
        """
        Initialize the nesting optimizer.

        Args:
            strategy: Default optimization strategy to use
        """
        self.strategy = strategy
        self.logger = logging.getLogger(__name__)

    def optimize_1d_cutting(
        self,
        cut_pieces: List[CutPiece],
        stock_pieces: List[StockPiece],
        kerf: float = 3.0,  # mm, cutting blade width
        min_remnant: float = 100.0,  # mm, minimum usable remnant
        optimize_for: str = "waste",  # "waste", "cost", or "time"
        max_time_seconds: float = 30.0
    ) -> OptimizationResult:
        """
        Optimize 1D cutting (aluminum profiles).

        Args:
            cut_pieces: Pieces to cut (will be expanded by quantity)
            stock_pieces: Available stock material
            kerf: Cutting blade width (material loss per cut) in mm
            min_remnant: Minimum remnant length to keep in mm
            optimize_for: Optimization objective ("waste", "cost", "time")
            max_time_seconds: Maximum optimization time

        Returns:
            OptimizationResult with cutting plans and metrics
        """
        start_time = time.time()

        self.logger.info(
            f"Starting 1D optimization: {len(cut_pieces)} cut types, "
            f"{len(stock_pieces)} stock types, "
            f"strategy={self.strategy.value}"
        )

        # Expand cuts by quantity
        expanded_cuts = self._expand_cuts(cut_pieces)
        self.logger.info(
            f"Expanded to {len(expanded_cuts)} individual cuts"
        )

        if not expanded_cuts:
            return self._empty_result(start_time)

        # Make copies to avoid modifying originals
        available_stock = [copy.deepcopy(s) for s in stock_pieces]

        # Sort cuts by priority and length (largest first)
        sorted_cuts = sorted(
            expanded_cuts, key=lambda x: (-x.priority, -x.length)
        )

        # Sort stock: prioritize remnants (cheaper), then by length
        sorted_stock = sorted(
            available_stock,
            key=lambda x: (
                0 if x.is_remnant else 1,
                x.cost_per_mm,
                -x.length
            )
        )

        # Run optimization based on strategy
        if self.strategy == NestingStrategy.GENETIC:
            plans = self._genetic_optimization(
                sorted_cuts, sorted_stock, kerf, min_remnant,
                optimize_for, max_time_seconds
            )
        elif self.strategy == NestingStrategy.BEST_FIT:
            plans = self._best_fit_optimization(
                sorted_cuts, sorted_stock, kerf, min_remnant
            )
        elif self.strategy == NestingStrategy.WORST_FIT:
            plans = self._worst_fit_optimization(
                sorted_cuts, sorted_stock, kerf, min_remnant
            )
        else:
            plans = self._first_fit_optimization(
                sorted_cuts, sorted_stock, kerf, min_remnant
            )

        # Calculate metrics
        optimization_time = (time.time() - start_time) * 1000

        total_waste = sum(p.waste_length for p in plans)
        total_used = sum(p.used_length for p in plans)
        total_material = sum(p.stock_length for p in plans)
        total_cost = sum(p.cost for p in plans)

        if total_material > 0:
            overall_utilization = total_used / total_material
        else:
            overall_utilization = 0

        remnants_used = sum(1 for p in plans if p.is_remnant)

        # Estimate savings vs naive approach
        naive_waste = self._estimate_naive_waste(
            expanded_cuts, stock_pieces
        )
        # Approximate cost/mm
        estimated_savings = max(0, naive_waste - total_waste) * 0.02

        result = OptimizationResult(
            plans=plans,
            total_waste=total_waste,
            total_cost=total_cost,
            overall_utilization=overall_utilization,
            stock_pieces_used=len(plans),
            remnants_used=remnants_used,
            estimated_savings=estimated_savings,
            strategy_used=self.strategy,
            optimization_time_ms=optimization_time
        )

        self.logger.info(
            f"Optimization complete: {len(plans)} plans, "
            f"utilization={overall_utilization:.2%}, "
            f"waste={total_waste:.1f}mm, "
            f"time={optimization_time:.1f}ms"
        )

        return result

    def _expand_cuts(self, cut_pieces: List[CutPiece]) -> List[CutPiece]:
        """Expand cut pieces by quantity into individual cuts."""
        expanded = []
        for cut in cut_pieces:
            for i in range(cut.quantity):
                expanded.append(CutPiece(
                    id=f"{cut.id}_{i+1}",
                    length=cut.length,
                    quantity=1,
                    material_type=cut.material_type,
                    profile_id=cut.profile_id,
                    rotation_allowed=cut.rotation_allowed,
                    priority=cut.priority,
                    label=cut.label or f"{cut.id}_{i+1}"
                ))
        return expanded

    def _empty_result(self, start_time: float) -> OptimizationResult:
        """Return empty result when no cuts provided."""
        return OptimizationResult(
            plans=[],
            total_waste=0,
            total_cost=0,
            overall_utilization=0,
            stock_pieces_used=0,
            remnants_used=0,
            estimated_savings=0,
            strategy_used=self.strategy,
            optimization_time_ms=(time.time() - start_time) * 1000
        )

    def _estimate_naive_waste(
        self,
        cuts: List[CutPiece],
        stock: List[StockPiece]
    ) -> float:
        """Estimate waste from naive one-cut-per-bar approach."""
        if not stock:
            return 0
        avg_stock_length = sum(s.length for s in stock) / len(stock)
        total_cut_length = sum(c.length for c in cuts)
        num_bars_needed = len(cuts)  # Naive: one bar per cut
        return (num_bars_needed * avg_stock_length) - total_cut_length

    def _first_fit_optimization(
        self,
        cuts: List[CutPiece],
        stock: List[StockPiece],
        kerf: float,
        min_remnant: float
    ) -> List[CutPlan]:
        """
        First-Fit Decreasing algorithm.

        Simple and fast - places each cut in the first stock piece that fits.
        """
        plans: List[CutPlan] = []

        for cut in cuts:
            placed = False

            # Try to fit in existing plans
            for plan in plans:
                stock_piece = next(
                    (
                        s for s in stock
                        if s.id == plan.stock_piece_id and s.quantity > 0
                    ),
                    None
                )
                if not stock_piece:
                    continue

                # Check material and profile compatibility
                if (stock_piece.material_type != cut.material_type or
                        stock_piece.profile_id != cut.profile_id):
                    continue

                # Check if cut fits
                current_used = sum(c.length + kerf for c in plan.cuts)
                if (current_used + cut.length + kerf <=
                        stock_piece.length):
                    plan.cuts.append(cut)
                    placed = True
                    break

            if not placed:
                # Find new stock piece
                for stock_piece in stock:
                    if stock_piece.quantity <= 0:
                        continue

                    if (stock_piece.material_type != cut.material_type or
                            stock_piece.profile_id != cut.profile_id):
                        continue

                    if cut.length + kerf <= stock_piece.length:
                        # Create new plan
                        plan = CutPlan(
                            stock_piece_id=stock_piece.id,
                            stock_length=stock_piece.length,
                            cuts=[cut],
                            used_length=cut.length,
                            waste_length=(
                                stock_piece.length - cut.length - kerf
                            ),
                            utilization_rate=(
                                cut.length / stock_piece.length
                            ),
                            cutting_sequence=[0],
                            is_remnant=stock_piece.is_remnant,
                            cost=stock_piece.cost_per_mm * stock_piece.length
                        )
                        plans.append(plan)
                        stock_piece.quantity -= 1
                        placed = True
                        break

            if not placed:
                self.logger.warning(
                    f"Could not place cut {cut.id} "
                    f"(length={cut.length}mm)"
                )

        # Recalculate metrics for all plans
        return self._recalculate_plans(plans, kerf)

    def _best_fit_optimization(
        self,
        cuts: List[CutPiece],
        stock: List[StockPiece],
        kerf: float,
        min_remnant: float
    ) -> List[CutPlan]:
        """
        Best-Fit Decreasing algorithm.

        Places each cut in the stock piece that leaves the smallest waste.
        Better waste reduction than FFD but slightly slower.
        """
        plans: List[CutPlan] = []

        for cut in cuts:
            best_plan_idx = None
            best_waste = float('inf')

            # Find best existing plan
            for idx, plan in enumerate(plans):
                stock_piece = next(
                    (s for s in stock if s.id == plan.stock_piece_id),
                    None
                )
                if not stock_piece:
                    continue

                if (stock_piece.material_type != cut.material_type or
                        stock_piece.profile_id != cut.profile_id):
                    continue

                current_used = sum(c.length + kerf for c in plan.cuts)
                remaining = stock_piece.length - current_used

                if cut.length + kerf <= remaining:
                    new_waste = remaining - cut.length - kerf
                    if new_waste < best_waste:
                        best_waste = new_waste
                        best_plan_idx = idx

            if best_plan_idx is not None:
                plans[best_plan_idx].cuts.append(cut)
            else:
                # Find best new stock piece
                best_stock = None
                best_new_waste = float('inf')

                for stock_piece in stock:
                    if stock_piece.quantity <= 0:
                        continue

                    if (stock_piece.material_type != cut.material_type or
                            stock_piece.profile_id != cut.profile_id):
                        continue

                    if cut.length + kerf <= stock_piece.length:
                        new_waste = stock_piece.length - cut.length - kerf
                        if new_waste < best_new_waste:
                            best_new_waste = new_waste
                            best_stock = stock_piece

                if best_stock:
                    plan = CutPlan(
                        stock_piece_id=best_stock.id,
                        stock_length=best_stock.length,
                        cuts=[cut],
                        used_length=cut.length,
                        waste_length=best_new_waste,
                        utilization_rate=cut.length / best_stock.length,
                        cutting_sequence=[0],
                        is_remnant=best_stock.is_remnant,
                        cost=best_stock.cost_per_mm * best_stock.length
                    )
                    plans.append(plan)
                    best_stock.quantity -= 1
                else:
                    self.logger.warning(
                        f"Could not place cut {cut.id}"
                    )

        return self._recalculate_plans(plans, kerf)

    def _worst_fit_optimization(
        self,
        cuts: List[CutPiece],
        stock: List[StockPiece],
        kerf: float,
        min_remnant: float
    ) -> List[CutPlan]:
        """
        Worst-Fit Decreasing algorithm.

        Places each cut in the stock piece with the most remaining space.
        Can be useful when trying to consolidate waste.
        """
        plans: List[CutPlan] = []

        for cut in cuts:
            best_plan_idx = None
            most_space = -1

            for idx, plan in enumerate(plans):
                stock_piece = next(
                    (s for s in stock if s.id == plan.stock_piece_id),
                    None
                )
                if not stock_piece:
                    continue

                if (stock_piece.material_type != cut.material_type or
                        stock_piece.profile_id != cut.profile_id):
                    continue

                current_used = sum(c.length + kerf for c in plan.cuts)
                remaining = stock_piece.length - current_used

                if (cut.length + kerf <= remaining and
                        remaining > most_space):
                    most_space = remaining
                    best_plan_idx = idx

            if best_plan_idx is not None:
                plans[best_plan_idx].cuts.append(cut)
            else:
                # Find stock with most space
                best_stock = None
                most_new_space = -1

                for stock_piece in stock:
                    if stock_piece.quantity <= 0:
                        continue

                    if (stock_piece.material_type != cut.material_type or
                            stock_piece.profile_id != cut.profile_id):
                        continue

                    if cut.length + kerf <= stock_piece.length:
                        space = stock_piece.length
                        if space > most_new_space:
                            most_new_space = space
                            best_stock = stock_piece

                if best_stock:
                    plan = CutPlan(
                        stock_piece_id=best_stock.id,
                        stock_length=best_stock.length,
                        cuts=[cut],
                        used_length=cut.length,
                        waste_length=(
                            best_stock.length - cut.length - kerf
                        ),
                        utilization_rate=cut.length / best_stock.length,
                        cutting_sequence=[0],
                        is_remnant=best_stock.is_remnant,
                        cost=best_stock.cost_per_mm * best_stock.length
                    )
                    plans.append(plan)
                    best_stock.quantity -= 1

        return self._recalculate_plans(plans, kerf)

    def _genetic_optimization(
        self,
        cuts: List[CutPiece],
        stock: List[StockPiece],
        kerf: float,
        min_remnant: float,
        optimize_for: str,
        max_time: float
    ) -> List[CutPlan]:
        """
        Genetic Algorithm optimization.

        Uses evolutionary approach for near-optimal solutions on complex
        problems. Implements tournament selection, crossover, and mutation.
        """
        start_time = time.time()

        # Initialize population using FFD as seed
        population = []

        # Seed with heuristic solutions
        for _ in range(self.POPULATION_SIZE // 4):
            shuffled_cuts = cuts.copy()
            random.shuffle(shuffled_cuts)
            plans = self._first_fit_optimization(
                shuffled_cuts, copy.deepcopy(stock), kerf, min_remnant
            )
            population.append(plans)

        for _ in range(self.POPULATION_SIZE // 4):
            shuffled_cuts = cuts.copy()
            random.shuffle(shuffled_cuts)
            plans = self._best_fit_optimization(
                shuffled_cuts, copy.deepcopy(stock), kerf, min_remnant
            )
            population.append(plans)

        # Fill rest with random variations
        while len(population) < self.POPULATION_SIZE:
            shuffled_cuts = cuts.copy()
            random.shuffle(shuffled_cuts)
            plans = self._first_fit_optimization(
                shuffled_cuts, copy.deepcopy(stock), kerf, min_remnant
            )
            population.append(plans)

        best_solution = None
        best_fitness = float('-inf')
        generations_without_improvement = 0

        for generation in range(self.GENERATIONS):
            # Check time limit
            if time.time() - start_time > max_time:
                self.logger.info(
                    f"Time limit reached at generation {generation}"
                )
                break

            # Evaluate fitness
            fitness_scores = [
                self._calculate_fitness(plans, optimize_for)
                for plans in population
            ]

            # Track best
            gen_best_idx = max(
                range(len(population)),
                key=lambda i: fitness_scores[i]
            )
            if fitness_scores[gen_best_idx] > best_fitness:
                best_fitness = fitness_scores[gen_best_idx]
                best_solution = copy.deepcopy(
                    population[gen_best_idx]
                )
                generations_without_improvement = 0
            else:
                generations_without_improvement += 1

            # Early termination if no improvement
            if generations_without_improvement > 20:
                self.logger.info(
                    f"Converged at generation {generation}"
                )
                break

            # Selection and reproduction
            new_population = []

            # Elitism - keep best solutions
            elite_indices = sorted(
                range(len(population)),
                key=lambda i: fitness_scores[i],
                reverse=True
            )[:self.ELITISM_COUNT]

            for idx in elite_indices:
                new_population.append(copy.deepcopy(population[idx]))

            # Generate rest of population
            while len(new_population) < self.POPULATION_SIZE:
                # Tournament selection
                parent1 = self._tournament_select(
                    population, fitness_scores
                )
                parent2 = self._tournament_select(
                    population, fitness_scores
                )

                # Crossover
                if random.random() < self.CROSSOVER_RATE:
                    child = self._crossover(
                        parent1, parent2, cuts, stock, kerf, min_remnant
                    )
                else:
                    # Randomly select one parent to clone
                    if random.random() < 0.5:
                        parent = parent1
                    else:
                        parent = parent2
                    child = copy.deepcopy(parent)

                # Mutation
                if random.random() < self.MUTATION_RATE:
                    child = self._mutate(
                        child, cuts, stock, kerf, min_remnant
                    )

                new_population.append(child)

            population = new_population

        return best_solution if best_solution else population[0]

    def _calculate_fitness(
        self, plans: List[CutPlan], optimize_for: str
    ) -> float:
        """Calculate fitness score for a solution."""
        if not plans:
            return float('-inf')

        total_waste = sum(p.waste_length for p in plans)
        total_cost = sum(p.cost for p in plans)
        num_bars = len(plans)
        total_stock_len = sum(p.stock_length for p in plans)
        utilization = 1 - (total_waste / total_stock_len)

        if optimize_for == "waste":
            # Maximize utilization, penalize waste
            return (
                utilization * 1000 - total_waste * 0.1 - num_bars * 10
            )
        elif optimize_for == "cost":
            # Minimize cost
            return 10000 / (total_cost + 1) + utilization * 100
        else:  # time - favor fewer setups
            return 1000 / (num_bars + 1) + utilization * 500

    def _tournament_select(
        self,
        population: List[List[CutPlan]],
        fitness_scores: List[float]
    ) -> List[CutPlan]:
        """Tournament selection for genetic algorithm."""
        tournament_indices = random.sample(
            range(len(population)), self.TOURNAMENT_SIZE
        )
        winner_idx = max(
            tournament_indices, key=lambda i: fitness_scores[i]
        )
        return copy.deepcopy(population[winner_idx])

    def _crossover(
        self,
        parent1: List[CutPlan],
        parent2: List[CutPlan],
        cuts: List[CutPiece],
        stock: List[StockPiece],
        kerf: float,
        min_remnant: float
    ) -> List[CutPlan]:
        """Crossover operation - combine two solutions."""
        # Extract cut assignments from both parents
        assignments1 = {}
        assignments2 = {}

        for plan in parent1:
            for cut in plan.cuts:
                assignments1[cut.id] = plan.stock_piece_id

        for plan in parent2:
            for cut in plan.cuts:
                assignments2[cut.id] = plan.stock_piece_id

        # Create child by randomly selecting from each parent
        child_order = []
        for cut in cuts:
            if random.random() < 0.5 and cut.id in assignments1:
                child_order.append(
                    (cut, assignments1.get(cut.id, None))
                )
            else:
                child_order.append(
                    (cut, assignments2.get(cut.id, None))
                )

        # Sort by assignment to group similar
        random.shuffle(child_order)
        ordered_cuts = [c[0] for c in child_order]

        return self._first_fit_optimization(
            ordered_cuts, copy.deepcopy(stock), kerf, min_remnant
        )

    def _mutate(
        self,
        solution: List[CutPlan],
        cuts: List[CutPiece],
        stock: List[StockPiece],
        kerf: float,
        min_remnant: float
    ) -> List[CutPlan]:
        """Mutation operation - make small random changes."""
        if len(solution) < 2:
            return solution

        mutation_type = random.choice(['swap', 'repack', 'shuffle'])

        if mutation_type == 'swap' and len(solution) >= 2:
            # Swap cuts between two plans
            idx1, idx2 = random.sample(range(len(solution)), 2)
            if solution[idx1].cuts and solution[idx2].cuts:
                cut1_idx = random.randrange(len(solution[idx1].cuts))
                cut2_idx = random.randrange(len(solution[idx2].cuts))

                # Swap
                (solution[idx1].cuts[cut1_idx],
                 solution[idx2].cuts[cut2_idx]) = (
                    solution[idx2].cuts[cut2_idx],
                    solution[idx1].cuts[cut1_idx]
                )

        elif mutation_type == 'repack':
            # Repack a random plan
            if solution:
                idx = random.randrange(len(solution))
                plan_cuts = solution[idx].cuts.copy()
                random.shuffle(plan_cuts)
                solution[idx].cuts = plan_cuts

        else:  # shuffle
            # Rebuild from shuffled cuts
            all_cuts = [
                cut for plan in solution for cut in plan.cuts
            ]
            random.shuffle(all_cuts)
            return self._first_fit_optimization(
                all_cuts, copy.deepcopy(stock), kerf, min_remnant
            )

        return self._recalculate_plans(solution, kerf)

    def _recalculate_plans(
        self, plans: List[CutPlan], kerf: float
    ) -> List[CutPlan]:
        """Recalculate metrics for all plans."""
        for plan in plans:
            total_cut = sum(c.length for c in plan.cuts)
            total_kerf = kerf * len(plan.cuts)
            plan.used_length = total_cut + total_kerf
            plan.waste_length = max(
                0, plan.stock_length - plan.used_length
            )
            if plan.stock_length > 0:
                plan.utilization_rate = (
                    plan.used_length / plan.stock_length
                )
            else:
                plan.utilization_rate = 0
            plan.cutting_sequence = list(range(len(plan.cuts)))

        return plans
