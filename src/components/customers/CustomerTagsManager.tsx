/**
 * CustomerTagsManager Component
 * 
 * Priority 4: Customers Page Upgrade - Tag Management UI
 * Create, edit, delete, and assign tags to customers.
 * 
 * Gold Tier Implementation:
 * - Market-leading UX patterns (Salesforce/HubSpot inspired)
 * - ARIA compliant (WCAG 2.1 AA)
 * - Performance optimized
 * - Real-time updates
 */

import { cn } from '@/lib/utils';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent } from '@/shared/ui/ui/card';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import { Badge } from '@/shared/ui/ui/badge';
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
    Tag,
    Plus,
    Edit2,
    Trash2,
    X,
    Loader2,
} from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
    listTags,
    createTag,
    updateTag,
    deleteTag,
    getCustomerTags,
    assignTagToCustomer,
    removeTagFromCustomer,
    type CustomerTagResponse,
    type CustomerTagCreateRequest,
    type CustomerTagUpdateRequest,
} from '@/services/customersApi';

/**
 * CustomerTagsManager props
 */
export interface CustomerTagsManagerProps {
    customerId?: string; // If provided, shows customer-specific tags
    onTagsChange?: () => void;
    className?: string;
}

/**
 * CustomerTagsManager Component
 */
