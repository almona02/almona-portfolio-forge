/**
 * Enhanced Fabricator Dashboard
 * AI-powered workshop management with real-time insights
 */

import { TodayDashboard } from '@/components/dashboard/TodayDashboard';
import { MorningBriefWidget } from '@/components/fabricator/MorningBriefWidget';
import { RemnantMarketplacePreview } from '@/components/fabricator/RemnantMarketplacePreview';
import { WorkshopPerformanceWidget } from '@/components/fabricator/WorkshopPerformanceWidget';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { fabricatorRoutes } from '@/lib/fabricator/routes';
import { isRTL } from '@/lib/i18n';
import { BarChart3, Recycle, Settings, TrendingUp } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const FabricatorDashboard: React.FC = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation(['fabricator', 'translation']);
  const isRTLMode = isRTL(i18n.language);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-amber-200 pt-20 relative">
      {/* Classical Textured Background */}
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: `
          radial-gradient(circle at 2px 2px, rgba(245, 158, 11, 0.15) 1px, transparent 0),
          repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(245, 158, 11, 0.05) 2px, rgba(245, 158, 11, 0.05) 4px)
        `,
        backgroundSize: '40px 40px, 100px 100px'
      }} />
      
      <div id="top" className="sr-only" aria-hidden="true" />
      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <div className={`mb-8 ${isRTLMode ? 'text-right' : 'text-left'}`}>
          <h1 className="typography-h1 text-amber-300 drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]">
            {t('fabricator:dashboard.title', 'Fabricator Pro Dashboard')}
          </h1>
          <p className="text-amber-600/80 mt-2 text-sm font-medium">
              {t('fabricator:dashboard.subtitle', 'AI-powered workshop management with real-time insights')}
            </p>
        </div>

        {/* Performance Analytics Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <WorkshopPerformanceWidget 
            workshopId={user?.id || 'anonymous'}
            timeframe="month"
          />
          
          {/* Quick Stats Card */}
          <Card className="/40 shadow-[0_0_30px_rgba(245,158,11,0.2)] card-premium card-glass-dark">
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 text-amber-300 ${isRTLMode ? 'flex-row-reverse' : ''}`}>
                <TrendingUp className="h-5 w-5 text-amber-500 drop-shadow-[0_0_4px_rgba(245,158,11,0.5)]" />
                {t('fabricator:dashboard.performance.title', 'Performance Summary')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className={`flex justify-between items-center ${isRTLMode ? 'flex-row-reverse' : ''}`}>
                  <span className="text-amber-500/80 font-semibold">{t('fabricator:dashboard.performance.optimization_speed', 'Optimization Speed')}</span>
                  <Badge variant="outline" className="btn-secondary-dark">
                    +2.5x faster
                  </Badge>
                </div>
                <div className={`flex justify-between items-center ${isRTLMode ? 'flex-row-reverse' : ''}`}>
                  <span className="text-amber-500/80 font-semibold">{t('fabricator:dashboard.performance.waste_reduction', 'Waste Reduction')}</span>
                  <Badge variant="outline" className="btn-secondary-dark">
                    -12% average
                  </Badge>
                </div>
                <div className={`flex justify-between items-center ${isRTLMode ? 'flex-row-reverse' : ''}`}>
                  <span className="text-amber-500/80 font-semibold">{t('fabricator:dashboard.performance.ml_accuracy', 'ML Accuracy')}</span>
                  <Badge variant="outline" className="btn-secondary-dark">
                    94% prediction rate
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Morning Brief - Industry Intelligence */}
        <div className="mb-8">
          <MorningBriefWidget 
            workshopId={user?.id || 'anonymous'}
            className="w-full"
          />
        </div>

        {/* Remnant Marketplace Section */}
        <Card className="/40 shadow-[0_0_30px_rgba(245,158,11,0.2)] mb-8 card-premium card-glass-dark">
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 text-amber-300 ${isRTLMode ? 'flex-row-reverse' : ''}`}>
              <Recycle className="h-5 w-5 text-amber-500 drop-shadow-[0_0_4px_rgba(245,158,11,0.5)]" />
              {t('fabricator:dashboard.remnant_marketplace.title', 'Remnant Marketplace')}
              <Badge variant="secondary" className={`${isRTLMode ? 'mr-2' : 'ml-2'} bg-[#1a1a1a]/80 text-amber-400 border-2 border-amber-600/40`}>
                New
              </Badge>
            </CardTitle>
            <CardDescription className="text-amber-600/80">
              {t('fabricator:dashboard.remnant_marketplace.subtitle', 'Buy and sell excess materials across the fabricator network')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RemnantMarketplacePreview 
              workshopId={user?.id || 'anonymous'}
              onListingCreated={() => {
                toast.success("Remnant listed successfully!");
              }}
            />
          </CardContent>
        </Card>

        {/* Additional Dashboard Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Recent Optimizations */}
          <Card className="bg-slate-800/60 border-slate-700 /50 shadow-card card-dark">
            <CardHeader>
              <CardTitle className="text-sm">Recent Optimizations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-xs">
                  <span>Job #2456</span>
                  <span className="text-green-400">-8.2% waste</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Job #2457</span>
                  <span className="text-green-400">-11.5% waste</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Job #2458</span>
                  <span className="text-green-400">-9.8% waste</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Health */}
          <Card className="bg-slate-800/60 border-slate-700 /50 shadow-card card-dark">
            <CardHeader>
              <CardTitle className="text-sm">System Health</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">ML Models</span>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-xs">Active</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">Data Collection</span>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-xs">Live</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">Calibration</span>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                    <span className="text-xs">Ready</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="bg-slate-800/60 border-slate-700 /50 shadow-card card-dark">
            <CardHeader>
              <CardTitle className="text-sm">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button 
                  size="sm" 
                  className="w-full" 
                  variant="outline"
                  onClick={() => {
                    navigate(fabricatorRoutes.studioProjects());
                  }}
                >
                  <Settings className="h-3 w-3 mr-2" />
                  Open Project Studio
                </Button>
                <Button 
                  size="sm" 
                  className="w-full" 
                  variant="outline"
                  onClick={() => {
                    navigate(fabricatorRoutes.studioReports());
                  }}
                >
                  <BarChart3 className="h-3 w-3 mr-2" />
                  View Full Analytics
                </Button>
                <Button 
                  size="sm" 
                  className="w-full" 
                  variant="outline"
                  onClick={() => {
                    toast.info('Marketplace module is launching from Command Studio');
                    navigate(fabricatorRoutes.studioCommand());
                  }}
                >
                  <Recycle className="h-3 w-3 mr-2" />
                  Browse Marketplace
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Today Dashboard Integration */}
        <div className="mt-8">
          <TodayDashboard />
        </div>
      </div>
    </div>
  );
};

export default FabricatorDashboard;
