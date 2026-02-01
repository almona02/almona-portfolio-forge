/**
 * CONSTITUTIONAL PERFORMANCE PROFILER
 * React Profiler wrapper with tier classification
 * 
 * Extends React.Profiler to add constitutional context to performance metrics
 */

import React from 'react';
import { globalPerformanceMonitor as performanceMonitor } from './PerformanceMonitor';

export type ConstitutionalTier = 'Tier 0' | 'Tier 3' | 'Mixed';

export interface ConstitutionalProfilerProps {
    id: string;
    tier: ConstitutionalTier;
    egyptianTemplate?: string;
    children: React.ReactNode;
}

export interface ConstitutionalPerformanceData {
    component: string;
    phase: 'mount' | 'update' | 'nested-update';
    actualDuration: number;
    baseDuration: number;
    startTime: number;
    commitTime: number;
    constitutionalTier: ConstitutionalTier;
    egyptianTemplate?: string;
    timestamp: number;
}

/**
 * React Profiler wrapper that adds constitutional context to metrics
 * 
 * Usage:
 * ```tsx
 * <ConstitutionalProfiler 
 *   id="DraftingCanvas" 
 *   tier="Tier 0"
 *   egyptianTemplate="casement_2x2"
 * >
 *   <DraftingCanvas />
 * </ConstitutionalProfiler>
 * ```
 */
export const ConstitutionalProfiler: React.FC<ConstitutionalProfilerProps> = ({
    id,
    tier,
    egyptianTemplate,
    children
}) => {
    const onRender = (
        id: string,
        phase: 'mount' | 'update' | 'nested-update',
        actualDuration: number,
        baseDuration: number,
        startTime: number,
        commitTime: number
    ) => {
        // Record in global performance monitor
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const metrics = performanceMonitor.getMetrics();

        // Log constitutional context
        const perfData: ConstitutionalPerformanceData = {
            component: id,
            phase,
            actualDuration,
            baseDuration,
            startTime,
            commitTime,
            constitutionalTier: tier,
            egyptianTemplate,
            timestamp: Date.now()
        };

        // Store in sessionStorage for constitutional audit trail
        try {
            const existingData = sessionStorage.getItem('constitutional_performance_data');
            const dataArray: ConstitutionalPerformanceData[] = existingData
                ? JSON.parse(existingData)
                : [];

            dataArray.push(perfData);

            // Keep last 100 entries
            if (dataArray.length > 100) {
                dataArray.shift();
            }

            sessionStorage.setItem('constitutional_performance_data', JSON.stringify(dataArray));
        } catch (error) {
            console.warn('ConstitutionalProfiler: Failed to store performance data', error);
        }

        // Warn if Tier 0 component is slow (>16.67ms for 60fps)
        if (tier === 'Tier 0' && actualDuration > 16.67) {
            console.warn(
                `⚠️ CONSTITUTIONAL PERFORMANCE: Tier 0 component "${id}" took ${actualDuration.toFixed(2)}ms ` +
                `(target: <16.67ms for 60fps). Egyptian template: ${egyptianTemplate || 'none'}`
            );
        }

        // Warn if Tier 3 component is slow (>100ms for interactive)
        if (tier === 'Tier 3' && actualDuration > 100) {
            console.warn(
                `⚠️ CONSTITUTIONAL PERFORMANCE: Tier 3 component "${id}" took ${actualDuration.toFixed(2)}ms ` +
                `(target: <100ms for interactive responsiveness). Egyptian template: ${egyptianTemplate || 'none'}`
            );
        }
    };

    return (
        <React.Profiler id={id} onRender={onRender}>
            {children}
        </React.Profiler>
    );
};

/**
 * Get constitutional performance data from session storage
 */
export function getConstitutionalPerformanceData(): ConstitutionalPerformanceData[] {
    try {
        const data = sessionStorage.getItem('constitutional_performance_data');
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Failed to retrieve constitutional performance data', error);
        return [];
    }
}

/**
 * Clear constitutional performance data
 */
export function clearConstitutionalPerformanceData(): void {
    sessionStorage.removeItem('constitutional_performance_data');
}

/**
 * Generate constitutional performance report
 */
export function generateConstitutionalPerformanceReport() {
    const data = getConstitutionalPerformanceData();

    const tier0Data = data.filter(d => d.constitutionalTier === 'Tier 0');
    const tier3Data = data.filter(d => d.constitutionalTier === 'Tier 3');

    const egyptianTemplates = new Set(
        data.filter(d => d.egyptianTemplate).map(d => d.egyptianTemplate!)
    );

    return {
        totalMeasurements: data.length,
        tier0: {
            count: tier0Data.length,
            avgDuration: tier0Data.reduce((sum, d) => sum + d.actualDuration, 0) / tier0Data.length || 0,
            maxDuration: Math.max(...tier0Data.map(d => d.actualDuration), 0),
            violations60fps: tier0Data.filter(d => d.actualDuration > 16.67).length
        },
        tier3: {
            count: tier3Data.length,
            avgDuration: tier3Data.reduce((sum, d) => sum + d.actualDuration, 0) / tier3Data.length || 0,
            maxDuration: Math.max(...tier3Data.map(d => d.actualDuration), 0),
            violations100ms: tier3Data.filter(d => d.actualDuration > 100).length
        },
        egyptianTemplatesCovered: egyptianTemplates.size,
        egyptianTemplates: Array.from(egyptianTemplates),
        constitutionalCompliance: {
            tier0_60fps: tier0Data.filter(d => d.actualDuration <= 16.67).length === tier0Data.length,
            tier3_100ms: tier3Data.filter(d => d.actualDuration <= 100).length === tier3Data.length
        }
    };
}
