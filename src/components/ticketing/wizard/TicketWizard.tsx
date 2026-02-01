/**
 * @tier Tier 1 Presentation
 * @purpose Ticket creation with constitutional compliance
 */

import React, { useState } from 'react';

// Mock types
interface Ticket {
    type?: string;
    priority?: string;
    description?: string;
    attachments?: any[];
}

// Mock sub-components
const Step = ({ number, label, active }: any) => (
    <div style={{ fontWeight: active ? 'bold' : 'normal', color: active ? 'blue' : 'gray' }}>
        Step {number}: {label}
    </div>
);
const CategoryStep = ({ onSelect }: any) => (
    <div>
        <h3>Select Category</h3>
        <button onClick={() => onSelect('technical')}>Technical</button>
        <button onClick={() => onSelect('warranty')}>Warranty</button>
    </div>
);
const DetailsStep = ({ data, onChange }: any) => (
    <div>
        <h3>Details</h3>
        <textarea onChange={(e) => onChange({ ...data, description: e.target.value })} />
    </div>
);
const EvidenceStep = ({ onUpload }: any) => (
    <div>
        <h3>Evidence</h3>
        <button onClick={() => onUpload(['file1.jpg'])}>Upload Dummy Evidence</button>
    </div>
);
const ReviewStep = ({ ticket, onSubmit }: any) => (
    <div>
        <h3>Review</h3>
        <pre>{JSON.stringify(ticket, null, 2)}</pre>
        <button onClick={onSubmit}>Confirm & Submit</button>
    </div>
);

export const TicketWizard: React.FC = () => {
    const [step, setStep] = useState(1);
    const [ticketData, setTicketData] = useState<Partial<Ticket>>({});

    return (
        <div className="ticket-wizard" style={{ padding: '2rem' }}>
            <h2 className="text-2xl font-bold mb-4">Create New Service Ticket</h2>

            <div className="wizard-steps" style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                <Step number={1} label="Category" active={step === 1} />
                <Step number={2} label="Details" active={step === 2} />
                <Step number={3} label="Evidence" active={step === 3} />
                <Step number={4} label="Review" active={step === 4} />
            </div>

            <div className="wizard-content" style={{ minHeight: '300px', border: '1px solid #eee', padding: '1rem', marginBottom: '1rem' }}>
                {step === 1 && (
                    <CategoryStep
                        onSelect={(type: string) => setTicketData({ ...ticketData, type })}
                    />
                )}

                {step === 2 && (
                    <DetailsStep
                        data={ticketData}
                        onChange={setTicketData}
                    />
                )}

                {step === 3 && (
                    <EvidenceStep
                        onUpload={(files: any) => setTicketData({ ...ticketData, attachments: files })}
                    />
                )}

                {step === 4 && (
                    <ReviewStep
                        ticket={ticketData}
                        onSubmit={() => {
                            // This would call Tier 3 TicketLifecycleEngine
                            console.log('Submitting ticket:', ticketData);
                        }}
                    />
                )}
            </div>

            <div className="wizard-actions" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button
                    disabled={step === 1}
                    onClick={() => setStep(step - 1)}
                    style={{ padding: '0.5rem 1rem' }}
                >
                    Previous
                </button>

                <button
                    onClick={() => {
                        if (step < 4) setStep(step + 1);
                    }}
                    style={{ padding: '0.5rem 1rem', background: 'blue', color: 'white' }}
                >
                    {step === 4 ? 'Submit Ticket' : 'Next'}
                </button>
            </div>
        </div>
    );
};
