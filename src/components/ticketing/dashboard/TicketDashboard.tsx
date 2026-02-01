/**
 * @tier Tier 1 Presentation
 * @constitutional_compliance AICS-001 §5.1 (No execution logic)
 */

import React from 'react';
import { AdvisoryGate } from '../gates/AdvisoryGate';
// In a real app, this would be a proper hook. Mocking for now as per instructions implies usage.
// Pointing to where we will add the Hook or assuming it exists. 
// Use a local mock for now to ensure compilation if file doesn't exist.
const useTicketEngine = () => {
    return {
        tickets: [
            { id: 'T-1001', type: 'technical', priority: 'high', status: 'open', sla: '4h' },
            { id: 'T-1002', type: 'warranty', priority: 'medium', status: 'assigned', sla: '24h' }
        ],
        loading: false
    };
};

// Mock components for compilation
const StatCard = ({ title, value, trend }: any) => (
    <div className="stat-card" style={{ padding: '1rem', border: '1px solid #ccc' }}>
        <h3>{title}</h3>
        <p>{value}</p>
        <small>{trend}</small>
    </div>
);
const FilterPill = ({ label, count, active }: any) => (
    <button style={{ marginRight: '0.5rem', fontWeight: active ? 'bold' : 'normal' }}>
        {label} {count && `(${count})`}
    </button>
);
const TicketRow = ({ ticket }: any) => (
    <tr>
        <td>{ticket.id}</td>
        <td>{ticket.type}</td>
        <td>{ticket.priority}</td>
        <td>{ticket.status}</td>
        <td>{ticket.sla}</td>
        <td><button>View</button></td>
    </tr>
);

const mockRoutingAdvisory = {
    tier: 'Tier 2',
    requiresHumanValidation: true,
    constitutionalDisclaimer: 'ADVISORY ONLY',
    suggestion: 'Assign to Tech A',
    confidence: 0.95
};

export const TicketDashboard: React.FC = () => {
    const { tickets, loading } = useTicketEngine();

    if (loading) {
        return <div>Loading dashboard...</div>;
    }

    return (
        <div className="ticket-dashboard" role="main" aria-label="Service Ticket Dashboard" style={{ padding: '2rem' }}>
            <div className="constitutional-header" style={{ marginBottom: '2rem' }}>
                <h1 className="text-2xl font-bold">Service & Ticketing System</h1>
                <div style={{ display: 'flex', gap: '0.5rem', margin: '0.5rem 0' }}>
                    <span className="tier-badge tier3" style={{ background: '#ef4444', color: 'white', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>Tier 3 Execution</span>
                    <span className="tier-badge tier2" style={{ background: '#eab308', color: 'white', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>Tier 2 Advisory</span>
                </div>
                <p className="constitutional-notice" style={{ color: '#666', fontSize: '0.875rem' }}>
                    ⚖️ AICS-001 Compliant | Human Validation Required | Deterministic Execution
                </p>
            </div>

            <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                {/* Statistics Panel */}
                <div className="stats-panel">
                    <h2 className="text-xl font-semibold mb-4">Operational Metrics</h2>
                    <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                        <StatCard title="Open Tickets" value="24" trend="+2" />
                        <StatCard title="SLA Compliance" value="98%" trend="+1%" />
                        <StatCard title="Avg Resolution" value="18h" trend="-2h" />
                        <StatCard title="Satisfaction" value="4.7/5" trend="+0.2" />
                    </div>
                </div>

                {/* Ticket List */}
                <div className="ticket-list-panel">
                    <h2 className="text-xl font-semibold mb-4">Active Tickets</h2>
                    <div className="ticket-filters" style={{ marginBottom: '1rem' }}>
                        <FilterPill label="All" active />
                        <FilterPill label="Technical" count={12} />
                        <FilterPill label="Warranty" count={5} />
                        <FilterPill label="Spare Parts" count={7} />
                    </div>

                    <div className="ticket-table">
                        <table style={{ width: '100%', textAlign: 'left' }}>
                            <thead>
                                <tr>
                                    <th>Ticket ID</th>
                                    <th>Type</th>
                                    <th>Priority</th>
                                    <th>Status</th>
                                    <th>SLA</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tickets.map(ticket => (
                                    <TicketRow key={ticket.id} ticket={ticket} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Advisory Panel */}
            <div className="advisory-panel" style={{ marginTop: '2rem', borderTop: '1px solid #eee', paddingTop: '2rem' }}>
                <h2 className="text-xl font-semibold mb-4">Pending Validations</h2>
                <div className="advisory-list">
                    {/* This is where AdvisoryGate components will render */}
                    <AdvisoryGate
                        advisoryOutput={mockRoutingAdvisory}
                        onValidate={(decision, rationale) => {
                            console.log('Validation:', decision, rationale);
                            // This triggers Tier 3 execution
                        }}
                        validationType="assignment"
                    />
                </div>
            </div>

            {/* Constitutional Footer */}
            <div className="constitutional-footer" style={{ marginTop: '4rem', padding: '1rem', background: '#f9fafb', borderRadius: '4px' }}>
                <p>
                    <strong>Constitutional Note:</strong> This dashboard presents information only.
                    All execution actions require human validation through Advisory Gates.
                    No autonomous decisions are made by this interface.
                </p>
            </div>
        </div>
    );
};
