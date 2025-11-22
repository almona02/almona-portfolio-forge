/**
 * Enhanced Inventory Dashboard
 * 
 * Features:
 * - Visual stock levels with color-coded alerts
 * - Automatic remnant creation from cutting operations
 * - Smart remnant matching for new projects
 * - Remnant utilization analytics and reporting
 * - Stock movement history with project linking
 * - Low stock alerts with automatic reorder suggestions
 * - Multi-location inventory support
 * - Barcode/QR code generation for stock items
 * - "Use remnants first" optimization flag
 * - Remnant expiration tracking
 * - Remnant value calculation
 * - Automatic remnant consolidation suggestions
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/ui/card';
import { Badge } from '@/shared/ui/ui/badge';
import { Progress } from '@/shared/ui/ui/progress';
import { Button } from '@/shared/ui/ui/button';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/ui/alert';
import { Switch } from '@/shared/ui/ui/switch';
import {
  Package,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  History,
  MapPin,
  QrCode,
  BarChart3,
  RefreshCw,
  Download,
  Filter,
  Search,
  X,
  Plus,
  Calendar,
  DollarSign,
  Box,
  Warehouse,
  AlertCircle,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { WindowUnit, Profile } from '@/types/fabricator';
import { remnantManager, type Remnant, type RemnantStatistics, type RemnantConsolidationSuggestion } from '@/lib/inventory/RemnantManager';
import { supabase } from '@/lib/supabase';

interface InventoryDashboardProps {
  inventory: Profile[];
  project?: WindowUnit | null;
  userId?: string;
}

interface StockAlert {
  id: string;
  profileId: string;
  profileName: string;
  alertType: 'low_stock' | 'out_of_stock' | 'overstock' | 'expiring_remnant' | 'unused_remnant';
  severity: 'low' | 'medium' | 'high' | 'critical';
  currentValue: number;
  thresholdValue: number;
  reorderQuantity?: number;
  reorderPriority?: 'low' | 'medium' | 'high' | 'urgent';
  message?: string;
}

interface StockMovement {
  id: string;
  profileId: string;
  profileName: string;
  movementType: string;
  quantity: number;
  unit: string;
  projectId?: string;
  projectName?: string;
  notes?: string;
  createdAt: Date;
  createdBy?: string;
}

interface InventoryLocation {
  id: string;
  name: string;
  code: string;
  address?: string;
  isDefault: boolean;
}

export const InventoryDashboard: React.FC<InventoryDashboardProps> = ({
  inventory,
  project,
  userId,
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [remnants, setRemnants] = useState<Remnant[]>([]);
  const [remnantStats, setRemnantStats] = useState<RemnantStatistics | null>(null);
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [consolidationSuggestions, setConsolidationSuggestions] = useState<RemnantConsolidationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [useRemnantsFirst, setUseRemnantsFirst] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMaterial, setFilterMaterial] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Load data on mount
  useEffect(() => {
    if (userId) {
      loadDashboardData();
    }
  }, [userId, selectedLocation]);

  const loadDashboardData = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      // Load remnants
      const availableRemnants = await remnantManager.getAvailableRemnants(userId, {
        locationId: selectedLocation !== 'all' ? selectedLocation : undefined,
      });
      setRemnants(availableRemnants);

      // Load statistics
      const stats = await remnantManager.getRemnantStatistics(userId);
      setRemnantStats(stats);

      // Load consolidation suggestions
      const suggestions = await remnantManager.getConsolidationSuggestions(userId);
      setConsolidationSuggestions(suggestions);

      // Load stock alerts
      await loadStockAlerts();

      // Load stock movements
      await loadStockMovements();

      // Load locations
      await loadLocations();
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load inventory data');
    } finally {
      setIsLoading(false);
    }
  }, [userId, selectedLocation]);

  const loadStockAlerts = useCallback(async () => {
    if (!userId) return;

    try {
      // Check stock levels (this will create/update alerts)
      await supabase.rpc('check_stock_levels', { p_user_id: userId });

      // Fetch alerts
      const { data, error } = await supabase
        .from('stock_alerts')
        .select(`
          *,
          fabricator_profiles (id, name)
        `)
        .eq('user_id', userId)
        .eq('is_resolved', false)
        .order('severity', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      const alerts: StockAlert[] = (data || []).map((alert: any) => ({
        id: alert.id,
        profileId: alert.profile_id,
        profileName: alert.fabricator_profiles?.name || 'Unknown',
        alertType: alert.alert_type,
        severity: alert.severity,
        currentValue: parseFloat(alert.current_value),
        thresholdValue: parseFloat(alert.threshold_value || 0),
        reorderQuantity: alert.reorder_quantity ? parseFloat(alert.reorder_quantity) : undefined,
        reorderPriority: alert.reorder_priority,
        message: alert.message,
      }));

      setStockAlerts(alerts);
    } catch (error) {
      console.error('Error loading stock alerts:', error);
    }
  }, [userId]);

  const loadStockMovements = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('stock_movements')
        .select(`
          *,
          fabricator_profiles (id, name)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const movements: StockMovement[] = (data || []).map((movement: any) => ({
        id: movement.id,
        profileId: movement.profile_id,
        profileName: movement.fabricator_profiles?.name || 'Unknown',
        movementType: movement.movement_type,
        quantity: parseFloat(movement.quantity),
        unit: movement.unit,
        projectId: movement.project_id,
        notes: movement.notes,
        createdAt: new Date(movement.created_at),
        createdBy: movement.created_by,
      }));

      setStockMovements(movements);
    } catch (error) {
      console.error('Error loading stock movements:', error);
    }
  }, [userId]);

  const loadLocations = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('inventory_locations')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('name', { ascending: true });

      if (error) throw error;

      const locs: InventoryLocation[] = (data || []).map((loc: any) => ({
        id: loc.id,
        name: loc.name,
        code: loc.code,
        address: loc.address,
        isDefault: loc.is_default,
      }));

      setLocations(locs);
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  }, [userId]);

  const getStockStatus = (profile: Profile) => {
    if (!profile.minStockLevel) return 'unknown';
    const percentage = (profile.stockQuantity / (profile.minStockLevel * 2)) * 100;
    if (percentage === 0) return 'out_of_stock';
    if (percentage < 50) return 'low';
    if (percentage < 80) return 'medium';
    return 'high';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'out_of_stock':
        return 'text-red-400 border-red-500';
      case 'low':
        return 'text-orange-400 border-orange-500';
      case 'medium':
        return 'text-yellow-400 border-yellow-500';
      case 'high':
        return 'text-green-400 border-green-500';
      default:
        return 'text-gray-400 border-gray-500';
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'out_of_stock':
        return 'bg-red-500/20';
      case 'low':
        return 'bg-orange-500/20';
      case 'medium':
        return 'bg-yellow-500/20';
      case 'high':
        return 'bg-green-500/20';
      default:
        return 'bg-gray-500/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'out_of_stock':
        return <AlertCircle className="h-4 w-4" />;
      case 'low':
        return <AlertTriangle className="h-4 w-4" />;
      case 'medium':
        return <AlertTriangle className="h-4 w-4" />;
      case 'high':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const handleGenerateBarcode = async (remnantId: string) => {
    try {
      const result = await remnantManager.generateBarcode(remnantId);
      if (result) {
        toast.success('Barcode generated successfully');
        // Refresh remnants
        if (userId) {
          const updated = await remnantManager.getAvailableRemnants(userId);
          setRemnants(updated);
        }
      }
    } catch (error) {
      toast.error('Failed to generate barcode');
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('stock_alerts')
        .update({
          is_resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: userId,
        })
        .eq('id', alertId);

      if (error) throw error;

      toast.success('Alert resolved');
      await loadStockAlerts();
    } catch (error) {
      toast.error('Failed to resolve alert');
    }
  };

  // Filtered inventory
  const filteredInventory = useMemo(() => {
    return inventory.filter((profile) => {
      if (searchQuery && !profile.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (filterMaterial !== 'all' && profile.material !== filterMaterial) {
        return false;
      }
      return true;
    });
  }, [inventory, searchQuery, filterMaterial]);

  // Filtered remnants
  const filteredRemnants = useMemo(() => {
    return remnants.filter((remnant) => {
      if (filterMaterial !== 'all' && remnant.profile?.material !== filterMaterial) {
        return false;
      }
      if (filterStatus !== 'all' && remnant.status !== filterStatus) {
        return false;
      }
      if (searchQuery && !remnant.profile?.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [remnants, searchQuery, filterMaterial, filterStatus]);

  if (!inventory || inventory.length === 0) {
    return (
      <Card className="bg-gray-700/50 border-gray-600">
        <CardContent className="p-8 text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Inventory Data</h3>
          <p className="text-gray-400">
            Inventory data is not available. Please refresh the page or contact support.
          </p>
        </CardContent>
      </Card>
    );
  }

  const lowStockCount = inventory.filter((p) => getStockStatus(p) === 'low' || getStockStatus(p) === 'out_of_stock').length;
  const goodStockCount = inventory.filter((p) => getStockStatus(p) === 'high').length;
  const totalValue = inventory.reduce((sum, p) => sum + (p.stockQuantity * p.costPerMeter), 0);

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Inventory Dashboard</h2>
          <p className="text-gray-400">Comprehensive inventory and remnant management</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={loadDashboardData}
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {locations.length > 0 && (
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name} {loc.isDefault && '(Default)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Stock Alerts Banner */}
      {stockAlerts.length > 0 && (
        <Alert className={`border-orange-500 ${stockAlerts.some(a => a.severity === 'critical') ? 'bg-red-500/10' : 'bg-orange-500/10'}`}>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>
            {stockAlerts.length} Active Stock Alert{stockAlerts.length > 1 ? 's' : ''}
          </AlertTitle>
          <AlertDescription>
            {stockAlerts.filter(a => a.severity === 'critical').length > 0 && (
              <span className="text-red-400 font-semibold">
                {stockAlerts.filter(a => a.severity === 'critical').length} critical alert(s) require immediate attention.
              </span>
            )}
            {' '}Click on the Alerts tab to view details and reorder suggestions.
          </AlertDescription>
        </Alert>
      )}

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gray-700/50 border-gray-600">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Profiles</p>
                <p className="text-2xl font-bold text-blue-400">{inventory.length}</p>
              </div>
              <Package className="h-8 w-8 text-blue-400 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-700/50 border-gray-600">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Low Stock</p>
                <p className="text-2xl font-bold text-orange-400">{lowStockCount}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-400 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-700/50 border-gray-600">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Good Stock</p>
                <p className="text-2xl font-bold text-green-400">{goodStockCount}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-700/50 border-gray-600">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Value</p>
                <p className="text-2xl font-bold text-purple-400">
                  ${totalValue.toFixed(2)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-400 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Remnant Stats */}
      {remnantStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gray-700/50 border-gray-600">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Available Remnants</p>
                  <p className="text-2xl font-bold text-cyan-400">
                    {remnantStats.availableRemnants}
                  </p>
                </div>
                <Box className="h-8 w-8 text-cyan-400 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-700/50 border-gray-600">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Remnant Length</p>
                  <p className="text-2xl font-bold text-cyan-400">
                    {(remnantStats.totalLength / 1000).toFixed(2)}m
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-cyan-400 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-700/50 border-gray-600">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Remnant Value</p>
                  <p className="text-2xl font-bold text-cyan-400">
                    ${remnantStats.totalValue.toFixed(2)}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-cyan-400 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-700/50 border-gray-600">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Expiring Soon</p>
                  <p className="text-2xl font-bold text-orange-400">
                    {remnantStats.expiringSoon}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-orange-400 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="remnants">Remnants</TabsTrigger>
          <TabsTrigger value="alerts">
            Alerts
            {stockAlerts.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {stockAlerts.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Use Remnants First Toggle */}
          <Card className="bg-gray-700/50 border-gray-600">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={useRemnantsFirst}
                    onCheckedChange={setUseRemnantsFirst}
                  />
                  <div>
                    <Label className="text-base font-semibold">Use Remnants First</Label>
                    <p className="text-sm text-gray-400">
                      Automatically match and use available remnants before cutting new stock
                    </p>
                  </div>
                </div>
                <Badge variant={useRemnantsFirst ? 'default' : 'outline'}>
                  {useRemnantsFirst ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Search and Filters */}
          <Card className="bg-gray-700/50 border-gray-600">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search profiles..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={filterMaterial} onValueChange={setFilterMaterial}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Material" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Materials</SelectItem>
                    <SelectItem value="aluminum">Aluminum</SelectItem>
                    <SelectItem value="upvc">UPVC</SelectItem>
                    <SelectItem value="wood">Wood</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Inventory List */}
          <Card className="bg-gray-700/50 border-gray-600">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-orange-400" />
                Profile Inventory
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredInventory.map((profile) => {
                  const status = getStockStatus(profile);
                  const stockPercentage = profile.minStockLevel
                    ? Math.min((profile.stockQuantity / (profile.minStockLevel * 2)) * 100, 100)
                    : 0;

                  return (
                    <div
                      key={profile.id}
                      className={`p-4 rounded-lg border ${getStatusColor(status)} ${getStatusBgColor(status)}`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{profile.name}</h4>
                            <Badge variant="outline" className={getStatusColor(status)}>
                              <div className="flex items-center gap-1">
                                {getStatusIcon(status)}
                                {status.toUpperCase().replace('_', ' ')}
                              </div>
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-400">
                            {profile.material} • {profile.width}mm • {profile.color}
                          </p>
                        </div>
                        {profile.userId && locations.length > 0 && (
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <MapPin className="h-4 w-4" />
                            {locations.find(l => l.isDefault)?.name || 'Default'}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Stock: {profile.stockQuantity}m</span>
                          <span>Min Level: {profile.minStockLevel}m</span>
                        </div>
                        <Progress value={stockPercentage} className="h-2" />
                        <div className="flex justify-between text-sm text-gray-400">
                          <span>Cost: ${profile.costPerMeter}/m</span>
                          <span>Supplier: {profile.supplier || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Remnants Tab */}
        <TabsContent value="remnants" className="space-y-4">
          {/* Consolidation Suggestions */}
          {consolidationSuggestions.length > 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Consolidation Opportunities</AlertTitle>
              <AlertDescription>
                <div className="space-y-2 mt-2">
                  {consolidationSuggestions.slice(0, 3).map((suggestion, idx) => (
                    <div key={idx} className="text-sm">
                      <strong>{suggestion.profileName}:</strong> {suggestion.suggestedAction}
                      {' '}Estimated savings: ${suggestion.estimatedSavings.toFixed(2)}
                    </div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Remnant Filters */}
          <Card className="bg-gray-700/50 border-gray-600">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="reserved">Reserved</SelectItem>
                    <SelectItem value="used">Used</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Remnants List */}
          <Card className="bg-gray-700/50 border-gray-600">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Box className="h-5 w-5 text-cyan-400" />
                Material Remnants ({filteredRemnants.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredRemnants.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <Box className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No remnants available</p>
                  </div>
                ) : (
                  filteredRemnants.map((remnant) => (
                    <div
                      key={remnant.id}
                      className="p-4 bg-gray-800 rounded-lg border border-gray-600"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">
                              {remnant.profile?.name || 'Unknown Profile'}
                            </h4>
                            <Badge variant="outline">{remnant.status}</Badge>
                            <Badge variant="outline" className="text-xs">
                              {remnant.quality}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-400">
                            {remnant.profile?.material} • Length: {(remnant.length / 1000).toFixed(2)}m
                            {remnant.locationName && ` • Location: ${remnant.locationName}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {remnant.barcode ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(remnant.qrCodeUrl, '_blank')}
                            >
                              <QrCode className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleGenerateBarcode(remnant.id)}
                            >
                              <QrCode className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-400">Value:</span>
                          <p className="font-semibold">${remnant.estimatedValue.toFixed(2)}</p>
                        </div>
                        <div>
                          <span className="text-gray-400">Created:</span>
                          <p className="font-semibold">
                            {new Date(remnant.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        {remnant.expirationDate && (
                          <div>
                            <span className="text-gray-400">Expires:</span>
                            <p className="font-semibold">
                              {new Date(remnant.expirationDate).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                        <div>
                          <span className="text-gray-400">Usage Count:</span>
                          <p className="font-semibold">{remnant.usageCount}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <Card className="bg-gray-700/50 border-gray-600">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-400" />
                Stock Alerts ({stockAlerts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stockAlerts.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No active alerts</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {stockAlerts.map((alert) => (
                    <Alert
                      key={alert.id}
                      className={`${
                        alert.severity === 'critical'
                          ? 'bg-red-500/10 border-red-500'
                          : alert.severity === 'high'
                          ? 'bg-orange-500/10 border-orange-500'
                          : 'bg-yellow-500/10 border-yellow-500'
                      }`}
                    >
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle className="flex items-center justify-between">
                        <span>{alert.profileName}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleResolveAlert(alert.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </AlertTitle>
                      <AlertDescription>
                        <div className="space-y-2">
                          <p>
                            <strong>Type:</strong> {alert.alertType.replace('_', ' ')}
                            {' • '}
                            <strong>Severity:</strong> {alert.severity}
                          </p>
                          <p>
                            Current: {alert.currentValue}m • Threshold: {alert.thresholdValue}m
                          </p>
                          {alert.reorderQuantity && (
                            <div className="mt-2 p-2 bg-gray-800 rounded">
                              <p className="text-sm font-semibold">Reorder Suggestion:</p>
                              <p className="text-sm">
                                Order {alert.reorderQuantity.toFixed(2)}m
                                {alert.reorderPriority && ` (Priority: ${alert.reorderPriority})`}
                              </p>
                            </div>
                          )}
                          {alert.message && <p className="text-sm mt-1">{alert.message}</p>}
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card className="bg-gray-700/50 border-gray-600">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-blue-400" />
                Stock Movement History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stockMovements.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No movement history</p>
                  </div>
                ) : (
                  stockMovements.map((movement) => (
                    <div
                      key={movement.id}
                      className="p-3 bg-gray-800 rounded border border-gray-600"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{movement.profileName}</p>
                          <p className="text-sm text-gray-400">
                            {movement.movementType} • {movement.quantity} {movement.unit}
                          </p>
                          {movement.notes && (
                            <p className="text-xs text-gray-500 mt-1">{movement.notes}</p>
                          )}
                        </div>
                        <div className="text-right text-sm text-gray-400">
                          <p>{new Date(movement.createdAt).toLocaleDateString()}</p>
                          <p>{new Date(movement.createdAt).toLocaleTimeString()}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-gray-700/50 border-gray-600">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-purple-400" />
                  Remnant Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                {remnantStats ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-400">By Material</p>
                      <div className="mt-2 space-y-2">
                        {Object.entries(remnantStats.byMaterial).map(([material, stats]) => (
                          <div key={material} className="flex justify-between">
                            <span className="capitalize">{material}:</span>
                            <span>
                              {stats.count} pieces, {(stats.length / 1000).toFixed(2)}m
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">By Quality</p>
                      <div className="mt-2 space-y-2">
                        {Object.entries(remnantStats.byQuality).map(([quality, count]) => (
                          <div key={quality} className="flex justify-between">
                            <span className="capitalize">{quality}:</span>
                            <span>{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-400">No statistics available</p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-gray-700/50 border-gray-600">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-400" />
                  Utilization Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                {remnantStats ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-400">Total Remnants</p>
                      <p className="text-2xl font-bold">{remnantStats.totalRemnants}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Available</p>
                      <p className="text-2xl font-bold text-green-400">
                        {remnantStats.availableRemnants}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Unused (90+ days)</p>
                      <p className="text-2xl font-bold text-orange-400">
                        {remnantStats.unusedRemnants}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-400">No metrics available</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

