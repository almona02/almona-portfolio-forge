/**
 * WorkflowBuilderPage Component
 * 
 * Priority 3: Workflow Builder - Main Page
 * Page for creating and editing workflows using the WorkflowBuilder component.
 * 
 * Gold Tier Implementation:
 * - Market-leading UX patterns
 * - ARIA compliant (WCAG 2.1 AA)
 * - Performance optimized
 */

import { WorkflowBuilder } from '@/components/workflow/WorkflowBuilder';
import type { WorkflowResponse } from '@/services/workflowsApi';
import {
    deleteWorkflow,
} from '@/services/workflowsApi';
import { Button } from '@/shared/ui/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/shared/ui/ui/dialog';
import {
    ArrowLeft,
    Loader2,
} from 'lucide-react';
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

/**
 * WorkflowBuilderPage Component
 */
const WorkflowBuilderPage: React.FC = () => {
    const { workflowId } = useParams<{ workflowId?: string }>();
    const navigate = useNavigate();
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    const handleSave = (_workflow: WorkflowResponse) => {
        toast.success('Workflow saved successfully');
        // Optionally navigate to workflow list or detail page
        // navigate(`/workflows/${workflow.id}`);
    };

    const handleCancel = () => {
        navigate('/workflows');
    };

    const handleDelete = async () => {
        if (!workflowId) return;

        setIsDeleting(true);
        try {
            await deleteWorkflow(workflowId);
            toast.success('Workflow deleted successfully');
            navigate('/workflows');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to delete workflow');
        } finally {
            setIsDeleting(false);
            setDeleteDialogOpen(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950">
            <div className="container mx-auto p-4 h-screen flex flex-col">
                {/* Header */}
                <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate('/workflows')}
                            className="text-slate-400 hover:text-slate-200"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-100">
                                {workflowId ? 'Edit Workflow' : 'New Workflow'}
                            </h1>
                            <p className="text-sm text-slate-400">
                                {workflowId 
                                    ? 'Edit your workflow configuration'
                                    : 'Create a new workflow for business process automation'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Workflow Builder */}
                <div className="flex-1 overflow-hidden">
                    <WorkflowBuilder
                        workflowId={workflowId}
                        onSave={handleSave}
                        onCancel={handleCancel}
                        className="h-full"
                    />
                </div>

                {/* Delete Confirmation Dialog */}
                <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Delete Workflow</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to delete this workflow? This action cannot be undone.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex justify-end gap-2 mt-4">
                            <Button
                                variant="outline"
                                onClick={() => setDeleteDialogOpen(false)}
                                disabled={isDeleting}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleDelete}
                                disabled={isDeleting}
                            >
                                {isDeleting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Deleting...
                                    </>
                                ) : (
                                    'Delete'
                                )}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
};

export default WorkflowBuilderPage;
