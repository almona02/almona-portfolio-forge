import React, { Suspense, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/fabricator';
import { Card, CardContent } from '@/shared/ui/ui/card';
import { Button } from '@/shared/ui/ui/button';
import { FabricatorProjectSkeleton } from '@/components/ui/EnhancedLoadingStates';

const ProfileManagement = React.lazy(() =>
  import('@/components/fabricator/ProfileManagement').then((m) => ({
    default: m.ProfileManagement,
  })),
);

const ProfilesPage: React.FC = () => {
  const { t } = useTranslation('fabricator');
  const { user } = useAuth();
  const [refetchTrigger, setRefetchTrigger] = useState(0);
  const [searchParams] = useSearchParams();
  const autoOpenTuning = searchParams.get('tuning') === 'studio';
  const tuningProfileId = searchParams.get('profileId') || searchParams.get('profile_id');

  const {
    data: profiles = [],
    isLoading,
    refetch,
    error: queryError,
  } = useQuery({
    queryKey: ['fabricator-profiles', user?.id, refetchTrigger],
    queryFn: async () => {
      if (!user) return [] as Profile[];
      
      // Check if session is still valid
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('Session expired. Please log in again.');
      }
      
      // Use untyped client here to avoid friction with generated Supabase types
       
      const db = supabase as any;
      
      // Add timeout wrapper
      const queryPromise = db
        .from('fabricator_profiles')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      // Add timeout (30 seconds)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout: Request took too long')), 30000)
      );
      
      const { data, error } = await Promise.race([queryPromise, timeoutPromise]);
      
      if (error) {
        // Check for auth errors
        if (error.code === 'PGRST301' || error.message?.includes('JWT') || error.message?.includes('token')) {
          throw new Error('Authentication failed. Please log in again.');
        }
        throw error;
      }
      return (data || []) as Profile[];
    },
    enabled: !!user,
    retry: (failureCount, error: any) => {
      // Don't retry on auth errors
      if (error?.message?.includes('Session expired') || error?.message?.includes('Authentication failed')) {
        return false;
      }
      // Retry up to 2 times for other errors
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });

  const handleProfilesUpdate = () => {
    setRefetchTrigger((prev) => prev + 1);
    void refetch();
  };

  if (isLoading) {
    return <FabricatorProjectSkeleton />;
  }

  // Handle auth errors
  if (queryError) {
    const errorMessage = queryError instanceof Error ? queryError.message : 'Failed to load profiles';
    if (errorMessage.includes('Session expired') || errorMessage.includes('Authentication failed')) {
      // Show error and let user know they need to log in again
      return (
        <div className="space-y-6">
          <Card className="bg-slate-800/50 border-slate-700 /50 card-dark">
            <CardContent className="p-6">
              <div className="text-center py-12">
                <p className="text-red-400 mb-4">{errorMessage}</p>
                <p className="text-gray-400 text-sm">Please refresh the page or log in again.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="typography-h1 text-2xl text-white">Profiles</h1>
          <p className="text-sm text-gray-400">
            {t('profiles.register_description', 'Register new profiles directly from Smart Scan or Assembly, then manage them here.')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            asChild
            className="btn-primary"
            variant="default"
          >
            <Link to="/test-scanner">{t('profiles.launch_smart_scan', 'Launch Smart Scan')}</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="btn-primary"
          >
            <Link to="/smart-scan-assembly">{t('profiles.assembly_scan', 'Assembly Scan')}</Link>
          </Button>
        </div>
      </div>

      <Card className="bg-slate-800/50 border-slate-700 /50 card-dark">
        <CardContent className="p-6">
          <Suspense fallback={<FabricatorProjectSkeleton />}>
            <ProfileManagement
              userId={user?.id || ''}
              initialProfiles={profiles}
              onProfilesUpdate={handleProfilesUpdate}
              skipInitialLoad={true} // Tell ProfileManagement to use initialProfiles instead of loading
              autoOpenTuning={autoOpenTuning}
              initialTuningProfileId={tuningProfileId || undefined}
            />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfilesPage;

