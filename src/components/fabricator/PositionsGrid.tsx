import ErrorBoundary from '@/components/ErrorBoundary';
import { useFabricatorWorkspace } from '@/context/FabricatorWorkspaceContext';
import { SYSTEM_PACKS } from '@/data/systemPacks';
import { useDeletePose, usePositions, useUpsertPose } from '@/hooks/useFabricatorQueries';
import { fabricatorRoutes } from '@/lib/fabricator/routes';
import { trackError } from '@/lib/performance-monitoring';
import { mapPositionRowToWindowUnit } from '@/lib/supabase/fabricatorClientV2';
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
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Checkbox } from '@/shared/ui/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/shared/ui/ui/dialog';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
// ScrollArea replaced by TanStack Virtual
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/ui/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/shared/ui/ui/table';
import type { WindowUnit } from '@/types/fabricator';
import { useVirtualizer } from '@tanstack/react-virtual';
import { CheckSquare, Eye, Layers, MapPin, Pencil, Search, Trash2, X } from 'lucide-react';
import React, { memo, useCallback, useDeferredValue, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PoseQuickEditModal } from './PoseQuickEditModal';

interface PositionsGridProps {
  currentProject: WindowUnit | null;
}

/**
 * PositionsGrid
 * Large-scale overview of all window units (poses) with quantity and
 * positional metadata (flat, floor, elevation, remarks).
 *
 * Designed for heavy-duty usage:
 * - Uses simple pagination instead of rendering all rows at once
 * - Supports quick filtering by current project and text search
 */
