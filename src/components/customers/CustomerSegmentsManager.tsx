/**
 * CustomerSegmentsManager Component
 * 
 * Priority 4: Customers Page Upgrade - Segment Management UI
 * Create, edit, delete, and view customer segments (dynamic and static).
 * 
 * Gold Tier Implementation:
 * - Market-leading UX patterns (Salesforce/HubSpot inspired)
 * - ARIA compliant (WCAG 2.1 AA)
 * - Performance optimized
 * - Real-time updates
 */

import { cn } from '@/lib/utils';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import { Textarea } from '@/shared/ui/ui/textarea';
import { Badge } from '@/shared/ui/ui/badge';
import { Switch } from '@/shared/ui/ui/switch';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/shared/ui/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/shared/ui/ui/alert-dialog';
import {
    Users,
    Plus,
    Edit2,
    Trash2,
    Loader2,
    Filter,
    Sparkles,
} from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
    listSegments,
    createSegment,
    updateSegment,
    deleteSegment,
    getSegmentCustomers,
    type CustomerSegmentResponse,
    type CustomerSegmentCreateRequest,
    type CustomerSegmentUpdateRequest,
} from '@/services/customersApi';

/**
 * CustomerSegmentsManager props
 */
export interface CustomerSegmentsManagerProps {
    onSegmentChange?: () => void;
    className?: string;
}

/**
 * CustomerSegmentsManager Component
 */
