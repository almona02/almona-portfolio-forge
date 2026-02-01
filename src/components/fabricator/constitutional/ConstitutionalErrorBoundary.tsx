/**
 * Constitutional Error Boundary
 * 
 * @tier Tier 3 Protected
 * @constitutional_compliance AICS-001 §9.3
 * 
 * Prevents constitutional violations from crashing the entire application.
 * Captures errors, logs to constitutional audit, and provides graceful fallback UI.
 */

import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { AlertCircle, RefreshCw, Shield } from 'lucide-react';
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
    errorCount: number;
}

/**
 * Error Boundary for Constitutional Components
 * 
 * Features:
 * - Captures and logs constitutional violations
 * - Emits RealityOS events
 * - Provides user-friendly fallback UI
 * - Supports error recovery without full page reload
 */
export class ConstitutionalErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            errorCount: 0,
        };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return {
            hasError: true,
            error,
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        const { errorCount } = this.state;

        this.setState({
            errorInfo,
            errorCount: errorCount + 1,
        });

        // Log to constitutional audit
        this.logToConstitutionalAudit(error, errorInfo);

        // Emit RealityOS event
        this.emitRealityOSEvent(error, errorInfo);

        // Call custom error handler if provided
        this.props.onError?.(error, errorInfo);

        // Log to console with constitutional prefix
        console.error('[CONSTITUTIONAL ERROR BOUNDARY]', {
            error: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack,
            timestamp: new Date().toISOString(),
        });
    }

    private logToConstitutionalAudit(error: Error, errorInfo: ErrorInfo) {
        try {
            const auditEntry = {
                type: 'CONSTITUTIONAL_ERROR',
                timestamp: new Date().toISOString(),
                tier: 'Tier 3',
                operation: 'ERROR_BOUNDARY_CATCH',
                error: {
                    message: error.message,
                    name: error.name,
                    stack: error.stack,
                },
                componentStack: errorInfo.componentStack,
                compliance: 'AICS-001 §9.3',
                severity: 'CRITICAL',
                requiresHumanValidation: true,
            };

            // Persist to localStorage
            if (typeof window !== 'undefined' && window.localStorage) {
                const auditKey = 'constitutional-audit-log';
                const existing = window.localStorage.getItem(auditKey);
                const auditLog = existing ? JSON.parse(existing) : [];
                auditLog.push(auditEntry);
                window.localStorage.setItem(auditKey, JSON.stringify(auditLog.slice(-1000)));
            }
        } catch (loggingError) {
            console.error('[Constitutional] Failed to log error:', loggingError);
        }
    }

    private emitRealityOSEvent(error: Error, errorInfo: ErrorInfo) {
        try {
            if (typeof window !== 'undefined' && (window as any).realityOS) {
                (window as any).realityOS.emitEvent({
                    type: 'CONSTITUTIONAL_VIOLATION',
                    entityId: 'error-boundary',
                    operation: 'ERROR',
                    error: error.message,
                    componentStack: errorInfo.componentStack,
                    severity: 'CRITICAL',
                    tier: 'Tier 3',
                    compliance: 'AICS-001 §9.3',
                    timestamp: new Date().toISOString(),
                });
            }
        } catch (emitError) {
            console.error('[Constitutional] Failed to emit RealityOS event:', emitError);
        }
    }

    private handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    private handleRefresh = () => {
        window.location.reload();
    };

    render() {
        const { hasError, error, errorCount } = this.state;
        const { children, fallback } = this.props;

        if (hasError) {
            // Use custom fallback if provided
            if (fallback) {
                return fallback;
            }

            // Default fallback UI
            return (
                <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-6">
                    <Card className="max-w-2xl w-full bg-slate-800/50 border-red-500/30 backdrop-blur-sm">
                        <CardHeader>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/30">
                                    <Shield className="h-6 w-6 text-red-400" />
                                </div>
                                <CardTitle className="text-xl text-red-400">
                                    Constitutional Integrity Compromised
                                </CardTitle>
                            </div>
                            <p className="text-sm text-slate-400">
                                AICS-001 §9.3 Violation Detected – Tier 3 Protected Component Error
                            </p>
                        </CardHeader>

                        <CardContent className="space-y-4">
                            <Alert variant="destructive" className="bg-red-500/10 border-red-500/30">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription className="text-sm">
                                    <strong className="font-semibold">Error:</strong> {error?.message || 'Unknown error occurred'}
                                </AlertDescription>
                            </Alert>

                            {errorCount > 1 && (
                                <Alert className="bg-amber-500/10 border-amber-500/30">
                                    <AlertCircle className="h-4 w-4 text-amber-400" />
                                    <AlertDescription className="text-sm text-amber-200">
                                        This error has occurred <strong>{errorCount}</strong> times.
                                        Consider refreshing the page if the issue persists.
                                    </AlertDescription>
                                </Alert>
                            )}

                            <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                                <h4 className="text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wide">
                                    What happened?
                                </h4>
                                <p className="text-sm text-slate-400 leading-relaxed">
                                    A critical error occurred in the constitutional state management layer.
                                    Your work has been preserved in the audit trail, but the component cannot continue.
                                </p>
                            </div>

                            <div className="flex gap-3">
                                <Button
                                    onClick={this.handleReset}
                                    variant="default"
                                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                                >
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Try Recovery
                                </Button>
                                <Button
                                    onClick={this.handleRefresh}
                                    variant="outline"
                                    className="flex-1 border-slate-600 hover:bg-slate-700"
                                >
                                    Refresh Page
                                </Button>
                            </div>

                            <div className="pt-4 border-t border-slate-700/50">
                                <details className="text-xs text-slate-500">
                                    <summary className="cursor-pointer hover:text-slate-400 font-medium">
                                        Technical Details (for support)
                                    </summary>
                                    <pre className="mt-2 p-3 bg-slate-950 rounded text-[10px] overflow-x-auto border border-slate-800">
                                        {error?.stack || 'No stack trace available'}
                                    </pre>
                                </details>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            );
        }

        return children;
    }
}

/**
 * Hook for programmatic error handling
 */
export function useConstitutionalErrorHandler() {
    const [error, setError] = React.useState<Error | null>(null);

    const handleError = React.useCallback((err: Error) => {
        setError(err);

        // Log to audit
        console.error('[Constitutional] Handled error:', err);
    }, []);

    const clearError = React.useCallback(() => {
        setError(null);
    }, []);

    return { error, handleError, clearError };
}
