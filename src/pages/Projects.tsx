import React, { useEffect, useMemo, useState, lazy, Suspense, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { useTranslation } from 'react-i18next';
import { useJobsStore } from '@/store/jobsStore';
import { Plus, Trash2 } from 'lucide-react';
import SEO from '@/components/SEO';

// Lazy load heavy component for better performance
const PositionsGrid = lazy(() => import('@/components/fabricator/PositionsGrid'));
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
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const ProjectsPage: React.FC = () => {
  const { t } = useTranslation('fabricator');
  const navigate = useNavigate();
  const location = useLocation();
  const { jobs, isLoading, loadJobs, deleteJob } = useJobsStore();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<{
    key: string;
    orderNumber: string;
    projectCode?: string | null;
    customer?: string | null;
    poses: number;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Defer data loading to avoid blocking initial render (improves LCP and TBT)
  useEffect(() => {
    if (!jobs.length) {
      const loadData = () => {
        void loadJobs();
      };
      // Defer loading to idle time to improve initial render performance
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        (window as any).requestIdleCallback(loadData, { timeout: 1000 });
      } else {
        setTimeout(loadData, 0);
      }
    }
  }, [jobs.length, loadJobs]);

  // Memoize calculations to avoid recalculating on every render
  const { totalUnits, totalPoses } = useMemo(() => {
    const units = jobs.length;
    const poses = jobs.reduce((sum, job) => sum + (job.quantity || 1), 0);
    return { totalUnits: units, totalPoses: poses };
  }, [jobs]);

  const projectsSummary = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        orderNumber: string;
        projectCode?: string | null;
        customer?: string | null;
        poses: number;
        qty: number;
      }
    >();

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

    return Array.from(map.values());
  }, [jobs]);

  const handleDeleteProject = useCallback(async () => {
    if (!projectToDelete) return;

    setDeleting(true);
    try {
      // Get all jobs that belong to this project
      const jobsToDelete = jobs.filter(
        (job) => (job.projectCode || job.orderNumber) === projectToDelete.key
      );

      // Delete from Supabase
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        toast.error('You must be logged in to delete projects.');
        setDeleting(false);
        return;
      }

      // Delete all positions for this project from database
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

      // Delete from local store
      jobsToDelete.forEach((job) => {
        deleteJob(job.id);
      });

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
  }, [projectToDelete, jobs, deleteJob]);

  // Memoize currentUrl to avoid recalculating on every render
  const currentUrl = useMemo(() => `https://www.almona02.com${location.pathname}`, [location.pathname]);

  if (isLoading && !jobs.length) {
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
                  onClick={() => navigate('/fabricator-workflow?new=true')}
                  size="default"
                  className="btn-bronze text-sm px-6"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('projects.projects_tab.new_project', 'New Project')}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-8 pb-8 space-y-4 text-sm">
              {projectsSummary.length === 0 && !isLoading ? (
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
                    onClick={() => navigate('/fabricator-workflow?new=true')}
                    size="default"
                    className="btn-bronze text-sm px-8 py-6 h-auto"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    {t('projects.projects_tab.create_first_project', 'Create First Project')}
                  </Button>
                </div>
              ) : projectsSummary.length === 0 && isLoading ? (
                <div className="py-8">
                  <div className="h-12 rounded-lg bg-[#0f0f0f]/60 animate-pulse" />
                </div>
              ) : (
                <div className="divide-y divide-amber-600/30 space-y-1">
                  {projectsSummary.map((p) => {
                    const handleProjectClick = () => {
                      // Find first job for this project
                      const firstJob = jobs.find((job) => (job.projectCode || job.orderNumber) === p.key);
                      if (firstJob) {
                        navigate(`/fabricator/workflow/engineering-bay/${firstJob.id}`, {
                          state: { jobId: firstJob.id, startTab: 'design' },
                        });
                      }
                    };
                    
                    return (
                    <div 
                      key={p.key} 
                      className="py-4 px-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 group hover:bg-[#0f0f0f]/40 transition-all duration-200 rounded-lg cursor-pointer border border-transparent hover:border-amber-600/20"
                      onClick={handleProjectClick}
                    >
                      <div className="space-y-1.5 flex-1">
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
                      </div>
                      <div className="flex items-center gap-4 text-xs text-amber-600/70">
                        <span>
                          {t('projects.projects_tab.poses', 'Poses')}: <span className="text-amber-200 font-semibold text-sm">{p.poses}</span>
                        </span>
                        <span>
                          {t('projects.projects_tab.total_qty', 'Total qty')}:{' '}
                          <span className="text-amber-200 font-semibold text-sm">{p.qty}</span>
                        </span>
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
      </main>
    </>
  );
};

export default ProjectsPage;


