import React, { Suspense, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/ui/card';
import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { Badge } from '@/shared/ui/ui/badge';
import { useJobsStore } from '@/store/jobsStore';
import { WindowUnit } from '@/types/fabricator';
import { supabase } from '@/lib/supabase';
import { Factory, Sparkles, AlertCircle } from 'lucide-react';

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
  const { jobs } = useJobsStore();
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [userError, setUserError] = useState<string | null>(null);

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
        // eslint-disable-next-line no-console
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
                    Fabricator Workflow Pro
                  </div>
                  <CardTitle className="text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-orange-400 via-red-400 to-red-500 bg-clip-text text-transparent">
                    Mass Production Cockpit
                  </CardTitle>
                  <CardDescription className="text-xs md:text-sm text-gray-300 mt-1">
                    Cross‑project optimisation using GA + remnant‑aware cutting, built for
                    high‑volume workshops.
                  </CardDescription>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge
                  variant="outline"
                  className="bg-blue-500/15 border-blue-500/40 text-[11px] text-blue-300"
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  {optimizedJobs.length} optimised job
                  {optimizedJobs.length === 1 ? '' : 's'}
                </Badge>
                {userId && (
                  <p className="text-[11px] text-gray-400">
                    User:{' '}
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
              {userError} Mass production mode requires a logged‑in Supabase user so remnant
              usage can be tracked correctly.
            </AlertDescription>
          </Alert>
        )}

        {!isLoadingUser && !userId && !userError && (
          <Alert className="bg-yellow-900/20 border-yellow-500">
            <AlertDescription className="text-sm">
              No authenticated user detected. Please sign in to enable remnant‑aware mass
              optimisation.
            </AlertDescription>
          </Alert>
        )}

        <Suspense
          fallback={
            <Card className="bg-gray-900/70 border-gray-800">
              <CardContent className="p-8 text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-400 mx-auto mb-4" />
                <p className="text-sm text-gray-300">Loading Mass Production Dashboard…</p>
              </CardContent>
            </Card>
          }
        >
          {userId ? (
            <MassProductionDashboard projects={optimizedJobs} userId={userId} />
          ) : (
            <Card className="bg-gray-900/70 border-gray-800">
              <CardContent className="p-6 text-sm text-gray-300">
                Mass production optimisation is disabled until a user is authenticated.
              </CardContent>
            </Card>
          )}
        </Suspense>
      </div>
    </div>
  );
};

export default FabricatorWorkflowPro;


