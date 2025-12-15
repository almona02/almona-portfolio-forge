import React, { Suspense, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/ui/card';
import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { useJobsStore } from '@/store/jobsStore';
import { WindowUnit } from '@/types/fabricator';
import { supabase } from '@/lib/supabase';
import { Factory, Sparkles, AlertCircle, ArrowRight, Wand2, CheckCircle2, Loader2 } from 'lucide-react';
import { FabricatorLoader } from '@/components/ui/EnhancedLoadingStates';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const MassProductionDashboard = React.lazy(() =>
  import('@/components/fabricator/MassProductionDashboard').then((m) => ({
    default: m.MassProductionDashboard,
  })),
);

/**
 * FabricatorWorkflowPro
 * ----------------------------------------------------------------------------
 * Operator‑level cockpit that exposes MassProductionDashboard on top of the
 * existing single‑job Fabricator workflow.
 *
 * It reads optimized jobs from the shared jobs store and passes them into the
 * MassProductionOptimizer UI so factories can batch optimise cutting across
 * many WindowUnit positions.
 */
export const FabricatorWorkflowPro: React.FC = () => {
  const { t } = useTranslation('fabricator');
  const { jobs } = useJobsStore();
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [userError, setUserError] = useState<string | null>(null);
  const [optStatus, setOptStatus] = useState<'idle' | 'running' | 'complete'>('idle');

  useEffect(() => {
    const resolveUser = async () => {
      setIsLoadingUser(true);
      setUserError(null);
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();
        if (error) {
          throw error;
        }
        setUserId(user?.id ?? null);
      } catch (err) {
        console.error('Failed to resolve Supabase user for FabricatorWorkflowPro:', err);
        setUserError(
          err instanceof Error ? err.message : 'Unable to determine current user identity.',
        );
      } finally {
        setIsLoadingUser(false);
      }
    };

    void resolveUser();
  }, []);

  const optimizedJobs: WindowUnit[] = jobs.filter(
    (job) => job.optimization && job.optimization.cuttingPlan.length > 0,
  );

  const handleOptimize = async () => {
    if (optStatus === 'running') return;
    setOptStatus('running');
    // TODO: wire to real optimization trigger; for now simulate async
    setTimeout(() => setOptStatus('complete'), 1500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white pt-20">
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <Card className="bg-gray-900/80 border-gray-800 shadow-2xl">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="relative flex items-center justify-center">
                  <Factory className="h-9 w-9 text-orange-400" />
                  <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse ring-2 ring-emerald-400/40" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold tracking-[0.25em] text-orange-300/80 uppercase">
                    {t('workflow_pro.title', 'FABRICATOR WORKFLOW PRO')}
                  </div>
                  <CardTitle className="text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-orange-400 via-red-400 to-red-500 bg-clip-text text-transparent">
                    {t('workflow_pro.mass_production_cockpit', 'Mass Production Cockpit')}
                  </CardTitle>
                  <CardDescription className="text-xs md:text-sm text-gray-300 mt-1">
                    {t('workflow_pro.description', 'Cross‑project optimisation using GA + remnant‑aware cutting, built for high‑volume workshops.')}
                  </CardDescription>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge
                  variant="outline"
                  className="bg-blue-500/15 border-blue-500/40 text-[11px] text-blue-300"
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  {optimizedJobs.length} {optimizedJobs.length === 1 
                    ? t('workflow_pro.optimised_jobs', 'optimised job')
                    : t('workflow_pro.optimised_jobs_plural', 'optimised jobs')}
                </Badge>
                {userId && (
                  <p className="text-[11px] text-gray-400">
                    {t('workflow_pro.user', 'User')}:{' '}
                    <span className="font-mono text-gray-200">
                      {userId.slice(0, 4)}…{userId.slice(-4)}
                    </span>
                  </p>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {userError && (
          <Alert variant="destructive" className="bg-red-900/25 border-red-500">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              {userError} {t('workflow_pro.user_error', 'Mass production mode requires a logged‑in Supabase user so remnant usage can be tracked correctly.')}
            </AlertDescription>
          </Alert>
        )}

        {!isLoadingUser && !userId && !userError && (
          <Alert className="bg-yellow-900/20 border-yellow-500">
            <AlertDescription className="text-sm">
              {t('workflow_pro.no_auth', 'No authenticated user detected. Please sign in to enable remnant‑aware mass optimisation.')}
            </AlertDescription>
          </Alert>
        )}

        <Suspense
          fallback={
            <FabricatorLoader 
              stage={t('workflow_pro.loading_dashboard', 'Loading Mass Production Dashboard…')} 
              progress={0}
              message={t('workflow_pro.initializing_workspace', 'Initializing workspace...')}
            />
          }
        >
          {/* Optimization CTA */}
          <div className="flex flex-wrap items-center gap-3 p-4 bg-gray-900/60 border border-gray-800 rounded-lg">
            <Button
              size="lg"
              onClick={handleOptimize}
              disabled={optStatus === 'running'}
              className={`relative overflow-hidden transition-all ${
                optStatus === 'complete'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {optStatus === 'running' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {optStatus === 'idle' && <Wand2 className="mr-2 h-4 w-4" />}
              {optStatus === 'complete' && <CheckCircle2 className="mr-2 h-4 w-4" />}
              {optStatus === 'idle' && t('workflow_pro.start_ai_optimization', 'Start AI Optimization')}
              {optStatus === 'running' && t('workflow_pro.optimizing_generating', 'Optimizing & Generating G-Code...')}
              {optStatus === 'complete' && t('workflow_pro.optimization_complete', 'Optimization Complete')}
            </Button>

            {optStatus === 'complete' && (
              <Button
                size="lg"
                className="bg-orange-500 hover:bg-orange-600 animate-in fade-in slide-in-from-left-4"
                onClick={() => navigate('/fabricator/production')}
              >
                {t('workflow_pro.go_to_production', 'Go to Production Command')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>

          {userId ? (
            <MassProductionDashboard projects={optimizedJobs} userId={userId} />
          ) : (
            <Card className="bg-gray-900/70 border-gray-800">
              <CardContent className="p-6 text-sm text-gray-300">
                {t('workflow_pro.disabled_until_auth', 'Mass production optimisation is disabled until a user is authenticated.')}
              </CardContent>
            </Card>
          )}
        </Suspense>
      </div>
    </div>
  );
};

export default FabricatorWorkflowPro;


