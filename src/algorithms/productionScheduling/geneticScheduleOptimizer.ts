/**
 * Genetic Algorithm Production Schedule Optimizer
 * ---------------------------------------------------------------------------
 * Optimizes production schedules using genetic algorithms for:
 * - Machine assignment
 * - Operation sequencing
 * - Resource allocation
 * - Timeline optimization
 */

export interface FabricatorProject {
  id: string;
  orderNumber: string;
  priority: number;
  dueDate: Date;
  estimatedDuration: number; // hours
  requiredMachines: string[];
  dependencies: string[];
  status: 'pending' | 'scheduled' | 'in_progress' | 'completed';
}

export interface Machine {
  id: string;
  name: string;
  type: string;
  capabilities: string[];
  maxCapacity: number;
  currentLoad: number;
  availability: Date[];
}

export interface ScheduledOperation {
  id: string;
  projectId: string;
  machineId: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  priority: number;
}

export interface MachineAssignment {
  machineId: string;
  machineType: string;
  operations: ScheduledOperation[];
  utilization: number;
  estimatedDuration: number;
}

export interface ProductionConstraints {
  maxConcurrentOperations: number;
  minTimeBetweenOperations: number; // minutes
  machineSetupTime: number; // minutes
  maxOvertime: number; // hours per day
}

export interface ScheduleOptimization {
  fitness: number;
  makespan: number; // total schedule duration
  machineUtilization: number;
  averageWaitingTime: number;
  onTimeDeliveryRate: number;
}

export interface ProductionSchedule {
  id: string;
  projectId: string;
  machineAssignments: MachineAssignment[];
  timeline: ScheduleTimeline;
  constraints: ProductionConstraints;
  optimization: ScheduleOptimization;
}

export interface ScheduleTimeline {
  startDate: Date;
  endDate: Date;
  milestones: TimelineMilestone[];
}

export interface TimelineMilestone {
  id: string;
  name: string;
  date: Date;
  type: 'start' | 'milestone' | 'completion';
}

interface Chromosome {
  assignments: MachineAssignment[];
  fitness: number;
}

const MAX_GENERATIONS = 100;
const POPULATION_SIZE = 50;
const MUTATION_RATE = 0.1;
const CROSSOVER_RATE = 0.8;
const ELITE_COUNT = 5;

/**
 * Genetic algorithm for production scheduling
 */
export function geneticScheduleOptimizer(
  projects: FabricatorProject[],
  machines: Machine[]
): ProductionSchedule {
  // Initialize population
  let population: Chromosome[] = initializePopulation(projects, machines);

  // Evolve population
  for (let generation = 0; generation < MAX_GENERATIONS; generation++) {
    // Evaluate fitness
    const fitness = evaluateFitness(population, projects, machines);

    // Select parents (elite + tournament selection)
    const selected = selection(population, fitness);

    // Crossover
    const offspring = crossover(selected, projects, machines);

    // Mutation
    const mutated = mutation(offspring, machines);

    // Replace population (elitism)
    population = replacePopulation(population, mutated, fitness);
  }

  // Get best schedule
  const bestChromosome = getBestSchedule(population);
  return formatSchedule(bestChromosome, projects, machines);
}

/**
 * Initialize population with random schedules
 */
function initializePopulation(
  projects: FabricatorProject[],
  machines: Machine[]
): Chromosome[] {
  const population: Chromosome[] = [];

  for (let i = 0; i < POPULATION_SIZE; i++) {
    const assignments = generateRandomAssignments(projects, machines);
    population.push({
      assignments,
      fitness: 0, // Will be calculated later
    });
  }

  return population;
}

/**
 * Generate random machine assignments
 */
