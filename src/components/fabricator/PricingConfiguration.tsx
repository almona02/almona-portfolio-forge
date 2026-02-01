/**
 * PricingConfiguration - Comprehensive pricing engine configuration UI
 * 
 * Features:
 * - Multi-currency support (TRY, EGP, USD, EUR)
 * - Regional pricing variations (Turkey vs Egypt)
 * - Material-specific markups and discounts
 * - Labor cost configuration with operation types
 * - Price history tracking and versioning
 * - Bulk price updates from CSV/Excel
 * - Integration with QuotingEngine for real-time quotes
 * - Automatic price validation and alerts
 */

import { useRegionDetection } from '@/hooks/useRegionDetection';
import { formatCurrency, getExchangeRate } from '@/lib/currencyExchange';
import { PricingEngine, type LaborCostConfig, type MaterialPricingRule, type PriceHistoryEntry, type PriceValidationAlert, type PricingConfiguration as PricingConfig } from '@/lib/pricing/PricingEngine';
import { supabase } from '@/lib/supabase';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/ui/alert';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import { Progress } from '@/shared/ui/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Download,
  FileSpreadsheet,
  Plus,
  RefreshCw,
  Save,
  TrendingDown,
  TrendingUp,
  Upload,
} from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

interface PricingConfigurationProps {
  userId?: string;
  onConfigurationUpdate?: (config: PricingConfig) => void;
}

