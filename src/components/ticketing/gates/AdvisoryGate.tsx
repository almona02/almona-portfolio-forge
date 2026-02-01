/**
 * Constitutional Human Validation Gate
 * @purpose Enforces AICS-001 §2.1 (Human Validation Required)
 * @tier Tier 1 Presentation
 */

import React from 'react';

// Define types locally if not available globally yet
type ValidationDecision = 'approved' | 'modified' | 'rejected';

class ConstitutionalViolationError extends Error {
    constructor(message: string, citation: string) {
        super(`${message} (Citation: ${citation})`);
        this.name = 'ConstitutionalViolationError';
    }
}

interface AdvisoryGateProps<T> {
    advisoryOutput: T;
    onValidate: (decision: ValidationDecision, rationale: string) => void;
    validationType: 'assignment' | 'resolution' | 'preventive' | 'parts';
}

export function AdvisoryGate<T extends { tier: string; requiresHumanValidation: boolean; constitutionalDisclaimer: string; suggestion: any; confidence?: number }>({
    advisoryOutput,
    onValidate,
    validationType
}: AdvisoryGateProps<T>) {
    // Constitutional enforcement
    if (advisoryOutput.tier !== 'Tier 2') {
        throw new ConstitutionalViolationError(
            'AdvisoryGate can only process Tier 2 advisory outputs',
            'AICS-001 §2.1'
        );
    }

    if (!advisoryOutput.requiresHumanValidation) {
        throw new ConstitutionalViolationError(
            'Advisory output must require human validation',
            'AICS-001 §2.1'
        );
    }

    const [rationale, setRationale] = React.useState('');

    const getRationale = () => rationale;

    return (
        <div className="advisory-gate" role="alert" aria-label="Human validation required" style={{ border: '2px solid #eab308', padding: '1rem', borderRadius: '0.5rem', background: '#fffbeb' }}>
            <div className="constitutional-banner warning" style={{ marginBottom: '1rem' }}>
                <h3 style={{ color: '#854d0e', fontWeight: 'bold' }}>⚠️ Human Validation Required</h3>
                <p>This is an advisory suggestion only. Human validation is required before execution.</p>
                <p className="disclaimer" style={{ fontSize: '0.875rem', color: '#666' }}>{advisoryOutput.constitutionalDisclaimer}</p>
            </div>

            <div className="advisory-content" style={{ marginBottom: '1rem' }}>
                <h4 style={{ fontWeight: 'bold' }}>Advisory Suggestion:</h4>
                <pre style={{ background: '#f5f5f5', padding: '0.5rem', borderRadius: '0.25rem' }}>{JSON.stringify(advisoryOutput.suggestion, null, 2)}</pre>

                {advisoryOutput.confidence && (
                    <div className="confidence-indicator" style={{ marginTop: '0.5rem' }}>
                        <span>Confidence Score: {Math.round(advisoryOutput.confidence * 100)}%</span>
                    </div>
                )}
            </div>

            <div className="validation-actions">
                <h4 style={{ fontWeight: 'bold' }}>Human Validation Decision:</h4>
                <textarea
                    placeholder="Enter your rationale for this decision..."
                    className="rationale-input"
                    required
                    value={rationale}
                    onChange={(e) => setRationale(e.target.value)}
                    style={{ width: '100%', minHeight: '80px', margin: '0.5rem 0', padding: '0.5rem' }}
                />

                <div className="action-buttons" style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        className="btn-approve"
                        disabled={!rationale}
                        onClick={() => onValidate('approved', getRationale())}
                        style={{ backgroundColor: '#22c55e', color: 'white', padding: '0.5rem 1rem', borderRadius: '0.25rem', border: 'none', opacity: !rationale ? 0.5 : 1, cursor: !rationale ? 'not-allowed' : 'pointer' }}
                    >
                        ✅ Approve & Execute
                    </button>

                    <button
                        className="btn-modify"
                        disabled={!rationale}
                        onClick={() => onValidate('modified', getRationale())}
                        style={{ backgroundColor: '#eab308', color: 'white', padding: '0.5rem 1rem', borderRadius: '0.25rem', border: 'none', opacity: !rationale ? 0.5 : 1, cursor: !rationale ? 'not-allowed' : 'pointer' }}
                    >
                        ✏️ Modify & Execute
                    </button>

                    <button
                        className="btn-reject"
                        disabled={!rationale}
                        onClick={() => onValidate('rejected', getRationale())}
                        style={{ backgroundColor: '#ef4444', color: 'white', padding: '0.5rem 1rem', borderRadius: '0.25rem', border: 'none', opacity: !rationale ? 0.5 : 1, cursor: !rationale ? 'not-allowed' : 'pointer' }}
                    >
                        ❌ Reject Suggestion
                    </button>
                </div>
            </div>

            <div className="constitutional-footnote" style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#999', borderTop: '1px solid #ddd', paddingTop: '0.5rem' }}>
                <small>
                    This validation will be recorded in the immutable audit trail per AICS-001 §3.1.
                    You are legally accountable for this decision.
                </small>
            </div>
        </div>
    );
}
