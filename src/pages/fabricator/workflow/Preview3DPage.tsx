import { Button } from '@/shared/ui/ui/button';
import { useWorkflowStore } from '@/store/workflowStore';
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export const Preview3DPage: React.FC = () => {
    const { projectId } = useParams<{ projectId?: string }>();
    const navigate = useNavigate();
    const { completeStep, currentProject: _currentProject } = useWorkflowStore();

    const handleContinue = () => {
        completeStep('preview3d');
        navigate(projectId ? `/fabricator/workflow/optimization/${projectId}` : '/fabricator/workflow/optimization');
    };

    return (
        <div className="flex flex-col h-full bg-slate-950 p-6">
            <div className="max-w-6xl mx-auto w-full">
                <h2 className="text-2xl font-bold text-amber-200 mb-4">3D Preview</h2>
                <p className="text-slate-400 mb-6">
                    Visualize your window design in 3D before proceeding to optimization.
                </p>

                {/* Placeholder for 3D viewer - will be integrated in Week 2 */}
                <div className="bg-slate-900 rounded-lg border border-slate-700 p-8 mb-6 min-h-[400px] flex items-center justify-center">
                    <div className="text-center">
                        <Box className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                        <p className="text-slate-500">3D Preview Component</p>
                        <p className="text-sm text-slate-600 mt-2">
                            Window3DGenerator will be integrated here
                        </p>
                    </div>
                </div>

                <div className="flex justify-between">
                    <Button
                        variant="outline"
                        onClick={() => navigate(projectId ? `/fabricator/workflow/design/${projectId}` : '/fabricator/workflow/design')}
                    >
                        ← Back to Design
                    </Button>
                    <Button
                        onClick={handleContinue}
                        className="bg-amber-500 hover:bg-amber-600"
                    >
                        Continue to Optimization →
                    </Button>
                </div>
            </div>
        </div>
    );
};

// Temporary import for icon
import { Box } from 'lucide-react';