export const CustomerSegmentsManager: React.FC<CustomerSegmentsManagerProps> = ({
    onSegmentChange,
    className,
}) => {
    const [segments, setSegments] = useState<CustomerSegmentResponse[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [viewCustomersDialogOpen, setViewCustomersDialogOpen] = useState(false);
    const [editingSegment, setEditingSegment] = useState<CustomerSegmentResponse | null>(null);
    const [segmentToDelete, setSegmentToDelete] = useState<CustomerSegmentResponse | null>(null);
    const [segmentToView, setSegmentToView] = useState<CustomerSegmentResponse | null>(null);
    const [segmentName, setSegmentName] = useState('');
    const [segmentDescription, setSegmentDescription] = useState('');
    const [isDynamic, setIsDynamic] = useState(true);
    const [criteria, setCriteria] = useState('{}');
    const [isSaving, setIsSaving] = useState(false);

    /**
     * Load segments
     */
    const loadSegments = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await listSegments();
            setSegments(data.segments);
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Failed to load segments'
            );
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Initial load
     */
    useEffect(() => {
        loadSegments();
    }, [loadSegments]);

    /**
     * Open create dialog
     */
    const handleCreateClick = () => {
        setEditingSegment(null);
        setSegmentName('');
        setSegmentDescription('');
        setIsDynamic(true);
        setCriteria('{}');
        setDialogOpen(true);
    };

    /**
     * Open edit dialog
     */
    const handleEditClick = (segment: CustomerSegmentResponse) => {
        setEditingSegment(segment);
        setSegmentName(segment.name);
        setSegmentDescription(segment.description || '');
        setIsDynamic(segment.is_dynamic);
        setCriteria(JSON.stringify(segment.criteria, null, 2));
        setDialogOpen(true);
    };

    /**
     * Open delete dialog
     */
    const handleDeleteClick = (segment: CustomerSegmentResponse) => {
        setSegmentToDelete(segment);
        setDeleteDialogOpen(true);
    };

    /**
     * Open view customers dialog
     */
    const handleViewCustomers = (segment: CustomerSegmentResponse) => {
        setSegmentToView(segment);
        setViewCustomersDialogOpen(true);
    };

    /**
     * Handle save
     */
    const handleSave = useCallback(async () => {
        if (!segmentName.trim()) {
            toast.error('Segment name is required');
            return;
        }

        let criteriaObj: Record<string, any>;
        try {
            criteriaObj = JSON.parse(criteria);
        } catch {
            toast.error('Invalid criteria JSON');
            return;
        }

        setIsSaving(true);
        try {
            if (editingSegment) {
                const request: CustomerSegmentUpdateRequest = {
                    name: segmentName.trim(),
                    description: segmentDescription.trim() || undefined,
                    criteria: criteriaObj,
                    is_dynamic: isDynamic,
                };
                await updateSegment(editingSegment.id, request);
                toast.success('Segment updated successfully');
            } else {
                const request: CustomerSegmentCreateRequest = {
                    name: segmentName.trim(),
                    description: segmentDescription.trim() || undefined,
                    criteria: criteriaObj,
                    is_dynamic: isDynamic,
                };
                await createSegment(request);
                toast.success('Segment created successfully');
            }
            setDialogOpen(false);
            await loadSegments();
            onSegmentChange?.();
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Failed to save segment'
            );
        } finally {
            setIsSaving(false);
        }
    }, [editingSegment, segmentName, segmentDescription, criteria, isDynamic, loadSegments, onSegmentChange]);

    /**
     * Handle delete
     */
    const handleDelete = useCallback(async () => {
        if (!segmentToDelete) return;

        setIsSaving(true);
        try {
            await deleteSegment(segmentToDelete.id);
            toast.success('Segment deleted successfully');
            setDeleteDialogOpen(false);
            setSegmentToDelete(null);
            await loadSegments();
            onSegmentChange?.();
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Failed to delete segment'
            );
        } finally {
            setIsSaving(false);
        }
    }, [segmentToDelete, loadSegments, onSegmentChange]);

    return (
        <div className={cn('space-y-4', className)}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">Customer Segments</h3>
                    <p className="text-sm text-muted-foreground">
                        Organize customers into segments for targeted actions
                    </p>
                </div>
                <Button
                    onClick={handleCreateClick}
                    size="sm"
                    aria-label="Create segment"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Segment
                </Button>
            </div>

            {/* Segments list */}
            {isLoading ? (
                <Card>
                    <CardContent className="flex items-center justify-center p-12">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </CardContent>
                </Card>
            ) : segments.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center p-12">
                        <Users className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground text-center">
                            No segments yet. Create your first segment to get started.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    {segments.map((segment) => (
                        <Card key={segment.id}>
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <CardTitle className="flex items-center gap-2">
                                            {segment.is_dynamic ? (
                                                <Sparkles className="h-4 w-4 text-amber-500" />
                                            ) : (
                                                <Filter className="h-4 w-4 text-blue-500" />
                                            )}
                                            {segment.name}
                                        </CardTitle>
                                        {segment.description && (
                                            <CardDescription className="mt-1">
                                                {segment.description}
                                            </CardDescription>
                                        )}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Badge variant={segment.is_dynamic ? 'default' : 'secondary'}>
                                            {segment.is_dynamic ? 'Dynamic' : 'Static'}
                                        </Badge>
                                        <span className="text-sm text-muted-foreground">
                                            {segment.customer_count} customers
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleViewCustomers(segment)}
                                        className="flex-1"
                                    >
                                        <Users className="h-4 w-4 mr-2" />
                                        View Customers
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEditClick(segment)}
                                        aria-label={`Edit ${segment.name} segment`}
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteClick(segment)}
                                        aria-label={`Delete ${segment.name} segment`}
                                    >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            {editingSegment ? 'Edit Segment' : 'Create Segment'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingSegment
                                ? 'Update the segment configuration.'
                                : 'Create a new customer segment. Dynamic segments automatically update based on criteria.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="segment-name">Segment Name *</Label>
                            <Input
                                id="segment-name"
                                value={segmentName}
                                onChange={(e) => setSegmentName(e.target.value)}
                                placeholder="e.g., High Value Customers, VIP Clients"
                                autoFocus
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="segment-description">Description</Label>
                            <Textarea
                                id="segment-description"
                                value={segmentDescription}
                                onChange={(e) => setSegmentDescription(e.target.value)}
                                placeholder="Segment description (optional)"
                                rows={2}
                            />
                        </div>
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="space-y-0.5">
                                <Label htmlFor="segment-dynamic">Dynamic Segment</Label>
                                <p className="text-sm text-muted-foreground">
                                    Automatically update based on criteria
                                </p>
                            </div>
                            <Switch
                                id="segment-dynamic"
                                checked={isDynamic}
                                onCheckedChange={setIsDynamic}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="segment-criteria">Criteria (JSON) *</Label>
                            <Textarea
                                id="segment-criteria"
                                value={criteria}
                                onChange={(e) => setCriteria(e.target.value)}
                                placeholder='{"min_revenue": 10000, "sector": "ALUMINIUM"}'
                                rows={6}
                                className="font-mono text-sm"
                            />
                            <p className="text-xs text-muted-foreground">
                                Enter filter criteria as JSON (e.g., {`{"min_revenue": 10000}`})
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDialogOpen(false)}
                            disabled={isSaving}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={isSaving || !segmentName.trim()}>
                            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            {editingSegment ? 'Update' : 'Create'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Segment</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{segmentToDelete?.name}"? This action
                            cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isSaving}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* View Customers Dialog */}
            <Dialog open={viewCustomersDialogOpen} onOpenChange={setViewCustomersDialogOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>
                            Customers in "{segmentToView?.name}"
                        </DialogTitle>
                        <DialogDescription>
                            {segmentToView?.is_dynamic
                                ? 'Dynamic segment - customers are automatically included based on criteria'
                                : 'Static segment - manually assigned customers'}
                        </DialogDescription>
                    </DialogHeader>
                    <SegmentCustomersList segmentId={segmentToView?.id} />
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setViewCustomersDialogOpen(false)}
                        >
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

/**
 * Segment Customers List Component (internal)
 */
const SegmentCustomersList: React.FC<{ segmentId?: string }> = ({ segmentId }) => {
    const [customers, setCustomers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!segmentId) return;

        const loadCustomers = async () => {
            setIsLoading(true);
            try {
                const data = await getSegmentCustomers(segmentId);
                setCustomers(data.customers);
            } catch (error) {
                console.error('Failed to load segment customers', error);
            } finally {
                setIsLoading(false);
            }
        };

        void loadCustomers();
    }, [segmentId]);

    if (!segmentId) {
        return (
            <div className="p-8 text-center text-muted-foreground">
                Select a segment to view customers
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (customers.length === 0) {
        return (
            <div className="p-8 text-center text-muted-foreground">
                No customers in this segment
            </div>
        );
    }

    return (
        <div className="space-y-2 max-h-96 overflow-auto">
            {customers.map((customer) => (
                <Card key={customer.id}>
                    <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                            <span className="font-medium">{customer.name}</span>
                            {customer.email && (
                                <span className="text-sm text-muted-foreground">
                                    {customer.email}
                                </span>
                            )}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
};