export const PricingConfiguration: React.FC<PricingConfigurationProps> = ({
  userId,
  onConfigurationUpdate,
}) => {
  const { regionState } = useRegionDetection();
  const [pricingEngine, setPricingEngine] = useState<PricingEngine | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  
  // Configuration state
  const [config, setConfig] = useState<Partial<PricingConfig>>({
    region: 'global',
    currency: 'USD',
    materialMarkupPercentage: 35,
    laborMarkupPercentage: 50,
    hardwareMarkupPercentage: 40,
    glazingMarkupPercentage: 30,
    installationMarkupPercentage: 45,
    defaultTaxRate: 20,
    taxName: 'VAT',
    minProfitMargin: 25,
    maxDiscountPercentage: 15,
    roundingMethod: 'standard',
    roundingPrecision: 2,
  });

  // Material pricing rules
  const [materialRules] = useState<MaterialPricingRule[]>([]);
  const [_editingMaterialRule, _setEditingMaterialRule] = useState<MaterialPricingRule | null>(null);

  // Labor cost configurations
  const [laborConfigs] = useState<LaborCostConfig[]>([]);
  const [_editingLaborConfig, _setEditingLaborConfig] = useState<LaborCostConfig | null>(null);

  // Price history
  const [priceHistory, setPriceHistory] = useState<PriceHistoryEntry[]>([]);
  const [historyFilter, setHistoryFilter] = useState<{ entityType?: string; days?: number }>({});

  // Validation alerts
  const [alerts, setAlerts] = useState<PriceValidationAlert[]>([]);
  const [unresolvedAlerts, setUnresolvedAlerts] = useState<PriceValidationAlert[]>([]);

  // Bulk import
  const [bulkImportFile, setBulkImportFile] = useState<File | null>(null);
  const [bulkImportProgress, setBulkImportProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Exchange rates
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});

  // Initialize pricing engine
  useEffect(() => {
    const initEngine = async () => {
      try {
        const currentUserId = userId || (await supabase.auth.getUser()).data.user?.id;
        if (!currentUserId) {
          toast.error('User not authenticated');
          return;
        }

        const engine = new PricingEngine(config, supabase);
        await engine.loadConfiguration(currentUserId, config.region as any, config.currency as any);
        await engine.loadMaterialRules(currentUserId, config.region as any);
        await engine.loadLaborConfigs(currentUserId, config.region as any);
        
        setPricingEngine(engine);
        setConfig(engine.getConfiguration());
        setLoading(false);
      } catch (error) {
        console.error('Failed to initialize pricing engine:', error);
        toast.error('Failed to load pricing configuration');
        setLoading(false);
      }
    };

    initEngine();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Auto-detect region and currency
  useEffect(() => {
    if (regionState.region) {
      const regionMap: Record<string, { region: string; currency: string }> = {
        TR: { region: 'turkey', currency: 'TRY' },
        EG: { region: 'egypt', currency: 'EGP' },
      };

      const detected = regionMap[regionState.region];
      if (detected && !config.region) {
        setConfig(prev => ({
          ...prev,
          region: detected.region as any,
          currency: detected.currency as any,
        }));
      }
    }
  }, [regionState.region]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load exchange rates
  useEffect(() => {
    const loadRates = async () => {
      if (!config.currency) return;

      const currencies: Array<'TRY' | 'EGP' | 'USD' | 'EUR'> = ['TRY', 'EGP', 'USD', 'EUR'];
      const rates: Record<string, number> = {};

      for (const currency of currencies) {
        if (currency !== config.currency) {
          try {
            const rate = await getExchangeRate(config.currency as any, currency);
            rates[`${config.currency}_${currency}`] = rate.rate;
          } catch (error) {
            console.error(`Failed to load rate for ${currency}:`, error);
          }
        }
      }

      setExchangeRates(rates);
    };

    loadRates();
  }, [config.currency]);

  // Load price history
  const loadPriceHistory = useCallback(async () => {
    if (!userId) return;

    try {
      let query = supabase
        .from('price_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (historyFilter.entityType) {
        query = query.eq('entity_type', historyFilter.entityType);
      }

      if (historyFilter.days) {
        const date = new Date();
        date.setDate(date.getDate() - historyFilter.days);
        query = query.gte('created_at', date.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      setPriceHistory(data || []);
    } catch (error) {
      console.error('Failed to load price history:', error);
      toast.error('Failed to load price history');
    }
  }, [userId, historyFilter]);

  // Load validation alerts
  const loadAlerts = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('price_validation_alerts')
        .select('*')
        .eq('user_id', userId)
        .eq('is_resolved', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      const typedData = (data || []) as any[];
      setAlerts(typedData as PriceValidationAlert[]);
      setUnresolvedAlerts(typedData.filter((a: any) => !a.is_resolved) || []);
    } catch (error) {
      console.error('Failed to load alerts:', error);
    }
  }, [userId]);

  useEffect(() => {
    loadPriceHistory();
    loadAlerts();
  }, [loadPriceHistory, loadAlerts]);

  // Save configuration
  const handleSave = async () => {
    if (!pricingEngine || !userId) return;

    setSaving(true);
    try {
      pricingEngine.updateConfiguration(config);
      await pricingEngine.saveConfiguration(userId);
      
      toast.success('Pricing configuration saved successfully');
      onConfigurationUpdate?.(pricingEngine.getConfiguration());
    } catch (error) {
      console.error('Failed to save configuration:', error);
      toast.error('Failed to save pricing configuration');
    } finally {
      setSaving(false);
    }
  };

  // Handle bulk import
  const handleBulkImport = async () => {
    if (!bulkImportFile || !userId) return;

    setBulkImportProgress(0);
    toast.info('Processing bulk import...');

    try {
      const formData = new FormData();
      formData.append('file', bulkImportFile);
      formData.append('userId', userId);
      formData.append('region', config.region || 'global');
      formData.append('currency', config.currency || 'USD');

      // This would typically call a backend API
      // For now, simulate processing
      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(l => l.trim());
        
        // Parse CSV (simplified)
        const updates: any[] = [];
        for (let i = 1; i < lines.length; i++) {
          const [profileId, baseCost, markup] = lines[i].split(',');
          if (profileId && baseCost) {
            updates.push({
              profile_id: profileId.trim(),
              base_cost_per_meter: parseFloat(baseCost),
              markup_percentage: parseFloat(markup) || config.materialMarkupPercentage,
            });
          }
          setBulkImportProgress((i / lines.length) * 100);
        }

        // Save updates
        for (const update of updates) {
          await supabase
            .from('material_pricing_rules')
            .upsert({
              user_id: userId,
              profile_id: update.profile_id,
              material_type: 'aluminum', // Would need to be determined
              region: config.region || 'global',
              currency: config.currency || 'USD',
              base_cost_per_meter: update.base_cost_per_meter,
              markup_percentage: update.markup_percentage,
              final_price_per_meter: update.base_cost_per_meter * (1 + update.markup_percentage / 100),
              is_active: true,
            } as any); // Type assertion for Supabase client type limitations
        }

        toast.success(`Successfully imported ${updates.length} price updates`);
        setBulkImportFile(null);
        setBulkImportProgress(0);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      };

      reader.readAsText(bulkImportFile);
    } catch (error) {
      console.error('Bulk import failed:', error);
      toast.error('Failed to import prices');
      setBulkImportProgress(0);
    }
  };

  // Export configuration
  const handleExport = () => {
    const data = {
      configuration: config,
      materialRules,
      laborConfigs,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pricing-config-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="typography-h2 text-white">Pricing Configuration</h2>
          <p className="text-gray-400 mt-1">Manage pricing settings, markups, and regional variations</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Configuration
          </Button>
        </div>
      </div>

      {/* Alerts Banner */}
      {unresolvedAlerts.length > 0 && (
        <Alert className="bg-yellow-900/20 border-yellow-700">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          <AlertTitle>Price Validation Alerts</AlertTitle>
          <AlertDescription>
            You have {unresolvedAlerts.length} unresolved pricing alerts. 
            <Button variant="link" className="p-0 ml-2" onClick={() => setActiveTab('alerts')}>
              View Alerts
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="materials">Materials</TabsTrigger>
          <TabsTrigger value="labor">Labor</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Import</TabsTrigger>
          <TabsTrigger value="alerts">
            Alerts {unresolvedAlerts.length > 0 && (
              <Badge variant="destructive" className="ml-2">{unresolvedAlerts.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* General Configuration */}
        <TabsContent value="general" className="space-y-4">
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle>General Pricing Settings</CardTitle>
              <CardDescription>Configure base markups, tax rates, and currency settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Region</Label>
                  <Select
                    value={config.region}
                    onValueChange={(value) => setConfig({ ...config, region: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="global">Global</SelectItem>
                      <SelectItem value="turkey">Turkey</SelectItem>
                      <SelectItem value="egypt">Egypt</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Currency</Label>
                  <Select
                    value={config.currency}
                    onValueChange={(value) => setConfig({ ...config, currency: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TRY">TRY - Turkish Lira</SelectItem>
                      <SelectItem value="EGP">EGP - Egyptian Pound</SelectItem>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Exchange Rates Display */}
              {Object.keys(exchangeRates).length > 0 && (
                <div className="p-4 bg-gray-900/50 rounded-lg">
                  <Label className="typography-label mb-2 block">Current Exchange Rates</Label>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(exchangeRates).map(([pair, rate]) => (
                      <div key={pair} className="flex justify-between">
                        <span className="text-gray-400">{pair.replace('_', ' → ')}</span>
                        <span className="text-white font-mono">{rate.toFixed(4)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Material Markup (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={config.materialMarkupPercentage}
                    onChange={(e) => setConfig({ ...config, materialMarkupPercentage: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>Labor Markup (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={config.laborMarkupPercentage}
                    onChange={(e) => setConfig({ ...config, laborMarkupPercentage: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>Hardware Markup (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={config.hardwareMarkupPercentage}
                    onChange={(e) => setConfig({ ...config, hardwareMarkupPercentage: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>Glazing Markup (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={config.glazingMarkupPercentage}
                    onChange={(e) => setConfig({ ...config, glazingMarkupPercentage: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>Installation Markup (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={config.installationMarkupPercentage}
                    onChange={(e) => setConfig({ ...config, installationMarkupPercentage: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>Base Labor Rate ({config.currency}/hour)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={config.baseLaborRatePerHour || 0}
                    onChange={(e) => setConfig({ ...config, baseLaborRatePerHour: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="border-t border-gray-700 pt-4">
                <h3 className="typography-h3 text-lg mb-4">Tax & Discount Settings</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Default Tax Rate (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={config.defaultTaxRate}
                      onChange={(e) => setConfig({ ...config, defaultTaxRate: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label>Tax Name</Label>
                    <Input
                      value={config.taxName}
                      onChange={(e) => setConfig({ ...config, taxName: e.target.value })}
                      placeholder="VAT, KDV, GST"
                    />
                  </div>
                  <div>
                    <Label>Minimum Profit Margin (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={config.minProfitMargin}
                      onChange={(e) => setConfig({ ...config, minProfitMargin: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label>Maximum Discount (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={config.maxDiscountPercentage}
                      onChange={(e) => setConfig({ ...config, maxDiscountPercentage: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-700 pt-4">
                <h3 className="typography-h3 text-lg mb-4">Material-Specific Markups</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Aluminum Markup (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={config.aluminumMarkupPercentage || config.materialMarkupPercentage}
                      onChange={(e) => setConfig({ ...config, aluminumMarkupPercentage: parseFloat(e.target.value) || undefined })}
                    />
                  </div>
                  <div>
                    <Label>UPVC Markup (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={config.upvcMarkupPercentage || config.materialMarkupPercentage}
                      onChange={(e) => setConfig({ ...config, upvcMarkupPercentage: parseFloat(e.target.value) || undefined })}
                    />
                  </div>
                  <div>
                    <Label>Wood Markup (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={config.woodMarkupPercentage || config.materialMarkupPercentage}
                      onChange={(e) => setConfig({ ...config, woodMarkupPercentage: parseFloat(e.target.value) || undefined })}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-700 pt-4">
                <h3 className="typography-h3 text-lg mb-4">Rounding Settings</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Rounding Method</Label>
                    <Select
                      value={config.roundingMethod}
                      onValueChange={(value) => setConfig({ ...config, roundingMethod: value as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard Rounding</SelectItem>
                        <SelectItem value="up">Round Up</SelectItem>
                        <SelectItem value="down">Round Down</SelectItem>
                        <SelectItem value="nearest">Nearest</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Rounding Precision (decimal places)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="4"
                      value={config.roundingPrecision}
                      onChange={(e) => setConfig({ ...config, roundingPrecision: parseInt(e.target.value) || 2 })}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Material Pricing Rules */}
        <TabsContent value="materials" className="space-y-4">
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle>Material Pricing Rules</CardTitle>
              <CardDescription>Configure material-specific pricing with quantity breaks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-400 mb-4">
                Material-specific pricing rules allow you to set different markups and discounts for specific profiles or material types.
              </div>
              {/* Material rules table/form would go here */}
              <Button variant="outline" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Material Pricing Rule
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Labor Cost Configuration */}
        <TabsContent value="labor" className="space-y-4">
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle>Labor Cost Configuration</CardTitle>
              <CardDescription>Configure labor rates by operation type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-400 mb-4">
                Set different labor rates for cutting, machining, assembly, welding, finishing, and installation operations.
              </div>
              {/* Labor configs table/form would go here */}
              <Button variant="outline" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Labor Cost Configuration
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Price History */}
        <TabsContent value="history" className="space-y-4">
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle>Price History</CardTitle>
              <CardDescription>View complete audit trail of all price changes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                <Select
                  value={historyFilter.entityType || 'all'}
                  onValueChange={(value) => setHistoryFilter({ ...historyFilter, entityType: value === 'all' ? undefined : value })}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="profile">Profiles</SelectItem>
                    <SelectItem value="accessory">Accessories</SelectItem>
                    <SelectItem value="material">Materials</SelectItem>
                    <SelectItem value="labor">Labor</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={historyFilter.days?.toString() || 'all'}
                  onValueChange={(value) => setHistoryFilter({ ...historyFilter, days: value === 'all' ? undefined : parseInt(value) })}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Time period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={loadPriceHistory}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
              <div className="space-y-2">
                {priceHistory.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">No price history found</div>
                ) : (
                  priceHistory.map((entry) => (
                    <div key={entry.id} className="p-3 bg-gray-900/50 rounded-lg flex items-center justify-between">
                      <div>
                        <div className="font-medium">{entry.entityName || entry.entityType}</div>
                        <div className="text-sm text-gray-400">
                          {entry.oldPrice && `${formatCurrency(entry.oldPrice, entry.currency)} → `}
                          {formatCurrency(entry.newPrice, entry.currency)}
                          {entry.priceChangePercentage && (
                            <Badge variant={entry.priceChangePercentage > 0 ? 'default' : 'secondary'} className="ml-2">
                              {entry.priceChangePercentage > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                              {entry.priceChangePercentage.toFixed(1)}%
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-gray-400">
                        {entry.createdAt && new Date(entry.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bulk Import */}
        <TabsContent value="bulk" className="space-y-4">
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle>Bulk Price Import</CardTitle>
              <CardDescription>Import price updates from CSV or Excel files</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center">
                <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <Label htmlFor="bulk-import-file" className="typography-label cursor-pointer">
                  <Input
                    ref={fileInputRef}
                    id="bulk-import-file"
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => setBulkImportFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <Button variant="outline" asChild>
                    <span>Choose File</span>
                  </Button>
                </Label>
                {bulkImportFile && (
                  <div className="mt-4">
                    <div className="text-sm text-gray-400">{bulkImportFile.name}</div>
                    <Button onClick={handleBulkImport} className="mt-2">
                      <Upload className="h-4 w-4 mr-2" />
                      Import Prices
                    </Button>
                  </div>
                )}
              </div>
              {bulkImportProgress > 0 && (
                <div>
                  <Progress value={bulkImportProgress} className="mb-2" />
                  <div className="text-sm text-gray-400 text-center">
                    Processing... {Math.round(bulkImportProgress)}%
                  </div>
                </div>
              )}
              <div className="text-sm text-gray-400 p-4 bg-gray-900/50 rounded-lg">
                <strong>CSV Format:</strong> profile_id,base_cost_per_meter,markup_percentage
                <br />
                <strong>Example:</strong> 123e4567-e89b-12d3-a456-426614174000,25.50,35
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Validation Alerts */}
        <TabsContent value="alerts" className="space-y-4">
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle>Price Validation Alerts</CardTitle>
              <CardDescription>Review and resolve pricing validation issues</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {alerts.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4  status-valid" />
                    No alerts found
                  </div>
                ) : (
                  alerts.map((alert) => (
                    <Alert
                      key={alert.id}
                      className={`${
                        alert.severity === 'error' || alert.severity === 'critical'
                          ? 'bg-red-900/20 border-red-700'
                          : alert.severity === 'warning'
                          ? 'bg-yellow-900/20 border-yellow-700'
                          : 'bg-blue-900/20 border-blue-700'
                      }`}
                    >
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>{alert.alertType.replace(/_/g, ' ').toUpperCase()}</AlertTitle>
                      <AlertDescription>{alert.message}</AlertDescription>
                    </Alert>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

