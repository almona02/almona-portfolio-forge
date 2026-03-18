import { Button } from '@/shared/ui/ui/button';
import type { WindowGrid } from '@/types/fabricator';
import { Shield } from 'lucide-react';
import React, { useState } from 'react';
import { DraftingValidationGate } from './DraftingValidationGate';

// Dummy state and types for example purposes
const state = { ui: { canvasWidth: 1200, canvasHeight: 1400, selectedSystemPack: 'sys-1' } };
const project = { id: 'p1' };
const draftingEngine = { getGeometry: () => ({ rectangles: [], lines: [], points: [], circles: [], arcs: [], polygons: [], splines: [] }) };
const onDesignValidated = (o: unknown) => console.log(o);

export const DraftingValidationGateIntegrationExample: React.FC = () => {
    // 1. Add state for showing validation gate
    const [showValidationGate, setShowValidationGate] = useState(false);

    // 2. Calculate current design dimensions
    const currentWidth = state.ui.canvasWidth || 1200;
    const currentHeight = state.ui.canvasHeight || 1400;

    // 3. Get current grid from state
    const currentGrid: WindowGrid = {
        rows: 2,
        cols: 1,
        cells: [
            { id: 'cell-0', row: 0, col: 0, type: 'fixed' },
            { id: 'cell-1', row: 1, col: 0, type: 'sash' }
        ]
    };

    return (
        <>
            {/* 4. Render validation gate in right panel */}
            {
                showValidationGate && (
                    <DraftingValidationGate
                        designId={project?.id || 'draft-' + Date.now()}
                        geometry={draftingEngine.getGeometry()}
                        width={currentWidth}
                        height={currentHeight}
                        grid={currentGrid}
                        systemId={state.ui.selectedSystemPack || null}
                        onValidationSuccess={(output) => {
                            console.log('Design validated successfully:', output);
                            onDesignValidated(output);
                            setShowValidationGate(false);
                        }}
                    />
                )
            }

            {/* 5. Add button to trigger validation gate */}
            <Button
                onClick={() => setShowValidationGate(true)}
                className="w-full bg-amber-600 hover:bg-amber-700"
            >
                <Shield className="w-4 h-4 mr-2" />
                Validate for Manufacturing
            </Button>
        </>
    );
};