function generateRandomAssignments(
  projects: FabricatorProject[],
  machines: Machine[]
): MachineAssignment[] {
  const assignments: MachineAssignment[] = [];
  const machineMap = new Map<string, Machine>();
  machines.forEach((m) => machineMap.set(m.id, m));

  // Initialize assignments for each machine
  machines.forEach((machine) => {
    assignments.push({
      machineId: machine.id,
      machineType: machine.type,
      operations: [],
      utilization: 0,
      estimatedDuration: 0,
    });
  });

  // Assign projects to machines randomly
  projects.forEach((project) => {
    const compatibleMachines = machines.filter((m) =>
      project.requiredMachines.some((req) => m.capabilities.includes(req))
    );

    if (compatibleMachines.length === 0) {
      // Fallback to any machine
      const randomMachine = machines[Math.floor(Math.random() * machines.length)];
      const assignment = assignments.find((a) => a.machineId === randomMachine.id)!;
      assignment.operations.push({
        id: `op-${project.id}`,
        projectId: project.id,
        machineId: randomMachine.id,
        startTime: new Date(),
        endTime: new Date(Date.now() + project.estimatedDuration * 3600000),
        duration: project.estimatedDuration,
        priority: project.priority,
      });
    } else {
      const randomMachine =
        compatibleMachines[Math.floor(Math.random() * compatibleMachines.length)];
      const assignment = assignments.find((a) => a.machineId === randomMachine.id)!;
      assignment.operations.push({
        id: `op-${project.id}`,
        projectId: project.id,
        machineId: randomMachine.id,
        startTime: new Date(),
        endTime: new Date(Date.now() + project.estimatedDuration * 3600000),
        duration: project.estimatedDuration,
        priority: project.priority,
      });
    }
  });

  // Calculate utilization and duration
  assignments.forEach((assignment) => {
    const totalDuration = assignment.operations.reduce(
      (sum, op) => sum + op.duration,
      0
    );
    assignment.estimatedDuration = totalDuration;
    assignment.utilization = totalDuration > 0 ? (totalDuration / 24) * 100 : 0; // Assuming 24h max
  });

  return assignments;
}

/**
 * Evaluate fitness of a chromosome
 */
function evaluateFitness(
  population: Chromosome[],
  projects: FabricatorProject[],
  machines: Machine[]
): number[] {
  return population.map((chromosome) => {
    let fitness = 0;

    // Minimize makespan (total schedule duration)
    const makespan = calculateMakespan(chromosome.assignments);
    fitness += 1000 / (makespan + 1); // Higher makespan = lower fitness

    // Maximize machine utilization
    const avgUtilization = calculateAverageUtilization(chromosome.assignments);
    fitness += avgUtilization * 10;

    // Minimize waiting time
    const avgWaitingTime = calculateAverageWaitingTime(chromosome.assignments, projects);
    fitness += 100 / (avgWaitingTime + 1);

    // Maximize on-time delivery
    const onTimeRate = calculateOnTimeDeliveryRate(chromosome.assignments, projects);
    fitness += onTimeRate * 20;

    // Penalize constraint violations
    const violations = countConstraintViolations(chromosome.assignments, projects);
    fitness -= violations * 50;

    chromosome.fitness = fitness;
    return fitness;
  });
}

/**
 * Calculate makespan (total schedule duration)
 */
function calculateMakespan(assignments: MachineAssignment[]): number {
  let maxEndTime = 0;

  assignments.forEach((assignment) => {
    assignment.operations.forEach((op) => {
      const endTime = op.endTime.getTime();
      if (endTime > maxEndTime) {
        maxEndTime = endTime;
      }
    });
  });

  return maxEndTime;
}

/**
 * Calculate average machine utilization
 */
function calculateAverageUtilization(assignments: MachineAssignment[]): number {
  if (assignments.length === 0) return 0;

  const totalUtilization = assignments.reduce(
    (sum, assignment) => sum + assignment.utilization,
    0
  );
  return totalUtilization / assignments.length;
}

/**
 * Calculate average waiting time
 */
function calculateAverageWaitingTime(
  assignments: MachineAssignment[],
  projects: FabricatorProject[]
): number {
  // Simplified: calculate time from project creation to operation start
  let totalWaiting = 0;
  let count = 0;

  assignments.forEach((assignment) => {
    assignment.operations.forEach((op) => {
      const project = projects.find((p) => p.id === op.projectId);
      if (project) {
        const waitingTime = op.startTime.getTime() - new Date().getTime();
        totalWaiting += Math.max(0, waitingTime);
        count++;
      }
    });
  });

  return count > 0 ? totalWaiting / count : 0;
}

/**
 * Calculate on-time delivery rate
 */
function calculateOnTimeDeliveryRate(
  assignments: MachineAssignment[],
  projects: FabricatorProject[]
): number {
  let onTimeCount = 0;
  let totalCount = 0;

  assignments.forEach((assignment) => {
    assignment.operations.forEach((op) => {
      const project = projects.find((p) => p.id === op.projectId);
      if (project) {
        totalCount++;
        if (op.endTime <= project.dueDate) {
          onTimeCount++;
        }
      }
    });
  });

  return totalCount > 0 ? onTimeCount / totalCount : 0;
}

/**
 * Count constraint violations
 */
