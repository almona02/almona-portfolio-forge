import React, { Suspense, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { Profile, WindowUnit } from '@/types/fabricator';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/ui/card';
import { Button } from '@/shared/ui/ui/button';
import { Badge } from '@/shared/ui/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import { Input } from '@/shared/ui/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import {
  Search,
  Package,
  TrendingUp,
  AlertTriangle,
  Download,
  Plus,
  Filter,
  Save,
} from 'lucide-react';
import { useFabricatorWorkspace } from '@/context/FabricatorWorkspaceContext';

const InventoryDashboard = React.lazy(() =>
  import('@/components/fabricator/InventoryDashboard').then((m) => ({
    default: m.InventoryDashboard,
  })),
);


const InventoryPage: React.FC = () => {
  const { t } = useTranslation('fabricator');
  const { user } = useAuth();
  const navigate = useNavigate();
  const { state: workspaceState, dispatch } = useFabricatorWorkspace();
  const [activeTab, setActiveTab] = useState('dashboard');
  // Use global search from workspace context
  const searchQuery = workspaceState.globalSearchQuery || '';
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [conflicts, setConflicts] = useState<Profile[]>([]);
  const [tuningFilter, setTuningFilter] = useState<'all' | 'tuned' | 'in_progress' | 'untuned'>('all');

  const {
    data: inventory = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['inventory-dashboard', user?.id],
    queryFn: async () => {
      if (!user) return [] as Profile[];
      
      // First, sync stock quantities from movements to ensure accurate stock_quantity values
      try {
        const db = supabase as any;
        await db.rpc('sync_stock_from_movements', { p_user_id: user.id });
      } catch (syncError) {
        console.warn('Failed to sync stock from movements:', syncError);
        // Continue loading even if sync fails
      }
      
      // Use untyped client here to avoid friction with generated Supabase types
       
      const db = supabase as any;
      const { data, error } = await db
        .from('fabricator_profiles')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      
      // Ensure stock quantities are numbers and not null/undefined
      const profiles = (data || []).map((profile: any) => ({
        ...profile,
        stockQuantity: profile.stock_quantity ? parseFloat(profile.stock_quantity) : 0,
        minStockLevel: profile.min_stock_level ? parseFloat(profile.min_stock_level) : 0,
      })) as Profile[];
      
      return profiles;
    },
    enabled: !!user,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });

  const getTuningStatus = (profile: Profile): 'untuned' | 'in_progress' | 'tuned' => {
    const specs = (profile as any).specifications || {};
    const raw = specs.tuningStatus as 'untuned' | 'in_progress' | 'tuned' | undefined;
    if (raw === 'tuned' || raw === 'in_progress' || raw === 'untuned') return raw;
    if ((profile as any).calibrations?.length || (profile as any).machiningMacros?.length) {
      return 'in_progress';
    }
    return 'untuned';
  };

  const inventoryWithEdits = useMemo(() => {
    return inventory.map((profile) => {
      const edits = workspaceState.profileEdits[profile.id];
      return edits ? { ...profile, ...edits } : profile;
    });
  }, [inventory, workspaceState.profileEdits]);

  const inventoryStats = useMemo(() => {
    const totalItems = inventoryWithEdits.length;
    const lowStockItems = inventoryWithEdits.filter(
      (p) => (p.stockQuantity || 0) <= (p.minStockLevel || 0),
    ).length;
    const outOfStockItems = inventoryWithEdits.filter(
      (p) => (p.stockQuantity || 0) === 0,
    ).length;
    const totalValue = inventoryWithEdits.reduce((sum, p) => {
      const cost = p.costPerMeter || 0;
      const quantity = p.stockQuantity || 0;
      return sum + cost * quantity;
    }, 0);

    const tunedItems = inventoryWithEdits.filter(
      (p) => getTuningStatus(p) === 'tuned',
    ).length;
    const inProgressItems = inventoryWithEdits.filter(
      (p) => getTuningStatus(p) === 'in_progress',
    ).length;
    const untunedItems = inventoryWithEdits.filter(
      (p) => getTuningStatus(p) === 'untuned',
    ).length;

    return {
      totalItems,
      lowStockItems,
      outOfStockItems,
      totalValue: totalValue.toFixed(2),
      utilizationRate:
        totalItems > 0 ? (((totalItems - outOfStockItems) / totalItems) * 100).toFixed(1) : '0',
      tunedItems,
      inProgressItems,
      untunedItems,
    };
  }, [inventoryWithEdits]);

  const filteredInventory = useMemo(() => {
    let list = inventoryWithEdits;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((profile) => {
        return (
          profile.name?.toLowerCase().includes(q) ||
          profile.systemBrand?.toLowerCase().includes(q) ||
          profile.material?.toLowerCase().includes(q) ||
          profile.supplier?.toLowerCase().includes(q)
        );
      });
    }

    if (tuningFilter !== 'all') {
      list = list.filter((p) => getTuningStatus(p) === tuningFilter);
    }

    return list;
  }, [inventoryWithEdits, searchQuery, tuningFilter]);

  const handleSaveAllEdits = async () => {
    try {
      const entries = Object.entries(workspaceState.profileEdits);
      if (!entries.length) return;

      const db: any = supabase;
      const newConflicts: Profile[] = [];

      for (const [profileId, edits] of entries) {
        const base = inventory.find((p) => p.id === profileId);
        if (!base) {
          // Profile no longer exists locally – treat as conflict and skip.
          continue;
        }

        const baselineUpdatedAt = (base as any).updated_at as string | undefined;

        // Try conditional update: only succeed if updated_at matches baseline.
        const query = db
          .from('fabricator_profiles')
          .update(edits)
          .eq('id', profileId);

        const { data, error } = baselineUpdatedAt
          ? await query.eq('updated_at', baselineUpdatedAt).select('id, updated_at')
          : await query.select('id, updated_at');

        if (error) {
          console.error('Error saving profile edits for', profileId, error);
          newConflicts.push(base);
          continue;
        }

        // If no rows were updated, someone else modified this row first.
        if (!data || data.length === 0) {
          // Fetch latest server snapshot for conflict display.
          const { data: serverRow } = await db
            .from('fabricator_profiles')
            .select('*')
            .eq('id', profileId)
            .single();

          newConflicts.push((serverRow as Profile) || base);
          continue;
        }

        // Successful save: clear this local edit.
        dispatch({ type: 'CLEAR_PROFILE_EDIT', payload: { profileId } });
      }

      setConflicts(newConflicts);

      // Refresh inventory from server so updated_at and values stay in sync.
      void refetch();
    } catch (error) {
      console.error('Failed to save profile edits:', error);
    }
  };

  const unsavedChangesCount = Object.keys(workspaceState.profileEdits).length;

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
          <CardContent className="py-16 text-center">
            <Package className="h-16 w-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-300 mb-2">Authentication Required</h3>
            <p className="text-slate-400 max-w-md mx-auto mb-6">
              Please log in to access your inventory management dashboard and remnant analytics.
            </p>
            <Button
              onClick={() => (window.location.href = '/login')}
              className="bg-orange-500 hover:bg-orange-600"
            >
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Draft profile edits indicator */}
      {unsavedChangesCount > 0 && (
        <Card className="bg-amber-500/10 border-amber-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Save className="h-5 w-5 text-amber-400" />
                <div>
                  <p className="text-amber-300 font-medium">
                    {unsavedChangesCount} unsaved profile change
                    {unsavedChangesCount > 1 ? 's' : ''}
                  </p>
                  <p className="text-amber-400/80 text-sm">
                    Changes are preserved across workspace tabs until you save or discard.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleSaveAllEdits}
                  className="bg-amber-500 hover:bg-amber-600 text-xs"
                >
                  Save All
                </Button>
                <Button
                  variant="outline"
                  onClick={() => dispatch({ type: 'CLEAR_PROFILE_EDITS' })}
                  className="border-amber-500 text-amber-300 hover:bg-amber-500/20 text-xs"
                >
                  Discard
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {conflicts.length > 0 && (
        <Card className="bg-red-900/20 border-red-500/50">
          <CardContent className="p-4 space-y-2">
            <p className="text-sm font-semibold text-red-200">
              Some profiles changed on the server while you were editing. Your local changes were not
              applied to these items:
            </p>
            <ul className="text-xs text-red-100 list-disc list-inside space-y-1">
              {conflicts.map((p) => (
                <li key={p.id}>
                  <span className="font-semibold">{p.name}</span>{' '}
                  <span className="text-red-300">
                    (updated by another user or process – review before retrying)
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
      {/* Enhanced Header Card */}
      <Card className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-700/50 shadow-2xl">
        <CardHeader className="pb-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-2">
              <CardTitle className="text-2xl flex items-center gap-3">
                <div className="p-2 bg-orange-500/20 rounded-lg">
                  <Package className="h-6 w-6 text-orange-400" />
                </div>
                {t('inventory.title', 'Inventory Intelligence Hub')}
              </CardTitle>
              <CardDescription className="text-slate-300/80 text-base">
                {t('inventory.description', 'Centralized inventory management with real-time analytics, remnant optimization, and AI-powered stock predictions for Turkish & Egyptian markets.')}
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                className="bg-orange-500 hover:bg-orange-600 border-orange-500"
                onClick={() => navigate('/fabricator/profiles')}
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('inventory.add_profile', 'Add Profile')}
              </Button>
              <Button
                variant="outline"
                className="border-slate-600 hover:bg-slate-700/50 text-slate-300"
                onClick={() => (window.location.href = '/fabricator-workflow#inventory')}
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                {t('inventory.workflow_integration', 'Workflow Integration')}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* User & Scope Info */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-4 bg-slate-800/30 rounded-lg border border-slate-700/30">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <span>Workspace:</span>
                <Badge
                  variant="outline"
                  className="bg-slate-700/50 text-slate-300 border-slate-600"
                >
                  {user.email || `${user.id.slice(0, 4)}…${user.id.slice(-4)}`}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <span>Last Sync:</span>
                <span className="text-slate-300 font-mono">
                  {isLoading ? 'Syncing…' : 'Just now'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2 text-green-400">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span>Live Data</span>
              </div>
              <div className="text-slate-500">Supabase • Real-time</div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-slate-800/40 rounded-lg p-4 border border-slate-700/30">
              <div className="text-2xl font-bold text-white mb-1">{inventoryStats.totalItems}</div>
              <div className="text-sm text-slate-400">Total Items</div>
            </div>
            <div className="bg-slate-800/40 rounded-lg p-4 border border-slate-700/30">
              <div className="text-2xl font-bold text-emerald-400 mb-1">
                {inventoryStats.tunedItems}
              </div>
              <div className="text-sm text-slate-400">Tuned Items</div>
            </div>
            <div className="bg-slate-800/40 rounded-lg p-4 border border-slate-700/30">
              <div className="text-2xl font-bold text-orange-400 mb-1">
                {inventoryStats.lowStockItems}
              </div>
              <div className="text-sm text-slate-400">Low Stock</div>
            </div>
            <div className="bg-slate-800/40 rounded-lg p-4 border border-slate-700/30">
              <div className="text-2xl font-bold text-red-400 mb-1">
                {inventoryStats.outOfStockItems}
              </div>
              <div className="text-sm text-slate-400">Out of Stock</div>
            </div>
            <div className="bg-slate-800/40 rounded-lg p-4 border border-slate-700/30">
              <div className="text-2xl font-bold text-green-400 mb-1">
                ${inventoryStats.totalValue}
              </div>
              <div className="text-sm text-slate-400">Total Value</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Navigation & Search */}
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full lg:w-auto">
              <TabsList className="bg-slate-700/50 border border-slate-600/50">
                <TabsTrigger value="dashboard" className="data-[state=active]:bg-orange-500">
                  <Package className="h-4 w-4 mr-2" />
                  {t('inventory.tabs.dashboard', 'Dashboard')}
                </TabsTrigger>
                <TabsTrigger value="analytics" className="data-[state=active]:bg-orange-500">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  {t('inventory.tabs.analytics', 'Analytics')}
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Search & Filters */}
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <div className="relative flex-1 lg:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search profiles, brands, materials..."
                  value={searchQuery}
                  onChange={(e) => dispatch({ type: 'SET_GLOBAL_SEARCH', payload: e.target.value })}
                  className="pl-9 bg-slate-700/50 border-slate-600/50 text-slate-100 placeholder-slate-500"
                />
              </div>

              <div className="flex gap-2">
                <Select
                  value={tuningFilter}
                  onValueChange={(v) => setTuningFilter(v as any)}
                >
                  <SelectTrigger className="w-40 bg-slate-700/50 border-slate-600/50 text-slate-100 text-xs">
                    <SelectValue placeholder="Tuning status" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-xs">
                    <SelectItem value="all">All Tuning</SelectItem>
                    <SelectItem value="tuned">Tuned Only</SelectItem>
                    <SelectItem value="in_progress">Tuning In Progress</SelectItem>
                    <SelectItem value="untuned">Untuned Only</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-600 hover:bg-slate-700/50"
                  onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  {viewMode === 'grid' ? 'Table' : 'Grid'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-600 hover:bg-slate-700/50"
                  onClick={() => refetch()}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts Section */}
      {inventoryStats.lowStockItems > 0 && (
        <Card className="bg-orange-500/10 border-orange-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-400" />
              <div className="flex-1">
                <p className="text-orange-300 font-medium">
                  {inventoryStats.lowStockItems} item(s) need attention
                </p>
                <p className="text-orange-400/80 text-sm">
                  Low stock levels detected. Consider reordering to avoid production delays.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-orange-500 text-orange-300 hover:bg-orange-500/20"
                onClick={() => {
                  dispatch({ type: 'SET_GLOBAL_SEARCH', payload: '' });
                  navigate('/fabricator/profiles');
                }}
              >
                Review Items
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Suspense
        fallback={
          <Card className="bg-slate-800/50 border-slate-700/50">
            <CardContent className="p-12 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
                <div>
                  <p className="text-slate-300 font-medium">Loading Inventory Intelligence</p>
                  <p className="text-slate-500 text-sm">Preparing your fabricator data...</p>
                </div>
              </div>
            </CardContent>
          </Card>
        }
      >
        {activeTab === 'dashboard' && (
          <InventoryDashboard
            inventory={filteredInventory}
            project={workspaceState.currentProject as WindowUnit | null}
            userId={user.id}
            viewMode={viewMode}
          />
        )}

        {activeTab === 'analytics' && (
          <Card className="bg-slate-800/50 border-slate-700/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-400" />
                {t('inventory.analytics.title', 'Inventory Analytics')}
              </CardTitle>
              <CardDescription>
                {t('inventory.analytics.description', 'Advanced analytics and insights for your fabricator inventory.')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-slate-500">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{t('inventory.analytics.coming_soon', 'Advanced analytics dashboard coming soon.')}</p>
                <p className="text-sm">
                  {t('inventory.analytics.features', 'Inventory utilization, trend analysis, and predictive stocking.')}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </Suspense>

      {/* Enhanced Footer */}
      <Card className="bg-slate-800/30 border-slate-700/30">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-6">
              <span>• Real-time synchronization</span>
              <span>• Turkish &amp; Egyptian market optimized</span>
              <span>• Machine-ready export formats</span>
            </div>
            <div className="flex items-center gap-4">
              <span>Fabricator Pro v4.0</span>
              <Badge
                variant="outline"
                className="bg-green-500/10 text-green-400 border-green-500/30"
              >
                Operational
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryPage;