const PositionsGridComponent: React.FC<PositionsGridProps> = ({ currentProject }) => {
  // V2 only — React Query as single source of truth (useJobsStore removed)
  const { data: positionsRaw = [] } = usePositions(null);
  const deletePoseMutation = useDeletePose();
  const upsertPose = useUpsertPose();
  const { dispatch: workspaceDispatch } = useFabricatorWorkspace();
  const navigate = useNavigate();

  const jobs = useMemo(() => {
    return positionsRaw.map((row: any) => mapPositionRowToWindowUnit(row)).filter((u): u is WindowUnit => u != null);
  }, [positionsRaw]);
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [limitToCurrentProject, setLimitToCurrentProject] = useState(true);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<WindowUnit | null>(null);
  // Inline edit via PoseQuickEditModal
  const [editingPose, setEditingPose] = useState<WindowUnit | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Bulk Actions State
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkEditField, setBulkEditField] = useState<string>('status');
  const [bulkEditValue, setBulkEditValue] = useState<string>('');
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const packLabelById = useMemo(() => {
    const map = new Map<string, string>();
    SYSTEM_PACKS.forEach((pack) => {
      map.set(pack.meta.id, pack.meta.name);
    });
    return map;
  }, []);

  const filteredJobs = useMemo(() => {
    let list = jobs;

    if (limitToCurrentProject && currentProject) {
      // Group units by same order number for this project
      list = list.filter((job) => job.orderNumber === currentProject.orderNumber);
    }

    if (deferredSearchTerm.trim()) {
      const term = deferredSearchTerm.toLowerCase();
      list = list.filter((job) => {
        const meta = job.positionMeta || {};
        return (
          job.orderNumber.toLowerCase().includes(term) ||
          job.posNumber.toLowerCase().includes(term) ||
          (job.customer && job.customer.toLowerCase().includes(term)) ||
          (meta.flatNumber && meta.flatNumber.toLowerCase().includes(term)) ||
          (meta.floor && meta.floor.toLowerCase().includes(term)) ||
          (meta.roomOrZone && meta.roomOrZone.toLowerCase().includes(term)) ||
          (meta.remarks && meta.remarks.toLowerCase().includes(term))
        );
      });
    }

    return list;
  }, [jobs, currentProject, limitToCurrentProject, deferredSearchTerm]);

  const totalRows = filteredJobs.length;

  const totalPoses = useMemo(
    () => filteredJobs.reduce((sum, job) => sum + (job.quantity || 1), 0),
    [filteredJobs],
  );

  // ─── TanStack Virtual ──────────────────────────────────────────
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const ROW_HEIGHT = 36; // h-9 = 36px

  const rowVirtualizer = useVirtualizer({
    count: filteredJobs.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 15,
  });

  const handleViewJob = useCallback((job: WindowUnit) => {
    try {
      // Save current project state before navigating away
      if (currentProject) void upsertPose.mutateAsync({ windowUnit: currentProject });
      workspaceDispatch({ type: 'SET_CURRENT_PROJECT', payload: job });
      const projectKey = (job as WindowUnit & { projectId?: string }).projectId ?? job.projectCode ?? job.orderNumber;
      navigate(fabricatorRoutes.poseDesign(projectKey, job.id), { state: { jobId: job.id, startTab: 'design' } });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      trackError('PositionsGrid', 'view_job', err.message);
    }
  }, [currentProject, upsertPose, workspaceDispatch, navigate]);

  const handleDeleteClick = useCallback((job: WindowUnit) => {
    setJobToDelete(job);
    setDeleteConfirmOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    try {
      if (jobToDelete) {
        await deletePoseMutation.mutateAsync(jobToDelete.id);
        setJobToDelete(null);
        setDeleteConfirmOpen(false);
        if (selectedJobIds.has(jobToDelete.id)) {
          const next = new Set(selectedJobIds);
          next.delete(jobToDelete.id);
          setSelectedJobIds(next);
        }
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      trackError('PositionsGrid', 'delete_job', err.message);
    }
  }, [jobToDelete, deletePoseMutation, selectedJobIds]);

  // Bulk Action Handlers
  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      const allIds = new Set(filteredJobs.map((j) => j.id));
      setSelectedJobIds(allIds);
    } else {
      setSelectedJobIds(new Set());
    }
  }, [filteredJobs]);

  const handleSelectRow = useCallback((jobId: string, checked: boolean) => {
    setSelectedJobIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(jobId);
      } else {
        next.delete(jobId);
      }
      return next;
    });
  }, []);

  const handleBulkUpdate = useCallback(async () => {
    if (selectedJobIds.size === 0) return;
    try {
      const updates: Partial<WindowUnit> = {};
      switch (bulkEditField) {
        case 'status': updates.status = bulkEditValue as WindowUnit['status']; break;
        case 'systemPack': updates.systemPackId = bulkEditValue; break;
        case 'color': updates.color = bulkEditValue; break;
      }
      for (const id of selectedJobIds) {
        const job = jobs.find((j) => j.id === id);
        if (job) await upsertPose.mutateAsync({ windowUnit: { ...job, ...updates } });
      }
      setBulkEditOpen(false);
      setSelectedJobIds(new Set());
    } catch (error) {
      console.error('Bulk Update Failed', error);
    }
  }, [selectedJobIds, bulkEditField, bulkEditValue, jobs, upsertPose]);

  const handleBulkDelete = useCallback(async () => {
    setIsBulkDeleting(true);
    try {
      for (const id of selectedJobIds) await deletePoseMutation.mutateAsync(id);
      setSelectedJobIds(new Set());
    } finally {
      setIsBulkDeleting(false);
    }
  }, [selectedJobIds, deletePoseMutation]);

  if (jobs.length === 0) {
    return null;
  }

  return (
    <Card className="bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark">
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between pb-3 min-h-[60px]">
        {selectedJobIds.size > 0 ? (
           <div className="flex items-center justify-between w-full bg-amber-500/10 p-2 rounded border border-amber-500/30 animate-in fade-in duration-200">
             <div className="flex items-center gap-3">
               <span className="text-sm font-semibold text-amber-200 flex items-center gap-2">
                 <CheckSquare className="h-4 w-4" />
                 {selectedJobIds.size} Selected
               </span>
               <div className="h-4 w-px bg-amber-600/50 mx-2" />
               <Button 
                size="sm" 
                variant="default"
                className="h-7 bg-amber-500 hover:bg-amber-600 text-black border-none"
                onClick={() => setBulkEditOpen(true)}
               >
                 <Pencil className="h-3 w-3 mr-1.5" />
                 Bulk Edit
               </Button>
               <Button 
                size="sm" 
                variant="destructive"
                className="h-7"
                onClick={handleBulkDelete}
                disabled={isBulkDeleting}
               >
                 <Trash2 className="h-3 w-3 mr-1.5" />
                 {isBulkDeleting ? 'Deleting...' : 'Delete All'}
               </Button>
             </div>
             <Button 
              size="icon" 
              variant="ghost" 
              className="h-6 w-6 text-amber-400/70 hover:text-amber-200"
              onClick={() => setSelectedJobIds(new Set())}
             >
               <X className="h-4 w-4" />
             </Button>
           </div>
        ) : (
          <>
            <CardTitle className="flex items-center gap-2 text-sm md:text-base">
              <Layers className="h-4 w-4 text-amber-400" />
              Positions & Flats Overview
              <Badge variant="outline" className="ml-2 text-[10px]">
                {totalPoses} poses · {totalRows} unit types
              </Badge>
            </CardTitle>
            <div className="flex flex-wrap items-center gap-3 mt-2 md:mt-0">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="limit-current"
                  checked={limitToCurrentProject && !!currentProject}
                  disabled={!currentProject}
                  onCheckedChange={(checked) =>
                    setLimitToCurrentProject(checked === true && !!currentProject)
                  }
                />
                <Label htmlFor="limit-current" className="typography-label text-xs text-amber-300">
                  Current order only
                </Label>
              </div>
              <div className="relative">
                <Search className="h-3 w-3 text-amber-600/70 absolute left-2 top-1.5" />
                <Input
                  className="pl-6 h-7 text-xs bg-[#0f0f0f]/60 border-amber-600/30 text-amber-200"
                  placeholder="Search order, flat, floor, remark…"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>
          </>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-[11px] text-amber-600/70">
          <span>{totalRows} positions</span>
        </div>

        {/* Virtualized Table */}
        <div className="rounded-md border border-amber-600/30 overflow-hidden">
          {/* Sticky Header */}
          <Table className="min-w-[950px] text-[10px]">
            <TableHeader>
              <TableRow className="bg-[#0f0f0f]/80 h-8">
                <TableHead className="w-8 px-2 py-1.5">
                  <Checkbox 
                    checked={filteredJobs.length > 0 && filteredJobs.every(j => selectedJobIds.has(j.id))}
                    onCheckedChange={(checked) => handleSelectAll(checked === true)}
                    className="border-amber-600/50 data-[state=checked]:bg-amber-500 data-[state=checked]:text-black"
                  />
                </TableHead>
                <TableHead className="w-20 px-2 py-1.5">Order/POS</TableHead>
                <TableHead className="w-20 px-2 py-1.5">Codes</TableHead>
                <TableHead className="w-24 px-2 py-1.5">System</TableHead>
                <TableHead className="w-20 px-2 py-1.5">Type</TableHead>
                <TableHead className="w-20 px-2 py-1.5">Size</TableHead>
                <TableHead className="w-24 px-2 py-1.5">Glazing</TableHead>
                <TableHead className="w-12 px-2 py-1.5 text-right">Qty</TableHead>
                <TableHead className="w-40 px-2 py-1.5">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-amber-400" />
                    Location
                  </div>
                </TableHead>
                <TableHead className="w-16 px-2 py-1.5">Status</TableHead>
                <TableHead className="w-20 px-2 py-1.5 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
          </Table>

          {/* Virtualized Body */}
          <div
            ref={scrollContainerRef}
            className="h-[260px] overflow-auto"
          >
            <div
              style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}
            >
              <Table className="min-w-[950px] text-[10px]">
                <TableBody>
                  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const job = filteredJobs[virtualRow.index];
                    if (!job) return null;
                    const meta = job.positionMeta || {};
                    const packLabel =
                      (job.systemPackId && packLabelById.get(job.systemPackId)) || job.systemPackId;
                    const isSelected = selectedJobIds.has(job.id);
                    
                    return (
                      <TableRow
                        key={job.id}
                        data-index={virtualRow.index}
                        className={`h-9 ${isSelected ? 'bg-amber-900/20' : ''}`}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: `${virtualRow.size}px`,
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                      >
                        <TableCell className="w-8 px-2 py-1">
                          <Checkbox 
                            checked={isSelected}
                            onCheckedChange={(checked) => handleSelectRow(job.id, checked === true)}
                            className="border-amber-600/50 data-[state=checked]:bg-amber-500 data-[state=checked]:text-black"
                          />
                        </TableCell>
                        <TableCell className="w-20 px-2 py-1">
                          <div className="flex flex-col gap-0">
                            <span className="font-mono text-[9px] text-amber-200 leading-tight">
                              {job.orderNumber}
                            </span>
                            <span className="text-[9px] text-amber-600/70 leading-tight">{job.posNumber}</span>
                          </div>
                        </TableCell>
                        <TableCell className="w-20 px-2 py-1">
                          <div className="flex flex-col gap-0">
                            {job.projectCode && (
                              <span className="text-[9px] text-amber-300 truncate leading-tight">
                                {job.projectCode}
                              </span>
                            )}
                            {job.positionCode && (
                              <span className="text-[9px] text-amber-600/70 truncate leading-tight">
                                {job.positionCode}
                              </span>
                            )}
                            {!job.projectCode && !job.positionCode && (
                              <span className="text-[9px] text-amber-600/70 italic">--</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="w-24 px-2 py-1">
                          {packLabel ? (
                            <span className="text-[9px] text-amber-200 truncate leading-tight">{packLabel}</span>
                          ) : (
                            <span className="text-[9px] text-amber-600/70 italic">--</span>
                          )}
                        </TableCell>
                        <TableCell className="w-20 px-2 py-1 text-amber-200 truncate text-[9px] leading-tight">
                          {job.type.replace('_', ' ').substring(0, 12)}
                        </TableCell>
                        <TableCell className="w-20 px-2 py-1 text-[9px] leading-tight">
                          {job.overallWidth}x{job.overallHeight}
                        </TableCell>
                        <TableCell className="w-24 px-2 py-1">
                          <div className="flex flex-col gap-0">
                            <span className="text-[9px] text-amber-200 leading-tight truncate">
                              {String(job.glazing?.type || '--')}
                            </span>
                            <span className="text-[8px] text-amber-600/70 leading-tight truncate">
                              {job.flyScreenType || 'none'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="w-12 px-2 py-1 text-right">
                          <span className="font-mono text-[9px]">{job.quantity || 1}</span>
                        </TableCell>
                        <TableCell className="w-40 px-2 py-1">
                          <div className="space-y-0">
                            <div className="flex flex-wrap gap-0.5">
                              {meta.flatNumber && (
                                <Badge variant="outline" className="text-[8px] px-1 py-0 h-4 leading-tight">
                                  F{meta.flatNumber}
                                </Badge>
                              )}
                              {meta.floor && (
                                <Badge variant="outline" className="text-[8px] px-1 py-0 h-4 leading-tight">
                                  {meta.floor}
                                </Badge>
                              )}
                              {meta.buildingBlock && (
                                <Badge variant="outline" className="text-[8px] px-1 py-0 h-4 leading-tight">
                                  B{meta.buildingBlock}
                                </Badge>
                              )}
                              {meta.roomOrZone && (
                                <Badge variant="outline" className="text-[8px] px-1 py-0 h-4 leading-tight truncate max-w-[40px]">
                                  {String(meta.roomOrZone).substring(0, 4)}
                                </Badge>
                              )}
                            </div>
                            {meta.remarks && (
                              <div className="text-[8px] text-amber-600/70 truncate mt-0.5 max-w-[120px]">
                                {meta.remarks}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="w-16 px-2 py-1">
                          <Badge className="text-[8px] capitalize bg-[#0f0f0f]/60 text-amber-200 border border-amber-600/30 px-1.5 py-0 h-4 leading-tight">
                            {job.status.substring(0, 6)}
                          </Badge>
                        </TableCell>
                        <TableCell className="w-20 px-2 py-1 text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-amber-600/70 hover:text-amber-400 hover:bg-amber-500/10"
                              onClick={() => { setEditingPose(job); setEditModalOpen(true); }}
                              title="Quick edit metadata"
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-amber-600/70 hover:text-amber-400 hover:bg-amber-500/10"
                              onClick={() => handleViewJob(job)}
                              title="Focus on this position"
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-900/40"
                              onClick={() => handleDeleteClick(job)}
                              title="Delete position"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredJobs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center text-[10px] text-amber-600/70 py-4">
                        No positions found for the current filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        {/* Bulk Edit Dialog */}
        <Dialog open={bulkEditOpen} onOpenChange={setBulkEditOpen}>
          <DialogContent className="bg-[#0f0f0f] border-amber-600/30 card-glass-dark">
            <DialogHeader>
              <DialogTitle className="text-amber-200">Bulk Edit {selectedJobIds.size} Positions</DialogTitle>
              <DialogDescription className="text-amber-600/70">
                Update properties for all selected positions. This will override existing values.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="field" className="text-right text-amber-200">
                  Field
                </Label>
                <div className="col-span-3">
                  <Select
                    value={bulkEditField}
                    onValueChange={setBulkEditField}
                  >
                    <SelectTrigger className="bg-[#0f0f0f] border-amber-600/30 text-amber-200">
                      <SelectValue placeholder="Select field to update" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0f0f0f] border-amber-600/30 text-amber-200">
                      <SelectItem value="status">Status</SelectItem>
                      <SelectItem value="systemPack">System Pack</SelectItem>
                      <SelectItem value="color">Color Material</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="value" className="text-right text-amber-200">
                  Value
                </Label>
                <div className="col-span-3">
                  {bulkEditField === 'status' && (
                     <Select
                      value={bulkEditValue}
                      onValueChange={setBulkEditValue}
                    >
                      <SelectTrigger className="bg-[#0f0f0f] border-amber-600/30 text-amber-200">
                        <SelectValue placeholder="Select new status" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0f0f0f] border-amber-600/30 text-amber-200">
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="design">Design</SelectItem>
                        <SelectItem value="production">Production</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  
                  {bulkEditField === 'systemPack' && (
                     <Select
                      value={bulkEditValue}
                      onValueChange={setBulkEditValue}
                    >
                      <SelectTrigger className="bg-[#0f0f0f] border-amber-600/30 text-amber-200">
                        <SelectValue placeholder="Select system pack" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0f0f0f] border-amber-600/30 text-amber-200 h-64">
                         {SYSTEM_PACKS.map(pack => (
                           <SelectItem key={pack.meta.id} value={pack.meta.id}>
                             {pack.meta.name}
                           </SelectItem>
                         ))}
                      </SelectContent>
                    </Select>
                  )}
                  
                  {bulkEditField === 'color' && (
                    <Input 
                      className="bg-[#0f0f0f] border-amber-600/30 text-amber-200" 
                      placeholder="e.g. RAL 9016 (White)"
                      value={bulkEditValue}
                      onChange={(e) => setBulkEditValue(e.target.value)}
                    />
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
               <Button variant="outline" onClick={() => setBulkEditOpen(false)} className="border-amber-600/30 text-amber-200 hover:bg-amber-900/20">
                 Cancel
               </Button>
               <Button onClick={handleBulkUpdate} className="bg-amber-500 hover:bg-amber-600 text-black">
                 Apply to {selectedJobIds.size} Items
               </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Inline Edit Modal */}
        <PoseQuickEditModal
          pose={editingPose}
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent className="bg-[#0f0f0f] border-amber-600/30 card-glass-dark">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-amber-200">Delete Position?</AlertDialogTitle>
              <AlertDialogDescription className="text-amber-600/70">
                Are you sure you want to delete position{' '}
                <span className="font-mono text-amber-400">
                  {jobToDelete?.orderNumber} / {jobToDelete?.posNumber}
                </span>
                ? This action cannot be undone for this workspace session.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-[#0f0f0f] border-amber-600/30 text-amber-300 hover:bg-[#1a1a1a]">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleConfirmDelete}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};

// ✅ HARDENING: Memoize component for performance
const PositionsGridMemo = memo(PositionsGridComponent);

// ✅ HARDENING: Wrap with error boundary for production
export const PositionsGrid: React.FC<PositionsGridProps> = (props) => (
  <ErrorBoundary level="component">
    <PositionsGridMemo {...props} />
  </ErrorBoundary>
);

export default PositionsGrid;