function countConstraintViolations(
  assignments: MachineAssignment[],
  projects: FabricatorProject[]
): number {
  let violations = 0;

  // Check dependency violations
  projects.forEach((project) => {
    project.dependencies.forEach((depId) => {
      const depProject = projects.find((p) => p.id === depId);
      if (depProject) {
        const depOp = findOperation(assignments, depId);
        const projectOp = findOperation(assignments, project.id);

        if (depOp && projectOp && projectOp.startTime < depOp.endTime) {
          violations++;
        }
      }
    });
  });

  return violations;
}

/**
 * Find operation for a project
 */
function findOperation(
  assignments: MachineAssignment[],
  projectId: string
): ScheduledOperation | undefined {
  for (const assignment of assignments) {
    const op = assignment.operations.find((o) => o.projectId === projectId);
    if (op) return op;
  }
  return undefined;
}

/**
 * Selection: Elite + Tournament
 */
function selection(
  population: Chromosome[],
  fitness: number[]
): Chromosome[] {
  const selected: Chromosome[] = [];

  // Elite selection
  const sorted = [...population].sort((a, b) => b.fitness - a.fitness);
  selected.push(...sorted.slice(0, ELITE_COUNT));

  // Tournament selection for the rest
  while (selected.length < POPULATION_SIZE) {
    const tournamentSize = 3;
    const tournament: Chromosome[] = [];

    for (let i = 0; i < tournamentSize; i++) {
      const randomIndex = Math.floor(Math.random() * population.length);
      tournament.push(population[randomIndex]);
    }

    const winner = tournament.reduce((best, current) =>
      current.fitness > best.fitness ? current : best
    );
    selected.push(winner);
  }

  return selected;
}

/**
 * Crossover: Single-point crossover
 */
function crossover(
  parents: Chromosome[],
  projects: FabricatorProject[],
  machines: Machine[]
): Chromosome[] {
  const offspring: Chromosome[] = [];

  for (let i = 0; i < parents.length - 1; i += 2) {
    if (Math.random() < CROSSOVER_RATE) {
      const parent1 = parents[i];
      const parent2 = parents[i + 1];

      // Single-point crossover
      const crossoverPoint = Math.floor(parent1.assignments.length / 2);

      const child1Assignments = [
        ...parent1.assignments.slice(0, crossoverPoint),
        ...parent2.assignments.slice(crossoverPoint),
      ];

      const child2Assignments = [
        ...parent2.assignments.slice(0, crossoverPoint),
        ...parent1.assignments.slice(crossoverPoint),
      ];

      // Repair: ensure all projects are assigned
      repairAssignments(child1Assignments, projects, machines);
      repairAssignments(child2Assignments, projects, machines);

      offspring.push(
        { assignments: child1Assignments, fitness: 0 },
        { assignments: child2Assignments, fitness: 0 }
      );
    } else {
      // No crossover, keep parents
      offspring.push(parents[i], parents[i + 1]);
    }
  }

  return offspring;
}

/**
 * Repair assignments to ensure all projects are included
 */
function repairAssignments(
  assignments: MachineAssignment[],
  projects: FabricatorProject[],
  machines: Machine[]
): void {
  const assignedProjects = new Set<string>();

  assignments.forEach((assignment) => {
    assignment.operations.forEach((op) => {
      assignedProjects.add(op.projectId);
    });
  });

  // Add missing projects
  projects.forEach((project) => {
    if (!assignedProjects.has(project.id)) {
      const compatibleMachines = machines.filter((m) =>
        project.requiredMachines.some((req) => m.capabilities.includes(req))
      );

      if (compatibleMachines.length > 0) {
        const randomMachine =
          compatibleMachines[Math.floor(Math.random() * compatibleMachines.length)];
        const assignment = assignments.find((a) => a.machineId === randomMachine.id)!;

        assignment.operations.push({
          id: `op-${project.id}`,
          projectId: project.id,
          machineId: randomMachine.id,
          startTime: new Date(),
          endTime: new Date(Date.now() + project.estimatedDuration * 3600000),
          duration: project.estimatedDuration,
          priority: project.priority,
        });
      }
    }
  });
}

/**
 * Mutation: Random swap or reassignment
 */
