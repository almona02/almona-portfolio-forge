/**
 * Fabricator Command Center
 * Understated workshop command — engines, stock, production, and Almona service.
 * AICS-001: no ML/AI marketing in the execution shell; advisory stays gated.
 */

import { TodayDashboard } from '@/components/dashboard/TodayDashboard';
import { RemnantMarketplacePreview } from '@/components/fabricator/RemnantMarketplacePreview';
import { CommandCapabilityGrid } from '@/components/fabricator/shell/CommandCapabilityGrid';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { fabricatorRoutes } from '@/lib/fabricator/routes';
import { isRTL } from '@/lib/i18n';
import { Package, Recycle } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

const FabricatorDashboard: React.FC = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation(['fabricator', 'translation']);
  const isRTLMode = isRTL(i18n.language);
  const displayName =
    user?.full_name?.trim()
    || user?.username?.trim()
    || user?.email?.trim()
    || null;

  return (
    <div
      className="h-full overflow-auto bg-[#0a0a0a] text-amber-200 relative"
      data-testid="fabricator-command-center"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage: `
            radial-gradient(circle at 1px 1px, rgba(245, 158, 11, 0.35) 1px, transparent 0)
          `,
          backgroundSize: '28px 28px',
        }}
        aria-hidden
      />

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <header className={`mb-6 ${isRTLMode ? 'text-right' : 'text-left'}`}>
          <div className={`flex flex-wrap items-baseline gap-x-3 gap-y-1 ${isRTLMode ? 'flex-row-reverse' : ''}`}>
            <p className="text-[10px] uppercase tracking-[0.3em] text-amber-700 font-mono">
              Almona · Fabricator Pro
            </p>
            {displayName && (
              <p className="text-[10px] text-amber-700/80 font-mono truncate max-w-[14rem]">
                {displayName}
              </p>
            )}
          </div>
          <h1 className="mt-1.5 text-2xl sm:text-3xl font-semibold tracking-wide text-amber-200">
            {t('fabricator:dashboard.title', 'Command Center')}
          </h1>
          <p className="mt-1 text-xs text-amber-600/70 font-mono tracking-wide">
            {t('fabricator:dashboard.subtitle', 'Measure · design · stock · production · service')}
          </p>
        </header>

        <CommandCapabilityGrid className="mb-10" />

        <section className="mb-10">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-amber-700 font-mono">
                Floor
              </p>
              <h2 className="mt-1 text-lg font-semibold text-amber-200">
                Today&apos;s work
              </h2>
            </div>
            <Link
              to={fabricatorRoutes.studioProjects()}
              className="text-xs uppercase tracking-wider text-amber-500 hover:text-amber-300 border border-amber-600/30 px-3 py-1.5"
            >
              Open Project Studio
            </Link>
          </div>
          <TodayDashboard />
        </section>

        <Card className="mb-8 border-amber-600/25 bg-[#0c0c0c]/90 rounded-none">
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 text-amber-200 text-base ${isRTLMode ? 'flex-row-reverse' : ''}`}>
              <Recycle className="h-4 w-4 text-amber-500" />
              {t('fabricator:dashboard.remnant_marketplace.title', 'Remnant exchange')}
              <Badge
                variant="outline"
                className="rounded-none border-amber-600/40 text-amber-500 text-[10px] uppercase tracking-wider"
              >
                Optional
              </Badge>
            </CardTitle>
            <CardDescription className="text-amber-600/70 text-xs">
              {t('fabricator:dashboard.remnant_marketplace.subtitle', 'Verified surplus bars only.')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RemnantMarketplacePreview
              workshopId={user?.id || 'anonymous'}
              onListingCreated={() => {
                toast.success('Remnant listed.');
              }}
            />
            <div className="mt-4">
              <Link
                to={fabricatorRoutes.studioDataStock()}
                className="inline-flex items-center gap-2 text-xs text-amber-500 hover:text-amber-300"
              >
                <Package className="h-3.5 w-3.5" />
                Manage stock & remnants
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FabricatorDashboard;
