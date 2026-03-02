import { fabricatorRoutes } from '@/lib/fabricator/routes';
import { getPoseWorkflowPathForStage } from '@/lib/fabricator/workflow/workflowGraph';
import { Button } from '@/shared/ui/ui/button';
import { useWorkflowStore } from '@/store/workflowStore';
import { CheckCircle2 } from 'lucide-react';
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export const QualityControlPage: React.FC = () => {
    const { projectId, poseId } = useParams<{ projectId?: string; poseId?: string }>();
    const navigate = useNavigate();
    const { completeStep, currentProject, clearWorkflow } = useWorkflowStore();

    const handleQualityApproved = () => {
        completeStep('quality-control');
        // Workflow complete - navigate to projects or show success
        navigate('/fabricator/studio/projects');
    };

    const handleStartNew = () => {
        if (confirm('Start a new project? Current progress will be saved.')) {
            clearWorkflow();
            navigate(fabricatorRoutes.newProjectWizard());
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-950 p-6">
            <div className="max-w-4xl mx-auto w-full">
                <div className="flex items-center gap-3 mb-6">
                    <CheckCircle2 className="w-8 h-8 text-green-400" />
                    <h2 className="text-2xl font-bold text-amber-200">Quality Control</h2>
                </div>

                <p className="text-slate-400 mb-8">
                    Final inspection and validation before production approval.
                </p>

                {/* Quality Checklist */}
                <div className="bg-slate-900 rounded-lg border border-slate-700 p-6 mb-6">
                    <h3 className="text-lg font-semibold text-amber-200 mb-4">Quality Checklist</h3>

                    <div className="space-y-3">
                        {[
                            'Measurements verified and within tolerance',
                            'Design specifications match requirements',
                            '3D model reviewed and approved',
                            'Optimization plan reviewed',
                            'Materials available in inventory',
                            'Production commands validated',
                            'All documentation complete'
                        ].map((item, index) => (
                            <label key={index} className="flex items-center gap-3 text-slate-300 cursor-pointer hover:text-amber-200">
                                <input
                                    type="checkbox"
                                    className="w-5 h-5 rounded border-slate-600 text-amber-500 focus:ring-amber-500"
                                />
                                <span>{item}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Project Summary */}
                {currentProject && (
                    <div className="bg-slate-900 rounded-lg border border-slate-700 p-6 mb-6">
                        <h3 className="text-lg font-semibold text-amber-200 mb-4">Project Summary</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-slate-500">Project ID:</span>
                                <span className="ml-2 text-slate-300">{currentProject.id}</span>
                            </div>
                            <div>
                                <span className="text-slate-500">Order Number:</span>
                                <span className="ml-2 text-slate-300">{currentProject.orderNumber}</span>
                            </div>
                            <div>
                                <span className="text-slate-500">Dimensions:</span>
                                <span className="ml-2 text-slate-300">
                                    {currentProject.overallWidth} × {currentProject.overallHeight} mm
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-500">Status:</span>
                                <span className="ml-2 text-green-400">{currentProject.status}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex justify-between gap-4">
                    <Button
                        variant="outline"
                        onClick={() =>
                            navigate(
                                projectId && poseId
                                    ? getPoseWorkflowPathForStage('production', projectId, poseId)
                                    : '/fabricator/studio/production'
                            )
                        }
                    >
                        ← Back to Production
                    </Button>

                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            onClick={handleStartNew}
                        >
                            Start New Project
                        </Button>
                        <Button
                            onClick={handleQualityApproved}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            Approve & Complete ✓
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
