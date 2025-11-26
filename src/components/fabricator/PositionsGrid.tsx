import React, { useMemo, useState } from 'react';
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
import { MapPin, Search, ArrowLeft, ArrowRight, Layers } from 'lucide-react';

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
  const { jobs, setSelectedJob } = useJobsStore();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(100);
  const [searchTerm, setSearchTerm] = useState('');
  const [limitToCurrentProject, setLimitToCurrentProject] = useState(true);

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
          <Table className="min-w-[700px] text-[11px]">
            <TableHeader>
              <TableRow className="bg-gray-900/80">
                <TableHead className="w-28">Order / POS</TableHead>
                <TableHead className="w-24">Codes</TableHead>
                <TableHead className="w-28">Type</TableHead>
                <TableHead className="w-28">Size (mm)</TableHead>
                <TableHead className="w-16 text-right">Qty</TableHead>
                <TableHead className="w-48">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-orange-400" />
                    Location
                  </div>
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageSlice.map((job) => {
                const meta = job.positionMeta || {};
                return (
                  <TableRow key={job.id}>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-mono text-[10px] text-gray-200">
                          {job.orderNumber}
                        </span>
                        <span className="text-[10px] text-gray-500">{job.posNumber}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        {job.projectCode && (
                          <span className="text-[10px] text-gray-300 truncate">
                            {job.projectCode}
                          </span>
                        )}
                        {job.positionCode && (
                          <span className="text-[10px] text-gray-500 truncate">
                            {job.positionCode}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-200 truncate">{job.type}</TableCell>
                    <TableCell>
                      {job.overallWidth} × {job.overallHeight}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-mono">{job.quantity || 1}</span>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        <div className="flex flex-wrap gap-1">
                          {meta.flatNumber && (
                            <Badge variant="outline" className="text-[9px]">
                              Flat {meta.flatNumber}
                            </Badge>
                          )}
                          {meta.floor && (
                            <Badge variant="outline" className="text-[9px]">
                              Floor {meta.floor}
                            </Badge>
                          )}
                          {meta.elevation && (
                            <Badge variant="outline" className="text-[9px]">
                              {meta.elevation}
                            </Badge>
                          )}
                          {meta.roomOrZone && (
                            <Badge variant="outline" className="text-[9px]">
                              {meta.roomOrZone}
                            </Badge>
                          )}
                          {meta.windowIndex && (
                            <Badge variant="outline" className="text-[9px]">
                              W {meta.windowIndex}
                            </Badge>
                          )}
                        </div>
                        {meta.remarks && (
                          <div className="text-[10px] text-gray-400 truncate">
                            {meta.remarks}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className="text-[9px] capitalize bg-gray-800 text-gray-100">
                        {job.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="xs"
                        variant="outline"
                        className="h-6 px-2 text-[10px]"
                        onClick={() => setSelectedJob(job.id)}
                      >
                        Focus
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {pageSlice.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-[11px] text-gray-500">
                    No positions found for the current filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default PositionsGrid;


