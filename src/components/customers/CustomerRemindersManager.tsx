/**
 * CustomerRemindersManager Component
 * 
 * Priority 4: Customers Page Upgrade - Reminder Management UI
 * Create, edit, delete, and manage customer reminders.
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
import { Textarea } from '@/shared/ui/ui/textarea';
import { Badge } from '@/shared/ui/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
    Bell,
    Plus,
    Edit2,
    Trash2,
    CheckCircle2,
    Loader2,
    Calendar,
} from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { format, formatDistanceToNow, isPast, isToday, isTomorrow } from 'date-fns';
import { toast } from 'sonner';
import {
    listReminders,
    createReminder,
    updateReminder,
    deleteReminder,
    type CustomerReminderResponse,
    type CustomerReminderCreateRequest,
    type CustomerReminderUpdateRequest,
} from '@/services/customersApi';

/**
 * CustomerRemindersManager props
 */
export interface CustomerRemindersManagerProps {
    customerId: string;
    onReminderChange?: () => void;
    className?: string;
}

/**
 * CustomerRemindersManager Component
 */
export const CustomerRemindersManager: React.FC<CustomerRemindersManagerProps> = ({
    customerId,
    onReminderChange,
    className,
}) => {
    const [reminders, setReminders] = useState<CustomerReminderResponse[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [editingReminder, setEditingReminder] = useState<CustomerReminderResponse | null>(null);
    const [reminderToDelete, setReminderToDelete] = useState<CustomerReminderResponse | null>(null);
    const [reminderTitle, setReminderTitle] = useState('');
    const [reminderDescription, setReminderDescription] = useState('');
    const [reminderDate, setReminderDate] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    /**
     * Load reminders
     */
    const loadReminders = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await listReminders(customerId, 100, 0);
            setReminders(data.reminders);
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Failed to load reminders'
            );
        } finally {
            setIsLoading(false);
        }
    }, [customerId]);

    /**
     * Initial load
     */
    useEffect(() => {
        loadReminders();
    }, [loadReminders]);

    /**
     * Open create dialog
     */
    const handleCreateClick = () => {
        setEditingReminder(null);
        setReminderTitle('');
        setReminderDescription('');
        // Set default date to tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setReminderDate(tomorrow.toISOString().split('T')[0] + 'T10:00');
        setDialogOpen(true);
    };

    /**
     * Open edit dialog
     */
    const handleEditClick = (reminder: CustomerReminderResponse) => {
        setEditingReminder(reminder);
        setReminderTitle(reminder.title);
        setReminderDescription(reminder.description || '');
        setReminderDate(new Date(reminder.reminder_date).toISOString().slice(0, 16));
        setDialogOpen(true);
    };

    /**
     * Open delete dialog
     */
    const handleDeleteClick = (reminder: CustomerReminderResponse) => {
        setReminderToDelete(reminder);
        setDeleteDialogOpen(true);
    };

    /**
     * Handle toggle complete
     */
    const handleToggleComplete = useCallback(async (reminder: CustomerReminderResponse) => {
        try {
            const request: CustomerReminderUpdateRequest = {
                is_completed: !reminder.is_completed,
            };
            await updateReminder(reminder.id, request);
            toast.success(
                reminder.is_completed ? 'Reminder marked as incomplete' : 'Reminder completed'
            );
            await loadReminders();
            onReminderChange?.();
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Failed to update reminder'
            );
        }
    }, [loadReminders, onReminderChange]);

    /**
     * Handle save
     */
    const handleSave = useCallback(async () => {
        if (!reminderTitle.trim()) {
            toast.error('Reminder title is required');
            return;
        }
        if (!reminderDate) {
            toast.error('Reminder date is required');
            return;
        }

        setIsSaving(true);
        try {
            if (editingReminder) {
                const request: CustomerReminderUpdateRequest = {
                    title: reminderTitle.trim(),
                    description: reminderDescription.trim() || undefined,
                    reminder_date: new Date(reminderDate).toISOString(),
                };
                await updateReminder(editingReminder.id, request);
                toast.success('Reminder updated successfully');
            } else {
                const request: CustomerReminderCreateRequest = {
                    title: reminderTitle.trim(),
                    description: reminderDescription.trim() || undefined,
                    reminder_date: new Date(reminderDate).toISOString(),
                };
                await createReminder(customerId, request);
                toast.success('Reminder created successfully');
            }
            setDialogOpen(false);
            await loadReminders();
            onReminderChange?.();
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Failed to save reminder'
            );
        } finally {
            setIsSaving(false);
        }
    }, [customerId, editingReminder, reminderTitle, reminderDescription, reminderDate, loadReminders, onReminderChange]);

    /**
     * Handle delete
     */
    const handleDelete = useCallback(async () => {
        if (!reminderToDelete) return;

        setIsSaving(true);
        try {
            await deleteReminder(reminderToDelete.id);
            toast.success('Reminder deleted successfully');
            setDeleteDialogOpen(false);
            setReminderToDelete(null);
            await loadReminders();
            onReminderChange?.();
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Failed to delete reminder'
            );
        } finally {
            setIsSaving(false);
        }
    }, [reminderToDelete, loadReminders, onReminderChange]);

    /**
     * Get reminder status
     */
    const getReminderStatus = (reminder: CustomerReminderResponse) => {
        if (reminder.is_completed) {
            return { label: 'Completed', variant: 'secondary' as const };
        }
        const date = new Date(reminder.reminder_date);
        if (isPast(date)) {
            return { label: 'Overdue', variant: 'destructive' as const };
        }
        if (isToday(date)) {
            return { label: 'Today', variant: 'default' as const };
        }
        if (isTomorrow(date)) {
            return { label: 'Tomorrow', variant: 'default' as const };
        }
        return { label: 'Upcoming', variant: 'outline' as const };
    };

    const upcomingReminders = reminders.filter(r => !r.is_completed);
    const completedReminders = reminders.filter(r => r.is_completed);

    return (
        <div className={cn('space-y-4', className)}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">Reminders</h3>
                    <p className="text-sm text-muted-foreground">
                        Track follow-ups and important dates
                    </p>
                </div>
                <Button
                    onClick={handleCreateClick}
                    size="sm"
                    aria-label="Create reminder"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Reminder
                </Button>
            </div>

            {/* Reminders list */}
            {isLoading ? (
                <Card>
                    <CardContent className="flex items-center justify-center p-12">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </CardContent>
                </Card>
            ) : reminders.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center p-12">
                        <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground text-center">
                            No reminders yet. Create your first reminder to get started.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {/* Upcoming reminders */}
                    {upcomingReminders.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium text-muted-foreground">
                                Upcoming ({upcomingReminders.length})
                            </h4>
                            {upcomingReminders.map((reminder) => {
                                const status = getReminderStatus(reminder);
                                const reminderDate = new Date(reminder.reminder_date);
                                return (
                                    <Card key={reminder.id}>
                                        <CardContent className="p-4">
                                            <div className="flex items-start gap-4">
                                                <Checkbox
                                                    checked={reminder.is_completed}
                                                    onCheckedChange={() => handleToggleComplete(reminder)}
                                                    aria-label={`Mark "${reminder.title}" as ${reminder.is_completed ? 'incomplete' : 'complete'}`}
                                                />
                                                <div className="flex-1 min-w-0 space-y-2">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-medium">
                                                                    {reminder.title}
                                                                </span>
                                                                <Badge variant={status.variant}>
                                                                    {status.label}
                                                                </Badge>
                                                            </div>
                                                            {reminder.description && (
                                                                <p className="text-sm text-muted-foreground mt-1">
                                                                    {reminder.description}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                        <div className="flex items-center gap-1">
                                                            <Calendar className="h-3 w-3" />
                                                            {format(reminderDate, 'PPp')} (
                                                            {formatDistanceToNow(reminderDate, {
                                                                addSuffix: true,
                                                            })}
                                                            )
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleEditClick(reminder)}
                                                        aria-label={`Edit "${reminder.title}" reminder`}
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDeleteClick(reminder)}
                                                        aria-label={`Delete "${reminder.title}" reminder`}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}

                    {/* Completed reminders */}
                    {completedReminders.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium text-muted-foreground">
                                Completed ({completedReminders.length})
                            </h4>
                            {completedReminders.map((reminder) => {
                                return (
                                    <Card key={reminder.id} className="opacity-60">
                                        <CardContent className="p-4">
                                            <div className="flex items-start gap-4">
                                                <Checkbox
                                                    checked={reminder.is_completed}
                                                    onCheckedChange={() => handleToggleComplete(reminder)}
                                                    aria-label={`Mark "${reminder.title}" as incomplete`}
                                                />
                                                <div className="flex-1 min-w-0 space-y-2">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-medium line-through">
                                                                    {reminder.title}
                                                                </span>
                                                                <Badge variant="secondary">Completed</Badge>
                                                            </div>
                                                            {reminder.description && (
                                                                <p className="text-sm text-muted-foreground mt-1">
                                                                    {reminder.description}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                        <div className="flex items-center gap-1">
                                                            <CheckCircle2 className="h-3 w-3" />
                                                            Completed{' '}
                                                            {reminder.completed_at &&
                                                                formatDistanceToNow(
                                                                    new Date(reminder.completed_at),
                                                                    { addSuffix: true }
                                                                )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDeleteClick(reminder)}
                                                        aria-label={`Delete "${reminder.title}" reminder`}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingReminder ? 'Edit Reminder' : 'Create Reminder'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingReminder
                                ? 'Update the reminder details.'
                                : 'Set a reminder for this customer.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="reminder-title">Title *</Label>
                            <Input
                                id="reminder-title"
                                value={reminderTitle}
                                onChange={(e) => setReminderTitle(e.target.value)}
                                placeholder="e.g., Follow up on quote, Check on project status"
                                autoFocus
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="reminder-description">Description</Label>
                            <Textarea
                                id="reminder-description"
                                value={reminderDescription}
                                onChange={(e) => setReminderDescription(e.target.value)}
                                placeholder="Additional notes (optional)"
                                rows={3}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="reminder-date">Reminder Date & Time *</Label>
                            <Input
                                id="reminder-date"
                                type="datetime-local"
                                value={reminderDate}
                                onChange={(e) => setReminderDate(e.target.value)}
                            />
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
                        <Button
                            onClick={handleSave}
                            disabled={isSaving || !reminderTitle.trim() || !reminderDate}
                        >
                            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            {editingReminder ? 'Update' : 'Create'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Reminder</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{reminderToDelete?.title}"? This action
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
        </div>
    );
};
