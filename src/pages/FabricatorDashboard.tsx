/**
 * Enhanced Fabricator Dashboard
 * AI-powered workshop management with real-time insights
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { WorkshopPerformanceWidget } from '@/components/fabricator/WorkshopPerformanceWidget';
import { RemnantMarketplacePreview } from '@/components/fabricator/RemnantMarketplacePreview';
import { useAuth } from '@/context/AuthContext';
import { TrendingUp, Recycle, Settings, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { TodayDashboard } from '@/components/dashboard/TodayDashboard';
import { useTranslation } from 'react-i18next';
import { isRTL } from '@/lib/i18n';

const FabricatorDashboard: React.FC = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation(['fabricator', 'translation']);
  const isRTLMode = isRTL(i18n.language);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white pt-20">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className={`mb-8 ${isRTLMode ? 'text-right' : 'text-left'}`}>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
            {t('fabricator:dashboard.title', 'Fabricator Pro Dashboard')}
          </h1>
          <p className="text-gray-400 mt-2">
            {t('fabricator:dashboard.subtitle', 'AI-powered workshop management with real-time insights')}
          </p>
        </div>

        {/* Performance Analytics Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <WorkshopPerformanceWidget 
            workshopId={user?.id || 'anonymous'}
            timeframe="30d"
          />
          
          {/* Quick Stats Card */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${isRTLMode ? 'flex-row-reverse' : ''}`}>
                <TrendingUp className="h-5 w-5 text-green-400" />
                {t('fabricator:dashboard.performance.title', 'Performance Summary')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className={`flex justify-between items-center ${isRTLMode ? 'flex-row-reverse' : ''}`}>
                  <span className="text-gray-400">{t('fabricator:dashboard.performance.optimization_speed', 'Optimization Speed')}</span>
                  <Badge variant="outline" className="bg-green-500/20 text-green-300">
                    +2.5x faster
                  </Badge>
                </div>
                <div className={`flex justify-between items-center ${isRTLMode ? 'flex-row-reverse' : ''}`}>
                  <span className="text-gray-400">{t('fabricator:dashboard.performance.waste_reduction', 'Waste Reduction')}</span>
                  <Badge variant="outline" className="bg-blue-500/20 text-blue-300">
                    -12% average
                  </Badge>
                </div>
                <div className={`flex justify-between items-center ${isRTLMode ? 'flex-row-reverse' : ''}`}>
                  <span className="text-gray-400">{t('fabricator:dashboard.performance.ml_accuracy', 'ML Accuracy')}</span>
                  <Badge variant="outline" className="bg-purple-500/20 text-purple-300">
                    94% prediction rate
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Remnant Marketplace Section */}
        <Card className="bg-gray-800/50 border-gray-700 mb-8">
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${isRTLMode ? 'flex-row-reverse' : ''}`}>
              <Recycle className="h-5 w-5 text-green-400" />
              {t('fabricator:dashboard.remnant_marketplace.title', 'Remnant Marketplace')}
              <Badge variant="secondary" className={`${isRTLMode ? 'mr-2' : 'ml-2'} bg-orange-500/20 text-orange-300`}>
                New
              </Badge>
            </CardTitle>
            <CardDescription>
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
          <Card className="bg-gray-800/50 border-gray-700">
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
          <Card className="bg-gray-800/50 border-gray-700">
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
          <Card className="bg-gray-800/50 border-gray-700">
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
                    window.location.href = '/fabricator/workflow?tab=design';
                  }}
                >
                  <Settings className="h-3 w-3 mr-2" />
                  Calibration Wizard
                </Button>
                <Button 
                  size="sm" 
                  className="w-full" 
                  variant="outline"
                  onClick={() => {
                    window.location.href = '/fabricator/analytics';
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
                    window.location.href = '/fabricator/marketplace';
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
