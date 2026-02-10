import SEO from '@/components/SEO';
import { ProjectCreationManager } from '@/components/fabricator/project/ProjectCreationManager';
import {
  useDeleteProject as useDeleteProjectV2,
  usePositions as usePositionsV2,
  useProjects as useProjectsV2,
  useUpdateProject,
} from '@/hooks/useFabricatorQueries';
import { fabricatorRoutes } from '@/lib/fabricator/routes';
import { FeatureFlags } from '@/lib/featureFlags';
import { supabase } from '@/lib/supabase';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Input } from '@/shared/ui/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import { useJobsStore } from '@/store/jobsStore';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import React, { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

// Lazy load heavy component for better performance
const PositionsGrid = lazy(() => import('@/components/fabricator/PositionsGrid'));

type ProjectSummaryItem = {
  key: string;
  orderNumber: string;
  projectCode?: string | null;
  customer?: string | null;
  poses: number;
  qty: number;
  projectId?: string;
  firstPoseId?: string;
};

const ProjectsPage: React.FC = () => {
  const { t } = useTranslation('fabricator');
  const navigate = useNavigate();
  const location = useLocation();
  const useV2 = FeatureFlags.FABRICATOR_READ_V2;
  const { jobs, isLoading, loadJobs, deleteJob } = useJobsStore();
  const { data: projectsV2 = [], isLoading: loadingProjectsV2 } = useProjectsV2();
  const { data: positionsV2 = [], isLoading: loadingPositionsV2 } = usePositionsV2(null);
  const deleteProjectV2 = useDeleteProjectV2();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<ProjectSummaryItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Inline project header editing
  const updateProjectMutation = useUpdateProject();
  const [editingProjectKey, setEditingProjectKey] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editClient, setEditClient] = useState('');

  const startEditing = useCallback((p: ProjectSummaryItem) => {
    setEditingProjectKey(p.key);
    setEditName(p.orderNumber);
    setEditClient(p.customer ?? '');
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingProjectKey(null);
  }, []);

  const saveEditing = useCallback(async (p: ProjectSummaryItem) => {
    if (!p.projectId) {
      toast.error('Cannot edit legacy projects without a V2 project ID');
      setEditingProjectKey(null);
      return;
    }
    try {
      await updateProjectMutation.mutateAsync({
        projectId: p.projectId,
        updates: {
          project_name: editName || p.orderNumber,
          client_name: editClient || undefined,
        },
      });
      toast.success('Project updated');
    } catch (err) {
      toast.error(`Update failed: ${err}`);
    }
    setEditingProjectKey(null);
  }, [editName, editClient, updateProjectMutation]);

  // Defer v1 data loading
  useEffect(() => {
    if (!useV2 && !jobs.length) {
      const loadData = () => void loadJobs();
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        (window as any).requestIdleCallback(loadData, { timeout: 1000 });
      } else {
        setTimeout(loadData, 0);
      }
    }
  }, [useV2, jobs.length, loadJobs]);

  const { totalUnits, totalPoses, projectsSummary } = useMemo(() => {
    if (useV2) {
      const positionsByProject = new Map<string, any[]>();
      positionsV2.forEach((p: any) => {
        const pid = p.project_id ?? 'unassigned';
        if (!positionsByProject.has(pid)) positionsByProject.set(pid, []);
        positionsByProject.get(pid)?.push(p);
      });
      const summary: ProjectSummaryItem[] = projectsV2.map((proj) => {
        const positions = positionsByProject.get(proj.id) ?? [];
        const poses = positions.length;
        const qty = positions.reduce((s: number, p: any) => s + (p.quantity ?? 1), 0);
        const first = positions[0];
        return {
          key: proj.project_code,
          orderNumber: proj.project_name,
          projectCode: proj.project_code,
          customer: proj.client_name ?? null,
          poses,
          qty,
          projectId: proj.id,
          firstPoseId: first?.id,
        };
      });
      return {
        totalUnits: positionsV2.length,
        totalPoses: positionsV2.reduce((s: number, p: any) => s + (p.quantity ?? 1), 0),
        projectsSummary: summary,
      };
    }
    const units = jobs.length;
    const poses = jobs.reduce((sum, job) => sum + (job.quantity || 1), 0);
    const map = new Map<string, ProjectSummaryItem>();
    jobs.forEach((job) => {
      const key = job.projectCode || job.orderNumber;
      const prev = map.get(key);
      if (!prev) {
        map.set(key, {
          key,
          orderNumber: job.orderNumber,
          projectCode: job.projectCode,
          customer: job.customer || null,
          poses: 1,
          qty: job.quantity || 1,
        });
      } else {
        prev.poses += 1;
        prev.qty += job.quantity || 1;
      }
    });
    return {
      totalUnits: units,
      totalPoses: poses,
      projectsSummary: Array.from(map.values()),
    };
  }, [useV2, jobs, projectsV2, positionsV2]);

  const isLoadingList = useV2 ? (loadingProjectsV2 || loadingPositionsV2) : isLoading;

  const handleDeleteProject = useCallback(async () => {
    if (!projectToDelete) return;

    setDeleting(true);
    try {
      if (useV2 && projectToDelete.projectId) {
        await deleteProjectV2.mutateAsync(projectToDelete.projectId);
        toast.success(
          `Project ${projectToDelete.orderNumber}${projectToDelete.projectCode ? ` (${projectToDelete.projectCode})` : ''} deleted successfully.`
        );
        setDeleteConfirmOpen(false);
        setProjectToDelete(null);
        setDeleting(false);
        return;
      }

      const jobsToDelete = jobs.filter(
        (job) => (job.projectCode || job.orderNumber) === projectToDelete.key
      );
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        toast.error('You must be logged in to delete projects.');
        setDeleting(false);
        return;
      }
      const positionIds = jobsToDelete.map((job) => job.id);
      if (positionIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('fabricator_positions')
          .delete()
          .in('id', positionIds)
          .eq('owner_user_id', user.id);
        if (deleteError) {
          console.error('Failed to delete positions from database:', deleteError);
          toast.error('Failed to delete project from database.');
          setDeleting(false);
          return;
        }
      }
      jobsToDelete.forEach((job) => deleteJob(job.id));
      toast.success(
        `Project ${projectToDelete.orderNumber}${projectToDelete.projectCode ? ` (${projectToDelete.projectCode})` : ''} deleted successfully.`
      );
      setDeleteConfirmOpen(false);
      setProjectToDelete(null);
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('Failed to delete project. Please try again.');
    } finally {
      setDeleting(false);
    }
  }, [useV2, projectToDelete, jobs, deleteJob, deleteProjectV2]);

  // Memoize currentUrl to avoid recalculating on every render
  const currentUrl = useMemo(() => `https://www.almona02.com${location.pathname}`, [location.pathname]);

  if (isLoadingList && !projectsSummary.length) {
    return (
      <>
        <SEO
          title="Fabricator Projects - Almona Portfolio Forge"
          description="Manage your fabrication projects, positions, and orders"
          url={currentUrl}
        />
        <main className="container mx-auto px-4 py-8">
          <Card className="bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl">{t('projects.title', 'Projects & Positions')}</CardTitle>
              <CardDescription className="text-sm text-amber-600/70">
                {t('projects.loading', 'Loading your fabricator projects from Supabase...')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-24 rounded-lg bg-[#0f0f0f]/60 animate-pulse" />
            </CardContent>
          </Card>
        </main>
      </>
    );
  }

  return (
    <>
      <SEO
        title="Fabricator Projects - Almona Portfolio Forge"
        description="Manage your fabrication projects, positions, and orders"
        url={currentUrl}
      />
      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Summary Stats Card - Smaller, less prominent */}
        <Card className="bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl">{t('projects.title', 'Projects & Positions')}</CardTitle>
            <CardDescription className="text-sm text-amber-600/70">
              {t('projects.description', 'High-level projects view with quick access to all poses. Use the Projects tab to see orders, and the Positions tab to drill into individual poses/flats.')}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4 text-xs text-amber-300">
            <div>
              <span className="text-amber-600/70">{t('projects.stats.distinct_units', 'Distinct units')}:</span>{' '}
              <span className="font-semibold text-amber-200">{totalUnits}</span>
            </div>
            <div>
              <span className="text-amber-600/70">{t('projects.stats.total_poses', 'Total poses')}:</span>{' '}
              <span className="font-semibold text-amber-200">{totalPoses}</span>
            </div>
            <div>
              <span className="text-amber-600/70">{t('projects.stats.projects', 'Projects')}:</span>{' '}
              <span className="font-semibold text-amber-200">{projectsSummary.length}</span>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="projects" className="space-y-6">
          <TabsList className="bg-[#0f0f0f]/80 border border-amber-600/30 rounded-xl p-1 card-glass-dark">
            <TabsTrigger
              value="projects"
              className="data-[state=active]:btn-bronze data-[state=inactive]:bg-[#0f0f0f]/60 data-[state=inactive]:text-amber-600/70 data-[state=inactive]:border-amber-600/20 data-[state=inactive]:hover:bg-[#0f0f0f]/80 data-[state=inactive]:hover:text-amber-500"
            >
              {t('projects.tabs.projects', 'Projects')}
            </TabsTrigger>
            <TabsTrigger
              value="positions"
              className="data-[state=active]:btn-bronze data-[state=inactive]:bg-[#0f0f0f]/60 data-[state=inactive]:text-amber-600/70 data-[state=inactive]:border-amber-600/20 data-[state=inactive]:hover:bg-[#0f0f0f]/80 data-[state=inactive]:hover:text-amber-500"
            >
              {t('projects.tabs.positions', 'Recent Poses')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="projects" className="space-y-4">
            {/* Main Projects Card - Enhanced size and prominence */}
            <Card className="bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark shadow-glow-strong">
              <CardHeader className="pb-4 px-8 pt-8">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-lg font-semibold text-amber-200 mb-2">{t('projects.projects_tab.title', 'Projects')}</CardTitle>
                    <CardDescription className="text-sm text-amber-600/70">
                      {t('projects.projects_tab.description', 'Each row groups all poses that share the same project code / order number.')}
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => navigate(fabricatorRoutes.newProjectWizard())}
                    size="default"
                    className="btn-bronze text-sm px-6"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t('projects.projects_tab.new_project', 'New Project')}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-8 pb-8 space-y-4 text-sm">
                {projectsSummary.length === 0 && !isLoadingList ? (
                  <div className="py-12 text-center space-y-6">
                    <div className="space-y-3">
                      <p className="text-amber-300/90 text-base font-semibold">
                        {t('projects.projects_tab.no_projects', 'No projects yet')}
                      </p>
                      <p className="text-amber-600/70 text-sm max-w-lg mx-auto leading-relaxed">
                        {t('projects.projects_tab.no_projects_description', 'Create your first project by completing the measurement phase in the Fabricator workflow. Each project can contain multiple poses (window units).')}
                      </p>
                    </div>
                    <Button
                      onClick={() => navigate(fabricatorRoutes.newProjectWizard())}
                      size="default"
                      className="btn-bronze text-sm px-8 py-6 h-auto"
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      {t('projects.projects_tab.create_first_project', 'Create First Project')}
                    </Button>
                  </div>
                ) : projectsSummary.length === 0 && isLoadingList ? (
                  <div className="py-8">
                    <div className="h-12 rounded-lg bg-[#0f0f0f]/60 animate-pulse" />
                  </div>
                ) : (
                  <div className="divide-y divide-amber-600/30 space-y-1">
                    {projectsSummary.map((p) => {
                      const handleProjectClick = () => {
                        if (useV2 && p.projectId && p.firstPoseId) {
                          navigate(fabricatorRoutes.poseDesign(p.projectId, p.firstPoseId), {
                            state: { jobId: p.firstPoseId, startTab: 'design' },
                          });
                          return;
                        }
                        const firstJob = jobs.find((job) => (job.projectCode || job.orderNumber) === p.key);
                        if (firstJob) {
                          navigate(fabricatorRoutes.poseDesign(p.key, firstJob.id), {
                            state: { jobId: firstJob.id, startTab: 'design' },
                          });
                        }
                      };

                      const isEditing = editingProjectKey === p.key;

                      return (
                        <div
                          key={p.key}
                          className="py-4 px-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 group hover:bg-[#0f0f0f]/40 transition-all duration-200 rounded-lg cursor-pointer border border-transparent hover:border-amber-600/20"
                          onClick={isEditing ? undefined : handleProjectClick}
                        >
                          <div className="space-y-1.5 flex-1">
                            {isEditing ? (
                              <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center gap-2">
                                  <Input
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="h-8 text-sm bg-[#0f0f0f] border-amber-600/30 text-amber-200 w-64"
                                    placeholder="Project name"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') void saveEditing(p);
                                      if (e.key === 'Escape') cancelEditing();
                                    }}
                                  />
                                  {p.projectCode && (
                                    <Badge variant="outline" className="text-xs">
                                      {p.projectCode}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-amber-600/70 w-16">Customer:</span>
                                  <Input
                                    value={editClient}
                                    onChange={(e) => setEditClient(e.target.value)}
                                    className="h-7 text-xs bg-[#0f0f0f] border-amber-600/30 text-amber-200 w-48"
                                    placeholder="Client name"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') void saveEditing(p);
                                      if (e.key === 'Escape') cancelEditing();
                                    }}
                                  />
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0 text-green-400 hover:text-green-300 hover:bg-green-500/10"
                                    onClick={() => void saveEditing(p)}
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0 text-gray-400 hover:text-gray-300 hover:bg-gray-500/10"
                                    onClick={cancelEditing}
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center gap-3">
                                  <span className="font-mono text-base text-amber-200 font-semibold">{p.orderNumber}</span>
                                  {p.projectCode && (
                                    <Badge variant="outline" className="text-xs">
                                      {p.projectCode}
                                    </Badge>
                                  )}
                                </div>
                                {p.customer && (
                                  <div className="text-xs text-amber-600/70">
                                    {t('projects.projects_tab.customer', 'Customer')}: <span className="text-amber-300 font-medium">{p.customer}</span>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-amber-600/70">
                            <span>
                              {t('projects.projects_tab.poses', 'Poses')}: <span className="text-amber-200 font-semibold text-sm">{p.poses}</span>
                            </span>
                            <span>
                              {t('projects.projects_tab.total_qty', 'Total qty')}:{' '}
                              <span className="text-amber-200 font-semibold text-sm">{p.qty}</span>
                            </span>
                            {useV2 && p.projectId && !isEditing && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEditing(p);
                                }}
                                className="h-8 w-8 p-0 text-amber-500/70 hover:text-amber-400 hover:bg-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Edit project"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                setProjectToDelete(p);
                                setDeleteConfirmOpen(true);
                              }}
                              className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Delete project"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="positions">
            <Suspense fallback={
              <div className="h-64 rounded-lg bg-[#0f0f0f]/60 animate-pulse" />
            }>
              <PositionsGrid currentProject={null} />
            </Suspense>
          </TabsContent>
        </Tabs>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent className="bg-[#0f0f0f] border-amber-600/30 card-glass-dark">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-amber-200">Delete Project?</AlertDialogTitle>
              <AlertDialogDescription className="text-amber-600/70">
                Are you sure you want to delete project{' '}
                <span className="font-mono text-amber-400">
                  {projectToDelete?.orderNumber}
                  {projectToDelete?.projectCode ? ` (${projectToDelete.projectCode})` : ''}
                </span>
                ?
                <br />
                <br />
                This will permanently delete:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>
                    <span className="font-semibold">{projectToDelete?.poses || 0}</span> pose(s)
                  </li>
                  <li>
                    <span className="font-semibold">{projectToDelete?.qty || 0}</span> total quantity
                  </li>
                  {projectToDelete?.customer && (
                    <li>
                      Customer: <span className="font-semibold">{projectToDelete.customer}</span>
                    </li>
                  )}
                </ul>
                <br />
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-[#0f0f0f] border-amber-600/30 text-amber-300 hover:bg-[#1a1a1a]">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleDeleteProject}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete Project'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {/* Project Creation Manager - Handles ?new=true flows */}
        <ProjectCreationManager />
      </main>
    </>
  );
};

export default ProjectsPage;


