/**
 * AdvisorySidebar - Integration component for EngineeringBay
 * AICS-001 §5.10.2: Tier 2 - Collaborative Intelligence
 * 
 * Provides a collapsible sidebar with advisory panels.
 */

import {
    AdvisoryComponentKey,
    getAdvisoryComponent,
    getTier2Components
} from '@/lib/fabricator/wiring/advisoryWiring';
import { Button } from '@/shared/ui/ui/button';
import {
    AlertTriangle,
    BarChart3,
    Brain,
    ChevronLeft,
    ChevronRight,
    Layout,
    Shield
} from 'lucide-react';
import React, { Suspense, useState } from 'react';

interface AdvisorySidebarProps {
    /** Whether the sidebar is expanded */
    isExpanded?: boolean;
    /** Callback when expansion state changes */
    onToggle?: (expanded: boolean) => void;
    /** Additional class names */
    className?: string;
}

const ADVISOR_ICONS: Record<string, React.ReactNode> = {
    AISuggestionPanel: <Brain className="w-4 h-4 text-[var(--fabricator-text-accent)]" />,
    DesignModeComparison: <Layout className="w-4 h-4" />,
    OptimizationJobMonitor: <BarChart3 className="w-4 h-4" />,
    JobRiskIndicator: <AlertTriangle className="w-4 h-4" />,
    ConstitutionalHealthDashboard: <Shield className="w-4 h-4" />,
};

const ADVISOR_LABELS: Record<string, string> = {
    AISuggestionPanel: 'AI Suggestions',
    DesignModeComparison: 'Design Comparison',
    OptimizationJobMonitor: 'Optimization Monitor',
    JobRiskIndicator: 'Risk Assessment',
    ConstitutionalHealthDashboard: 'Governance Health',
    DesignModeSelector: 'Mode Selector',
};

/**
 * Fallback component while loading
 */
const AdvisoryLoading: React.FC = () => (
    <div className="p-4 border border-dashed border-amber-300 rounded-lg animate-pulse">
        <div className="h-4 bg-amber-200 rounded w-3/4 mb-2" />
        <div className="h-4 bg-amber-100 rounded w-1/2" />
    </div>
);

/**
 * AdvisorySidebar component
 */
export const AdvisorySidebar: React.FC<AdvisorySidebarProps> = ({
    isExpanded: controlledExpanded,
    onToggle,
    className = ''
}) => {
    const [internalExpanded, setInternalExpanded] = useState(true);
    const [activeAdvisor, setActiveAdvisor] = useState<AdvisoryComponentKey | null>(null);

    const isExpanded = controlledExpanded ?? internalExpanded;

    const handleToggle = () => {
        const newState = !isExpanded;
        setInternalExpanded(newState);
        onToggle?.(newState);
    };

    const tier2Components = getTier2Components();

    return (
        <div
            className={`advisory-sidebar border-l border-slate-700 bg-slate-900/95 transition-all duration-300 ${isExpanded ? 'w-[350px]' : 'w-12'
                } ${className}`}
        >
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-slate-700">
                {isExpanded && (
                    <div className="flex items-center gap-2">
                        <Brain className="w-5 h-5 text-[var(--fabricator-text-accent)]" />
                        <h3 className="text-sm font-semibold text-amber-200">Advisory Intelligence</h3>
                        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-xs rounded-full">
                            Tier 2
                        </span>
                    </div>
                )}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleToggle}
                    className="text-slate-400 hover:text-amber-400"
                >
                    {isExpanded ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </Button>
            </div>

            {isExpanded && (
                <>
                    {/* Advisor Selection */}
                    <div className="p-3 space-y-2">
                        <p className="text-xs text-slate-500 mb-2">Select an advisor:</p>
                        <div className="grid grid-cols-2 gap-2">
                            {tier2Components.slice(0, 6).map((key) => (
                                <Button
                                    key={key}
                                    variant={activeAdvisor === key ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setActiveAdvisor(activeAdvisor === key ? null : key)}
                                    className={`text-xs justify-start gap-2 ${activeAdvisor === key
                                            ? 'bg-amber-500 text-white hover:bg-amber-600'
                                            : 'border-slate-600 text-slate-300 hover:border-amber-500'
                                        }`}
                                >
                                    {ADVISOR_ICONS[key] || <Brain className="w-4 h-4 text-[var(--fabricator-text-accent)]" />}
                                    <span className="truncate">{ADVISOR_LABELS[key] || key}</span>
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Active Advisor Panel */}
                    {activeAdvisor && (
                        <div className="p-3 border-t border-slate-700 overflow-y-auto max-h-[calc(100vh-200px)]">
                            <Suspense fallback={<AdvisoryLoading />}>
                                {React.createElement(getAdvisoryComponent(activeAdvisor))}
                            </Suspense>
                        </div>
                    )}

                    {/* No Advisor Selected */}
                    {!activeAdvisor && (
                        <div className="p-6 text-center text-slate-500">
                            <Brain className="w-12 h-12 mx-auto mb-3 opacity-30 text-[var(--fabricator-text-accent)]" />
                            <p className="text-sm">Select an advisor above to get AI-powered suggestions</p>
                            <p className="text-xs mt-2 text-amber-500/70">
                                All advisors are Tier 2 - suggestions only, no execution authority
                            </p>
                        </div>
                    )}
                </>
            )}

            {/* Collapsed State */}
            {!isExpanded && (
                <div className="p-2 space-y-2">
                    {tier2Components.slice(0, 4).map((key) => (
                        <Button
                            key={key}
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                handleToggle();
                                setActiveAdvisor(key);
                            }}
                            className="w-full p-2 text-slate-400 hover:text-amber-400"
                            title={ADVISOR_LABELS[key]}
                        >
                            {ADVISOR_ICONS[key] || <Brain className="w-4 h-4 text-[var(--fabricator-text-accent)]" />}
                        </Button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AdvisorySidebar;
