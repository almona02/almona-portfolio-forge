import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJobsStore } from '@/store/jobsStore';
import type { WindowUnit } from '@/types/fabricator';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import { Checkbox } from '@/shared/ui/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/ui/table';
import { ScrollArea } from '@/shared/ui/ui/scroll-area';
import { MapPin, Search, ArrowLeft, ArrowRight, Layers, Trash2, Eye } from 'lucide-react';
import { useFabricatorWorkspace } from '@/context/FabricatorWorkspaceContext';
import { SYSTEM_PACKS } from '@/data/systemPacks';
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
export const PositionsGrid: React.FC<PositionsGridProps> = ({ currentProject }) => {
  const { jobs, setSelectedJob, deleteJob, addOrUpdateJob } = useJobsStore();
  const { dispatch: workspaceDispatch } = useFabricatorWorkspace();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(100);
  const [searchTerm, setSearchTerm] = useState('');
  const [limitToCurrentProject, setLimitToCurrentProject] = useState(true);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<WindowUnit | null>(null);

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

  if (jobs.length === 0) {
    return null;
  }

  return (
    <Card className="bg-gray-900/70 border-gray-700">
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-sm md:text-base">
          <Layers className="h-4 w-4 text-orange-400" />
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
            <Label htmlFor="limit-current" className="text-xs text-gray-300">
              Current order only
            </Label>
          </div>
          <div className="relative">
            <Search className="h-3 w-3 text-gray-400 absolute left-2 top-1.5" />
            <Input
              className="pl-6 h-7 text-xs bg-gray-800 border-gray-700"
              placeholder="Search order, flat, floor, remark…"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-[11px] text-gray-400">
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

        <ScrollArea className="h-[260px] rounded-md border border-gray-800">
          <Table className="min-w-[900px] text-[10px]">
            <TableHeader>
              <TableRow className="bg-gray-900/80 h-8">
                <TableHead className="w-20 px-2 py-1.5">Order/POS</TableHead>
                <TableHead className="w-20 px-2 py-1.5">Codes</TableHead>
                <TableHead className="w-24 px-2 py-1.5">System</TableHead>
                <TableHead className="w-20 px-2 py-1.5">Type</TableHead>
                <TableHead className="w-20 px-2 py-1.5">Size</TableHead>
                <TableHead className="w-24 px-2 py-1.5">Glazing</TableHead>
                <TableHead className="w-12 px-2 py-1.5 text-right">Qty</TableHead>
                <TableHead className="w-40 px-2 py-1.5">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-orange-400" />
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
                return (
                  <TableRow key={job.id} className="h-9">
                    <TableCell className="px-2 py-1">
                      <div className="flex flex-col gap-0">
                        <span className="font-mono text-[9px] text-gray-200 leading-tight">
                          {job.orderNumber}
                        </span>
                        <span className="text-[9px] text-gray-500 leading-tight">{job.posNumber}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-2 py-1">
                      <div className="flex flex-col gap-0">
                        {job.projectCode && (
                          <span className="text-[9px] text-gray-300 truncate leading-tight">
                            {job.projectCode}
                          </span>
                        )}
                        {job.positionCode && (
                          <span className="text-[9px] text-gray-500 truncate leading-tight">
                            {job.positionCode}
                          </span>
                        )}
                        {!job.projectCode && !job.positionCode && (
                          <span className="text-[9px] text-gray-500 italic">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-2 py-1">
                      {packLabel ? (
                        <span className="text-[9px] text-gray-200 truncate leading-tight">{packLabel}</span>
                      ) : (
                        <span className="text-[9px] text-gray-500 italic">—</span>
                      )}
                    </TableCell>
                    <TableCell className="px-2 py-1 text-gray-200 truncate text-[9px] leading-tight">
                      {job.type.replace('_', ' ').substring(0, 12)}
                    </TableCell>
                    <TableCell className="px-2 py-1 text-[9px] leading-tight">
                      {job.overallWidth}×{job.overallHeight}
                    </TableCell>
                    <TableCell className="px-2 py-1">
                      <div className="flex flex-col gap-0">
                        <span className="text-[9px] text-gray-200 leading-tight truncate">
                          {String((job as any).glazing?.type || '—')}
                        </span>
                        <span className="text-[8px] text-gray-400 leading-tight truncate">
                          {meta.flyScreenType
                            ? (meta.flyScreenType as string).substring(0, 8)
                            : (job as any).flyScreenType || 'none'}
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
                          <div className="text-[8px] text-gray-400 truncate mt-0.5 max-w-[120px]">
                            {meta.remarks}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-2 py-1">
                      <Badge className="text-[8px] capitalize bg-gray-800 text-gray-100 px-1.5 py-0 h-4 leading-tight">
                        {job.status.substring(0, 6)}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-2 py-1 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-gray-400 hover:text-orange-400"
                          onClick={() => {
                            // Persist any active project changes before switching focus
                            if (currentProject) {
                              addOrUpdateJob(currentProject);
                            }
                            setSelectedJob(job.id);
                            workspaceDispatch({
                              type: 'SET_CURRENT_PROJECT',
                              payload: job,
                            });
                            navigate('/fabricator-workflow', {
                              state: { jobId: job.id, startTab: 'design' },
                            });
                          }}
                          title="Focus on this position"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-900/40"
                          onClick={() => {
                            setJobToDelete(job);
                            setDeleteConfirmOpen(true);
                          }}
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
                  <TableCell colSpan={10} className="text-center text-[10px] text-gray-500 py-4">
                    No positions found for the current filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent className="bg-gray-900 border-gray-700">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-gray-100">Delete Position?</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-400">
                Are you sure you want to delete position{' '}
                <span className="font-mono text-orange-400">
                  {jobToDelete?.orderNumber} / {jobToDelete?.posNumber}
                </span>
                ? This action cannot be undone for this workspace session.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => {
                  if (jobToDelete) {
                    deleteJob(jobToDelete.id);
                    setJobToDelete(null);
                    setDeleteConfirmOpen(false);
                  }
                }}
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

export default PositionsGrid;


