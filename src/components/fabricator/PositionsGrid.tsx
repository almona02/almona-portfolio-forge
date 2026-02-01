import ErrorBoundary from '@/components/ErrorBoundary';
import { useFabricatorWorkspace } from '@/context/FabricatorWorkspaceContext';
import { SYSTEM_PACKS } from '@/data/systemPacks';
import { trackError } from '@/lib/performance-monitoring';
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
import { ScrollArea } from '@/shared/ui/ui/scroll-area';
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
import { useJobsStore } from '@/store/jobsStore';
import type { WindowUnit } from '@/types/fabricator';
import { ArrowLeft, ArrowRight, CheckSquare, Eye, Layers, MapPin, Pencil, Search, Trash2, X } from 'lucide-react';
import React, { memo, useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

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
  const { jobs, setSelectedJob, deleteJob, addOrUpdateJob, bulkUpdateJobs, bulkDeleteJobs } = useJobsStore();
  const { dispatch: workspaceDispatch } = useFabricatorWorkspace();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(100);
  const [searchTerm, setSearchTerm] = useState('');
  const [limitToCurrentProject, setLimitToCurrentProject] = useState(true);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<WindowUnit | null>(null);

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

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
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
  }, [jobs, currentProject, limitToCurrentProject, searchTerm]);

  const totalRows = filteredJobs.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const currentPage = Math.min(page, totalPages);

  const pageSlice = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredJobs.slice(start, end);
  }, [filteredJobs, currentPage, pageSize]);

  const totalPoses = useMemo(
    () => filteredJobs.reduce((sum, job) => sum + (job.quantity || 1), 0),
    [filteredJobs],
  );

  // ✅ PERFORMANCE: Memoize handlers to prevent unnecessary re-renders
  const handleViewJob = useCallback((job: WindowUnit) => {
    try {
      // Persist any active project changes before switching focus
      if (currentProject) {
        addOrUpdateJob(currentProject);
      }
      setSelectedJob(job.id);
      workspaceDispatch({
        type: 'SET_CURRENT_PROJECT',
        payload: job,
      });
      navigate(`/fabricator/workflow/engineering-bay/${job.id}`, {
        state: { jobId: job.id, startTab: 'design' },
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      trackError('PositionsGrid', 'view_job', err.message);
    }
  }, [currentProject, addOrUpdateJob, setSelectedJob, workspaceDispatch, navigate]);

  const handleDeleteClick = useCallback((job: WindowUnit) => {
    setJobToDelete(job);
    setDeleteConfirmOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    try {
      if (jobToDelete) {
        deleteJob(jobToDelete.id);
        setJobToDelete(null);
        setDeleteConfirmOpen(false);
        // Remove from selection if it was selected
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
  }, [jobToDelete, deleteJob, selectedJobIds]);

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
        case 'status':
          updates.status = bulkEditValue as any;
          break;
        case 'systemPack':
          updates.systemPackId = bulkEditValue;
          break;
        case 'color':
          updates.color = bulkEditValue;
          break;
      }
      
      await bulkUpdateJobs(Array.from(selectedJobIds), updates);
      setBulkEditOpen(false);
      setSelectedJobIds(new Set()); // Clear selection after update
      
    } catch (error) {
       console.error("Bulk Update Failed", error);
    }
  }, [selectedJobIds, bulkEditField, bulkEditValue, bulkUpdateJobs]);

  const handleBulkDelete = useCallback(async () => {
    setIsBulkDeleting(true);
    try {
       await bulkDeleteJobs(Array.from(selectedJobIds));
       setSelectedJobIds(new Set());
    } finally {
       setIsBulkDeleting(false);
    }
  }, [selectedJobIds, bulkDeleteJobs]);

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
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ArrowLeft className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <ScrollArea className="h-[260px] rounded-md border border-amber-600/30">
          <Table className="min-w-[950px] text-[10px]">
            <TableHeader>
              <TableRow className="bg-[#0f0f0f]/80 h-8">
                <TableHead className="w-8 px-2 py-1.5">
                  <Checkbox 
                    checked={pageSlice.length > 0 && pageSlice.every(j => selectedJobIds.has(j.id))}
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
            <TableBody>
              {pageSlice.map((job) => {
                const meta = job.positionMeta || {};
                const packLabel =
                  (job.systemPackId && packLabelById.get(job.systemPackId)) || job.systemPackId;
                const isSelected = selectedJobIds.has(job.id);
                
                return (
                  <TableRow key={job.id} className={`h-9 ${isSelected ? 'bg-amber-900/20' : ''}`}>
                    <TableCell className="px-2 py-1">
                      <Checkbox 
                        checked={isSelected}
                        onCheckedChange={(checked) => handleSelectRow(job.id, checked === true)}
                        className="border-amber-600/50 data-[state=checked]:bg-amber-500 data-[state=checked]:text-black"
                      />
                    </TableCell>
                    <TableCell className="px-2 py-1">
                      <div className="flex flex-col gap-0">
                        <span className="font-mono text-[9px] text-amber-200 leading-tight">
                          {job.orderNumber}
                        </span>
                        <span className="text-[9px] text-amber-600/70 leading-tight">{job.posNumber}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-2 py-1">
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
                          <span className="text-[9px] text-amber-600/70 italic">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-2 py-1">
                      {packLabel ? (
                        <span className="text-[9px] text-amber-200 truncate leading-tight">{packLabel}</span>
                      ) : (
                        <span className="text-[9px] text-amber-600/70 italic">—</span>
                      )}
                    </TableCell>
                    <TableCell className="px-2 py-1 text-amber-200 truncate text-[9px] leading-tight">
                      {job.type.replace('_', ' ').substring(0, 12)}
                    </TableCell>
                    <TableCell className="px-2 py-1 text-[9px] leading-tight">
                      {job.overallWidth}×{job.overallHeight}
                    </TableCell>
                    <TableCell className="px-2 py-1">
                      <div className="flex flex-col gap-0">
                        <span className="text-[9px] text-amber-200 leading-tight truncate">
                          {String(job.glazing?.type || '—')}
                        </span>
                        <span className="text-[8px] text-amber-600/70 leading-tight truncate">
                          {job.flyScreenType || 'none'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-2 py-1 text-right">
                      <span className="font-mono text-[9px]">{job.quantity || 1}</span>
                    </TableCell>
                    <TableCell className="px-2 py-1">
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
                    <TableCell className="px-2 py-1">
                      <Badge className="text-[8px] capitalize bg-[#0f0f0f]/60 text-amber-200 border border-amber-600/30 px-1.5 py-0 h-4 leading-tight">
                        {job.status.substring(0, 6)}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-2 py-1 text-right">
                      <div className="flex justify-end gap-1">
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
              {pageSlice.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} className="text-center text-[10px] text-amber-600/70 py-4">
                    No positions found for the current filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>

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


