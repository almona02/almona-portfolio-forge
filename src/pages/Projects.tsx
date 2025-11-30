import React, { useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import { Badge } from '@/shared/ui/ui/badge';
import { useTranslation } from 'react-i18next';
import { useJobsStore } from '@/store/jobsStore';
import { PositionsGrid } from '@/components/fabricator/PositionsGrid';

const ProjectsPage: React.FC = () => {
  const { t } = useTranslation('fabricator');
  const { jobs, isLoading, loadJobs } = useJobsStore();

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
              <CardTitle className="text-sm">{t('projects.projects_tab.title', 'Projects')}</CardTitle>
              <CardDescription className="text-xs text-gray-400">
                {t('projects.projects_tab.description', 'Each row groups all poses that share the same project code / order number.')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              {projectsSummary.length === 0 ? (
                <p className="text-gray-500 text-xs">{t('projects.projects_tab.no_projects', 'No projects yet. Create your first pose from the Fabricator workflow.')}</p>
              ) : (
                <div className="divide-y divide-gray-800">
                  {projectsSummary.map((p) => (
                    <div key={p.key} className="py-2 flex flex-col md:flex-row md:items-center md:justify-between gap-1">
                      <div className="space-y-0.5">
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
    </div>
  );
};

export default ProjectsPage;


