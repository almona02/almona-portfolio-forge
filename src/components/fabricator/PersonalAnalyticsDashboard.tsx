/**
 * Personal Analytics Dashboard
 * Provides immediate value by reflecting user's calibration data back to them
 * Makes the data collection visible and actionable
 */

import { personalAnalytics, type CalibrationInsight, type EfficiencyTrend, type ProfileHealth, type StrategyPerformance } from '@/lib/analytics/PersonalAnalytics';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/ui/alert';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import {
  Activity,
  AlertCircle,
  BarChart3,
  Calendar,
  CheckCircle2,
  Info,
  RefreshCw,
  Target,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { VirtualizedAnalyticsList } from './VirtualizedAnalyticsList';

interface PersonalAnalyticsDashboardProps {
  userId: string;
}

export const PersonalAnalyticsDashboard: React.FC<PersonalAnalyticsDashboardProps> = ({
  userId,
}) => {
  const { t } = useTranslation('fabricator');
  const [insights, setInsights] = useState<CalibrationInsight[]>([]);
  const [strategyPerformance, setStrategyPerformance] = useState<StrategyPerformance[]>([]);
  const [profileHealth, setProfileHealth] = useState<ProfileHealth[]>([]);
  const [efficiencyTrends, setEfficiencyTrends] = useState<EfficiencyTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month'>('month');

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const [insightsData, strategyData, healthData, trendsData] = await Promise.all([
        personalAnalytics.getAllInsights(userId),
        personalAnalytics.getStrategyPerformance(userId),
        personalAnalytics.getProfileHealth(userId),
        personalAnalytics.getEfficiencyTrends(userId, selectedPeriod),
      ]);

      setInsights(insightsData);
      setStrategyPerformance(strategyData);
      setProfileHealth(healthData);
      setEfficiencyTrends(trendsData);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, selectedPeriod]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'error':
        return 'bg-red-500/10 border-red-500/30 text-red-400';
      case 'warning':
        return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400';
      case 'success':
        return 'bg-green-500/10 border-green-500/30 text-green-400';
      default:
        return 'bg-blue-500/10 border-blue-500/30 text-blue-400';
    }
  };

  const getHealthStatusColor = (status: ProfileHealth['healthStatus']) => {
    switch (status) {
      case 'excellent':
        return 'text-green-400';
      case 'good':
        return 'text-blue-400';
      case 'needs_attention':
        return 'text-yellow-400';
      case 'critical':
        return 'text-red-400';
    }
  };

  if (loading) {
    return (
      <Card className="bg-gray-800/50 border-gray-700">
        <CardContent className="p-8 text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
          <p className="text-gray-400">{t('personal_analytics.loading', 'Loading analytics...')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <BarChart3 className="h-6 w-6 text-purple-400" /> {t('personal_analytics.title', 'Personal Analytics Dashboard')}
              </CardTitle>
              <CardDescription className="text-gray-400 mt-1">
                {t('personal_analytics.description', 'Insights from your calibration data to improve accuracy and efficiency')}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadAnalytics}
              className="text-gray-300 border-gray-600 hover:bg-gray-700"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('personal_analytics.refresh', 'Refresh')}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Key Insights */}
      {insights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.map((insight, idx) => (
            <Alert key={idx} className={getSeverityColor(insight.severity)}>
              {insight.severity === 'error' && <AlertCircle className="h-4 w-4" />}
              {insight.severity === 'success' && <CheckCircle2 className="h-4 w-4" />}
              {(!insight.severity || insight.severity === 'info') && <Info className="h-4 w-4" />}
              <AlertTitle className="font-semibold">{insight.title}</AlertTitle>
              <AlertDescription>
                <div className="mt-2">
                  <p className="text-sm mb-1">{insight.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-lg font-bold">{insight.value}</span>
                    {insight.recommendation && (
                      <Badge variant="outline" className="text-xs">
                        {insight.recommendation}
                      </Badge>
                    )}
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Main Analytics Tabs */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardContent className="pt-4">
          <Tabs defaultValue="profiles" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profiles">{t('personal_analytics.tabs.profiles', 'Profile Health')}</TabsTrigger>
          <TabsTrigger value="strategies">{t('personal_analytics.tabs.strategies', 'Strategy Performance')}</TabsTrigger>
          <TabsTrigger value="trends">{t('personal_analytics.tabs.trends', 'Efficiency Trends')}</TabsTrigger>
        </TabsList>

        {/* Profile Health Tab */}
        <TabsContent value="profiles" className="space-y-4">
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg">Profile Calibration Health</CardTitle>
              <CardDescription className="text-gray-400">
                Monitor calibration accuracy for each profile
              </CardDescription>
            </CardHeader>
            <CardContent>
              {profileHealth.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{t('personal_analytics.no_profiles', 'No profile health data available.')}</p>
                  <p className="text-sm mt-2">{t('personal_analytics.no_profiles_desc', 'Start calibrating profiles to see insights here.')}</p>
                </div>
              ) : (
                <VirtualizedAnalyticsList
                  items={profileHealth}
                  containerHeight={500}
                  itemHeight={140}
                  renderItem={(profile) => (
                    <div
                      key={profile.profileId}
                      className="p-4 bg-gray-900 rounded-lg border border-gray-700 mb-3"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-300">{profile.profileName}</h4>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                            <span>
                              <Target className="h-4 w-4 inline mr-1" />
                              {profile.totalTests} tests
                            </span>
                            <span>
                              <Activity className="h-4 w-4 inline mr-1" />
                              {profile.averageAccuracy.toFixed(2)}mm avg deviation
                            </span>
                            {profile.lastCalibrationDate && (
                              <span>
                                <Calendar className="h-4 w-4 inline mr-1" />
                                {new Date(profile.lastCalibrationDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={getHealthStatusColor(profile.healthStatus)}
                        >
                          {profile.healthStatus === 'excellent' ? t('personal_analytics.health_excellent', 'Excellent') :
                           profile.healthStatus === 'good' ? t('personal_analytics.health_good', 'Good') :
                           profile.healthStatus === 'needs_attention' ? t('personal_analytics.health_needs_attention', 'Needs Attention') :
                           profile.healthStatus === 'critical' ? t('personal_analytics.health_critical', 'Critical') :
                           String(profile.healthStatus).replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-400 mt-2">{profile.recommendation}</p>
                    </div>
                  )}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Strategy Performance Tab */}
        <TabsContent value="strategies" className="space-y-4">
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg">Optimization Strategy Performance</CardTitle>
              <CardDescription className="text-gray-400">
                Compare how different strategies perform in your workshop
              </CardDescription>
            </CardHeader>
            <CardContent>
              {strategyPerformance.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{t('personal_analytics.no_strategies', 'No strategy performance data available.')}</p>
                  <p className="text-sm mt-2">{t('personal_analytics.no_strategies_desc', 'Use different strategies to see comparisons.')}</p>
                </div>
              ) : (
                <VirtualizedAnalyticsList
                  items={strategyPerformance}
                  containerHeight={400}
                  itemHeight={180}
                  renderItem={(strategy, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-gray-900 rounded-lg border border-gray-700 mb-4"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-gray-300">{strategy.strategyName}</h4>
                          <p className="text-xs text-gray-500 mt-1">
                            {strategy.jobCount} job{strategy.jobCount !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-orange-400">
                            {strategy.averageWastePercentage.toFixed(1)}%
                          </div>
                          <div className="text-xs text-gray-400">avg waste</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-3">
                        <div>
                          <div className="text-sm text-gray-400">Accuracy</div>
                          <div className="text-lg font-semibold text-green-400">
                            {(strategy.averageAccuracy * 100).toFixed(1)}%
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 p-2 bg-blue-500/10 border border-blue-500/30 rounded text-sm text-blue-300">
                        {strategy.recommendation}
                      </div>
                    </div>
                  )}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Efficiency Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Efficiency Trends</CardTitle>
                  <CardDescription className="text-gray-400">
                    Track calibration accuracy over time
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={selectedPeriod === 'week' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedPeriod('week')}
                  >
                    {t('personal_analytics.period_week', 'Week')}
                  </Button>
                  <Button
                    variant={selectedPeriod === 'month' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedPeriod('month')}
                  >
                    {t('personal_analytics.period_month', 'Month')}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {efficiencyTrends.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{t('personal_analytics.no_trends', 'No efficiency trend data available.')}</p>
                  <p className="text-sm mt-2">{t('personal_analytics.no_trends_desc', 'Complete more calibration tests to see trends.')}</p>
                </div>
              ) : (
                <VirtualizedAnalyticsList
                  items={efficiencyTrends}
                  containerHeight={400}
                  itemHeight={100}
                  renderItem={(trend, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-gray-900 rounded-lg border border-gray-700 mb-3"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-gray-300">
                            {trend.date.toLocaleDateString()}
                          </div>
                          <div className="text-sm text-gray-400 mt-1">
                            {trend.testCount} test{trend.testCount !== 1 ? 's' : ''}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-sm text-gray-400">Avg Accuracy</div>
                            <div className="text-lg font-bold text-green-400">
                              {trend.averageAccuracy.toFixed(2)}mm
                            </div>
                          </div>
                          {trend.improvement !== 0 && (
                            <div className="flex items-center gap-1">
                              {trend.improvement < 0 ? (
                                <TrendingDown className="h-5 w-5 text-red-400" />
                              ) : (
                                <TrendingUp className="h-5 w-5 text-green-400" />
                              )}
                              <span
                                className={
                                  trend.improvement < 0
                                    ? 'text-green-400 font-semibold'
                                    : 'text-red-400 font-semibold'
                                }
                              >
                                {Math.abs(trend.improvement).toFixed(1)}%
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

