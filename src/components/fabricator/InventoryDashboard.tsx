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

import { PricingTuningStudio } from '@/components/fabricator/PricingTuningStudio';
import { PurchaseWizard } from '@/components/fabricator/PurchaseWizard';
import { Rock60PricingSetup } from '@/components/fabricator/Rock60PricingSetup';
import { VirtualizedInventoryList } from '@/components/fabricator/VirtualizedInventoryList';
import { useFabricatorWorkspace } from '@/context/FabricatorWorkspaceContext';
import { JUMBO100_WINDOW_SYSTEM_SPEC, ROCK60_WINDOW_SYSTEM_TEMPLATE, SYSTEM_PACKS } from '@/data/systemPacks';
import { remnantManager, type Remnant, type RemnantConsolidationSuggestion, type RemnantStatistics } from '@/lib/inventory/RemnantManager';
import { syncStockFromMovements } from '@/lib/inventory/StockCalculator';
import { trackError } from '@/lib/performance-monitoring';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/ui/alert';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/ui/ui/collapsible';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import { Progress } from '@/shared/ui/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import { Switch } from '@/shared/ui/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import { Profile, WindowUnit } from '@/types/fabricator';
import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  Box,
  Calendar,
  CheckCircle,
  ChevronDown,
  DollarSign,
  Download,
  FileText,
  History,
  Info,
  MapPin,
  Package,
  QrCode,
  RefreshCw,
  Search,
  ShoppingCart,
  TrendingUp,
  Warehouse,
  X,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

// System-pack specific paint color options (can be expanded per catalog)
const PACK_COLOR_OPTIONS: Record<
  string,
  { value: string; label: string; swatch: string }[]
> = {
  rock60: [
    { value: 'RAL 9016', label: 'RAL 9016 – White', swatch: '#FFFFFF' },
    { value: 'RAL 9005', label: 'RAL 9005 – Black', swatch: '#000000' },
    { value: 'RAL 7016', label: 'RAL 7016 – Anthracite Grey', swatch: '#383E42' },
    { value: 'RAL 9006', label: 'RAL 9006 – Silver', swatch: '#A5A5A5' },
  ],
  jumbo100: [
    { value: 'JUMBO-WHITE', label: 'JUMBO – White', swatch: '#FFFFFF' },
    { value: 'JUMBO-BLACK', label: 'JUMBO – Black', swatch: '#000000' },
    { value: 'JUMBO-BRONZE', label: 'JUMBO – Bronze', swatch: '#8B4513' },
    { value: 'JUMBO-SILVER', label: 'JUMBO – Silver', swatch: '#A5A5A5' },
  ],
  default: [
    { value: 'RAL 9016', label: 'RAL 9016 – White', swatch: '#FFFFFF' },
    { value: 'RAL 9005', label: 'RAL 9005 – Black', swatch: '#000000' },
    { value: 'RAL 7016', label: 'RAL 7016 – Anthracite Grey', swatch: '#383E42' },
    { value: 'RAL 8017', label: 'RAL 8017 – Chocolate Brown', swatch: '#4B3621' },
    { value: 'RAL 9006', label: 'RAL 9006 – Silver', swatch: '#A5A5A5' },
  ],
};

// Try to derive weight per meter directly from known system packs
const getPackWeightPerMeter = (profile: Profile | null, role: string): number | undefined => {
  if (!profile) return undefined;
  const specs: any = profile.specifications || {};
  const systemLabel: string =
    (specs.window_system as string | undefined) ||
    (profile.systemBrand as string | undefined) ||
    '';

  if (!systemLabel) return undefined;

  const system = systemLabel.toLowerCase();
  const roleLower = (role || specs.profileRole || '').toString().toLowerCase();

  // ROCK 60 – use canonical 45° config weights
  if (system.includes('rock 60') || system.includes('rock60')) {
    const cfg: any = ROCK60_WINDOW_SYSTEM_TEMPLATE.rock60_45_degree_config;
    if (!cfg) return undefined;

    if (roleLower.includes('frame') && cfg.frame_profiles?.main_frame?.weight_kg_m) {
      return cfg.frame_profiles.main_frame.weight_kg_m;
    }
    if (roleLower.includes('sash') && cfg.sash_profiles?.main_sash?.weight_kg_m) {
      return cfg.sash_profiles.main_sash.weight_kg_m;
    }
    if (
      (roleLower.includes('bead') || roleLower.includes('glazing')) &&
      cfg.glazing_beads?.bead_profile?.weight_kg_m
    ) {
      return cfg.glazing_beads.bead_profile.weight_kg_m;
    }
  }

  // JUMBO 100 – look up by profile code in aluminum/small profiles
  if (system.includes('jumbo100') || system.includes('jumbo 100') || system.includes('jumbo')) {
    const jumbo: any = JUMBO100_WINDOW_SYSTEM_SPEC;
    const allProfiles: any[] = [
      ...(jumbo.aluminum_profiles || []),
      ...(jumbo.small_profiles || []),
    ];

    const codeCandidates = [
      specs.supplierCode,
      specs.internalCode,
      profile.name,
    ]
      .filter(Boolean)
      .map((v: any) => v.toString().toLowerCase());

    const match = allProfiles.find((p) => {
      const pn = p.profile_number?.toString().toLowerCase();
      const old = p.old_profile_number?.toString().toLowerCase();
      return codeCandidates.includes(pn) || (old && codeCandidates.includes(old));
    });

    if (match && typeof match.weight_kg_per_ml === 'number') {
      return match.weight_kg_per_ml as number; // catalog is already kg per meter
    }
  }

  return undefined;
};