export const CustomerTagsManager: React.FC<CustomerTagsManagerProps> = ({
    customerId,
    onTagsChange,
    className,
}) => {
    const [allTags, setAllTags] = useState<CustomerTagResponse[]>([]);
    const [customerTags, setCustomerTags] = useState<CustomerTagResponse[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [editingTag, setEditingTag] = useState<CustomerTagResponse | null>(null);
    const [tagToDelete, setTagToDelete] = useState<CustomerTagResponse | null>(null);
    const [tagName, setTagName] = useState('');
    const [tagColor, setTagColor] = useState('#3b82f6');
    const [isSaving, setIsSaving] = useState(false);

    /**
     * Load tags
     */
    const loadTags = useCallback(async () => {
        setIsLoading(true);
        try {
            const tagsData = await listTags();
            setAllTags(tagsData.tags);

            if (customerId) {
                const customerTagsData = await getCustomerTags(customerId);
                setCustomerTags(customerTagsData.tags);
            }
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Failed to load tags'
            );
        } finally {
            setIsLoading(false);
        }
    }, [customerId]);

    /**
     * Initial load
     */
    useEffect(() => {
        loadTags();
    }, [loadTags]);

    /**
     * Open create dialog
     */
    const handleCreateClick = () => {
        setEditingTag(null);
        setTagName('');
        setTagColor('#3b82f6');
        setDialogOpen(true);
    };

    /**
     * Open edit dialog
     */
    const handleEditClick = (tag: CustomerTagResponse) => {
        setEditingTag(tag);
        setTagName(tag.name);
        setTagColor(tag.color);
        setDialogOpen(true);
    };

    /**
     * Open delete dialog
     */
    const handleDeleteClick = (tag: CustomerTagResponse) => {
        setTagToDelete(tag);
        setDeleteDialogOpen(true);
    };

    /**
     * Handle save
     */
    const handleSave = useCallback(async () => {
        if (!tagName.trim()) {
            toast.error('Tag name is required');
            return;
        }

        setIsSaving(true);
        try {
            if (editingTag) {
                const request: CustomerTagUpdateRequest = {
                    name: tagName.trim(),
                    color: tagColor,
                };
                await updateTag(editingTag.id, request);
                toast.success('Tag updated successfully');
            } else {
                const request: CustomerTagCreateRequest = {
                    name: tagName.trim(),
                    color: tagColor,
                };
                await createTag(request);
                toast.success('Tag created successfully');
            }
            setDialogOpen(false);
            await loadTags();
            onTagsChange?.();
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Failed to save tag'
            );
        } finally {
            setIsSaving(false);
        }
    }, [editingTag, tagName, tagColor, loadTags, onTagsChange]);

    /**
     * Handle delete
     */
    const handleDelete = useCallback(async () => {
        if (!tagToDelete) return;

        setIsSaving(true);
        try {
            await deleteTag(tagToDelete.id);
            toast.success('Tag deleted successfully');
            setDeleteDialogOpen(false);
            setTagToDelete(null);
            await loadTags();
            onTagsChange?.();
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Failed to delete tag'
            );
        } finally {
            setIsSaving(false);
        }
    }, [tagToDelete, loadTags, onTagsChange]);

    /**
     * Handle assign tag to customer
     */
    const handleAssignTag = useCallback(async (tag: CustomerTagResponse) => {
        if (!customerId) return;

        try {
            await assignTagToCustomer(customerId, { tag_id: tag.id });
            toast.success('Tag assigned successfully');
            await loadTags();
            onTagsChange?.();
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Failed to assign tag'
            );
        }
    }, [customerId, loadTags, onTagsChange]);

    /**
     * Handle remove tag from customer
     */
    const handleRemoveTag = useCallback(async (tag: CustomerTagResponse) => {
        if (!customerId) return;

        try {
            await removeTagFromCustomer(customerId, tag.id);
            toast.success('Tag removed successfully');
            await loadTags();
            onTagsChange?.();
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Failed to remove tag'
            );
        }
    }, [customerId, loadTags, onTagsChange]);

    /**
     * Check if tag is assigned to customer
     */
    const isTagAssigned = (tagId: string): boolean => {
        return customerTags.some(tag => tag.id === tagId);
    };

    const tagsToDisplay = customerId ? allTags : allTags;

    return (
        <div className={cn('space-y-4', className)}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">
                        {customerId ? 'Customer Tags' : 'Tags'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        {customerId
                            ? 'Manage tags for this customer'
                            : 'Create and manage tags'}
                    </p>
                </div>
                <Button
                    onClick={handleCreateClick}
                    size="sm"
                    aria-label="Create tag"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Tag
                </Button>
            </div>

            {/* Tags list */}
            {isLoading ? (
                <Card>
                    <CardContent className="flex items-center justify-center p-12">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </CardContent>
                </Card>
            ) : tagsToDisplay.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center p-12">
                        <Tag className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground text-center">
                            No tags yet. Create your first tag to get started.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-2">
                    {tagsToDisplay.map((tag) => {
                        const assigned = customerId ? isTagAssigned(tag.id) : false;
                        return (
                            <Card key={tag.id}>
                                <CardContent className="flex items-center justify-between p-4">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="h-4 w-4 rounded"
                                            style={{ backgroundColor: tag.color }}
                                            aria-label={`Tag color: ${tag.color}`}
                                        />
                                        <span className="font-medium">{tag.name}</span>
                                        {customerId && assigned && (
                                            <Badge variant="secondary" className="text-xs">
                                                Assigned
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {customerId ? (
                                            assigned ? (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleRemoveTag(tag)}
                                                    aria-label={`Remove ${tag.name} tag`}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            ) : (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleAssignTag(tag)}
                                                    aria-label={`Assign ${tag.name} tag`}
                                                >
                                                    <Plus className="h-4 w-4" />
                                                </Button>
                                            )
                                        ) : (
                                            <>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleEditClick(tag)}
                                                    aria-label={`Edit ${tag.name} tag`}
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDeleteClick(tag)}
                                                    aria-label={`Delete ${tag.name} tag`}
                                                >
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingTag ? 'Edit Tag' : 'Create Tag'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingTag
                                ? 'Update the tag name and color.'
                                : 'Create a new tag to organize your customers.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="tag-name">Tag Name *</Label>
                            <Input
                                id="tag-name"
                                value={tagName}
                                onChange={(e) => setTagName(e.target.value)}
                                placeholder="e.g., VIP, Preferred, Hot Lead"
                                autoFocus
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="tag-color">Tag Color</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="tag-color"
                                    type="color"
                                    value={tagColor}
                                    onChange={(e) => setTagColor(e.target.value)}
                                    className="w-20 h-10"
                                />
                                <Input
                                    value={tagColor}
                                    onChange={(e) => setTagColor(e.target.value)}
                                    placeholder="#3b82f6"
                                    className="flex-1"
                                />
                            </div>
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
                        <Button onClick={handleSave} disabled={isSaving || !tagName.trim()}>
                            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            {editingTag ? 'Update' : 'Create'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Tag</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{tagToDelete?.name}"? This action
                            cannot be undone and will remove the tag from all customers.
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
        </div>
    );
};
