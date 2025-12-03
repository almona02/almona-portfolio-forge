import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { useTranslation } from 'react-i18next';
import { useJobsStore } from '@/store/jobsStore';
import { PositionsGrid } from '@/components/fabricator/PositionsGrid';
import { Plus, Trash2 } from 'lucide-react';
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

  useEffect(() => {
    if (!jobs.length) {
      void loadJobs();
    }
  }, [jobs.length, loadJobs]);

  const totalUnits = jobs.length;
  const totalPoses = jobs.reduce((sum, job) => sum + (job.quantity || 1), 0);

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

  const handleDeleteProject = async () => {
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
  };

  if (isLoading && !jobs.length) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="bg-gray-900/80 border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl">{t('projects.title', 'Projects & Positions')}</CardTitle>
            <CardDescription className="text-sm text-gray-400">
              {t('projects.loading', 'Loading your fabricator projects from Supabase...')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-24 rounded-lg bg-gray-800/60 animate-pulse" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-4">
      <Card className="bg-gray-900/80 border-gray-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl">{t('projects.title', 'Projects & Positions')}</CardTitle>
          <CardDescription className="text-sm text-gray-400">
            {t('projects.description', 'High-level projects view with quick access to all poses. Use the Projects tab to see orders, and the Positions tab to drill into individual poses/flats.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4 text-xs text-gray-300">
          <div>
            <span className="text-gray-400">{t('projects.stats.distinct_units', 'Distinct units')}:</span>{' '}
            <span className="font-semibold text-gray-100">{totalUnits}</span>
          </div>
          <div>
            <span className="text-gray-400">{t('projects.stats.total_poses', 'Total poses')}:</span>{' '}
            <span className="font-semibold text-gray-100">{totalPoses}</span>
          </div>
          <div>
            <span className="text-gray-400">{t('projects.stats.projects', 'Projects')}:</span>{' '}
            <span className="font-semibold text-gray-100">{projectsSummary.length}</span>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="projects" className="space-y-4">
        <TabsList className="bg-gray-900/80 border border-gray-800 rounded-xl p-1">
          <TabsTrigger
            value="projects"
            className="data-[state=active]:bg-orange-500 data-[state=active]:text-white text-xs px-3 py-1.5 rounded-lg"
          >
            {t('projects.tabs.projects', 'Projects')}
          </TabsTrigger>
          <TabsTrigger
            value="positions"
            className="data-[state=active]:bg-orange-500 data-[state=active]:text-white text-xs px-3 py-1.5 rounded-lg"
          >
            {t('projects.tabs.positions', 'Recent Poses')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="space-y-3">
          <Card className="bg-gray-900/80 border-gray-800">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <CardTitle className="text-sm">{t('projects.projects_tab.title', 'Projects')}</CardTitle>
                  <CardDescription className="text-xs text-gray-400">
                    {t('projects.projects_tab.description', 'Each row groups all poses that share the same project code / order number.')}
                  </CardDescription>
                </div>
                <Button
                  onClick={() => navigate('/fabricator-workflow?new=true')}
                  size="sm"
                  className="bg-orange-500 hover:bg-orange-600 text-white text-xs px-3 py-1.5 h-auto"
                >
                  <Plus className="h-3 w-3 mr-1.5" />
                  {t('projects.projects_tab.new_project', 'New Project')}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              {projectsSummary.length === 0 ? (
                <p className="text-gray-500 text-xs">{t('projects.projects_tab.no_projects', 'No projects yet. Create your first pose from the Fabricator workflow.')}</p>
              ) : (
                <div className="divide-y divide-gray-800">
                  {projectsSummary.map((p) => (
                    <div key={p.key} className="py-2 flex flex-col md:flex-row md:items-center md:justify-between gap-2 group hover:bg-gray-800/30 transition-colors rounded px-2 -mx-2">
                      <div className="space-y-0.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-gray-100">{p.orderNumber}</span>
                          {p.projectCode && (
                            <Badge variant="outline" className="text-[10px]">
                              {p.projectCode}
                            </Badge>
                          )}
                        </div>
                        {p.customer && (
                          <div className="text-[11px] text-gray-400">
                            {t('projects.projects_tab.customer', 'Customer')}: <span className="text-gray-200">{p.customer}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-gray-400">
                        <span>
                          {t('projects.projects_tab.poses', 'Poses')}: <span className="text-gray-100 font-semibold">{p.poses}</span>
                        </span>
                        <span>
                          {t('projects.projects_tab.total_qty', 'Total qty')}:{' '}
                          <span className="text-gray-100 font-semibold">{p.qty}</span>
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setProjectToDelete(p);
                            setDeleteConfirmOpen(true);
                          }}
                          className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Delete project"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="positions">
          <PositionsGrid currentProject={null} />
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="bg-gray-900 border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-100">Delete Project?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to delete project{' '}
              <span className="font-mono text-orange-400">
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
            <AlertDialogCancel className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700">
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
    </div>
  );
};

export default ProjectsPage;