interface InventoryDashboardProps {
  inventory: Profile[];
  project?: WindowUnit | null;
  userId?: string;
  /**
   * Optional view mode hint from higher-level pages (e.g. grid vs table).
   * Current dashboard ignores this for layout but it is kept for future
   * enterprise cockpit shells such as InventoryPage.
   */
  viewMode?: 'grid' | 'table';
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
  const { t } = useTranslation('fabricator');
  const { state: workspaceState, dispatch } = useFabricatorWorkspace();
  const searchQuery = workspaceState.globalSearchQuery || '';
  const [activeTab, setActiveTab] = useState('overview');
  const [remnants, setRemnants] = useState<Remnant[]>([]);
  const [remnantStats, setRemnantStats] = useState<RemnantStatistics | null>(null);
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [consolidationSuggestions, setConsolidationSuggestions] = useState<RemnantConsolidationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const isLoadingRef = useRef(false);
  const [useRemnantsFirst, setUseRemnantsFirst] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [filterMaterial, setFilterMaterial] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSystemPackId, setFilterSystemPackId] = useState<string>('all');
  const [invoiceProfileId, setInvoiceProfileId] = useState<string>('');
  const [invoiceQuantity, setInvoiceQuantity] = useState<number>(0);
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [invoiceSupplier, setInvoiceSupplier] = useState<string>('');
  const [isSavingInvoice, setIsSavingInvoice] = useState(false);
  const [invoiceUnit, setInvoiceUnit] = useState<'bar' | 'meter'>('bar');
  const [invoiceBarLengthM, setInvoiceBarLengthM] = useState<number | ''>('');
  const [invoiceIsPainted, setInvoiceIsPainted] = useState<boolean>(false);
  const [invoicePaintColor, setInvoicePaintColor] = useState<string>('');
  const [invoiceSystemPackFilter, setInvoiceSystemPackFilter] = useState<string>('all');
  const [invoiceRoleFilter, setInvoiceRoleFilter] = useState<string>('all');
  const [showPurchaseWizard, setShowPurchaseWizard] = useState(false);
  const [selectedRock60ProfileId, setSelectedRock60ProfileId] = useState<string | undefined>(undefined);
  const [isProfileInventoryOpen, setIsProfileInventoryOpen] = useState(true);
  const [showPricingStudio, setShowPricingStudio] = useState(false);
  const [pricingStudioSystemPackId, setPricingStudioSystemPackId] = useState<string | undefined>(undefined);
  const [pricingStudioProfileId, setPricingStudioProfileId] = useState<string | undefined>(undefined);

  const loadStockAlerts = useCallback(async () => {
    if (!userId) return;

    try {
      // Use untyped Supabase client here to avoid friction with generated types
      const db = supabase as any;

      // Check stock levels (this will create/update alerts)
      await db.rpc('check_stock_levels', { p_user_id: userId });

      // Fetch alerts
      const { data, error } = await (db
        .from('stock_alerts')
        .select(`
          *,
          fabricator_profiles (id, name)
        `) as any)
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
      const err = error instanceof Error ? error : new Error(String(error));
      trackError('InventoryDashboard', 'load_stock_alerts', err.message);
    }
  }, [userId]);

  const loadStockMovements = useCallback(async () => {
    if (!userId) return;

    try {
      const db = supabase as any;

      const { data, error } = await (db
        .from('stock_movements')
        .select(`
          *,
          fabricator_profiles (id, name)
        `) as any)
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
      const err = error instanceof Error ? error : new Error(String(error));
      trackError('InventoryDashboard', 'load_stock_movements', err.message);
    }
  }, [userId]);

  const loadLocations = useCallback(async () => {
    if (!userId) return;

    try {
      const db = supabase as any;

      const { data, error } = await (db
        .from('inventory_locations')
        .select('*') as any)
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
      const err = error instanceof Error ? error : new Error(String(error));
      trackError('InventoryDashboard', 'load_locations', err.message);
    }
  }, [userId]);

  const loadDashboardData = useCallback(async () => {
    if (!userId || isLoadingRef.current) return;

    isLoadingRef.current = true;
    setIsLoading(true);
    try {
      // Sync stock quantities from movements first (ensures stock_quantity is accurate)
      // This updates fabricator_profiles.stock_quantity based on actual stock_movements
      await syncStockFromMovements(userId);

      // Core remnant data (depends on selectedLocation)
      const [availableRemnants, stats, suggestions] = await Promise.all([
        remnantManager.getAvailableRemnants(userId, {
          locationId: selectedLocation !== 'all' ? selectedLocation : undefined,
        }),
        remnantManager.getRemnantStatistics(userId),
        remnantManager.getConsolidationSuggestions(userId),
      ]);

      setRemnants(availableRemnants);
      setRemnantStats(stats);
      setConsolidationSuggestions(suggestions);

      // Run stock‑related queries in parallel; they only depend on userId
      await Promise.all([loadStockAlerts(), loadStockMovements(), loadLocations()]);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      trackError('InventoryDashboard', 'load_dashboard_data', err.message);
      toast.error('Failed to load inventory data');
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  }, [userId, selectedLocation, loadStockAlerts, loadStockMovements, loadLocations]);

  // Load data on mount / when user or location changes
  useEffect(() => {
    if (userId) {
      loadDashboardData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, selectedLocation]);

  const handleInvoiceCsvImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Allow re‑uploading the same file
    event.target.value = '';

    if (!userId) {
      toast.error('You must be signed in to import invoices.');
      return;
    }

    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const text = String(e.target?.result || '');
        const lines = text
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter(Boolean);

        if (lines.length < 2) {
          toast.error('CSV appears to be empty.');
          return;
        }

        const headers = lines[0]
          .split(',')
          .map((h) => h.trim().toLowerCase());

        const idxProfileCode = headers.indexOf('profile_code');
        const idxQuantity = headers.indexOf('quantity');
        const idxUnit = headers.indexOf('unit');
        const idxBarLength = headers.indexOf('bar_length_m');
        const idxInvoiceNo = headers.indexOf('invoice_no');
        const idxSupplier = headers.indexOf('supplier');

        if (idxProfileCode === -1 || idxQuantity === -1 || idxUnit === -1) {
          toast.error(
            'CSV must include at least: profile_code, quantity, unit (optional: bar_length_m, invoice_no, supplier).',
          );
          return;
        }

        const rows = lines.slice(1);
        const inserts: any[] = [];
        const stockUpdates = new Map<string, number>();
        let skippedUnknownProfiles = 0;

        for (const row of rows) {
          const cols = row.split(',').map((c) => c.trim());
          if (!cols[idxProfileCode] || !cols[idxQuantity]) continue;

          const profileCode = cols[idxProfileCode];
          const quantity = Number(cols[idxQuantity]) || 0;
          if (quantity <= 0) continue;

          const unitRaw = (cols[idxUnit] || '').toLowerCase();
          const unit: 'bar' | 'meter' =
            unitRaw === 'm' || unitRaw === 'meter' || unitRaw === 'meters' ? 'meter' : 'bar';

          const barLengthM =
            idxBarLength >= 0 && cols[idxBarLength]
              ? Number(cols[idxBarLength]) || 0
              : undefined;

          const invoiceNo = idxInvoiceNo >= 0 ? cols[idxInvoiceNo] : '';
          const supplier = idxSupplier >= 0 ? cols[idxSupplier] : '';

          const profile = inventory.find((p) => {
            const spec: any = p.specifications || {};
            const candidateCodes = [
              spec.supplierCode,
              spec.internalCode,
              p.name,
              String(p.id),
            ]
              .filter(Boolean)
              .map((v) => String(v).toLowerCase());

            return candidateCodes.includes(profileCode.toLowerCase());
          });

          if (!profile) {
            skippedUnknownProfiles += 1;
            continue;
          }

          const effectiveUnit = unit === 'meter' ? 'meters' : 'pieces';
          const defaultBarLenM =
            typeof (profile.specifications as any)?.stockLengthMm === 'number'
              ? ((profile.specifications as any).stockLengthMm as number) / 1000
              : 6;

          const effectiveBarLenM = unit === 'meter' ? 0 : barLengthM || defaultBarLenM;
          const totalLengthM =
            unit === 'meter' ? quantity : quantity * (effectiveBarLenM > 0 ? effectiveBarLenM : 0);

          // Accumulate stock update
          const currentUpdate = stockUpdates.get(profile.id) || 0;
          stockUpdates.set(profile.id, currentUpdate + totalLengthM);

          const movementQuantity = unit === 'meter' ? totalLengthM : quantity;

          const metaParts: string[] = [];
          if (invoiceNo) metaParts.push(`Invoice ${invoiceNo}`);
          if (supplier) metaParts.push(supplier);
          metaParts.push(`[CSV import • code=${profileCode}]`);
          if (totalLengthM > 0) metaParts.push(`len=${totalLengthM.toFixed(2)}m`);

          const notes = metaParts.join(' – ');

          inserts.push({
            user_id: userId,
            profile_id: profile.id,
            movement_type: 'in', // 'in' is the correct type for stock intake/purchases
            quantity: movementQuantity,
            unit: effectiveUnit,
            notes,
          });
        }

        if (!inserts.length) {
          toast.error('No valid rows found in CSV.');
          return;
        }

        const db = supabase as any;
        const { error } = await (db.from('stock_movements') as any).insert(inserts as any);
        if (error) throw error;

        // Update profile stock quantities
        for (const [profileId, addedLength] of stockUpdates.entries()) {
          const profile = inventory.find((p) => p.id === profileId);
          if (profile) {
            await (db.from('fabricator_profiles') as any)
              .update({ 
                stock_quantity: (profile.stockQuantity || 0) + addedLength,
                updated_at: new Date().toISOString()
              } as any)
              .eq('id', profileId)
              .eq('user_id', userId);
          }
        }

        await Promise.all([loadStockMovements(), loadStockAlerts()]);

        toast.success(
          `Imported ${inserts.length} invoice row(s)${
            skippedUnknownProfiles ? ` (skipped ${skippedUnknownProfiles} unknown profile(s))` : ''
          }.`,
        );
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        trackError('InventoryDashboard', 'import_invoice_csv', error.message);
        toast.error('Failed to import invoice CSV.');
      }
    };

    reader.readAsText(file);
  };

  const handleInvoiceStockIntake = async () => {
    if (!userId || !invoiceProfileId || invoiceQuantity <= 0 || !invoiceSelectedProfile) return;

    try {
      setIsSavingInvoice(true);
      const lengthM = totalInvoiceLengthM;
      const effectiveUnit = invoiceUnit === 'meter' ? 'meters' : 'pieces';
      const movementQuantity = invoiceUnit === 'meter' ? lengthM : invoiceQuantity;

      const metaParts: string[] = [];
      if (invoiceNumber) metaParts.push(`Invoice ${invoiceNumber}`);
      if (invoiceSupplier) metaParts.push(invoiceSupplier);
      if (invoiceProfileCode) {
        metaParts.push(
          `[${invoiceProfileSystemPack} • ${invoiceProfileCode} • role=${invoiceProfileRole}]`,
        );
      }
      if (invoiceIsPainted) {
        metaParts.push('painted');
        if (invoicePaintColor) {
          metaParts.push(`color=${invoicePaintColor}`);
        }
      }
      if (lengthM > 0) metaParts.push(`len=${lengthM.toFixed(2)}m`);
      if (totalInvoiceWeightKg > 0) metaParts.push(`wt=${totalInvoiceWeightKg.toFixed(2)}kg`);

      const notes = metaParts.length ? metaParts.join(' – ') : null;

      const db = supabase as any;

      const { error } = await (db.from('stock_movements') as any).insert({
        user_id: userId,
        profile_id: invoiceProfileId,
        movement_type: 'in', // 'in' is the correct type for stock intake/purchases
        quantity: movementQuantity,
        unit: effectiveUnit,
        notes,
      } as any);

      if (error) throw error;

      // Update profile stock quantity
      const { error: updateError } = await (db.from('fabricator_profiles') as any)
        .update({ 
          stock_quantity: (invoiceSelectedProfile.stockQuantity || 0) + lengthM,
          updated_at: new Date().toISOString()
        } as any)
        .eq('id', invoiceProfileId)
        .eq('user_id', userId);

      if (updateError) throw updateError;

      toast.success('Stock updated from purchase invoice');

      // Reload movements and alerts to reflect new stock levels
      await Promise.all([loadStockMovements(), loadStockAlerts()]);

      setInvoiceProfileId('');
      setInvoiceQuantity(0);
      setInvoiceNumber('');
      setInvoiceSupplier('');
      setInvoiceBarLengthM('');
      setInvoiceUnit('bar');
      setInvoiceIsPainted(false);
      setInvoicePaintColor('');
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      trackError('InventoryDashboard', 'save_stock_intake', err.message);
      toast.error('Failed to record stock intake');
    } finally {
      setIsSavingInvoice(false);
    }
  };

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
        return 'text-amber-400 border-amber-500';
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
        return 'bg-amber-500/20';
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
    } catch {
      toast.error('Failed to generate barcode');
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    if (!userId) return;

    try {
      const db = supabase as any;

      const { error } = await (db
        .from('stock_alerts')
        .update({
          is_resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: userId,
        }) as any)
        .eq('id', alertId);

      if (error) throw error;

      toast.success('Alert resolved');
      await loadStockAlerts();
    } catch {
      toast.error('Failed to resolve alert');
    }
  };

  // Derive branded system-pack grouping for filters and summary
  const inventoryBrandTrees = useMemo(() => {
    return SYSTEM_PACKS.map((pack) => {
      const packId = pack.meta.id;
      const brand = pack.meta.brands[0] || pack.meta.name;
      const specSystem = (pack.windowSystemSpec as any)?.window_system as string | undefined;

      const profiles = inventory.filter((profile) => {
        const specs: any = profile.specifications || {};
        const systemLabel =
          (specs.window_system as string | undefined) ||
          (profile.systemBrand as string | undefined) ||
          '';

        if (!systemLabel) return false;
        const label = systemLabel.toLowerCase();
        const brandMatch = profile.systemBrand === brand;
        const specMatch =
          !!specSystem && systemLabel.toLowerCase().includes(specSystem.toLowerCase());

        return brandMatch || specMatch || label.includes(packId.toLowerCase());
      });

      const stockCount = profiles.reduce(
        (sum, p) => sum + (typeof p.stockQuantity === 'number' ? p.stockQuantity : 0),
        0,
      );
      const totalValue = profiles.reduce((sum, p) => {
        const qty = typeof p.stockQuantity === 'number' ? p.stockQuantity : 0;
        const cost = typeof p.costPerMeter === 'number' ? p.costPerMeter : 0;
        return sum + qty * cost;
      }, 0);

      return {
        systemPackId: packId,
        brand,
        displayName: pack.meta.name,
        profiles,
        stockCount,
        totalValue,
      };
    });
  }, [inventory]);

  // Filtered inventory
  const filteredInventory = useMemo(() => {
    return inventory.filter((profile) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const name = profile.name?.toLowerCase() || '';
        const supplier = profile.supplier?.toLowerCase() || '';
        const systemBrand = profile.systemBrand?.toLowerCase() || '';
        const material = profile.material?.toLowerCase() || '';
        const code = (profile.specifications as any)?.supplierCode?.toLowerCase() || 
                     (profile.specifications as any)?.internalCode?.toLowerCase() || '';
        const role = (profile.specifications as any)?.profileRole?.toLowerCase() || '';
        const profileNumber = ((profile.specifications as any)?.profileNumber || (profile.specifications as any)?.supplierCode || '').toLowerCase();
        
        if (!(
          name.includes(query) ||
          supplier.includes(query) ||
          systemBrand.includes(query) ||
          material.includes(query) ||
          code.includes(query) ||
          role.includes(query) ||
          profileNumber.includes(query)
        )) {
          return false;
        }
      }
      if (filterMaterial !== 'all' && profile.material !== filterMaterial) {
        return false;
      }
      if (filterSystemPackId !== 'all') {
        const specs: any = profile.specifications || {};
        const systemLabel =
          (specs.window_system as string | undefined) ||
          (profile.systemBrand as string | undefined) ||
          '';
        const label = systemLabel.toLowerCase();
        if (!label.includes(filterSystemPackId.toLowerCase())) {
          return false;
        }
      }
      return true;
    });
  }, [inventory, searchQuery, filterMaterial, filterSystemPackId]);

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
      if (filterSystemPackId !== 'all') {
        const specs: any = remnant.profile?.specifications || {};
        const systemLabel =
          (specs.window_system as string | undefined) ||
          (remnant.profile?.systemBrand as string | undefined) ||
          '';
        const label = systemLabel.toLowerCase();
        if (!label.includes(filterSystemPackId.toLowerCase())) {
          return false;
        }
      }
      return true;
    });
  }, [remnants, searchQuery, filterMaterial, filterStatus, filterSystemPackId]);

  // Project-specific/customer inventory view
  const projectProfiles = useMemo(() => {
    if (!project || !project.components || project.components.length === 0) {
      return [];
    }

    const ids = project.components.map((c) => c.profile.id);
    return inventory
      .filter((p) => ids.includes(p.id))
      .map((p) => ({
        profile: p,
        status: getStockStatus(p),
      }));
  }, [project, inventory]);

  // Derived metadata for the currently selected profile in the invoice form
  const invoiceSelectedProfile = useMemo(
    () => inventory.find((p) => p.id === invoiceProfileId) || null,
    [inventory, invoiceProfileId],
  );

  const invoiceProfileSystemPack =
    (invoiceSelectedProfile?.systemBrand as string | undefined) ||
    ((invoiceSelectedProfile?.specifications as any)?.window_system as string | undefined) ||
    'Standard';

  const invoiceProfileCode =
    ((invoiceSelectedProfile?.specifications as any)?.supplierCode as string | undefined) ||
    ((invoiceSelectedProfile?.specifications as any)?.internalCode as string | undefined) ||
    invoiceSelectedProfile?.name ||
    '';

  const invoiceProfileRole =
    ((invoiceSelectedProfile?.specifications as any)?.profileRole as string | undefined) ||
    'frame';

  const invoiceDefaultBarLengthM =
    typeof (invoiceSelectedProfile?.specifications as any)?.stockLengthMm === 'number'
      ? ((invoiceSelectedProfile?.specifications as any).stockLengthMm as number) / 1000
      : 6;

  const packWeightPerMeter = getPackWeightPerMeter(invoiceSelectedProfile, invoiceProfileRole);

  const invoiceWeightPerMeter =
    typeof invoiceSelectedProfile?.weightPerMeter === 'number'
      ? (invoiceSelectedProfile.weightPerMeter as number)
      : typeof (invoiceSelectedProfile?.specifications as any)?.weightPerMeterKg === 'number'
        ? ((invoiceSelectedProfile?.specifications as any).weightPerMeterKg as number)
        : typeof packWeightPerMeter === 'number'
          ? packWeightPerMeter
          : undefined;

  // Derive paint color options from the active system pack / brand
  const normalizedPackId = (() => {
    const label = invoiceProfileSystemPack.toLowerCase();
    if (label.includes('rock 60') || label.includes('rock60')) return 'rock60';
    if (label.includes('jumbo100') || label.includes('jumbo 100') || label.includes('jumbo')) {
      return 'jumbo100';
    }
    return 'default';
  })();

  const invoiceColorOptions = PACK_COLOR_OPTIONS[normalizedPackId] || PACK_COLOR_OPTIONS.default;

  const invoiceProfileOptions = useMemo(() => {
    return inventory.filter((p) => {
      const specs: any = p.specifications || {};
      const packLabel: string =
        (p.systemBrand as string | undefined) ||
        (specs.window_system as string | undefined) ||
        '';

      if (invoiceSystemPackFilter !== 'all') {
        const label = packLabel.toLowerCase();
        if (
          invoiceSystemPackFilter === 'rock60' &&
          !label.includes('rock 60') &&
          !label.includes('rock60')
        ) {
          return false;
        }
        if (
          invoiceSystemPackFilter === 'jumbo100' &&
          !label.includes('jumbo100') &&
          !label.includes('jumbo 100') &&
          !label.includes('jumbo')
        ) {
          return false;
        }
        if (
          invoiceSystemPackFilter === 'other' &&
          (label.includes('rock') || label.includes('jumbo'))
        ) {
          return false;
        }
      }

      if (invoiceRoleFilter !== 'all') {
        const role = (specs.profileRole as string | undefined) || '';
        if (!role.toLowerCase().includes(invoiceRoleFilter)) {
          return false;
        }
      }

      return true;
    });
  }, [inventory, invoiceSystemPackFilter, invoiceRoleFilter]);

  const effectiveInvoiceBarLengthM =
    invoiceUnit === 'meter'
      ? 0
      : typeof invoiceBarLengthM === 'number'
        ? invoiceBarLengthM
        : Number(invoiceBarLengthM) || invoiceDefaultBarLengthM;

  const totalInvoiceLengthM =
    !invoiceSelectedProfile || invoiceQuantity <= 0
      ? 0
      : invoiceUnit === 'meter'
        ? invoiceQuantity
        : invoiceQuantity * (effectiveInvoiceBarLengthM > 0 ? effectiveInvoiceBarLengthM : 0);

  const totalInvoiceWeightKg =
    invoiceWeightPerMeter && totalInvoiceLengthM > 0
      ? totalInvoiceLengthM * invoiceWeightPerMeter
      : 0;

  if (!inventory || inventory.length === 0) {
    return (
      <Card className="bg-gray-700/50 border-gray-600">
        <CardContent className="p-8 text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="typography-h3 text-lg mb-2">No Inventory Data Yet</h3>
          <p className="text-gray-400">
            Inventory is empty. Add or import profiles in the Profile Management section above to
            see stock levels and alerts here.
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
          <h2 className="typography-h2">{t('inventory_dashboard.title', 'Inventory Dashboard')}</h2>
          <p className="text-gray-400">{t('inventory_dashboard.description', 'Centralized inventory management with real-time analytics, remnant optimization, and stock level monitoring for Turkish & Egyptian markets.')}</p>
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
        <Alert className={`border-amber-500 ${stockAlerts.some(a => a.severity === 'critical') ? 'bg-red-500/10' : 'bg-amber-500/10'}`}>
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
                <p className="text-sm text-gray-400">{t('inventory_dashboard.low_stock', 'Low Stock')}</p>
                <p className="text-2xl font-bold text-amber-400">{lowStockCount}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-amber-400 opacity-50" />
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
                <p className="text-sm text-gray-400">{t('inventory_dashboard.total_value', 'Total Value')}</p>
                <p className="text-2xl font-bold text-amber-400">
                  ${totalValue.toFixed(2)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-amber-400 opacity-50" />
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
                  <p className="text-2xl font-bold text-amber-400">
                    {remnantStats.expiringSoon}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-amber-400 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">{t('inventory_dashboard.tabs.overview', 'Overview')}</TabsTrigger>
          <TabsTrigger value="remnants">{t('inventory_dashboard.tabs.remnants', 'Remnants')}</TabsTrigger>
          <TabsTrigger value="alerts">
            {t('inventory_dashboard.tabs.alerts', 'Alerts')}
            {stockAlerts.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {stockAlerts.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">{t('inventory_dashboard.tabs.history', 'History')}</TabsTrigger>
          <TabsTrigger value="analytics">{t('inventory_dashboard.tabs.analytics', 'Analytics')}</TabsTrigger>
          <TabsTrigger value="purchases">{t('inventory_dashboard.tabs.purchases', 'Purchases')}</TabsTrigger>
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
                    <Label className="typography-label text-base font-semibold">{t('inventory_dashboard.use_remnants_first', 'Remnant Optimization')}</Label>
                    <p className="text-sm text-gray-400">
                      {t('inventory_dashboard.use_remnants_desc', 'Prioritize matching and using available remnant stock before cutting new material')}
                    </p>
                  </div>
                </div>
                <div 
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold pointer-events-none select-none",
                    useRemnantsFirst 
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" 
                      : "bg-amber-500/10 text-amber-400/80 border-amber-500/30"
                  )}
                  aria-label={useRemnantsFirst ? "Remnant optimization enabled" : "Remnant optimization disabled"}
                >
                  {useRemnantsFirst ? (
                    <>
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Active
                    </>
                  ) : (
                    <>
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400/60" />
                      Inactive
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Main inventory list and filters */}
            <div className="lg:col-span-2 space-y-4 flex flex-col min-h-0">
              {/* Search and Filters */}
              <Card className="bg-gray-700/50 border-gray-600">
                <CardContent className="p-4 space-y-3">
                  <div className="flex flex-wrap gap-4">
                    <div className="flex-1 min-w-[200px]">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search profiles..."
                          value={searchQuery}
                          onChange={(e) => dispatch({ type: 'SET_GLOBAL_SEARCH', payload: e.target.value })}
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

                  {/* Brand / system-pack filter */}
                  <div className="flex flex-wrap gap-2 text-[11px]">
                    <span className="text-gray-400">Systems:</span>
                    <Button
                      type="button"
                      size="sm"
                      variant={filterSystemPackId === 'all' ? 'default' : 'outline'}
                      className="h-6 px-2"
                      onClick={() => setFilterSystemPackId('all')}
                    >
                      All
                    </Button>
                    {inventoryBrandTrees.map((tree) =>
                      tree.profiles.length > 0 ? (
                        <Button
                          key={tree.systemPackId}
                          type="button"
                          size="sm"
                          variant={filterSystemPackId === tree.systemPackId ? 'default' : 'outline'}
                          className="h-6 px-2"
                          onClick={() => setFilterSystemPackId(tree.systemPackId)}
                        >
                          {tree.displayName}
                          <span className="ml-1 text-[10px] text-gray-300">
                            {tree.profiles.length}
                          </span>
                        </Button>
                      ) : null,
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Inventory List */}
              <Collapsible open={isProfileInventoryOpen} onOpenChange={setIsProfileInventoryOpen}>
                <Card className="bg-gray-700/50 border-gray-600 flex flex-col flex-1 min-h-0">
                  <CollapsibleTrigger asChild>
                    <CardHeader className="flex-shrink-0 cursor-pointer hover:bg-gray-800/70 transition-colors">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <Package className="h-5 w-5 text-amber-400" />
                          Profile Inventory
                        </CardTitle>
                        <ChevronDown 
                          className={cn(
                            "h-4 w-4 text-gray-400 transition-transform duration-200",
                            isProfileInventoryOpen && "rotate-180"
                          )} 
                        />
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="flex-1 flex flex-col min-h-0 overflow-hidden">
                      {/* ✅ PERFORMANCE: Virtualized list for large inventory lists */}
                      <VirtualizedInventoryList
                        profiles={filteredInventory}
                        containerHeight={1400}
                        itemHeight={180}
                        renderProfile={(profile, _index) => {
                          const status = getStockStatus(profile);
                          const stockPercentage = profile.minStockLevel
                            ? Math.min((profile.stockQuantity / (profile.minStockLevel * 2)) * 100, 100)
                            : 0;

                          return (
                            <div
                              className={`p-4 rounded-lg border mb-4 ${getStatusColor(status)} ${getStatusBgColor(status)}`}
                            >
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <h4 className="typography-h4">{profile.name}</h4>
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
                                  <span>Stock: {profile.stockQuantity > 0 ? `${profile.stockQuantity.toFixed(2)}m` : '0m'} {profile.stockQuantity > 0 && '(from purchases)'}</span>
                                  <span>Min Level: {profile.minStockLevel || 0}m</span>
                                </div>
                                <Progress value={stockPercentage} className="h-2" />
                                <div className="flex justify-between text-sm text-gray-400">
                                  <span>Cost: ${profile.costPerMeter}/m</span>
                                  <span>Supplier: {profile.supplier || 'N/A'}</span>
                                </div>
                                {((profile.systemBrand && SYSTEM_PACKS.some(p => p.meta.name === profile.systemBrand)) ||
                                  (profile.specifications && (profile.specifications as any).window_system) ||
                                  (profile.specifications && (profile.specifications as any).systemPackId)) && (
                                  <div className="mt-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="w-full text-xs h-7"
                                      onClick={() => {
                                        setSelectedRock60ProfileId(profile.id);
                                        // Scroll to pricing panel after a short delay to allow state update
                                        setTimeout(() => {
                                          const pricingPanel = document.querySelector('[data-pricing-panel]');
                                          if (pricingPanel) {
                                            pricingPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                                            // Highlight the panel briefly
                                            pricingPanel.classList.add('ring-2', 'ring-amber-500', 'ring-offset-2');
                                            setTimeout(() => {
                                              pricingPanel.classList.remove('ring-2', 'ring-amber-500', 'ring-offset-2');
                                            }, 2000);
                                          }
                                        }, 100);
                                      }}
                                    >
                                      <DollarSign className="h-3 w-3 mr-1" />
                                      Edit System Pricing
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        }}
                      />
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            </div>

            {/* Customer / project inventory & ROCK 60 pricing side panel */}
            <div className="space-y-4">
              <Card className="bg-gray-700/50 border-gray-600">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Warehouse className="h-4 w-4 text-blue-400" />
                    Customer Inventory
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  {!project ? (
                    <p className="text-gray-400">
                      No active project selected. Customer inventory will appear here when a job is
                      loaded.
                    </p>
                  ) : projectProfiles.length === 0 ? (
                    <p className="text-gray-400">
                      Project has no linked profiles yet. Once components are defined, their stock
                      status will be shown here.
                    </p>
                  ) : (
                    <>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-400">Customer</span>
                        <Badge variant="outline" className="text-[10px] max-w-[140px] truncate">
                          {project.customer || 'Unnamed customer'}
                        </Badge>
                      </div>
                      <div className="space-y-2 max-h-72 overflow-y-auto">
                        {projectProfiles.map(({ profile, status }) => (
                          <div
                            key={profile.id}
                            className="flex justify-between items-center gap-2 border-b border-gray-700 pb-1 last:border-b-0"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="truncate">{profile.name}</p>
                              <p className="text-[10px] text-gray-400">
                                Stock {profile.stockQuantity}m • Min {profile.minStockLevel}m
                              </p>
                            </div>
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${getStatusColor(status)}`}
                            >
                              {status === 'out_of_stock'
                                ? 'Out'
                                : status === 'low'
                                ? 'Low'
                                : status === 'high'
                                ? 'OK'
                                : '—'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* System pricing setup (per-element) */}
              <div data-pricing-panel>
                <Rock60PricingSetup 
                  profiles={inventory} 
                  userId={userId || ''}
                  selectedProfileId={selectedRock60ProfileId}
                  onProfileChange={setSelectedRock60ProfileId}
                  onOpenStudio={(systemPackId, profileId) => {
                    setPricingStudioSystemPackId(systemPackId);
                    setPricingStudioProfileId(profileId);
                    setShowPricingStudio(true);
                  }}
                />
              </div>
            </div>
          </div>
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
                            <h4 className="typography-h4">
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

        {/* Purchases / Stock Intake Tab */}
        <TabsContent value="purchases" className="space-y-4">
          <Card className="bg-gray-700/50 border-gray-600">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm md:text-base">
                <FileText className="h-4 w-4 text-amber-400" />
                Stock Intake by Invoice
              </CardTitle>
              <CardDescription className="text-xs text-gray-400">
                Record purchase invoices and update stock levels for profiles. This feeds warehouse
                inventory and stock alerts before cutting.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-end mb-2">
                <Button
                  onClick={() => setShowPurchaseWizard(true)}
                  className="bg-gradient-to-r from-amber-500 to-pink-600 hover:from-amber-600 hover:to-pink-700 text-white border-none shadow-lg shadow-amber-500/20"
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Open Purchase Wizard
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-2 space-y-2">
                  <Label className="typography-label text-xs">Profile / Series / Pack</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="typography-label text-[10px] text-gray-400">Series / Pack</Label>
                      <Select
                        value={invoiceSystemPackFilter}
                        onValueChange={setInvoiceSystemPackFilter}
                      >
                        <SelectTrigger className="h-7 text-[11px] bg-gray-800 border-gray-700">
                          <SelectValue placeholder="All packs" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-900 border-gray-700 text-xs">
                          <SelectItem value="all">All packs</SelectItem>
                          <SelectItem value="rock60">ROCK 60</SelectItem>
                          <SelectItem value="jumbo100">JUMBO 100</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="typography-label text-[10px] text-gray-400">Role</Label>
                      <Select
                        value={invoiceRoleFilter}
                        onValueChange={setInvoiceRoleFilter}
                      >
                        <SelectTrigger className="h-7 text-[11px] bg-gray-800 border-gray-700">
                          <SelectValue placeholder="All roles" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-900 border-gray-700 text-xs">
                          <SelectItem value="all">All roles</SelectItem>
                          <SelectItem value="frame">Frame</SelectItem>
                          <SelectItem value="sash">Sash</SelectItem>
                          <SelectItem value="bead">Glazing bead</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Select
                    value={invoiceProfileId}
                    onValueChange={(v) => {
                      setInvoiceProfileId(v);
                      setInvoiceBarLengthM('');
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs bg-gray-800 border-gray-700 mt-1">
                      <SelectValue placeholder="Select profile by ID in chosen series" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700 text-xs max-h-72">
                      {invoiceProfileOptions.map((p) => {
                        const specs: any = p.specifications || {};
                        const packLabel: string =
                          (p.systemBrand as string | undefined) ||
                          (specs.window_system as string | undefined) ||
                          'Standard';
                        const roleLabel: string =
                          (specs.profileRole as string | undefined) || '—';
                        const codeLabel: string =
                          (specs.supplierCode as string | undefined) ||
                          (specs.internalCode as string | undefined) ||
                          p.name;

                        return (
                          <SelectItem key={p.id} value={p.id}>
                            <div className="flex flex-col gap-0.5">
                              <span className="font-medium text-gray-100">{p.name}</span>
                              <span className="text-[10px] text-gray-500">
                                {packLabel} • role {roleLabel} • code {codeLabel}
                              </span>
                              <span className="text-[10px] text-gray-500">
                                {p.material} • {p.width}mm • stock {p.stockQuantity}m
                              </span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
              {invoiceSelectedProfile && (
                <div className="mt-1 grid grid-cols-2 gap-2 text-[11px] text-gray-400">
                  <div>
                    <span className="text-gray-500">System / Pack:</span>{' '}
                    <span className="text-gray-200">{invoiceProfileSystemPack}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Profile item code:</span>{' '}
                    <span className="font-mono text-gray-200">{invoiceProfileCode}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Role:</span>{' '}
                    <span className="text-gray-200 capitalize">{invoiceProfileRole}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Default bar length:</span>{' '}
                    <span className="text-gray-200">
                      {invoiceDefaultBarLengthM.toFixed(2)} m
                    </span>
                  </div>
                  {invoiceWeightPerMeter && (
                    <div>
                      <span className="text-gray-500">Weight per meter:</span>{' '}
                      <span className="text-gray-200">
                        {invoiceWeightPerMeter.toFixed(3)} kg/m
                      </span>
                    </div>
                  )}
                </div>
              )}
                </div>
                <div className="space-y-1">
                  <Label className="typography-label text-xs">Quantity *</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min={0}
                      value={invoiceQuantity || ''}
                      onChange={(e) => setInvoiceQuantity(Number(e.target.value) || 0)}
                      className="h-8 text-xs bg-gray-800 border-gray-700 flex-1"
                    />
                    <Select
                      value={invoiceUnit}
                      onValueChange={(v) => setInvoiceUnit(v as 'bar' | 'meter')}
                    >
                      <SelectTrigger className="h-8 w-20 text-xs bg-gray-800 border-gray-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-gray-700 text-xs">
                        <SelectItem value="bar">Bars</SelectItem>
                        <SelectItem value="meter">Meters</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="typography-label text-xs">Bar length (m)</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    disabled={invoiceUnit === 'meter'}
                    value={invoiceUnit === 'meter' ? '' : invoiceBarLengthM}
                    onChange={(e) =>
                      setInvoiceBarLengthM(
                        e.target.value ? Number(e.target.value) || invoiceDefaultBarLengthM : '',
                      )
                    }
                    placeholder={invoiceDefaultBarLengthM.toFixed(2)}
                    className="h-8 text-xs bg-gray-800 border-gray-700"
                  />
                </div>
                <div>
                  <Label className="typography-label text-xs">Invoice No.</Label>
                  <Input
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="e.g. INV-2025-0012"
                    className="h-8 text-xs bg-gray-800 border-gray-700"
                  />
                </div>
                <div>
                  <Label className="typography-label text-xs">Supplier</Label>
                  <Input
                    value={invoiceSupplier}
                    onChange={(e) => setInvoiceSupplier(e.target.value)}
                    placeholder="e.g. ALSALAM, ELSHERIF"
                    className="h-8 text-xs bg-gray-800 border-gray-700"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="typography-label text-xs">Painted</Label>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={invoiceIsPainted}
                      onCheckedChange={(v) => setInvoiceIsPainted(!!v)}
                    />
                    <span className="text-[11px] text-gray-400">
                      {invoiceIsPainted ? 'Yes – specify color' : 'No (mill finish)'}
                    </span>
                  </div>
                  {invoiceIsPainted && (
                    <div className="mt-1">
                      <Label className="typography-label text-[11px]">Paint color</Label>
                      <Select
                        value={invoicePaintColor}
                        onValueChange={setInvoicePaintColor}
                      >
                        <SelectTrigger className="h-8 text-xs bg-gray-800 border-gray-700">
                          <SelectValue placeholder="Select color from pack" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-900 border-gray-700 text-xs">
                          {invoiceColorOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              <div className="flex items-center gap-2">
                                <span
                                  className="inline-block h-3 w-3 rounded-sm border border-gray-600"
                                  style={{ backgroundColor: opt.swatch }}
                                />
                                <span>{opt.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>

              {totalInvoiceLengthM > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 rounded-lg bg-gray-800/60 border border-gray-700 text-[11px] text-gray-300">
                  <div>
                    <span className="text-gray-400">Total length:</span>{' '}
                    <span className="font-semibold text-gray-100">
                      {totalInvoiceLengthM.toFixed(2)} m
                    </span>
                  </div>
                  {totalInvoiceWeightKg > 0 && (
                    <div>
                      <span className="text-gray-400">Estimated weight:</span>{' '}
                      <span className="font-semibold text-gray-100">
                        {totalInvoiceWeightKg.toFixed(2)} kg
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div className="text-[11px] text-gray-400 max-w-md">
                  Import full invoices from your purchasing system as CSV (columns:{' '}
                  <span className="font-mono text-gray-200">
                    profile_code, quantity, unit, bar_length_m, invoice_no, supplier
                  </span>
                  ).
                </div>
                <div className="flex items-center gap-2">
                  <Label className="typography-label text-[11px]">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-gray-600 text-xs"
                      asChild
                    >
                      <span>
                        <Download className="h-3 w-3 mr-1" />
                        Import CSV
                      </span>
                    </Button>
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      className="hidden"
                      onChange={handleInvoiceCsvImport}
                    />
                  </Label>
                  <Button
                    size="sm"
                    className="btn-primary"
                    disabled={
                      !userId ||
                      !invoiceProfileId ||
                      invoiceQuantity <= 0 ||
                      isSavingInvoice ||
                      !invoiceSelectedProfile
                    }
                    onClick={handleInvoiceStockIntake}
                  >
                    {isSavingInvoice ? 'Saving…' : 'Record Purchase & Update Stock'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-700/50 border-gray-600">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm md:text-base">
                <History className="h-4 w-4 text-blue-400" />
                Recent Stock Movements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-gray-300">
              {stockMovements.length === 0 && (
                <p className="text-gray-400">No stock movements recorded yet.</p>
              )}
              {stockMovements.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between border-b border-gray-600 pb-1 last:border-b-0"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{m.profileName}</div>
                    <div className="text-[10px] text-gray-400 truncate">
                      {m.movementType} • {m.quantity} {m.unit} •{' '}
                      {m.createdAt.toLocaleDateString()}
                    </div>
                    {m.notes && (
                      <div className="text-[10px] text-gray-500 truncate">Note: {m.notes}</div>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <Card className="bg-gray-700/50 border-gray-600">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
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
                          ? 'bg-amber-500/10 border-amber-500'
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
                  <BarChart3 className="h-5 w-5 text-amber-400" />
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
                      <p className="text-2xl font-bold text-amber-400">
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

      {userId && (
        <PurchaseWizard
          open={showPurchaseWizard}
          onOpenChange={setShowPurchaseWizard}
          userId={userId}
          onPurchaseComplete={async () => {
            // Refresh all dashboard data including alerts
            await loadDashboardData();
            // Explicitly reload alerts to ensure they're resolved
            await loadStockAlerts();
            setShowPurchaseWizard(false);
          }}
        />
      )}

      {userId && showPricingStudio && (
        <PricingTuningStudio
          systemPackId={pricingStudioSystemPackId}
          profileId={pricingStudioProfileId}
          userId={userId}
          profiles={inventory}
          onClose={(saved) => {
            setShowPricingStudio(false);
            setPricingStudioSystemPackId(undefined);
            setPricingStudioProfileId(undefined);
            if (saved) {
              // Refresh inventory if pricing was saved
              // The pricing update should trigger a refresh in parent component
            }
          }}
          onPricingUpdated={(systemPackId) => {
            // Optionally refresh data when pricing is updated
            console.log('Pricing updated for system pack:', systemPackId);
          }}
        />
      )}
    </div>
  );
};

