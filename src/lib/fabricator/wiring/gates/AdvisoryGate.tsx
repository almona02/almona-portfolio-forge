/**
 * AdvisoryGate - Constitutional wrapper for Tier 2 advisory components
 * AICS-001 §5.10.2: Tier 2 - Collaborative Intelligence
 * 
 * Wraps advisory components with constitutional metadata and boundaries.
 * Advisory components can suggest but never execute.
 */

import React, { ComponentType, Suspense, lazy } from 'react';

export interface AdvisoryComponentConfig {
    component: () => Promise<{ default: ComponentType<any> }>;
    purpose: string;
    minConfidence?: number;
    requiresHumanReview?: boolean;
}

interface AdvisoryBoundaryProps {
    purpose: string;
    minConfidence: number;
    requiresHumanReview: boolean;
    children: React.ReactNode;
}

/**
 * Visual boundary wrapper for advisory components
 */
const AdvisoryBoundary: React.FC<AdvisoryBoundaryProps> = ({
    purpose,
    minConfidence,
    requiresHumanReview,
    children
}) => (
    <div
        className="advisory-component border-2 border-amber-500 rounded-lg p-4 relative bg-gradient-to-br from-amber-50 to-amber-100"
        data-tier="2"
        data-purpose={purpose}
    >
        <div className="advisory-boundary flex gap-2 items-center mb-3 pb-2 border-b border-amber-300">
            <span className="tier-badge bg-amber-500 text-white px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide">
                Tier 2 Advisory
            </span>
            <span className="confidence-requirement bg-amber-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                Min Confidence: {(minConfidence * 100).toFixed(0)}%
            </span>
            {requiresHumanReview && (
                <span className="human-review-flag bg-red-600 text-white px-3 py-1 rounded-full text-xs font-semibold animate-pulse">
                    Human Review Required
                </span>
            )}
        </div>

        {/* Actual component */}
        {children}

        {/* Constitutional disclaimer */}
        <div className="constitutional-disclaimer mt-4 p-3 bg-amber-100 border-l-4 border-amber-600 rounded text-sm text-amber-800 italic">
            Advisory suggestion only. No execution authority granted. Human validation required.
        </div>
    </div>
);

/**
 * Loading fallback for advisory components
 */
const AdvisoryLoading: React.FC = () => (
    <div className="advisory-loading border-2 border-dashed border-amber-300 rounded-lg p-8 text-center">
        <div className="animate-spin h-8 w-8 border-4 border-amber-500 border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-amber-600 text-sm">Loading advisory panel...</p>
    </div>
);

/**
 * AdvisoryGate - Factory for creating constitutionally-wrapped advisory components
 */
export class AdvisoryGate {
    /**
     * Wrap a Tier 2 advisory component with constitutional guards
     * AICS-001 §5.10.2: Tier 2 - Collaborative Intelligence
     */
    static tier2(config: AdvisoryComponentConfig) {
        const {
            component,
            purpose,
            minConfidence = 0.6,
            requiresHumanReview = true
        } = config;

        // Create the lazy-loaded wrapped component
        const LazyComponent = lazy(component);

        // Return a component that wraps with advisory boundaries
        const WrappedComponent: React.FC<any> = (props) => (
            <Suspense fallback={<AdvisoryLoading />}>
                <AdvisoryBoundary
                    purpose={purpose}
                    minConfidence={minConfidence}
                    requiresHumanReview={requiresHumanReview}
                >
                    <LazyComponent {...props} />
                </AdvisoryBoundary>
            </Suspense>
        );

        WrappedComponent.displayName = `Tier2Advisory(${purpose.slice(0, 20)}...)`;
        return WrappedComponent;
    }

    /**
     * Tier 2 Limited: Suggestions only, less prominent boundary
     */
    static tier2Limited(config: AdvisoryComponentConfig) {
        return this.tier2({ ...config, requiresHumanReview: false });
    }

    /**
     * Pure Presentation: No AI, no state mutation, read-only
     * AICS-001 §5.3.4: No gates needed, minimal wrapper
     */
    static presentation(component: () => Promise<{ default: ComponentType<any> }>) {
        const LazyComponent = lazy(component);

        const WrappedComponent: React.FC<any> = (props) => (
            <Suspense fallback={<div className="animate-pulse bg-slate-100 rounded p-4">Loading...</div>}>
                <div
                    className="presentation-component border border-slate-200 rounded p-2 bg-slate-50"
                    data-tier="presentation"
                >
                    <LazyComponent {...props} />
                    <div className="presentation-notice text-xs text-slate-500 text-center mt-2 pt-1 border-t border-dashed border-slate-200">
                        Presentation Only • No State Mutation
                    </div>
                </div>
            </Suspense>
        );

        WrappedComponent.displayName = 'PresentationComponent';
        return WrappedComponent;
    }
}

export default AdvisoryGate;
