export interface AssetHealthInput {
    runtimeHours: number;
    totalCycles: number;
    lastServiceDate?: Date;
    installationDate?: Date;
    sensorwarnings?: number; // Count of recent sensor warnings
}

export interface MaintenanceAction {
    id: string;
    type: 'maintenance' | 'inspection' | 'replacement' | 'calibration' | 'repair';
    priority: 'critical' | 'high' | 'medium' | 'low';
    title: string;
    description: string;
    dueInHours?: number;
    isOverdue: boolean;
}

export interface AssetHealthScore {
    score: number; // 0-100
    status: 'optimal' | 'good' | 'warning' | 'critical';
    factors: string[]; // Reasons for score deduction
    nextServiceDate?: Date;
    predictedFailureProb?: number; // 0-1
    actions: MaintenanceAction[];
}

/**
 * MaintenanceRulesEngine
 * 
 * deterministic engine to calculate asset health and predict maintenance.
 * Pure logic, no side effects.
 */
export class MaintenanceRulesEngine {
    
    // Configurable thresholds (could be loaded from DB later)
    private static readonly SERVICE_INTERVAL_HOURS = 500; // e.g., every 500 hours
    // private static readonly ANNUAL_SERVICE_DAYS = 365; // Unused
    private static readonly WARNING_THRESHOLD_SCORE = 70;
    private static readonly CRITICAL_THRESHOLD_SCORE = 40;

    /**
     * Calculate comprehensive health score and maintenance needs
     */
    public static calculateHealth(input: AssetHealthInput): AssetHealthScore {
        let score = 100;
        const factors: string[] = [];
        const actions: MaintenanceAction[] = [];

        // 1. Runtime-based Maintenance
        const hoursSinceLastService = input.runtimeHours % this.SERVICE_INTERVAL_HOURS;
        const hoursUntilService = this.SERVICE_INTERVAL_HOURS - hoursSinceLastService;
        
        // If we are close to interval (e.g. within 50 hours)
        if (hoursUntilService <= 50) {
            score -= 10;
            factors.push('Scheduled maintenance approaching');
            actions.push({
                id: 'sched-maint-1',
                type: 'maintenance',
                priority: hoursUntilService < 10 ? 'high' : 'medium',
                title: 'Periodic Maintenance Due',
                description: `Standard maintenance required in ${hoursUntilService} hours.`,
                dueInHours: hoursUntilService,
                isOverdue: false
            });
        }

        // 2. Age-based Degradation (Annual Service)
        if (input.lastServiceDate) {
            const daysSinceService = Math.floor((new Date().getTime() - input.lastServiceDate.getTime()) / (1000 * 3600 * 24));
            if (daysSinceService > 365) {
                score -= 20;
                factors.push('Annual service overdue');
                actions.push({
                    id: 'annual-svc-1',
                    type: 'inspection',
                    priority: 'high',
                    title: 'Annual Inspection Overdue',
                    description: `It has been ${daysSinceService} days since last service.`,
                    isOverdue: true
                });
            } else if (daysSinceService > 330) {
                 factors.push('Annual service due soon');
            }
        }

        // 3. Sensor Warnings Impact
        if (input.sensorwarnings && input.sensorwarnings > 0) {
            const deduction = Math.min(input.sensorwarnings * 5, 40); // Cap at 40
            score -= deduction;
            factors.push(`${input.sensorwarnings} active sensor warnings`);
            actions.push({
                id: 'sensor-check-1',
                type: 'repair',
                priority: 'critical',
                title: 'Sensor Warning Check',
                description: 'Investigate active sensor alerts immediately.',
                isOverdue: true
            });
        }

        // 4. Usage Intensity (Wear & Tear)
        // Simple logic: if total cycles are extremely high relative to age (mock logic)
        // ... (can be expanded)

        // Clamp score
        score = Math.max(0, Math.min(100, score));

        // Determine Status based on Score and Actions
        let status: AssetHealthScore['status'] = 'optimal';
        
        // Base status on score
        if (score <= this.CRITICAL_THRESHOLD_SCORE) status = 'critical';
        else if (score <= this.WARNING_THRESHOLD_SCORE) status = 'warning';
        else if (score < 90) status = 'good';

        // Override status based on action priority (Severity takes precedence)
        const hasCritical = actions.some(a => a.priority === 'critical');
        const hasHigh = actions.some(a => a.priority === 'high');

        if (hasCritical) {
            status = 'critical';
        } else if (hasHigh && status !== 'critical') {
            status = 'warning';
        }

        return {
            score,
            status,
            factors,
            actions,
            // Simple prediction: assume running 8h/day
            nextServiceDate: new Date(Date.now() + hoursUntilService * 3600 * 1000 / 8) // Mock projection
        };
    }
}