function mutation(
  population: Chromosome[],
  machines: Machine[]
): Chromosome[] {
  return population.map((chromosome) => {
    if (Math.random() < MUTATION_RATE) {
      const mutated = { ...chromosome, assignments: [...chromosome.assignments] };

      // Random mutation: swap two operations
      const allOps: ScheduledOperation[] = [];
      mutated.assignments.forEach((assignment) => {
        allOps.push(...assignment.operations);
      });

      if (allOps.length >= 2) {
        const index1 = Math.floor(Math.random() * allOps.length);
        const index2 = Math.floor(Math.random() * allOps.length);

        if (index1 !== index2) {
          const op1 = allOps[index1];
          const op2 = allOps[index2];

          // Swap machine assignments
          const assignment1 = mutated.assignments.find((a) => a.machineId === op1.machineId)!;
          const assignment2 = mutated.assignments.find((a) => a.machineId === op2.machineId)!;

          const op1Index = assignment1.operations.indexOf(op1);
          const op2Index = assignment2.operations.indexOf(op2);

          if (op1Index !== -1 && op2Index !== -1) {
            assignment1.operations[op1Index] = op2;
            assignment2.operations[op2Index] = op1;
          }
        }
      }

      return mutated;
    }
    return chromosome;
  });
}

/**
 * Replace population: Elitism
 */
function replacePopulation(
  oldPopulation: Chromosome[],
  newPopulation: Chromosome[],
  fitness: number[]
): Chromosome[] {
  // Keep elite from old population
  const sorted = [...oldPopulation].sort((a, b) => b.fitness - a.fitness);
  const elite = sorted.slice(0, ELITE_COUNT);

  // Combine with new population
  const combined = [...elite, ...newPopulation];

  // Sort and take top POPULATION_SIZE
  return combined
    .sort((a, b) => b.fitness - a.fitness)
    .slice(0, POPULATION_SIZE);
}

/**
 * Get best schedule from population
 */
function getBestSchedule(population: Chromosome[]): Chromosome {
  return population.reduce((best, current) =>
    current.fitness > best.fitness ? current : best
  );
}

/**
 * Format schedule for output
 */
function formatSchedule(
  chromosome: Chromosome,
  projects: FabricatorProject[],
  machines: Machine[]
): ProductionSchedule {
  const makespan = calculateMakespan(chromosome.assignments);
  const avgUtilization = calculateAverageUtilization(chromosome.assignments);
  const avgWaitingTime = calculateAverageWaitingTime(chromosome.assignments, projects);
  const onTimeRate = calculateOnTimeDeliveryRate(chromosome.assignments, projects);

  // Find earliest start and latest end
  let earliestStart = new Date();
  let latestEnd = new Date();

  chromosome.assignments.forEach((assignment) => {
    assignment.operations.forEach((op) => {
      if (op.startTime < earliestStart) {
        earliestStart = op.startTime;
      }
      if (op.endTime > latestEnd) {
        latestEnd = op.endTime;
      }
    });
  });

  return {
    id: `schedule-${Date.now()}`,
    projectId: projects[0]?.id || 'unknown',
    machineAssignments: chromosome.assignments,
    timeline: {
      startDate: earliestStart,
      endDate: latestEnd,
      milestones: projects.map((project) => {
        const op = findOperation(chromosome.assignments, project.id);
        return {
          id: `milestone-${project.id}`,
          name: project.orderNumber,
          date: op?.endTime || project.dueDate,
          type: 'completion' as const,
        };
      }),
    },
    constraints: {
      maxConcurrentOperations: 3,
      minTimeBetweenOperations: 15,
      machineSetupTime: 30,
      maxOvertime: 4,
    },
    optimization: {
      fitness: chromosome.fitness,
      makespan,
      machineUtilization: avgUtilization,
      averageWaitingTime: avgWaitingTime,
      onTimeDeliveryRate: onTimeRate,
    },
  };
}

/**
 * Apply production constraints to schedule
 */
export function applyProductionConstraints(
  schedule: ProductionSchedule
): ProductionSchedule {
  // Sort operations by start time within each machine
  schedule.machineAssignments.forEach((assignment) => {
    assignment.operations.sort(
      (a, b) => a.startTime.getTime() - b.startTime.getTime()
    );

    // Apply minimum time between operations
    let currentEnd = assignment.operations[0]?.startTime || new Date();

    assignment.operations.forEach((op, index) => {
      if (index > 0) {
        const minGap = schedule.constraints.minTimeBetweenOperations * 60000; // Convert to ms
        const gap = op.startTime.getTime() - currentEnd.getTime();

        if (gap < minGap) {
          op.startTime = new Date(currentEnd.getTime() + minGap);
          op.endTime = new Date(
            op.startTime.getTime() + op.duration * 3600000
          );
        }
      }

      currentEnd = op.endTime;
    });
  });

  return schedule;
}

