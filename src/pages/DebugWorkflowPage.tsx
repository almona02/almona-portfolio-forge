import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { useWorkflowStore } from '@/store/workflowStore';
import { createCanonicalModel } from '@/types/CanonicalEngineeringModel';
import { ArrowRight, Bug, Code, Database, Play, Trash2 } from 'lucide-react';
import React from 'react';
import { useNavigate } from 'react-router-dom';

export const DebugWorkflowPage: React.FC = () => {
    const navigate = useNavigate();
    const workflowStore = useWorkflowStore();

    const clearStore = () => {
        workflowStore.clearWorkflow?.();
        localStorage.removeItem('workflow-store');
        alert('Store cleared!');
        window.location.reload();
    };

    const loadMockData = () => {
        const mockCanonical = createCanonicalModel('measurement');
        mockCanonical.geometry = {
            overallWidth: 1200,
            overallHeight: 1400,
            components: [
                {
                    id: 'comp-1',
                    type: 'frame',
                    profile: {
                        id: 'profile-1',
                        name: 'Test Profile',
                        material: 'aluminum' as const,
                        width: 60,
                        color: 'Silver',
                        costPerMeter: 10,
                        cuttingAllowance: 3,
                        stockQuantity: 100,
                        minStockLevel: 10,
                        supplier: 'Test Supplier',
                    },
                    width: 1200,
                    height: 1400,
                    quantity: 1,
                    cuttingLengths: [1200, 1400],
                    angles: [45, 45],
                    machiningOperations: [],
                    glazingType: 'double',
                    hardware: [],
                },
            ],
        };

        mockCanonical.materials.systemPack = 'caluminium_ps_v3';

        if (workflowStore.setCurrentProject) {
            workflowStore.setCurrentProject({
                id: mockCanonical.id,
                orderNumber: mockCanonical.orderNumber,
                posNumber: 'W-01',
                type: 'sliding_window',
                components: mockCanonical.geometry.components,
                overallWidth: mockCanonical.geometry.overallWidth,
                overallHeight: mockCanonical.geometry.overallHeight,
                color: 'Silver',
                glazing: { type: 'double', thickness: 4, spacer: 12, gasFill: 'argon' },
                hardware: [],
                status: 'design' as const,
                optimization: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
        }

        alert('Mock data loaded!');
    };

    const completedSteps = workflowStore.completedSteps || new Set();
    const currentProject = workflowStore.currentProject;

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-6xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <Bug className="w-8 h-8 text-amber-600" />
                        Workflow Debug Dashboard
                    </h1>
                    <p className="text-slate-600 mt-2">
                        Debug and test the unified workflow architecture
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Database className="w-5 h-5" />
                                Store State
                            </CardTitle>
                            <CardDescription>Current workflow store data</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <div>
                                    <span className="font-medium">Current Project:</span>
                                    <div className="mt-1 text-sm">
                                        {currentProject ? (
                                            <code className="bg-slate-100 p-2 rounded block overflow-auto max-h-32 text-xs">
                                                {JSON.stringify(currentProject, null, 2)}
                                            </code>
                                        ) : (
                                            <span className="text-slate-500">No project loaded</span>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <span className="font-medium">Completed Steps:</span>
                                    <div className="mt-1">
                                        {completedSteps.size > 0 ? (
                                            Array.from(completedSteps).map((step: string) => (
                                                <span key={step} className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded mr-2 mb-1">
                                                    {step}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-slate-500 text-sm">No steps completed</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Code className="w-5 h-5" />
                                Quick Actions
                            </CardTitle>
                            <CardDescription>Test and debug actions</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <Button
                                        onClick={loadMockData}
                                        variant="outline"
                                        className="gap-2"
                                    >
                                        <Play className="w-4 h-4" />
                                        Load Mock Data
                                    </Button>

                                    <Button
                                        onClick={clearStore}
                                        variant="outline"
                                        className="gap-2 text-red-600 hover:text-red-700"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Clear Store
                                    </Button>

                                    <Button
                                        onClick={() => navigate('/fabricator/workflow/design')}
                                        className="gap-2"
                                    >
                                        <ArrowRight className="w-4 h-4" />
                                        Test Design Page
                                    </Button>

                                    <Button
                                        onClick={() => navigate('/fabricator/workflow/design?mode=drafting')}
                                        variant="secondary"
                                        className="gap-2"
                                    >
                                        Test CAD Mode
                                    </Button>
                                </div>

                                <div className="pt-4 border-t">
                                    <h4 className="font-medium mb-2 text-sm">Direct Navigation:</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {[
                                            { path: '/fabricator/workflow/design', label: 'Design' },
                                            { path: '/fabricator/workflow/design?mode=drafting', label: 'CAD' },
                                            { path: '/fabricator/workflow/preview3d', label: 'Preview' },
                                            { path: '/fabricator/workflow/optimization', label: 'Optimize' },
                                            { path: '/fabricator/workflow/inventory', label: 'Inventory' },
                                            { path: '/fabricator/workflow/production', label: 'Production' },
                                            { path: '/fabricator/workflow/quality-control', label: 'QC' },
                                        ].map(({ path, label }) => (
                                            <Button
                                                key={path}
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => navigate(path)}
                                                className="text-xs"
                                            >
                                                {label}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Test Scenarios</CardTitle>
                        <CardDescription>Pre-defined test scenarios for the unified workflow</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="border rounded-lg p-4 hover:bg-slate-50 transition-colors">
                                <h4 className="font-medium mb-2">Scenario 1: New User Wizard Flow</h4>
                                <p className="text-sm text-slate-600 mb-3">
                                    Test the complete wizard workflow from start to finish
                                </p>
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        onClick={() => {
                                            clearStore();
                                            setTimeout(() => navigate('/fabricator/workflow/design'), 100);
                                        }}
                                    >
                                        Start Test
                                    </Button>
                                </div>
                            </div>

                            <div className="border rounded-lg p-4 hover:bg-slate-50 transition-colors">
                                <h4 className="font-medium mb-2">Scenario 2: CAD Professional Flow</h4>
                                <p className="text-sm text-slate-600 mb-3">
                                    Test the CAD workflow with mode switching
                                </p>
                                <Button
                                    size="sm"
                                    onClick={() => {
                                        clearStore();
                                        setTimeout(() => navigate('/fabricator/workflow/design?mode=drafting'), 100);
                                    }}
                                >
                                    Start CAD Test
                                </Button>
                            </div>

                            <div className="border rounded-lg p-4 hover:bg-slate-50 transition-colors">
                                <h4 className="font-medium mb-2">Scenario 3: Mode Switching</h4>
                                <p className="text-sm text-slate-600 mb-3">
                                    Test switching between wizard and CAD modes mid-design
                                </p>
                                <Button
                                    size="sm"
                                    onClick={() => {
                                        loadMockData();
                                        setTimeout(() => navigate('/fabricator/workflow/design'), 100);
                                    }}
                                >
                                    Start Mode Switching Test
                                </Button>
                            </div>

                            <div className="border rounded-lg p-4 hover:bg-slate-50 transition-colors">
                                <h4 className="font-medium mb-2">Scenario 4: Full Workflow</h4>
                                <p className="text-sm text-slate-600 mb-3">
                                    Test complete workflow: Design → Preview → Optimization → Inventory → Production → QC
                                </p>
                                <Button
                                    size="sm"
                                    onClick={() => {
                                        loadMockData();
                                        if (workflowStore.completeStep) {
                                            workflowStore.completeStep('design');
                                        }
                                        setTimeout(() => navigate('/fabricator/workflow/preview3d'), 100);
                                    }}
                                >
                                    Start Full Workflow Test
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle>Console Logs</CardTitle>
                        <CardDescription>Recent console activity</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="bg-slate-900 text-green-400 p-4 rounded font-mono text-xs overflow-auto max-h-48">
                            <div>Open browser DevTools (F12) to see detailed logs</div>
                            <div className="text-slate-500 mt-2">
                                • Check Network tab for API calls<br />
                                • Check Console for errors/warnings<br />
                                • Check Application → Local Storage for store data
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
