/**
 * Pricing Tuning Studio
 * ----------------------------------------------------------------------------
 * Gold-tier comprehensive pricing management workspace:
 * - Multi-system pack pricing configuration
 * - Material markups and pricing rules
 * - Labor & overhead configuration
 * - Price history & rollback
 * - Validation & quality checks
 * - Bulk operations & import/export
 * 
 * Follows Almona's proven studio pattern (inspired by ProfileTuningStudio)
 * Full-screen modal workspace for comprehensive pricing management
 * 
 * @since Pricing Tuning Studio - Gold Tier Enhancement
 */

import ErrorBoundary from '@/components/ErrorBoundary';
import { trackError } from '@/lib/performance-monitoring';
import { priceHistoryService, type PriceHistoryEntry } from '@/lib/pricing/PriceHistoryService';
import { priceValidationService, type ValidationResult } from '@/lib/pricing/PriceValidationService';
import { pricingImportExportService } from '@/lib/pricing/PricingImportExportService';
import { systemPricingService } from '@/lib/pricing/SystemPricingService';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/ui/dialog';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import { Progress } from '@/shared/ui/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/shared/ui/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import { Separator } from '@/shared/ui/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import type { Profile } from '@/types/fabricator';
import type {
  CustomMaterialRule,
  CustomerTierConfig,
  PricingImpactPreview,
  QuantityBreakRule,
  SeasonalAdjustmentRule,
  SystemPricingState,
} from '@/types/pricing';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Calculator,
  Calendar,
  CheckCircle,
  CheckCircle2,
  Copy,
  DollarSign,
  Download,
  FileDown,
  FileText,
  FileUp,
  History,
  Info,
  MapPin,
  Package,
  Percent,
  Plus,
  Settings,
  Shield,
  Tag,
  Trash2,
  TrendingDown,
  TrendingUp,
  Upload,
  Users,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Rock60PricingSetup } from './Rock60PricingSetup';
import { UnsavedChangesDialog } from './UnsavedChangesDialog';

// UI Dimensions (reuse from ProfileTuningStudio pattern)
const STUDIO_MAX_WIDTH = 'max-w-6xl';
const STUDIO_MAX_HEIGHT = 'max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)]';
const ICON_MEDIUM = 'h-4 w-4';
const ICON_LARGE = 'h-5 w-5';

interface PricingTuningStudioProps {
  systemPackId?: string; // Optional: pre-select system pack
  profileId?: string; // Optional: open with specific profile
  userId: string;
  profiles?: Profile[]; // Optional: profiles list (if not provided, will fetch)
  onClose: (saved: boolean) => void;
  onPricingUpdated?: (systemPackId: string) => void;
  mode?: 'workshop' | 'enterprise'; // Simplified vs full features
}

type PricingConfigurationStatus = 'configured' | 'required' | 'needs_review';

/**
 * Pricing Tuning Studio Component
 * Full-screen modal workspace for comprehensive pricing management
 */
const PricingTuningStudioComponent: React.FC<PricingTuningStudioProps> = ({
  systemPackId: initialSystemPackId,
  profileId: initialProfileId,
  userId,
  profiles: externalProfiles,
  onClose,
  onPricingUpdated,
  mode: _mode = 'enterprise',
}) => {
  const { t } = useTranslation('fabricator');

  // State management
  const [activeTab, setActiveTab] = useState<string>('system-packing');
  const [selectedSystemPackId, setSelectedSystemPackId] = useState<string | undefined>(
    initialSystemPackId
  );
  const [selectedProfileId, setSelectedProfileId] = useState<string | undefined>(
    initialProfileId
  );
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pricingState, setPricingState] = useState<SystemPricingState | null>(null);
  const [configurationStatus, setConfigurationStatus] = useState<PricingConfigurationStatus>('required');
  const [impactPreview, setImpactPreview] = useState<PricingImpactPreview | null>(null);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    warnings: Array<{ field: string; message: string }>;
    errors: Array<{ field: string; message: string }>;
  } | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState<PriceHistoryEntry | null>(null);
  const [showRollbackDialog, setShowRollbackDialog] = useState(false);
  const [comprehensiveValidation, setComprehensiveValidation] = useState<ValidationResult | null>(null);
  
  // Bulk operations state
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('replace');
  const [bulkPercentage, setBulkPercentage] = useState<string>('');
  const [copyFromSystemPack, setCopyFromSystemPack] = useState<string>('');
  const [showBulkConfirmDialog, setShowBulkConfirmDialog] = useState(false);
  const [bulkOperationType, setBulkOperationType] = useState<'percentage' | 'copy' | 'import' | null>(null);
  const [importResult, setImportResult] = useState<{ success: boolean; errors: string[]; warnings: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Pricing Rules state
  const [editingQuantityBreak, setEditingQuantityBreak] = useState<QuantityBreakRule | null>(null);
  const [showQuantityBreakDialog, setShowQuantityBreakDialog] = useState(false);
  const [editingCustomerTier, setEditingCustomerTier] = useState<CustomerTierConfig | null>(null);
  const [showCustomerTierDialog, setShowCustomerTierDialog] = useState(false);
  const [editingSeasonalAdjustment, setEditingSeasonalAdjustment] = useState<SeasonalAdjustmentRule | null>(null);
  const [showSeasonalAdjustmentDialog, setShowSeasonalAdjustmentDialog] = useState(false);
  
  // Material Markups state
  const [editingCustomRule, setEditingCustomRule] = useState<CustomMaterialRule | null>(null);
  const [showCustomRuleDialog, setShowCustomRuleDialog] = useState(false);

  // Load profiles if not provided
  const [profiles, setProfiles] = useState<Profile[]>(externalProfiles || []);
  const [loadingProfiles, setLoadingProfiles] = useState(!externalProfiles);

  useEffect(() => {
    if (!externalProfiles && userId) {
      const loadProfiles = async () => {
        try {
          setLoadingProfiles(true);
          const db = supabase as any;
          const { data, error } = await db
            .from('fabricator_profiles')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

          if (error) throw error;

          const loadedProfiles = (data || []).map((p: any) => ({
            ...p,
            stockQuantity: p.stock_quantity ? parseFloat(p.stock_quantity) : 0,
            minStockLevel: p.min_stock_level ? parseFloat(p.min_stock_level) : 0,
          })) as Profile[];

          setProfiles(loadedProfiles);
        } catch (error) {
          console.error('Error loading profiles:', error);
          trackError('PricingTuningStudio', 'loadProfiles', error instanceof Error ? error.message : String(error));
        } finally {
          setLoadingProfiles(false);
        }
      };

      loadProfiles();
    }
  }, [externalProfiles, userId]);

  // Get system packs from profiles (grouped by system name)
  const systemPacks = useMemo(() => {
    const packs = new Set<string>();
    profiles.forEach((profile) => {
      const specs = profile.specifications as any;
      const systemName =
        specs?.window_system || profile.systemBrand || specs?.systemPackId;
      if (systemName) {
        packs.add(systemName);
      }
    });
    return Array.from(packs).sort();
  }, [profiles]);

  // Get profiles for selected system pack
  const systemPackProfiles = useMemo(() => {
    if (!selectedSystemPackId) return [];
    return profiles.filter((profile) => {
      const specs = profile.specifications as any;
      const systemName =
        specs?.window_system || profile.systemBrand || specs?.systemPackId;
      return systemName === selectedSystemPackId;
    });
  }, [profiles, selectedSystemPackId]);

  // Auto-select first system pack if none selected
  useEffect(() => {
    if (!selectedSystemPackId && systemPacks.length > 0) {
      setSelectedSystemPackId(systemPacks[0]);
    }
  }, [systemPacks, selectedSystemPackId]);

  // Auto-select first profile when system pack changes
  useEffect(() => {
    if (selectedSystemPackId && systemPackProfiles.length > 0 && !selectedProfileId) {
      setSelectedProfileId(systemPackProfiles[0].id);
    }
  }, [selectedSystemPackId, systemPackProfiles, selectedProfileId]);

  // Handle system pack selection change
  const handleSystemPackChange = useCallback((systemPackId: string) => {
    // If there are unsaved changes, warn user (simplified - in production would handle more gracefully)
    if (isDirty && !window.confirm('You have unsaved changes. Switch system pack anyway?')) {
      return; // User cancelled
    }
    setSelectedSystemPackId(systemPackId);
    setSelectedProfileId(undefined); // Reset profile selection
    setIsDirty(false); // Reset dirty state when switching system packs
  }, [isDirty]);

  // Load pricing state for selected profile
  useEffect(() => {
    const loadPricing = async () => {
      if (!selectedProfileId || !selectedSystemPackId) {
        setPricingState(null);
        setConfigurationStatus('required');
        return;
      }

      try {
        const pricing = await systemPricingService.getSystemPricing(
          selectedProfileId,
          selectedSystemPackId
        );

        if (pricing) {
          setPricingState(pricing);
          setConfigurationStatus(pricing.initialized ? 'configured' : 'required');
        } else {
          setPricingState(null);
          setConfigurationStatus('required');
        }

        // Load impact preview
        const impact = await systemPricingService.getPricingImpactPreview(
          selectedSystemPackId,
          selectedProfileId
        );
        setImpactPreview(impact);

        // Validate pricing using comprehensive validation service
        if (pricing) {
          const validationResult = priceValidationService.validatePricing(pricing);
          setComprehensiveValidation(validationResult);
          // Map to legacy format for backward compatibility with left panel
          setValidationResult({
            isValid: validationResult.isValid,
            warnings: validationResult.warnings.map((w) => ({
              field: w.entityId || w.entityType || 'unknown',
              message: w.message,
            })),
            errors: validationResult.errors.map((e) => ({
              field: e.entityId || e.entityType || 'unknown',
              message: e.message,
            })),
          });
          // Update configuration status based on validation
          if (!validationResult.isValid) {
            setConfigurationStatus('needs_review');
          } else if (validationResult.warnings.length > 0) {
            setConfigurationStatus('needs_review');
          }
        } else {
          setValidationResult(null);
          setComprehensiveValidation(null);
        }
      } catch (error) {
        console.error('Error loading pricing:', error);
        trackError('PricingTuningStudio', 'loadPricing', error instanceof Error ? error.message : String(error));
        setValidationResult(null);
      }
    };

    loadPricing();
  }, [selectedProfileId, selectedSystemPackId]);

  // Handle back button
  const handleBack = useCallback(() => {
    if (isDirty) {
      setShowUnsavedDialog(true);
    } else {
      onClose(false);
    }
  }, [isDirty, onClose]);

  // Load price history
  const loadPriceHistory = useCallback(async () => {
    if (!selectedProfileId || !selectedSystemPackId) {
      setPriceHistory([]);
      return;
    }

    try {
      setLoadingHistory(true);
      const history = await priceHistoryService.getPriceHistory({
        profileId: selectedProfileId,
        systemPackId: selectedSystemPackId,
        limit: 50, // Load last 50 entries
      });
      setPriceHistory(history);
    } catch (error) {
      console.error('Error loading price history:', error);
      trackError('PricingTuningStudio', 'loadHistory', error instanceof Error ? error.message : String(error));
    } finally {
      setLoadingHistory(false);
    }
  }, [selectedProfileId, selectedSystemPackId]);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!selectedProfileId || !pricingState) {
      toast.error('No pricing configuration to save');
      return;
    }

    try {
      setSaving(true);

      const db = supabase as any;
      const { data: profileData } = await db
        .from('fabricator_profiles')
        .select('specifications')
        .eq('id', selectedProfileId)
        .single();

      const specs = profileData?.specifications || {};
      const nextSpecs = {
        ...specs,
        system_pricing: {
          ...pricingState,
          initialized: true,
          systemName: selectedSystemPackId,
        },
      };

      const { error } = await db
        .from('fabricator_profiles')
        .update({ specifications: nextSpecs })
        .eq('id', selectedProfileId)
        .eq('user_id', userId);

      if (error) throw error;

      // Clear cache
      systemPricingService.clearCache(selectedProfileId, selectedSystemPackId);

      // Save to price history
      try {
        await priceHistoryService.savePriceHistory(
          selectedProfileId,
          selectedSystemPackId,
          userId,
          pricingState,
          'update',
          'Pricing updated via Pricing Tuning Studio'
        );
        
        // Refresh history
        if (selectedProfileId && selectedSystemPackId) {
          await loadPriceHistory();
        }
      } catch (historyError) {
        // Log but don't fail the save operation
        console.error('Error saving price history:', historyError);
        trackError('PricingTuningStudio', 'saveHistory', historyError instanceof Error ? historyError.message : String(historyError));
      }

      toast.success('Pricing configuration saved');
      setIsDirty(false);
      setConfigurationStatus('configured');
      onPricingUpdated?.(selectedSystemPackId || '');
    } catch (error) {
      console.error('Error saving pricing:', error);
      trackError('PricingTuningStudio', 'save', error instanceof Error ? error.message : String(error));
      toast.error('Failed to save pricing configuration');
    } finally {
      setSaving(false);
    }
  }, [selectedProfileId, pricingState, selectedSystemPackId, userId, onPricingUpdated, loadPriceHistory]);

  // Load history when profile/system pack changes
  useEffect(() => {
    loadPriceHistory();
  }, [loadPriceHistory]);

  // Keyboard shortcuts for accessibility (Ctrl+S to save, Esc to close)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+S or Cmd+S to save
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        if (!saving && pricingState) {
          void handleSave();
        }
      }
      // Esc to close
      if (event.key === 'Escape' && !showUnsavedDialog && !showRollbackDialog && !showBulkConfirmDialog) {
        if (isDirty) {
          setShowUnsavedDialog(true);
        } else {
          onClose(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [saving, pricingState, isDirty, showUnsavedDialog, showRollbackDialog, showBulkConfirmDialog, handleSave, onClose]);

  // Handle rollback
  const handleRollback = useCallback(async () => {
    if (!selectedHistoryEntry || !selectedProfileId || !selectedSystemPackId) {
      return;
    }

    try {
      setSaving(true);

      const db = supabase as any;
      const { data: profileData } = await db
        .from('fabricator_profiles')
        .select('specifications')
        .eq('id', selectedProfileId)
        .single();

      const specs = profileData?.specifications || {};
      const nextSpecs = {
        ...specs,
        system_pricing: {
          ...selectedHistoryEntry.pricingData,
          initialized: true,
          systemName: selectedSystemPackId,
        },
      };

      const { error } = await db
        .from('fabricator_profiles')
        .update({ specifications: nextSpecs })
        .eq('id', selectedProfileId)
        .eq('user_id', userId);

      if (error) throw error;

      // Clear cache
      systemPricingService.clearCache(selectedProfileId, selectedSystemPackId);

      // Save rollback to history
      await priceHistoryService.savePriceHistory(
        selectedProfileId,
        selectedSystemPackId,
        userId,
        selectedHistoryEntry.pricingData,
        'rollback',
        `Rolled back to version ${selectedHistoryEntry.versionNumber}`
      );

      // Reload pricing state and history
      const pricing = await systemPricingService.getSystemPricing(
        selectedProfileId,
        selectedSystemPackId
      );
      if (pricing) {
        setPricingState(pricing);
        setConfigurationStatus(pricing.initialized ? 'configured' : 'required');
      }
      await loadPriceHistory();

      setShowRollbackDialog(false);
      setSelectedHistoryEntry(null);
      toast.success(`Rolled back to version ${selectedHistoryEntry.versionNumber}`);
    } catch (error) {
      console.error('Error rolling back pricing:', error);
      trackError('PricingTuningStudio', 'rollback', error instanceof Error ? error.message : String(error));
      toast.error('Failed to rollback pricing');
    } finally {
      setSaving(false);
    }
  }, [selectedHistoryEntry, selectedProfileId, selectedSystemPackId, userId, loadPriceHistory]);

  // Bulk operations handlers
  const handleExportPricing = useCallback(() => {
    if (!pricingState || !selectedSystemPackId || !selectedProfileId) {
      toast.error('No pricing configuration to export');
      return;
    }

    try {
      pricingImportExportService.downloadPricing(
        pricingState,
        'json',
        `pricing-${selectedSystemPackId}-${Date.now()}.json`,
        {
          systemPackId: selectedSystemPackId,
          profileId: selectedProfileId,
          exportedAt: new Date().toISOString(),
        }
      );
      toast.success('Pricing configuration exported successfully');
    } catch (error) {
      console.error('Error exporting pricing:', error);
      trackError('PricingTuningStudio', 'exportPricing', error instanceof Error ? error.message : String(error));
      toast.error('Failed to export pricing configuration');
    }
  }, [pricingState, selectedSystemPackId, selectedProfileId]);

  const handleExportTemplate = useCallback(() => {
    try {
      pricingImportExportService.downloadTemplate('json');
      toast.success('Template downloaded successfully');
    } catch (error) {
      console.error('Error downloading template:', error);
      trackError('PricingTuningStudio', 'exportTemplate', error instanceof Error ? error.message : String(error));
      toast.error('Failed to download template');
    }
  }, []);

  const handleImportFile = useCallback((file: File) => {
    setImportFile(file);
    setImportProgress(0);
    setImportResult(null);
  }, []);

  const handleImportPricing = useCallback(async () => {
    if (!importFile || !selectedProfileId || !selectedSystemPackId) {
      toast.error('Please select a file to import');
      return;
    }

    try {
      setImportProgress(10);
      const result = await pricingImportExportService.importFromFile(importFile, importMode);
      setImportProgress(50);

      if (!result.success || !result.pricing) {
        setImportResult({
          success: false,
          errors: result.errors,
          warnings: result.warnings,
        });
        setImportProgress(0);
        toast.error(`Import failed: ${result.errors.join(', ')}`);
        return;
      }

      setImportProgress(70);

      // Merge or replace pricing
      const finalPricing = importMode === 'merge' && pricingState
        ? pricingImportExportService.mergePricing(pricingState, result.pricing, importMode)
        : result.pricing;

      setImportProgress(80);

      // Update pricing state
      setPricingState(finalPricing);
      setIsDirty(true);
      setImportProgress(100);

      // Show warnings if any
      if (result.warnings.length > 0) {
        toast.warning(`Import completed with warnings: ${result.warnings.slice(0, 2).join(', ')}`);
      } else {
        toast.success('Pricing configuration imported successfully');
      }

      setImportResult({
        success: true,
        errors: [],
        warnings: result.warnings,
      });

      // Reset after a delay
      setTimeout(() => {
        setImportFile(null);
        setImportProgress(0);
        setImportResult(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 2000);
    } catch (error) {
      console.error('Error importing pricing:', error);
      trackError('PricingTuningStudio', 'importPricing', error instanceof Error ? error.message : String(error));
      toast.error('Failed to import pricing configuration');
      setImportProgress(0);
      setImportResult({
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: [],
      });
    }
  }, [importFile, importMode, selectedProfileId, selectedSystemPackId, pricingState]);

  const handleBulkPercentageChange = useCallback(() => {
    if (!pricingState || !selectedSystemPackId || !selectedProfileId) {
      toast.error('No pricing configuration to update');
      return;
    }

    const percentage = parseFloat(bulkPercentage);
    if (isNaN(percentage) || percentage <= -100) {
      toast.error('Percentage must be greater than -100%');
      return;
    }

    setBulkOperationType('percentage');
    setShowBulkConfirmDialog(true);
  }, [bulkPercentage, pricingState, selectedSystemPackId, selectedProfileId]);

  const handleConfirmBulkPercentage = useCallback(async () => {
    if (!pricingState || !selectedSystemPackId || !selectedProfileId) {
      return;
    }

    const percentage = parseFloat(bulkPercentage);
    const multiplier = 1 + percentage / 100;

    try {
      setSaving(true);

      // Apply percentage to profile prices
      const updatedProfilePrices: Record<string, number> = {};
      Object.entries(pricingState.profilePrices || {}).forEach(([code, price]) => {
        updatedProfilePrices[code] = price * multiplier;
      });

      // Apply percentage to hardware prices
      const updatedHardware: Record<string, number> = {};
      Object.entries(pricingState.hardware || {}).forEach(([code, price]) => {
        updatedHardware[code] = price * multiplier;
      });

      // Apply percentage to gasket prices
      const updatedGaskets: Record<string, number> = {};
      Object.entries(pricingState.gaskets || {}).forEach(([code, price]) => {
        updatedGaskets[code] = price * multiplier;
      });

      // Apply percentage to glazing types
      const updatedGlazingTypes = (pricingState.glazingTypes || []).map((gt) => ({
        ...gt,
        pricePerSquareMeter: gt.pricePerSquareMeter * multiplier,
      }));

      // Update pricing state
      const updatedPricing: SystemPricingState = {
        ...pricingState,
        profilePrices: updatedProfilePrices,
        hardware: updatedHardware,
        gaskets: updatedGaskets,
        glazingTypes: updatedGlazingTypes,
      };

      setPricingState(updatedPricing);
      setIsDirty(true);
      setShowBulkConfirmDialog(false);
      setBulkOperationType(null);
      setBulkPercentage('');
      toast.success(`Applied ${percentage > 0 ? '+' : ''}${percentage}% to all prices`);
    } catch (error) {
      console.error('Error applying bulk percentage:', error);
      trackError('PricingTuningStudio', 'bulkPercentage', error instanceof Error ? error.message : String(error));
      toast.error('Failed to apply bulk percentage');
    } finally {
      setSaving(false);
    }
  }, [bulkPercentage, pricingState, selectedSystemPackId, selectedProfileId]);

  const handleCopyPricing = useCallback(() => {
    if (!copyFromSystemPack || copyFromSystemPack === selectedSystemPackId) {
      toast.error('Please select a different system pack to copy from');
      return;
    }

    setBulkOperationType('copy');
    setShowBulkConfirmDialog(true);
  }, [copyFromSystemPack, selectedSystemPackId]);

  const handleConfirmCopyPricing = useCallback(async () => {
    if (!copyFromSystemPack || !selectedProfileId || !selectedSystemPackId) {
      return;
    }

    try {
      setSaving(true);

      // Find profile for source system pack
      const sourceProfiles = profiles.filter((p) => {
        const specs = p.specifications as any;
        const systemName = specs?.window_system || p.systemBrand || specs?.systemPackId;
        return systemName === copyFromSystemPack;
      });

      if (sourceProfiles.length === 0) {
        toast.error(`No profiles found for system pack: ${copyFromSystemPack}`);
        setShowBulkConfirmDialog(false);
        setBulkOperationType(null);
        return;
      }

      // Get pricing from first profile of source system pack
      const sourcePricing = await systemPricingService.getSystemPricing(
        sourceProfiles[0].id,
        copyFromSystemPack
      );

      if (!sourcePricing) {
        toast.error(`No pricing configuration found for system pack: ${copyFromSystemPack}`);
        setShowBulkConfirmDialog(false);
        setBulkOperationType(null);
        return;
      }

      // Update pricing state (copy with current system pack name)
      const copiedPricing: SystemPricingState = {
        ...sourcePricing,
        systemName: selectedSystemPackId,
      };

      setPricingState(copiedPricing);
      setIsDirty(true);
      setShowBulkConfirmDialog(false);
      setBulkOperationType(null);
      setCopyFromSystemPack('');
      toast.success(`Pricing copied from ${copyFromSystemPack}`);
    } catch (error) {
      console.error('Error copying pricing:', error);
      trackError('PricingTuningStudio', 'copyPricing', error instanceof Error ? error.message : String(error));
      toast.error('Failed to copy pricing configuration');
    } finally {
      setSaving(false);
    }
  }, [copyFromSystemPack, selectedProfileId, selectedSystemPackId, profiles]);

  // Handle unsaved changes dialog
  const handleUnsavedConfirm = useCallback(() => {
    setShowUnsavedDialog(false);
    onClose(false);
  }, [onClose]);

  const handleUnsavedCancel = useCallback(() => {
    setShowUnsavedDialog(false);
  }, []);

  const handleUnsavedSave = useCallback(async () => {
    await handleSave();
    setShowUnsavedDialog(false);
    onClose(true);
  }, [handleSave, onClose]);

  // Status badge
  const statusBadge = useMemo(() => {
    const statusConfig = {
      configured: {
        variant: 'outline' as const,
        className: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        label: 'Configured',
      },
      required: {
        variant: 'destructive' as const,
        className: 'bg-red-500/20 text-red-300 border-red-500/40',
        label: 'Required',
      },
      needs_review: {
        variant: 'outline' as const,
        className: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        label: 'Needs Review',
      },
    };

    const config = statusConfig[configurationStatus];
    return (
      <Badge variant={config.variant} className={cn('text-[10px]', config.className)}>
        {config.label}
      </Badge>
    );
  }, [configurationStatus]);

  if (loadingProfiles) {
    return (
      <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-xl flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-400 mx-auto mb-4" />
          <p className="text-amber-200">Loading pricing configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div
        className="pricing-tuning-studio fixed inset-0 z-[200] bg-black/70 backdrop-blur-xl flex items-start justify-center p-4 sm:p-6 lg:pt-[75px] overflow-y-auto"
        onClick={(e) => {
          // Close on backdrop click - only if no unsaved changes
          if (e.target === e.currentTarget) {
            if (isDirty) {
              setShowUnsavedDialog(true);
            } else {
              onClose(false);
            }
          }
        }}
      >
        <div
          className={cn(
            'w-full',
            STUDIO_MAX_WIDTH,
            STUDIO_MAX_HEIGHT,
            'overflow-y-auto rounded-lg card-glass-dark relative z-10'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <Card className="bg-transparent border-none h-full flex flex-col">
            {/* Header */}
            <CardHeader className="border-b border-amber-500/30 pb-3">
              <div className="flex items-center justify-between gap-4">
                {/* Left: Back button */}
                <div className="flex items-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBack}
                    className="btn-secondary-dark relative z-10"
                    type="button"
                    aria-label={t('pricing_tuning_studio.actions.back', 'Back')}
                    title={t('pricing_tuning_studio.actions.back_hint', 'Close Pricing Tuning Studio (Esc)')}
                  >
                    <ArrowLeft className={cn(ICON_MEDIUM, 'mr-1')} />
                    {t('pricing_tuning_studio.actions.back', 'Back')}
                  </Button>
                </div>

                {/* Center: Title and system pack selector */}
                <div className="flex items-start gap-3 flex-1 justify-center flex-col">
                  <div className="flex items-center gap-3 justify-center w-full">
                    <div className="btn-primary">
                      <DollarSign className={cn(ICON_LARGE, 'text-amber-300')} />
                    </div>
                    <div className="text-center">
                      <CardTitle className="text-lg md:text-xl flex items-center gap-2 justify-center">
                        {t('pricing_tuning_studio.title', 'Pricing Tuning Studio')}
                        {statusBadge}
                      </CardTitle>
                    </div>
                  </div>
                  {/* System Pack Selector and Currency Selector */}
                  {systemPacks.length > 0 && (
                    <div className="w-full max-w-xs mx-auto space-y-2">
                      <Select
                        value={selectedSystemPackId || ''}
                        onValueChange={handleSystemPackChange}
                      >
                        <SelectTrigger className="h-8 text-xs bg-gray-800/50 border-gray-700 hover:bg-gray-800">
                          <SelectValue placeholder="Select system pack" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-900 border-gray-700">
                          {systemPacks.map((packId) => {
                            const packProfiles = profiles.filter((p) => {
                              const specs = p.specifications as any;
                              const systemName =
                                specs?.window_system || p.systemBrand || specs?.systemPackId;
                              return systemName === packId;
                            });
                            return (
                              <SelectItem key={packId} value={packId}>
                                {packId} ({packProfiles.length} profiles)
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      {/* Currency Selector */}
                      {pricingState && (
                        <div className="flex items-center gap-2">
                          <Label className="text-[10px] text-gray-400 whitespace-nowrap">Currency:</Label>
                          <Select
                            value={pricingState.currency || 'EGP'}
                            onValueChange={(newCurrency) => {
                              setPricingState((prev) => {
                                if (!prev) return prev;
                                return {
                                  ...prev,
                                  currency: newCurrency,
                                };
                              });
                              setIsDirty(true);
                            }}
                          >
                            <SelectTrigger className="h-7 text-xs bg-gray-800/50 border-gray-700 hover:bg-gray-800 w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-900 border-gray-700">
                              <SelectItem value="EGP">EGP (Egyptian Pound)</SelectItem>
                              <SelectItem value="USD">USD (US Dollar)</SelectItem>
                              <SelectItem value="EUR">EUR (Euro)</SelectItem>
                              <SelectItem value="GBP">GBP (British Pound)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  )}
                  {systemPacks.length === 0 && (
                    <CardDescription className="text-xs md:text-sm text-amber-300/70 mt-1 text-center">
                      {t('pricing_tuning_studio.no_system_packs', 'No system packs found in inventory')}
                    </CardDescription>
                  )}
                </div>

                {/* Right: Save button */}
                <div className="flex items-center">
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={saving || !selectedProfileId || !pricingState}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    aria-label={t('pricing_tuning_studio.actions.save', 'Save Pricing')}
                    title={t('pricing_tuning_studio.actions.save_hint', 'Save pricing configuration (Ctrl+S)')}
                  >
                    <CheckCircle2 className={cn(ICON_MEDIUM, 'mr-1')} />
                    {saving
                      ? t('pricing_tuning_studio.actions.saving', 'Saving...')
                      : t('pricing_tuning_studio.actions.save', 'Save Pricing')}
                  </Button>
                </div>
              </div>
            </CardHeader>

            {/* Content */}
            <CardContent className="flex-1 overflow-y-auto p-4 md:p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
                {/* Left Panel (1/3) - Overview & Context */}
                <div className="space-y-4 lg:col-span-1">
                  {/* Overview Card */}
                  <Card className="card-glass-dark">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2 tracking-[0.02em] uppercase">
                        <Settings className="h-4 w-4 text-amber-400" />
                        {t('pricing_tuning_studio.overview.title', 'Overview')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-xs text-gray-300">
                      <div className="space-y-1.5">
                        <p>
                          <span className="font-semibold text-gray-200">
                            {t('pricing_tuning_studio.overview.system_pack', 'System Pack')}:
                          </span>{' '}
                          <span className="text-amber-300">{selectedSystemPackId || '—'}</span>
                        </p>
                        <p>
                          <span className="font-semibold text-gray-200">
                            {t('pricing_tuning_studio.overview.status', 'Status')}:
                          </span>{' '}
                          <span
                            className={
                              configurationStatus === 'configured'
                                ? 'text-emerald-400'
                                : configurationStatus === 'needs_review'
                                ? 'text-amber-400'
                                : 'text-red-400'
                            }
                          >
                            {configurationStatus === 'configured'
                              ? '✓ Configured'
                              : configurationStatus === 'needs_review'
                              ? '⚠ Needs Review'
                              : '⚠ Required'}
                          </span>
                        </p>
                        {pricingState && (
                          <>
                            <p>
                              <span className="font-semibold text-gray-200">Currency:</span>{' '}
                              <span className="text-amber-300">{pricingState.currency}</span>
                            </p>
                            <p>
                              <span className="font-semibold text-gray-200">Profiles:</span>{' '}
                              <span className="text-gray-300">
                                {Object.keys(pricingState.profilePrices || {}).length} configured
                              </span>
                            </p>
                            <p>
                              <span className="font-semibold text-gray-200">Hardware:</span>{' '}
                              <span className="text-gray-300">
                                {Object.keys(pricingState.hardware || {}).length} items
                              </span>
                            </p>
                            <p>
                              <span className="font-semibold text-gray-200">Glazing Types:</span>{' '}
                              <span className="text-gray-300">
                                {pricingState.glazingTypes?.length || 0} types
                              </span>
                            </p>
                          </>
                        )}
                        {systemPackProfiles.length > 0 && (
                          <p>
                            <span className="font-semibold text-gray-200">Total Profiles:</span>{' '}
                            <span className="text-gray-300">{systemPackProfiles.length}</span>
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Impact Preview Card */}
                  {impactPreview && (
                    <Card className="card-glass-dark">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2 tracking-[0.02em] uppercase">
                          <TrendingUp className="h-4 w-4 text-amber-400" />
                          {t('pricing_tuning_studio.impact.title', 'Impact Preview')}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 text-xs text-gray-300">
                        {/* Coverage Progress Bar */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-gray-200">
                              {t('pricing_tuning_studio.impact.coverage', 'Configuration Coverage')}:
                            </span>
                            <span className="text-amber-300 font-medium">
                              {impactPreview.configurationCoverage.percentage.toFixed(0)}%
                            </span>
                          </div>
                          <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${
                                impactPreview.configurationCoverage.percentage >= 80
                                  ? 'bg-emerald-500'
                                  : impactPreview.configurationCoverage.percentage >= 50
                                  ? 'bg-amber-500'
                                  : 'bg-red-500'
                              }`}
                              style={{
                                width: `${Math.min(100, impactPreview.configurationCoverage.percentage)}%`,
                              }}
                            />
                          </div>
                          <p className="text-[10px] text-gray-500">
                            {impactPreview.configurationCoverage.configured} of{' '}
                            {impactPreview.configurationCoverage.total} items configured
                          </p>
                        </div>

                        {/* Configuration Breakdown */}
                        {pricingState && (
                          <div className="pt-2 border-t border-gray-700 space-y-1.5">
                            <p className="font-semibold text-gray-200 text-[11px] uppercase tracking-wide">
                              Breakdown:
                            </p>
                            <div className="space-y-1 text-[10px]">
                              <div className="flex justify-between">
                                <span className="text-gray-400">Profile Prices:</span>
                                <span className="text-gray-300">
                                  {Object.keys(pricingState.profilePrices || {}).length}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Hardware Items:</span>
                                <span className="text-gray-300">
                                  {Object.keys(pricingState.hardware || {}).length}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Glazing Types:</span>
                                <span className="text-gray-300">
                                  {pricingState.glazingTypes?.length || 0}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Validation Summary Card */}
                  <Card className="card-glass-dark">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2 tracking-[0.02em] uppercase">
                        <Shield className="h-4 w-4 text-amber-400" />
                        {t('pricing_tuning_studio.validation.title', 'Validation')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-xs">
                      {validationResult ? (
                        <>
                          {/* Validation Status */}
                          <div className="flex items-center gap-2">
                            {validationResult.isValid && validationResult.errors.length === 0 ? (
                              <>
                                <CheckCircle className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                                <span className="text-emerald-300 font-medium">
                                  {validationResult.warnings.length === 0
                                    ? 'All checks passed'
                                    : 'Valid with warnings'}
                                </span>
                              </>
                            ) : (
                              <>
                                <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                                <span className="text-red-300 font-medium">Validation errors found</span>
                              </>
                            )}
                          </div>

                          {/* Errors */}
                          {validationResult.errors.length > 0 && (
                            <div className="space-y-1.5 pt-1 border-t border-gray-700">
                              <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wide">
                                Errors ({validationResult.errors.length}):
                              </p>
                              <div className="space-y-1 max-h-24 overflow-y-auto">
                                {validationResult.errors.map((error, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-start gap-1.5 p-1.5 bg-red-500/10 border border-red-500/20 rounded text-[10px]"
                                  >
                                    <AlertCircle className="h-3 w-3 text-red-400 flex-shrink-0 mt-0.5" />
                                    <span className="text-red-300">{error.message}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Warnings */}
                          {validationResult.warnings.length > 0 && (
                            <div className="space-y-1.5 pt-1 border-t border-gray-700">
                              <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-wide">
                                Warnings ({validationResult.warnings.length}):
                              </p>
                              <div className="space-y-1 max-h-32 overflow-y-auto">
                                {validationResult.warnings.map((warning, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-start gap-1.5 p-1.5 bg-amber-500/10 border border-amber-500/20 rounded text-[10px]"
                                  >
                                    <AlertTriangle className="h-3 w-3 text-amber-400 flex-shrink-0 mt-0.5" />
                                    <span className="text-amber-300">{warning.message}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* No Issues */}
                          {validationResult.errors.length === 0 &&
                            validationResult.warnings.length === 0 && (
                              <div className="flex items-center gap-2 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded">
                                <CheckCircle className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                                <span className="text-emerald-300 text-[10px]">
                                  No validation issues detected
                                </span>
                              </div>
                            )}
                        </>
                      ) : pricingState ? (
                        <div className="flex items-center gap-2 text-gray-400">
                          <Info className="h-4 w-4 flex-shrink-0" />
                          <span className="text-[10px]">
                            {t(
                              'pricing_tuning_studio.validation.no_pricing',
                              'Load pricing to validate'
                            )}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-gray-500">
                          <Info className="h-4 w-4 flex-shrink-0" />
                          <span className="text-[10px]">
                            {t(
                              'pricing_tuning_studio.validation.select_system',
                              'Select a system pack to validate'
                            )}
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Right Panel (2/3) - Tabbed Interface */}
                <div className="lg:col-span-2 h-full">
                  <Tabs
                    value={activeTab}
                    onValueChange={setActiveTab}
                    className="h-full flex flex-col"
                  >
                    <TabsList className="flex flex-wrap h-auto p-2 gap-1 card-dark mb-3 w-full justify-center shadow-glow-strong">
                      <TabsTrigger value="system-packing" className="text-xs flex items-center gap-1 min-w-[110px]">
                        <Package className="h-3 w-3" />
                        {t('pricing_tuning_studio.tabs.system_pack', 'System Pack')}
                      </TabsTrigger>
                      <TabsTrigger value="material-markups" className="text-xs flex items-center gap-1 min-w-[110px]">
                        <Calculator className="h-3 w-3" />
                        {t('pricing_tuning_studio.tabs.markups', 'Markups')}
                      </TabsTrigger>
                      <TabsTrigger value="labor-overhead" className="text-xs flex items-center gap-1 min-w-[110px]">
                        <Settings className="h-3 w-3" />
                        {t('pricing_tuning_studio.tabs.labor', 'Labor')}
                      </TabsTrigger>
                      <TabsTrigger value="pricing-rules" className="text-xs flex items-center gap-1 min-w-[110px]">
                        <FileText className="h-3 w-3" />
                        {t('pricing_tuning_studio.tabs.rules', 'Rules')}
                      </TabsTrigger>
                      <TabsTrigger value="history" className="text-xs flex items-center gap-1 min-w-[110px]">
                        <History className="h-3 w-3" />
                        {t('pricing_tuning_studio.tabs.history', 'History')}
                      </TabsTrigger>
                      <TabsTrigger value="validation" className="text-xs flex items-center gap-1 min-w-[110px]">
                        <Shield className="h-3 w-3" />
                        {t('pricing_tuning_studio.tabs.validation', 'Validation')}
                      </TabsTrigger>
                      <TabsTrigger value="bulk-ops" className="text-xs flex items-center gap-1 min-w-[110px]">
                        <Upload className="h-3 w-3" />
                        {t('pricing_tuning_studio.tabs.bulk', 'Bulk Ops')}
                      </TabsTrigger>
                    </TabsList>

                    {/* Tab 1: System Pack Pricing */}
                    <TabsContent value="system-packing" className="flex-1 overflow-y-auto">
                      {selectedSystemPackId && selectedProfileId && systemPackProfiles.length > 0 ? (
                        <div className="h-full">
                          <Rock60PricingSetup
                            profiles={systemPackProfiles}
                            userId={userId}
                            selectedProfileId={selectedProfileId}
                            onProfileChange={(profileId) => {
                              setSelectedProfileId(profileId);
                              setIsDirty(true); // Mark as dirty when profile changes (user might have unsaved changes)
                            }}
                          />
                        </div>
                      ) : (
                        <Card className="card-glass-dark">
                          <CardContent className="p-8 text-center">
                            <Package className={cn(ICON_LARGE, 'mx-auto mb-4 text-gray-400')} />
                            <p className="text-gray-300 mb-2">
                              {selectedSystemPackId
                                ? t(
                                    'pricing_tuning_studio.select_profile',
                                    'Select a profile from the system pack'
                                  )
                                : t(
                                    'pricing_tuning_studio.select_system_pack',
                                    'Select a system pack to configure pricing'
                                  )}
                            </p>
                            <p className="text-xs text-gray-500">
                              {systemPacks.length > 0
                                ? `${systemPacks.length} system pack${systemPacks.length > 1 ? 's' : ''} available`
                                : 'No system packs found'}
                            </p>
                          </CardContent>
                        </Card>
                      )}
                    </TabsContent>

                    {/* Tab 2: Material Markups */}
                    <TabsContent value="material-markups" className="flex-1 overflow-y-auto">
                      <div className="space-y-4">
                        {/* Material Markups Section */}
                        <Card className="card-glass-dark">
                          <CardHeader className="pb-3 border-b border-gray-700">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Percent className="h-4 w-4 text-amber-400" />
                              {t('pricing_tuning_studio.material_markups.title', 'Material Markups')}
                            </CardTitle>
                            <CardDescription className="text-xs text-gray-400">
                              {t(
                                'pricing_tuning_studio.material_markups.description',
                                'Configure markup percentages for different materials'
                              )}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="p-4 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Aluminum Markup */}
                              <div className="space-y-2">
                                <Label htmlFor="aluminum-markup" className="text-xs text-gray-300">
                                  {t('pricing_tuning_studio.material_markups.aluminum', 'Aluminum Markup (%)')}
                                </Label>
                                <Input
                                  id="aluminum-markup"
                                  type="number"
                                  step="0.1"
                                  value={
                                    pricingState?.materialMarkups?.materialMarkups?.aluminum?.toFixed(1) || ''
                                  }
                                  onChange={(e) => {
                                    const value = parseFloat(e.target.value);
                                    if (!isNaN(value) && pricingState) {
                                      const currentMarkups = pricingState.materialMarkups || {
                                        materialMarkups: {},
                                        regionalMarkups: {},
                                        customRules: [],
                                      };
                                      setPricingState({
                                        ...pricingState,
                                        materialMarkups: {
                                          ...currentMarkups,
                                          materialMarkups: {
                                            ...currentMarkups.materialMarkups,
                                            aluminum: value,
                                          },
                                        },
                                      });
                                      setIsDirty(true);
                                    }
                                  }}
                                  placeholder="30.0"
                                  className="text-xs"
                                />
                              </div>

                              {/* UPVC Markup */}
                              <div className="space-y-2">
                                <Label htmlFor="upvc-markup" className="text-xs text-gray-300">
                                  {t('pricing_tuning_studio.material_markups.upvc', 'UPVC Markup (%)')}
                                </Label>
                                <Input
                                  id="upvc-markup"
                                  type="number"
                                  step="0.1"
                                  value={
                                    pricingState?.materialMarkups?.materialMarkups?.upvc?.toFixed(1) || ''
                                  }
                                  onChange={(e) => {
                                    const value = parseFloat(e.target.value);
                                    if (!isNaN(value) && pricingState) {
                                      const currentMarkups = pricingState.materialMarkups || {
                                        materialMarkups: {},
                                        regionalMarkups: {},
                                        customRules: [],
                                      };
                                      setPricingState({
                                        ...pricingState,
                                        materialMarkups: {
                                          ...currentMarkups,
                                          materialMarkups: {
                                            ...currentMarkups.materialMarkups,
                                            upvc: value,
                                          },
                                        },
                                      });
                                      setIsDirty(true);
                                    }
                                  }}
                                  placeholder="25.0"
                                  className="text-xs"
                                />
                              </div>

                              {/* Wood Markup */}
                              <div className="space-y-2">
                                <Label htmlFor="wood-markup" className="text-xs text-gray-300">
                                  {t('pricing_tuning_studio.material_markups.wood', 'Wood Markup (%)')}
                                </Label>
                                <Input
                                  id="wood-markup"
                                  type="number"
                                  step="0.1"
                                  value={
                                    pricingState?.materialMarkups?.materialMarkups?.wood?.toFixed(1) || ''
                                  }
                                  onChange={(e) => {
                                    const value = parseFloat(e.target.value);
                                    if (!isNaN(value) && pricingState) {
                                      const currentMarkups = pricingState.materialMarkups || {
                                        materialMarkups: {},
                                        regionalMarkups: {},
                                        customRules: [],
                                      };
                                      setPricingState({
                                        ...pricingState,
                                        materialMarkups: {
                                          ...currentMarkups,
                                          materialMarkups: {
                                            ...currentMarkups.materialMarkups,
                                            wood: value,
                                          },
                                        },
                                      });
                                      setIsDirty(true);
                                    }
                                  }}
                                  placeholder="35.0"
                                  className="text-xs"
                                />
                              </div>

                              {/* Default Markup */}
                              <div className="space-y-2">
                                <Label htmlFor="default-markup" className="text-xs text-gray-300">
                                  {t('pricing_tuning_studio.material_markups.default', 'Default Markup (%)')}
                                </Label>
                                <Input
                                  id="default-markup"
                                  type="number"
                                  step="0.1"
                                  value={
                                    pricingState?.materialMarkups?.materialMarkups?.default?.toFixed(1) || ''
                                  }
                                  onChange={(e) => {
                                    const value = parseFloat(e.target.value);
                                    if (!isNaN(value) && pricingState) {
                                      const currentMarkups = pricingState.materialMarkups || {
                                        materialMarkups: {},
                                        regionalMarkups: {},
                                        customRules: [],
                                      };
                                      setPricingState({
                                        ...pricingState,
                                        materialMarkups: {
                                          ...currentMarkups,
                                          materialMarkups: {
                                            ...currentMarkups.materialMarkups,
                                            default: value,
                                          },
                                        },
                                      });
                                      setIsDirty(true);
                                    }
                                  }}
                                  placeholder="30.0"
                                  className="text-xs"
                                />
                                <p className="text-[10px] text-gray-500">
                                  {t(
                                    'pricing_tuning_studio.material_markups.default_hint',
                                    'Used when material-specific markup is not set'
                                  )}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Regional Markups Section */}
                        <Card className="card-glass-dark">
                          <CardHeader className="pb-3 border-b border-gray-700">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-amber-400" />
                              {t('pricing_tuning_studio.regional_markups.title', 'Regional Markups')}
                            </CardTitle>
                            <CardDescription className="text-xs text-gray-400">
                              {t(
                                'pricing_tuning_studio.regional_markups.description',
                                'Configure markup percentages by region'
                              )}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="p-4 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Cairo Regional Markup */}
                              <div className="space-y-2">
                                <Label htmlFor="cairo-markup" className="text-xs text-gray-300">
                                  {t('pricing_tuning_studio.regional_markups.cairo', 'Cairo Markup (%)')}
                                </Label>
                                <Input
                                  id="cairo-markup"
                                  type="number"
                                  step="0.1"
                                  value={
                                    pricingState?.materialMarkups?.regionalMarkups?.cairo?.toFixed(1) || ''
                                  }
                                  onChange={(e) => {
                                    const value = parseFloat(e.target.value);
                                    if (!isNaN(value) && pricingState) {
                                      const currentMarkups = pricingState.materialMarkups || {
                                        materialMarkups: {},
                                        regionalMarkups: {},
                                        customRules: [],
                                      };
                                      setPricingState({
                                        ...pricingState,
                                        materialMarkups: {
                                          ...currentMarkups,
                                          regionalMarkups: {
                                            ...currentMarkups.regionalMarkups,
                                            cairo: value,
                                          },
                                        },
                                      });
                                      setIsDirty(true);
                                    }
                                  }}
                                  placeholder="0.0"
                                  className="text-xs"
                                />
                              </div>

                              {/* Alexandria Regional Markup */}
                              <div className="space-y-2">
                                <Label htmlFor="alexandria-markup" className="text-xs text-gray-300">
                                  {t('pricing_tuning_studio.regional_markups.alexandria', 'Alexandria Markup (%)')}
                                </Label>
                                <Input
                                  id="alexandria-markup"
                                  type="number"
                                  step="0.1"
                                  value={
                                    pricingState?.materialMarkups?.regionalMarkups?.alexandria?.toFixed(1) || ''
                                  }
                                  onChange={(e) => {
                                    const value = parseFloat(e.target.value);
                                    if (!isNaN(value) && pricingState) {
                                      const currentMarkups = pricingState.materialMarkups || {
                                        materialMarkups: {},
                                        regionalMarkups: {},
                                        customRules: [],
                                      };
                                      setPricingState({
                                        ...pricingState,
                                        materialMarkups: {
                                          ...currentMarkups,
                                          regionalMarkups: {
                                            ...currentMarkups.regionalMarkups,
                                            alexandria: value,
                                          },
                                        },
                                      });
                                      setIsDirty(true);
                                    }
                                  }}
                                  placeholder="0.0"
                                  className="text-xs"
                                />
                              </div>

                              {/* Upper Egypt Regional Markup */}
                              <div className="space-y-2">
                                <Label htmlFor="upper-egypt-markup" className="text-xs text-gray-300">
                                  {t('pricing_tuning_studio.regional_markups.upper_egypt', 'Upper Egypt Markup (%)')}
                                </Label>
                                <Input
                                  id="upper-egypt-markup"
                                  type="number"
                                  step="0.1"
                                  value={
                                    pricingState?.materialMarkups?.regionalMarkups?.upperEgypt?.toFixed(1) || ''
                                  }
                                  onChange={(e) => {
                                    const value = parseFloat(e.target.value);
                                    if (!isNaN(value) && pricingState) {
                                      const currentMarkups = pricingState.materialMarkups || {
                                        materialMarkups: {},
                                        regionalMarkups: {},
                                        customRules: [],
                                      };
                                      setPricingState({
                                        ...pricingState,
                                        materialMarkups: {
                                          ...currentMarkups,
                                          regionalMarkups: {
                                            ...currentMarkups.regionalMarkups,
                                            upperEgypt: value,
                                          },
                                        },
                                      });
                                      setIsDirty(true);
                                    }
                                  }}
                                  placeholder="0.0"
                                  className="text-xs"
                                />
                              </div>

                              {/* Default Regional Markup */}
                              <div className="space-y-2">
                                <Label htmlFor="default-regional-markup" className="text-xs text-gray-300">
                                  {t('pricing_tuning_studio.regional_markups.default', 'Default Regional Markup (%)')}
                                </Label>
                                <Input
                                  id="default-regional-markup"
                                  type="number"
                                  step="0.1"
                                  value={
                                    pricingState?.materialMarkups?.regionalMarkups?.default?.toFixed(1) || ''
                                  }
                                  onChange={(e) => {
                                    const value = parseFloat(e.target.value);
                                    if (!isNaN(value) && pricingState) {
                                      const currentMarkups = pricingState.materialMarkups || {
                                        materialMarkups: {},
                                        regionalMarkups: {},
                                        customRules: [],
                                      };
                                      setPricingState({
                                        ...pricingState,
                                        materialMarkups: {
                                          ...currentMarkups,
                                          regionalMarkups: {
                                            ...currentMarkups.regionalMarkups,
                                            default: value,
                                          },
                                        },
                                      });
                                      setIsDirty(true);
                                    }
                                  }}
                                  placeholder="0.0"
                                  className="text-xs"
                                />
                                <p className="text-[10px] text-gray-500">
                                  {t(
                                    'pricing_tuning_studio.regional_markups.default_hint',
                                    'Used when region-specific markup is not set'
                                  )}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Custom Material Rules Section */}
                        <Card className="card-glass-dark">
                          <CardHeader className="pb-3 border-b border-gray-700">
                            <div className="flex items-center justify-between">
                              <div>
                                <CardTitle className="text-sm flex items-center gap-2">
                                  <Settings className="h-4 w-4 text-amber-400" />
                                  {t('pricing_tuning_studio.custom_rules.title', 'Custom Material Rules')}
                                </CardTitle>
                                <CardDescription className="text-xs text-gray-400">
                                  {t(
                                    'pricing_tuning_studio.custom_rules.description',
                                    'Define custom markup rules for specific materials and conditions'
                                  )}
                                </CardDescription>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingCustomRule({
                                    id: `cmr-${Date.now()}`,
                                    materialType: 'aluminum',
                                    markupPercentage: 0,
                                    isActive: true,
                                  });
                                  setShowCustomRuleDialog(true);
                                }}
                                className="text-xs h-7"
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                {t('pricing_tuning_studio.custom_rules.add', 'Add Rule')}
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent className="p-4">
                            {pricingState?.materialMarkups?.customRules && pricingState.materialMarkups.customRules.length > 0 ? (
                              <div className="space-y-2">
                                {pricingState.materialMarkups.customRules.map((rule) => (
                                  <div
                                    key={rule.id}
                                    className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50 border border-gray-700"
                                  >
                                    <div className="flex-1">
                                      <div className="flex items-center gap-3">
                                        <Badge variant="outline" className="text-xs">
                                          {rule.materialType}
                                          {rule.materialName && `: ${rule.materialName}`}
                                        </Badge>
                                        <span className="text-xs font-medium text-gray-200">
                                          {rule.markupPercentage}%
                                        </span>
                                        {rule.region && (
                                          <Badge variant="outline" className="text-xs">
                                            {t('pricing_tuning_studio.custom_rules.region', 'Region')}: {rule.region}
                                          </Badge>
                                        )}
                                        {rule.minQuantity && (
                                          <Badge variant="outline" className="text-xs">
                                            {t('pricing_tuning_studio.custom_rules.min_qty', 'Min Qty')}: {rule.minQuantity}
                                          </Badge>
                                        )}
                                        {!rule.isActive && (
                                          <Badge variant="secondary" className="text-xs">
                                            {t('common.inactive', 'Inactive')}
                                          </Badge>
                                        )}
                                      </div>
                                      {rule.notes && (
                                        <p className="text-[10px] text-gray-400 mt-1">{rule.notes}</p>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          setEditingCustomRule(rule);
                                          setShowCustomRuleDialog(true);
                                        }}
                                        className="h-7 w-7 p-0"
                                      >
                                        <Settings className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          if (pricingState) {
                                            const currentMarkups = pricingState.materialMarkups || {
                                              materialMarkups: {},
                                              regionalMarkups: {},
                                              customRules: [],
                                            };
                                            const updatedRules = (currentMarkups.customRules || []).filter(
                                              (r) => r.id !== rule.id
                                            );
                                            setPricingState({
                                              ...pricingState,
                                              materialMarkups: {
                                                ...currentMarkups,
                                                customRules: updatedRules,
                                              },
                                            });
                                            setIsDirty(true);
                                          }
                                        }}
                                        className="h-7 w-7 p-0 text-red-400 hover:text-red-300"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-gray-400 text-center py-4">
                                {t('pricing_tuning_studio.custom_rules.empty', 'No custom rules configured')}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>

                    {/* Tab 3: Labor & Overhead */}
                    <TabsContent value="labor-overhead" className="flex-1 overflow-y-auto">
                      <div className="space-y-4">
                        {/* Regional Labor Rates Section */}
                        <Card className="card-glass-dark">
                          <CardHeader className="pb-3 border-b border-gray-700">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Settings className="h-4 w-4 text-amber-400" />
                              {t('pricing_tuning_studio.labor_rates.title', 'Regional Labor Rates')}
                            </CardTitle>
                            <CardDescription className="text-xs text-gray-400">
                              {t(
                                'pricing_tuning_studio.labor_rates.description',
                                'Configure labor rates per hour by region'
                              )}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="p-4 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Cairo Labor Rate */}
                              <div className="space-y-2">
                                <Label htmlFor="cairo-labor-rate" className="text-xs text-gray-300">
                                  {t('pricing_tuning_studio.labor_rates.cairo', 'Cairo Rate (per hour)')}
                                </Label>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-400">{pricingState?.currency || 'EGP'}</span>
                                  <Input
                                    id="cairo-labor-rate"
                                    type="number"
                                    step="0.1"
                                    value={
                                      pricingState?.laborOverhead?.laborRates?.cairo?.toFixed(1) || ''
                                    }
                                    onChange={(e) => {
                                      const value = parseFloat(e.target.value);
                                      if (!isNaN(value) && pricingState) {
                                        const currentConfig = pricingState.laborOverhead || {
                                          laborRates: {},
                                          overheadAllocation: { method: 'percentage' },
                                          installationCosts: {},
                                          complexityMultipliers: {},
                                        };
                                        setPricingState({
                                          ...pricingState,
                                          laborOverhead: {
                                            ...currentConfig,
                                            laborRates: {
                                              ...currentConfig.laborRates,
                                              cairo: value,
                                            },
                                          },
                                        });
                                        setIsDirty(true);
                                      }
                                    }}
                                    placeholder="100.0"
                                    className="text-xs flex-1"
                                  />
                                </div>
                              </div>

                              {/* Alexandria Labor Rate */}
                              <div className="space-y-2">
                                <Label htmlFor="alexandria-labor-rate" className="text-xs text-gray-300">
                                  {t('pricing_tuning_studio.labor_rates.alexandria', 'Alexandria Rate (per hour)')}
                                </Label>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-400">{pricingState?.currency || 'EGP'}</span>
                                  <Input
                                    id="alexandria-labor-rate"
                                    type="number"
                                    step="0.1"
                                    value={
                                      pricingState?.laborOverhead?.laborRates?.alexandria?.toFixed(1) || ''
                                    }
                                    onChange={(e) => {
                                      const value = parseFloat(e.target.value);
                                      if (!isNaN(value) && pricingState) {
                                        const currentConfig = pricingState.laborOverhead || {
                                          laborRates: {},
                                          overheadAllocation: { method: 'percentage' },
                                          installationCosts: {},
                                          complexityMultipliers: {},
                                        };
                                        setPricingState({
                                          ...pricingState,
                                          laborOverhead: {
                                            ...currentConfig,
                                            laborRates: {
                                              ...currentConfig.laborRates,
                                              alexandria: value,
                                            },
                                          },
                                        });
                                        setIsDirty(true);
                                      }
                                    }}
                                    placeholder="95.0"
                                    className="text-xs flex-1"
                                  />
                                </div>
                              </div>

                              {/* Upper Egypt Labor Rate */}
                              <div className="space-y-2">
                                <Label htmlFor="upper-egypt-labor-rate" className="text-xs text-gray-300">
                                  {t('pricing_tuning_studio.labor_rates.upper_egypt', 'Upper Egypt Rate (per hour)')}
                                </Label>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-400">{pricingState?.currency || 'EGP'}</span>
                                  <Input
                                    id="upper-egypt-labor-rate"
                                    type="number"
                                    step="0.1"
                                    value={
                                      pricingState?.laborOverhead?.laborRates?.upperEgypt?.toFixed(1) || ''
                                    }
                                    onChange={(e) => {
                                      const value = parseFloat(e.target.value);
                                      if (!isNaN(value) && pricingState) {
                                        const currentConfig = pricingState.laborOverhead || {
                                          laborRates: {},
                                          overheadAllocation: { method: 'percentage' },
                                          installationCosts: {},
                                          complexityMultipliers: {},
                                        };
                                        setPricingState({
                                          ...pricingState,
                                          laborOverhead: {
                                            ...currentConfig,
                                            laborRates: {
                                              ...currentConfig.laborRates,
                                              upperEgypt: value,
                                            },
                                          },
                                        });
                                        setIsDirty(true);
                                      }
                                    }}
                                    placeholder="85.0"
                                    className="text-xs flex-1"
                                  />
                                </div>
                              </div>

                              {/* Default Labor Rate */}
                              <div className="space-y-2">
                                <Label htmlFor="default-labor-rate" className="text-xs text-gray-300">
                                  {t('pricing_tuning_studio.labor_rates.default', 'Default Rate (per hour)')}
                                </Label>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-400">{pricingState?.currency || 'EGP'}</span>
                                  <Input
                                    id="default-labor-rate"
                                    type="number"
                                    step="0.1"
                                    value={
                                      pricingState?.laborOverhead?.laborRates?.default?.toFixed(1) || ''
                                    }
                                    onChange={(e) => {
                                      const value = parseFloat(e.target.value);
                                      if (!isNaN(value) && pricingState) {
                                        const currentConfig = pricingState.laborOverhead || {
                                          laborRates: {},
                                          overheadAllocation: { method: 'percentage' },
                                          installationCosts: {},
                                          complexityMultipliers: {},
                                        };
                                        setPricingState({
                                          ...pricingState,
                                          laborOverhead: {
                                            ...currentConfig,
                                            laborRates: {
                                              ...currentConfig.laborRates,
                                              default: value,
                                            },
                                          },
                                        });
                                        setIsDirty(true);
                                      }
                                    }}
                                    placeholder="100.0"
                                    className="text-xs flex-1"
                                  />
                                </div>
                                <p className="text-[10px] text-gray-500">
                                  {t(
                                    'pricing_tuning_studio.labor_rates.default_hint',
                                    'Used when region-specific rate is not set'
                                  )}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Overhead Allocation Section */}
                        <Card className="card-glass-dark">
                          <CardHeader className="pb-3 border-b border-gray-700">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <TrendingUp className="h-4 w-4 text-amber-400" />
                              {t('pricing_tuning_studio.overhead.title', 'Overhead Allocation')}
                            </CardTitle>
                            <CardDescription className="text-xs text-gray-400">
                              {t(
                                'pricing_tuning_studio.overhead.description',
                                'Configure how overhead costs are allocated to pricing'
                              )}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="p-4 space-y-4">
                            {/* Allocation Method */}
                            <div className="space-y-2">
                              <Label className="text-xs text-gray-300">
                                {t('pricing_tuning_studio.overhead.method', 'Allocation Method')}
                              </Label>
                              <Select
                                value={pricingState?.laborOverhead?.overheadAllocation?.method || 'percentage'}
                                onValueChange={(value) => {
                                  if (pricingState) {
                                    const currentConfig = pricingState.laborOverhead || {
                                      laborRates: {},
                                      overheadAllocation: { method: 'percentage' },
                                      installationCosts: {},
                                      complexityMultipliers: {},
                                    };
                                    setPricingState({
                                      ...pricingState,
                                      laborOverhead: {
                                        ...currentConfig,
                                        overheadAllocation: {
                                          ...currentConfig.overheadAllocation,
                                          method: value as 'percentage' | 'fixed' | 'per_unit' | 'custom',
                                        },
                                      },
                                    });
                                    setIsDirty(true);
                                  }
                                }}
                              >
                                <SelectTrigger className="text-xs h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-gray-900 border-gray-700">
                                  <SelectItem value="percentage">Percentage of Material Cost</SelectItem>
                                  <SelectItem value="fixed">Fixed Amount</SelectItem>
                                  <SelectItem value="per_unit">Per Unit</SelectItem>
                                  <SelectItem value="custom">Custom Formula</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Method-specific inputs */}
                            {pricingState?.laborOverhead?.overheadAllocation?.method === 'percentage' && (
                              <div className="space-y-2">
                                <Label htmlFor="overhead-percentage" className="text-xs text-gray-300">
                                  {t('pricing_tuning_studio.overhead.percentage', 'Overhead Percentage (%)')}
                                </Label>
                                <Input
                                  id="overhead-percentage"
                                  type="number"
                                  step="0.1"
                                  value={
                                    pricingState?.laborOverhead?.overheadAllocation?.percentage?.toFixed(1) || ''
                                  }
                                  onChange={(e) => {
                                    const value = parseFloat(e.target.value);
                                    if (!isNaN(value) && pricingState) {
                                      const currentConfig = pricingState.laborOverhead || {
                                        laborRates: {},
                                        overheadAllocation: { method: 'percentage' },
                                        installationCosts: {},
                                        complexityMultipliers: {},
                                      };
                                      setPricingState({
                                        ...pricingState,
                                        laborOverhead: {
                                          ...currentConfig,
                                          overheadAllocation: {
                                            ...currentConfig.overheadAllocation,
                                            percentage: value,
                                          },
                                        },
                                      });
                                      setIsDirty(true);
                                    }
                                  }}
                                  placeholder="15.0"
                                  className="text-xs"
                                />
                              </div>
                            )}

                            {pricingState?.laborOverhead?.overheadAllocation?.method === 'fixed' && (
                              <div className="space-y-2">
                                <Label htmlFor="overhead-fixed" className="text-xs text-gray-300">
                                  {t('pricing_tuning_studio.overhead.fixed', 'Fixed Overhead Amount')}
                                </Label>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-400">{pricingState?.currency || 'EGP'}</span>
                                  <Input
                                    id="overhead-fixed"
                                    type="number"
                                    step="0.1"
                                    value={
                                      pricingState?.laborOverhead?.overheadAllocation?.fixedAmount?.toFixed(1) || ''
                                    }
                                    onChange={(e) => {
                                      const value = parseFloat(e.target.value);
                                      if (!isNaN(value) && pricingState) {
                                        const currentConfig = pricingState.laborOverhead || {
                                          laborRates: {},
                                          overheadAllocation: { method: 'fixed' },
                                          installationCosts: {},
                                          complexityMultipliers: {},
                                        };
                                        setPricingState({
                                          ...pricingState,
                                          laborOverhead: {
                                            ...currentConfig,
                                            overheadAllocation: {
                                              ...currentConfig.overheadAllocation,
                                              fixedAmount: value,
                                            },
                                          },
                                        });
                                        setIsDirty(true);
                                      }
                                    }}
                                    placeholder="500.0"
                                    className="text-xs flex-1"
                                  />
                                </div>
                              </div>
                            )}

                            {pricingState?.laborOverhead?.overheadAllocation?.method === 'per_unit' && (
                              <div className="space-y-2">
                                <Label htmlFor="overhead-per-unit" className="text-xs text-gray-300">
                                  {t('pricing_tuning_studio.overhead.per_unit', 'Overhead Per Unit')}
                                </Label>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-400">{pricingState?.currency || 'EGP'}</span>
                                  <Input
                                    id="overhead-per-unit"
                                    type="number"
                                    step="0.1"
                                    value={
                                      pricingState?.laborOverhead?.overheadAllocation?.perUnitAmount?.toFixed(1) || ''
                                    }
                                    onChange={(e) => {
                                      const value = parseFloat(e.target.value);
                                      if (!isNaN(value) && pricingState) {
                                        const currentConfig = pricingState.laborOverhead || {
                                          laborRates: {},
                                          overheadAllocation: { method: 'per_unit' },
                                          installationCosts: {},
                                          complexityMultipliers: {},
                                        };
                                        setPricingState({
                                          ...pricingState,
                                          laborOverhead: {
                                            ...currentConfig,
                                            overheadAllocation: {
                                              ...currentConfig.overheadAllocation,
                                              perUnitAmount: value,
                                            },
                                          },
                                        });
                                        setIsDirty(true);
                                      }
                                    }}
                                    placeholder="50.0"
                                    className="text-xs flex-1"
                                  />
                                </div>
                              </div>
                            )}

                            {pricingState?.laborOverhead?.overheadAllocation?.method === 'custom' && (
                              <div className="space-y-2">
                                <Label htmlFor="overhead-custom-formula" className="text-xs text-gray-300">
                                  {t('pricing_tuning_studio.overhead.custom_formula', 'Custom Formula')}
                                </Label>
                                <Input
                                  id="overhead-custom-formula"
                                  value={pricingState?.laborOverhead?.overheadAllocation?.customFormula || ''}
                                  onChange={(e) => {
                                    if (pricingState) {
                                      const currentConfig = pricingState.laborOverhead || {
                                        laborRates: {},
                                        overheadAllocation: { method: 'custom' },
                                        installationCosts: {},
                                        complexityMultipliers: {},
                                      };
                                      setPricingState({
                                        ...pricingState,
                                        laborOverhead: {
                                          ...currentConfig,
                                          overheadAllocation: {
                                            ...currentConfig.overheadAllocation,
                                            customFormula: e.target.value,
                                          },
                                        },
                                      });
                                      setIsDirty(true);
                                    }
                                  }}
                                  placeholder="materialCost * 0.15 + 100"
                                  className="text-xs"
                                />
                                <p className="text-[10px] text-gray-500">
                                  {t(
                                    'pricing_tuning_studio.overhead.custom_hint',
                                    'Use variables: materialCost, laborCost, quantity'
                                  )}
                                </p>
                              </div>
                            )}
                          </CardContent>
                        </Card>

                        {/* Installation Costs Section */}
                        <Card className="card-glass-dark">
                          <CardHeader className="pb-3 border-b border-gray-700">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Package className="h-4 w-4 text-amber-400" />
                              {t('pricing_tuning_studio.installation.title', 'Installation Costs')}
                            </CardTitle>
                            <CardDescription className="text-xs text-gray-400">
                              {t(
                                'pricing_tuning_studio.installation.description',
                                'Configure installation cost rates and complexity multipliers'
                              )}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="p-4 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {/* Base Installation Rate */}
                              <div className="space-y-2">
                                <Label htmlFor="installation-base-rate" className="text-xs text-gray-300">
                                  {t('pricing_tuning_studio.installation.base_rate', 'Base Rate')}
                                </Label>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-400">{pricingState?.currency || 'EGP'}</span>
                                  <Input
                                    id="installation-base-rate"
                                    type="number"
                                    step="0.1"
                                    value={
                                      pricingState?.laborOverhead?.installationCosts?.baseRate?.toFixed(1) || ''
                                    }
                                    onChange={(e) => {
                                      const value = parseFloat(e.target.value);
                                      if (!isNaN(value) && pricingState) {
                                        const currentConfig = pricingState.laborOverhead || {
                                          laborRates: {},
                                          overheadAllocation: { method: 'percentage' },
                                          installationCosts: {},
                                          complexityMultipliers: {},
                                        };
                                        setPricingState({
                                          ...pricingState,
                                          laborOverhead: {
                                            ...currentConfig,
                                            installationCosts: {
                                              ...currentConfig.installationCosts,
                                              baseRate: value,
                                            },
                                          },
                                        });
                                        setIsDirty(true);
                                      }
                                    }}
                                    placeholder="200.0"
                                    className="text-xs flex-1"
                                  />
                                </div>
                              </div>

                              {/* Per Square Meter */}
                              <div className="space-y-2">
                                <Label htmlFor="installation-per-m2" className="text-xs text-gray-300">
                                  {t('pricing_tuning_studio.installation.per_m2', 'Per m²')}
                                </Label>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-400">{pricingState?.currency || 'EGP'}</span>
                                  <Input
                                    id="installation-per-m2"
                                    type="number"
                                    step="0.1"
                                    value={
                                      pricingState?.laborOverhead?.installationCosts?.perSquareMeter?.toFixed(1) || ''
                                    }
                                    onChange={(e) => {
                                      const value = parseFloat(e.target.value);
                                      if (!isNaN(value) && pricingState) {
                                        const currentConfig = pricingState.laborOverhead || {
                                          laborRates: {},
                                          overheadAllocation: { method: 'percentage' },
                                          installationCosts: {},
                                          complexityMultipliers: {},
                                        };
                                        setPricingState({
                                          ...pricingState,
                                          laborOverhead: {
                                            ...currentConfig,
                                            installationCosts: {
                                              ...currentConfig.installationCosts,
                                              perSquareMeter: value,
                                            },
                                          },
                                        });
                                        setIsDirty(true);
                                      }
                                    }}
                                    placeholder="50.0"
                                    className="text-xs flex-1"
                                  />
                                </div>
                              </div>

                              {/* Per Unit */}
                              <div className="space-y-2">
                                <Label htmlFor="installation-per-unit" className="text-xs text-gray-300">
                                  {t('pricing_tuning_studio.installation.per_unit', 'Per Unit')}
                                </Label>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-400">{pricingState?.currency || 'EGP'}</span>
                                  <Input
                                    id="installation-per-unit"
                                    type="number"
                                    step="0.1"
                                    value={
                                      pricingState?.laborOverhead?.installationCosts?.perUnit?.toFixed(1) || ''
                                    }
                                    onChange={(e) => {
                                      const value = parseFloat(e.target.value);
                                      if (!isNaN(value) && pricingState) {
                                        const currentConfig = pricingState.laborOverhead || {
                                          laborRates: {},
                                          overheadAllocation: { method: 'percentage' },
                                          installationCosts: {},
                                          complexityMultipliers: {},
                                        };
                                        setPricingState({
                                          ...pricingState,
                                          laborOverhead: {
                                            ...currentConfig,
                                            installationCosts: {
                                              ...currentConfig.installationCosts,
                                              perUnit: value,
                                            },
                                          },
                                        });
                                        setIsDirty(true);
                                      }
                                    }}
                                    placeholder="150.0"
                                    className="text-xs flex-1"
                                  />
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Complexity Multipliers Section */}
                        <Card className="card-glass-dark">
                          <CardHeader className="pb-3 border-b border-gray-700">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Calculator className="h-4 w-4 text-amber-400" />
                              {t('pricing_tuning_studio.complexity.title', 'Complexity Multipliers')}
                            </CardTitle>
                            <CardDescription className="text-xs text-gray-400">
                              {t(
                                'pricing_tuning_studio.complexity.description',
                                'Configure multipliers for different installation complexity levels'
                              )}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="p-4 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {/* Simple Complexity */}
                              <div className="space-y-2">
                                <Label htmlFor="complexity-simple" className="text-xs text-gray-300">
                                  {t('pricing_tuning_studio.complexity.simple', 'Simple Multiplier')}
                                </Label>
                                <Input
                                  id="complexity-simple"
                                  type="number"
                                  step="0.1"
                                  value={
                                    pricingState?.laborOverhead?.complexityMultipliers?.simple?.toFixed(1) || ''
                                  }
                                  onChange={(e) => {
                                    const value = parseFloat(e.target.value);
                                    if (!isNaN(value) && pricingState) {
                                      const currentConfig = pricingState.laborOverhead || {
                                        laborRates: {},
                                        overheadAllocation: { method: 'percentage' },
                                        installationCosts: {},
                                        complexityMultipliers: {},
                                      };
                                      setPricingState({
                                        ...pricingState,
                                        laborOverhead: {
                                          ...currentConfig,
                                          complexityMultipliers: {
                                            ...currentConfig.complexityMultipliers,
                                            simple: value,
                                          },
                                        },
                                      });
                                      setIsDirty(true);
                                    }
                                  }}
                                  placeholder="0.8"
                                  className="text-xs"
                                />
                                <p className="text-[10px] text-gray-500">
                                  {t('pricing_tuning_studio.complexity.simple_hint', 'Standard installations')}
                                </p>
                              </div>

                              {/* Standard Complexity */}
                              <div className="space-y-2">
                                <Label htmlFor="complexity-standard" className="text-xs text-gray-300">
                                  {t('pricing_tuning_studio.complexity.standard', 'Standard Multiplier')}
                                </Label>
                                <Input
                                  id="complexity-standard"
                                  type="number"
                                  step="0.1"
                                  value={
                                    pricingState?.laborOverhead?.complexityMultipliers?.standard?.toFixed(1) || ''
                                  }
                                  onChange={(e) => {
                                    const value = parseFloat(e.target.value);
                                    if (!isNaN(value) && pricingState) {
                                      const currentConfig = pricingState.laborOverhead || {
                                        laborRates: {},
                                        overheadAllocation: { method: 'percentage' },
                                        installationCosts: {},
                                        complexityMultipliers: {},
                                      };
                                      setPricingState({
                                        ...pricingState,
                                        laborOverhead: {
                                          ...currentConfig,
                                          complexityMultipliers: {
                                            ...currentConfig.complexityMultipliers,
                                            standard: value,
                                          },
                                        },
                                      });
                                      setIsDirty(true);
                                    }
                                  }}
                                  placeholder="1.0"
                                  className="text-xs"
                                />
                                <p className="text-[10px] text-gray-500">
                                  {t('pricing_tuning_studio.complexity.standard_hint', 'Default multiplier')}
                                </p>
                              </div>

                              {/* Complex Complexity */}
                              <div className="space-y-2">
                                <Label htmlFor="complexity-complex" className="text-xs text-gray-300">
                                  {t('pricing_tuning_studio.complexity.complex', 'Complex Multiplier')}
                                </Label>
                                <Input
                                  id="complexity-complex"
                                  type="number"
                                  step="0.1"
                                  value={
                                    pricingState?.laborOverhead?.complexityMultipliers?.complex?.toFixed(1) || ''
                                  }
                                  onChange={(e) => {
                                    const value = parseFloat(e.target.value);
                                    if (!isNaN(value) && pricingState) {
                                      const currentConfig = pricingState.laborOverhead || {
                                        laborRates: {},
                                        overheadAllocation: { method: 'percentage' },
                                        installationCosts: {},
                                        complexityMultipliers: {},
                                      };
                                      setPricingState({
                                        ...pricingState,
                                        laborOverhead: {
                                          ...currentConfig,
                                          complexityMultipliers: {
                                            ...currentConfig.complexityMultipliers,
                                            complex: value,
                                          },
                                        },
                                      });
                                      setIsDirty(true);
                                    }
                                  }}
                                  placeholder="1.5"
                                  className="text-xs"
                                />
                                <p className="text-[10px] text-gray-500">
                                  {t('pricing_tuning_studio.complexity.complex_hint', 'Complex installations')}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>

                    {/* Tab 4: Pricing Rules */}
                    <TabsContent value="pricing-rules" className="flex-1 overflow-y-auto">
                      <div className="space-y-4">
                        {/* Quantity Breaks Section */}
                        <Card className="card-glass-dark">
                          <CardHeader className="pb-3 border-b border-gray-700">
                            <div className="flex items-center justify-between">
                              <div>
                                <CardTitle className="text-sm flex items-center gap-2">
                                  <TrendingDown className="h-4 w-4 text-amber-400" />
                                  {t('pricing_tuning_studio.quantity_breaks.title', 'Quantity Breaks')}
                                </CardTitle>
                                <CardDescription className="text-xs text-gray-400">
                                  {t(
                                    'pricing_tuning_studio.quantity_breaks.description',
                                    'Configure volume discounts based on order quantity'
                                  )}
                                </CardDescription>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingQuantityBreak({
                                    id: `qb-${Date.now()}`,
                                    minQuantity: 0,
                                    discountPercentage: 0,
                                    isActive: true,
                                  });
                                  setShowQuantityBreakDialog(true);
                                }}
                                className="text-xs h-7"
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                {t('pricing_tuning_studio.quantity_breaks.add', 'Add Break')}
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent className="p-4">
                            {pricingState?.pricingRules?.quantityBreaks && pricingState.pricingRules.quantityBreaks.length > 0 ? (
                              <div className="space-y-2">
                                {pricingState.pricingRules.quantityBreaks
                                  .sort((a, b) => a.minQuantity - b.minQuantity)
                                  .map((breakRule) => (
                                    <div
                                      key={breakRule.id}
                                      className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50 border border-gray-700"
                                    >
                                      <div className="flex-1">
                                        <div className="flex items-center gap-3">
                                          <span className="text-xs font-medium text-gray-200">
                                            {breakRule.minQuantity}
                                            {breakRule.maxQuantity !== undefined
                                              ? ` - ${breakRule.maxQuantity - 1}`
                                              : '+'}{' '}
                                            {t('pricing_tuning_studio.quantity_breaks.units', 'units')}
                                          </span>
                                          {breakRule.discountPercentage !== undefined && (
                                            <Badge variant="outline" className="text-xs">
                                              {breakRule.discountPercentage > 0 ? '-' : ''}
                                              {Math.abs(breakRule.discountPercentage)}%
                                            </Badge>
                                          )}
                                          {breakRule.priceMultiplier !== undefined && (
                                            <Badge variant="outline" className="text-xs">
                                              {breakRule.priceMultiplier < 1 ? '-' : ''}
                                              {Math.abs((1 - breakRule.priceMultiplier) * 100).toFixed(1)}%
                                            </Badge>
                                          )}
                                          {!breakRule.isActive && (
                                            <Badge variant="secondary" className="text-xs">
                                              {t('common.inactive', 'Inactive')}
                                            </Badge>
                                          )}
                                        </div>
                                        {breakRule.notes && (
                                          <p className="text-[10px] text-gray-400 mt-1">{breakRule.notes}</p>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            setEditingQuantityBreak(breakRule);
                                            setShowQuantityBreakDialog(true);
                                          }}
                                          className="h-7 w-7 p-0"
                                        >
                                          <Settings className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            if (pricingState) {
                                              const currentRules = pricingState.pricingRules || {
                                                quantityBreaks: [],
                                                customerTiers: [],
                                                seasonalAdjustments: [],
                                              };
                                              const updatedBreaks = (currentRules.quantityBreaks || []).filter(
                                                (b) => b.id !== breakRule.id
                                              );
                                              setPricingState({
                                                ...pricingState,
                                                pricingRules: {
                                                  ...currentRules,
                                                  quantityBreaks: updatedBreaks,
                                                },
                                              });
                                              setIsDirty(true);
                                            }
                                          }}
                                          className="h-7 w-7 p-0 text-red-400 hover:text-red-300"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            ) : (
                              <p className="text-xs text-gray-400 text-center py-4">
                                {t('pricing_tuning_studio.quantity_breaks.empty', 'No quantity breaks configured')}
                              </p>
                            )}
                          </CardContent>
                        </Card>

                        {/* Customer Tiers Section */}
                        <Card className="card-glass-dark">
                          <CardHeader className="pb-3 border-b border-gray-700">
                            <div className="flex items-center justify-between">
                              <div>
                                <CardTitle className="text-sm flex items-center gap-2">
                                  <Users className="h-4 w-4 text-amber-400" />
                                  {t('pricing_tuning_studio.customer_tiers.title', 'Customer Tiers')}
                                </CardTitle>
                                <CardDescription className="text-xs text-gray-400">
                                  {t(
                                    'pricing_tuning_studio.customer_tiers.description',
                                    'Configure pricing tiers for different customer segments'
                                  )}
                                </CardDescription>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingCustomerTier({
                                    id: `ct-${Date.now()}`,
                                    tierName: '',
                                    isActive: true,
                                  });
                                  setShowCustomerTierDialog(true);
                                }}
                                className="text-xs h-7"
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                {t('pricing_tuning_studio.customer_tiers.add', 'Add Tier')}
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent className="p-4">
                            {pricingState?.pricingRules?.customerTiers && pricingState.pricingRules.customerTiers.length > 0 ? (
                              <div className="space-y-2">
                                {pricingState.pricingRules.customerTiers.map((tier) => (
                                  <div
                                    key={tier.id}
                                    className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50 border border-gray-700"
                                  >
                                    <div className="flex-1">
                                      <div className="flex items-center gap-3">
                                        <span className="text-xs font-medium text-gray-200">{tier.tierName}</span>
                                        {tier.discountPercentage !== undefined && (
                                          <Badge variant="outline" className="text-xs">
                                            {t('pricing_tuning_studio.customer_tiers.discount', 'Discount')}:{' '}
                                            {tier.discountPercentage}%
                                          </Badge>
                                        )}
                                        {tier.markupPercentage !== undefined && (
                                          <Badge variant="outline" className="text-xs">
                                            {t('pricing_tuning_studio.customer_tiers.markup', 'Markup')}:{' '}
                                            {tier.markupPercentage}%
                                          </Badge>
                                        )}
                                        {tier.minOrderValue !== undefined && (
                                          <Badge variant="outline" className="text-xs">
                                            {t('pricing_tuning_studio.customer_tiers.min_order', 'Min')}:{' '}
                                            {pricingState?.currency || 'EGP'} {tier.minOrderValue}
                                          </Badge>
                                        )}
                                        {!tier.isActive && (
                                          <Badge variant="secondary" className="text-xs">
                                            {t('common.inactive', 'Inactive')}
                                          </Badge>
                                        )}
                                      </div>
                                      {tier.notes && (
                                        <p className="text-[10px] text-gray-400 mt-1">{tier.notes}</p>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          setEditingCustomerTier(tier);
                                          setShowCustomerTierDialog(true);
                                        }}
                                        className="h-7 w-7 p-0"
                                      >
                                        <Settings className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          if (pricingState) {
                                            const currentRules = pricingState.pricingRules || {
                                              quantityBreaks: [],
                                              customerTiers: [],
                                              seasonalAdjustments: [],
                                            };
                                            const updatedTiers = (currentRules.customerTiers || []).filter(
                                              (t) => t.id !== tier.id
                                            );
                                            setPricingState({
                                              ...pricingState,
                                              pricingRules: {
                                                ...currentRules,
                                                customerTiers: updatedTiers,
                                              },
                                            });
                                            setIsDirty(true);
                                          }
                                        }}
                                        className="h-7 w-7 p-0 text-red-400 hover:text-red-300"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-gray-400 text-center py-4">
                                {t('pricing_tuning_studio.customer_tiers.empty', 'No customer tiers configured')}
                              </p>
                            )}
                          </CardContent>
                        </Card>

                        {/* Seasonal Adjustments Section */}
                        <Card className="card-glass-dark">
                          <CardHeader className="pb-3 border-b border-gray-700">
                            <div className="flex items-center justify-between">
                              <div>
                                <CardTitle className="text-sm flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-amber-400" />
                                  {t('pricing_tuning_studio.seasonal_adjustments.title', 'Seasonal Adjustments')}
                                </CardTitle>
                                <CardDescription className="text-xs text-gray-400">
                                  {t(
                                    'pricing_tuning_studio.seasonal_adjustments.description',
                                    'Configure time-based pricing adjustments'
                                  )}
                                </CardDescription>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const today = new Date().toISOString().split('T')[0];
                                  const nextMonth = new Date();
                                  nextMonth.setMonth(nextMonth.getMonth() + 1);
                                  setEditingSeasonalAdjustment({
                                    id: `sa-${Date.now()}`,
                                    name: '',
                                    startDate: today,
                                    endDate: nextMonth.toISOString().split('T')[0],
                                    adjustmentPercentage: 0,
                                    adjustmentType: 'discount',
                                    isActive: true,
                                  });
                                  setShowSeasonalAdjustmentDialog(true);
                                }}
                                className="text-xs h-7"
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                {t('pricing_tuning_studio.seasonal_adjustments.add', 'Add Adjustment')}
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent className="p-4">
                            {pricingState?.pricingRules?.seasonalAdjustments &&
                            pricingState.pricingRules.seasonalAdjustments.length > 0 ? (
                              <div className="space-y-2">
                                {pricingState.pricingRules.seasonalAdjustments.map((adjustment) => (
                                  <div
                                    key={adjustment.id}
                                    className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50 border border-gray-700"
                                  >
                                    <div className="flex-1">
                                      <div className="flex items-center gap-3 flex-wrap">
                                        <span className="text-xs font-medium text-gray-200">{adjustment.name}</span>
                                        <Badge variant="outline" className="text-xs">
                                          {adjustment.startDate} - {adjustment.endDate}
                                        </Badge>
                                        <Badge
                                          variant={adjustment.adjustmentPercentage >= 0 ? 'default' : 'destructive'}
                                          className="text-xs"
                                        >
                                          {adjustment.adjustmentPercentage > 0 ? '+' : ''}
                                          {adjustment.adjustmentPercentage}%
                                        </Badge>
                                        <Badge variant="outline" className="text-xs">
                                          {t(
                                            `pricing_tuning_studio.seasonal_adjustments.type.${adjustment.adjustmentType}`,
                                            adjustment.adjustmentType
                                          )}
                                        </Badge>
                                        {adjustment.applicableRegions && adjustment.applicableRegions.length > 0 && (
                                          <Badge variant="outline" className="text-xs">
                                            {adjustment.applicableRegions.join(', ')}
                                          </Badge>
                                        )}
                                        {!adjustment.isActive && (
                                          <Badge variant="secondary" className="text-xs">
                                            {t('common.inactive', 'Inactive')}
                                          </Badge>
                                        )}
                                      </div>
                                      {adjustment.notes && (
                                        <p className="text-[10px] text-gray-400 mt-1">{adjustment.notes}</p>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          setEditingSeasonalAdjustment(adjustment);
                                          setShowSeasonalAdjustmentDialog(true);
                                        }}
                                        className="h-7 w-7 p-0"
                                      >
                                        <Settings className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          if (pricingState) {
                                            const currentRules = pricingState.pricingRules || {
                                              quantityBreaks: [],
                                              customerTiers: [],
                                              seasonalAdjustments: [],
                                            };
                                            const updatedAdjustments = (currentRules.seasonalAdjustments || []).filter(
                                              (a) => a.id !== adjustment.id
                                            );
                                            setPricingState({
                                              ...pricingState,
                                              pricingRules: {
                                                ...currentRules,
                                                seasonalAdjustments: updatedAdjustments,
                                              },
                                            });
                                            setIsDirty(true);
                                          }
                                        }}
                                        className="h-7 w-7 p-0 text-red-400 hover:text-red-300"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-gray-400 text-center py-4">
                                {t(
                                  'pricing_tuning_studio.seasonal_adjustments.empty',
                                  'No seasonal adjustments configured'
                                )}
                              </p>
                            )}
                          </CardContent>
                        </Card>

                        {/* Global Pricing Rules Settings */}
                        <Card className="card-glass-dark">
                          <CardHeader className="pb-3 border-b border-gray-700">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Tag className="h-4 w-4 text-amber-400" />
                              {t('pricing_tuning_studio.global_rules.title', 'Global Pricing Rules')}
                            </CardTitle>
                            <CardDescription className="text-xs text-gray-400">
                              {t(
                                'pricing_tuning_studio.global_rules.description',
                                'Configure default discount limits and global settings'
                              )}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="p-4 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Default Discount Percentage */}
                              <div className="space-y-2">
                                <Label htmlFor="default-discount" className="text-xs text-gray-300">
                                  {t('pricing_tuning_studio.global_rules.default_discount', 'Default Discount (%)')}
                                </Label>
                                <Input
                                  id="default-discount"
                                  type="number"
                                  step="0.1"
                                  value={
                                    pricingState?.pricingRules?.defaultDiscountPercentage?.toFixed(1) || ''
                                  }
                                  onChange={(e) => {
                                    const value = parseFloat(e.target.value);
                                    if (!isNaN(value) && pricingState) {
                                      const currentRules = pricingState.pricingRules || {
                                        quantityBreaks: [],
                                        customerTiers: [],
                                        seasonalAdjustments: [],
                                      };
                                      setPricingState({
                                        ...pricingState,
                                        pricingRules: {
                                          ...currentRules,
                                          defaultDiscountPercentage: value,
                                        },
                                      });
                                      setIsDirty(true);
                                    }
                                  }}
                                  placeholder="0.0"
                                  className="text-xs"
                                />
                              </div>

                              {/* Max Discount Percentage */}
                              <div className="space-y-2">
                                <Label htmlFor="max-discount" className="text-xs text-gray-300">
                                  {t('pricing_tuning_studio.global_rules.max_discount', 'Max Discount (%)')}
                                </Label>
                                <Input
                                  id="max-discount"
                                  type="number"
                                  step="0.1"
                                  value={
                                    pricingState?.pricingRules?.maxDiscountPercentage?.toFixed(1) || ''
                                  }
                                  onChange={(e) => {
                                    const value = parseFloat(e.target.value);
                                    if (!isNaN(value) && pricingState) {
                                      const currentRules = pricingState.pricingRules || {
                                        quantityBreaks: [],
                                        customerTiers: [],
                                        seasonalAdjustments: [],
                                      };
                                      setPricingState({
                                        ...pricingState,
                                        pricingRules: {
                                          ...currentRules,
                                          maxDiscountPercentage: value,
                                        },
                                      });
                                      setIsDirty(true);
                                    }
                                  }}
                                  placeholder="50.0"
                                  className="text-xs"
                                />
                                <p className="text-[10px] text-gray-500">
                                  {t(
                                    'pricing_tuning_studio.global_rules.max_discount_hint',
                                    'Maximum discount allowed across all rules'
                                  )}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>

                    <TabsContent value="history" className="flex-1 overflow-y-auto">
                      <Card className="card-glass-dark h-full flex flex-col">
                        <CardHeader className="pb-3 border-b border-gray-700">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <History className="h-4 w-4 text-amber-400" />
                            {t('pricing_tuning_studio.history.title', 'Price History & Rollback')}
                          </CardTitle>
                          <CardDescription className="text-xs text-gray-400">
                            {t(
                              'pricing_tuning_studio.history.description',
                              'View pricing changes and rollback to previous versions'
                            )}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-y-auto p-4">
                          {loadingHistory ? (
                            <div className="flex items-center justify-center py-8">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400" />
                            </div>
                          ) : priceHistory.length === 0 ? (
                            <div className="text-center py-8">
                              <History className={cn(ICON_LARGE, 'mx-auto mb-4 text-gray-400')} />
                              <p className="text-gray-300 mb-2">
                                {t('pricing_tuning_studio.history.no_history', 'No price history found')}
                              </p>
                              <p className="text-xs text-gray-500">
                                {t(
                                  'pricing_tuning_studio.history.no_history_hint',
                                  'Price changes will be tracked here once you save pricing.'
                                )}
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {priceHistory.map((entry, idx) => {
                                const isLatest = idx === 0;
                                const changeTypeColors = {
                                  update: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
                                  bulk_update: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
                                  rollback: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
                                  initial_setup: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
                                };

                                return (
                                  <Card
                                    key={entry.id}
                                    className={`card-glass-dark border ${
                                      isLatest ? 'border-amber-500/50' : 'border-gray-700'
                                    }`}
                                  >
                                    <CardContent className="p-4">
                                      <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 space-y-2">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <Badge
                                              variant="outline"
                                              className={`text-[10px] ${changeTypeColors[entry.changeType]}`}
                                            >
                                              {entry.changeType.replace('_', ' ')}
                                            </Badge>
                                            {isLatest && (
                                              <Badge
                                                variant="outline"
                                                className="text-[10px] bg-amber-500/20 text-amber-300 border-amber-500/40"
                                              >
                                                Latest
                                              </Badge>
                                            )}
                                            <span className="text-xs text-gray-400">
                                              Version {entry.versionNumber}
                                            </span>
                                          </div>
                                          <p className="text-xs text-gray-300">
                                            {new Date(entry.createdAt).toLocaleString()}
                                          </p>
                                          {entry.reason && (
                                            <p className="text-xs text-gray-400 italic">
                                              {entry.reason}
                                            </p>
                                          )}
                                          <div className="flex items-center gap-4 text-[10px] text-gray-500 pt-1">
                                            <span>
                                              Profiles: {Object.keys(entry.pricingData.profilePrices || {}).length}
                                            </span>
                                            <span>
                                              Hardware: {Object.keys(entry.pricingData.hardware || {}).length}
                                            </span>
                                            <span>
                                              Currency: {entry.pricingData.currency}
                                            </span>
                                          </div>
                                        </div>
                                        {!isLatest && (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                              setSelectedHistoryEntry(entry);
                                              setShowRollbackDialog(true);
                                            }}
                                            className="text-xs h-7 bg-amber-600/20 hover:bg-amber-600/30 border-amber-600/40 text-amber-300"
                                          >
                                            <History className="h-3 w-3 mr-1.5" />
                                            Rollback
                                          </Button>
                                        )}
                                      </div>
                                    </CardContent>
                                  </Card>
                                );
                              })}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="validation" className="flex-1 overflow-y-auto">
                      <Card className="card-glass-dark h-full flex flex-col">
                        <CardHeader className="pb-3 border-b border-gray-700">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Shield className="h-4 w-4 text-amber-400" />
                            {t('pricing_tuning_studio.validation_tab.title', 'Validation & Quality')}
                          </CardTitle>
                          <CardDescription className="text-xs text-gray-400">
                            {t(
                              'pricing_tuning_studio.validation_tab.description',
                              'Comprehensive pricing validation with alerts and recommendations'
                            )}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-y-auto p-4">
                          {comprehensiveValidation ? (
                            <div className="space-y-6">
                              {/* Validation Score */}
                              <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`h-16 w-16 rounded-full flex items-center justify-center font-bold text-xl ${
                                      comprehensiveValidation.score >= 80
                                        ? 'bg-emerald-500/20 text-emerald-300 border-2 border-emerald-500/40'
                                        : comprehensiveValidation.score >= 60
                                        ? 'bg-amber-500/20 text-amber-300 border-2 border-amber-500/40'
                                        : 'bg-red-500/20 text-red-300 border-2 border-red-500/40'
                                    }`}
                                  >
                                    {comprehensiveValidation.score}
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-gray-200">
                                      {t('pricing_tuning_studio.validation_tab.score', 'Validation Score')}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                      {comprehensiveValidation.isValid
                                        ? t('pricing_tuning_studio.validation_tab.valid', 'Configuration is valid')
                                        : t('pricing_tuning_studio.validation_tab.invalid', 'Issues found')}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-4 text-xs">
                                  <div className="text-center">
                                    <p className="text-red-400 font-semibold">{comprehensiveValidation.errors.length}</p>
                                    <p className="text-gray-500">Errors</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-amber-400 font-semibold">
                                      {comprehensiveValidation.warnings.length}
                                    </p>
                                    <p className="text-gray-500">Warnings</p>
                                  </div>
                                </div>
                              </div>

                              {/* Errors Section */}
                              {comprehensiveValidation.errors.length > 0 && (
                                <div className="space-y-2">
                                  <h3 className="text-sm font-semibold text-red-400 flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4" />
                                    {t('pricing_tuning_studio.validation_tab.errors', 'Errors')} (
                                    {comprehensiveValidation.errors.length})
                                  </h3>
                                  <div className="space-y-2">
                                    {comprehensiveValidation.errors.map((error, idx) => (
                                      <Card key={idx} className="bg-red-500/10 border-red-500/30">
                                        <CardContent className="p-3">
                                          <div className="flex items-start gap-2">
                                            <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                                            <div className="flex-1">
                                              <p className="text-sm font-medium text-red-300">{error.message}</p>
                                              {error.entityName && (
                                                <p className="text-xs text-red-400/70 mt-1">
                                                  {error.entityType}: {error.entityName}
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                        </CardContent>
                                      </Card>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Warnings Section */}
                              {comprehensiveValidation.warnings.length > 0 && (
                                <div className="space-y-2">
                                  <h3 className="text-sm font-semibold text-amber-400 flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4" />
                                    {t('pricing_tuning_studio.validation_tab.warnings', 'Warnings')} (
                                    {comprehensiveValidation.warnings.length})
                                  </h3>
                                  <div className="space-y-2">
                                    {comprehensiveValidation.warnings.map((warning, idx) => (
                                      <Card key={idx} className="bg-amber-500/10 border-amber-500/30">
                                        <CardContent className="p-3">
                                          <div className="flex items-start gap-2">
                                            <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
                                            <div className="flex-1">
                                              <p className="text-sm font-medium text-amber-300">{warning.message}</p>
                                              {warning.entityName && (
                                                <p className="text-xs text-amber-400/70 mt-1">
                                                  {warning.entityType}: {warning.entityName}
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                        </CardContent>
                                      </Card>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Recommendations Section */}
                              {comprehensiveValidation.recommendations.length > 0 && (
                                <div className="space-y-2">
                                  <h3 className="text-sm font-semibold text-blue-400 flex items-center gap-2">
                                    <Info className="h-4 w-4" />
                                    {t('pricing_tuning_studio.validation_tab.recommendations', 'Recommendations')} (
                                    {comprehensiveValidation.recommendations.length})
                                  </h3>
                                  <div className="space-y-2">
                                    {comprehensiveValidation.recommendations.map((rec, idx) => (
                                      <Card key={idx} className="bg-blue-500/10 border-blue-500/30">
                                        <CardContent className="p-3">
                                          <div className="flex items-start gap-2">
                                            <Info className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
                                            <p className="text-sm text-blue-300">{rec}</p>
                                          </div>
                                        </CardContent>
                                      </Card>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* All Clear */}
                              {comprehensiveValidation.errors.length === 0 &&
                                comprehensiveValidation.warnings.length === 0 &&
                                comprehensiveValidation.recommendations.length === 0 && (
                                  <div className="text-center py-8">
                                    <CheckCircle className={cn(ICON_LARGE, 'mx-auto mb-4 text-emerald-400')} />
                                    <p className="text-gray-300 font-medium mb-2">
                                      {t('pricing_tuning_studio.validation_tab.all_clear', 'All Validations Passed')}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {t(
                                        'pricing_tuning_studio.validation_tab.all_clear_desc',
                                        'Your pricing configuration meets all quality standards.'
                                      )}
                                    </p>
                                  </div>
                                )}
                            </div>
                          ) : pricingState ? (
                            <div className="text-center py-8">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400 mx-auto mb-4" />
                              <p className="text-gray-300">
                                {t('pricing_tuning_studio.validation_tab.loading', 'Validating pricing...')}
                              </p>
                            </div>
                          ) : (
                            <div className="text-center py-8">
                              <Shield className={cn(ICON_LARGE, 'mx-auto mb-4 text-gray-400')} />
                              <p className="text-gray-300 mb-2">
                                {t(
                                  'pricing_tuning_studio.validation_tab.no_pricing',
                                  'No pricing configuration to validate'
                                )}
                              </p>
                              <p className="text-xs text-gray-500">
                                {t(
                                  'pricing_tuning_studio.validation_tab.no_pricing_hint',
                                  'Configure pricing to see validation results.'
                                )}
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="bulk-ops" className="flex-1 overflow-y-auto">
                      <div className="space-y-4">
                        {/* Import/Export Section */}
                        <Card className="card-glass-dark">
                          <CardHeader className="pb-3 border-b border-gray-700">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <FileUp className="h-4 w-4 text-amber-400" />
                              {t('pricing_tuning_studio.bulk_ops.import_export', 'Import & Export')}
                            </CardTitle>
                            <CardDescription className="text-xs text-gray-400">
                              {t(
                                'pricing_tuning_studio.bulk_ops.import_export_desc',
                                'Import pricing from files or export current configuration'
                              )}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="p-4 space-y-4">
                            {/* Export Section */}
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs font-semibold text-gray-300">
                                  {t('pricing_tuning_studio.bulk_ops.export', 'Export Pricing')}
                                </Label>
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleExportTemplate}
                                    className="text-xs"
                                  >
                                    <FileDown className="h-3 w-3 mr-1" />
                                    {t('pricing_tuning_studio.bulk_ops.template', 'Template')}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleExportPricing}
                                    disabled={!pricingState}
                                    className="text-xs"
                                  >
                                    <Download className="h-3 w-3 mr-1" />
                                    {t('pricing_tuning_studio.bulk_ops.export_json', 'Export JSON')}
                                  </Button>
                                </div>
                              </div>
                              <p className="text-[10px] text-gray-500">
                                {t(
                                  'pricing_tuning_studio.bulk_ops.export_hint',
                                  'Download current pricing configuration or template for editing'
                                )}
                              </p>
                            </div>

                            <Separator className="bg-gray-700" />

                            {/* Import Section */}
                            <div className="space-y-3">
                              <Label className="text-xs font-semibold text-gray-300">
                                {t('pricing_tuning_studio.bulk_ops.import', 'Import Pricing')}
                              </Label>
                              
                              {/* Import Mode Selection */}
                              <RadioGroup
                                value={importMode}
                                onValueChange={(value) => setImportMode(value as 'replace' | 'merge')}
                                className="flex gap-4"
                              >
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="replace" id="replace-mode" />
                                  <Label htmlFor="replace-mode" className="text-xs text-gray-400 cursor-pointer">
                                    {t('pricing_tuning_studio.bulk_ops.replace_mode', 'Replace')}
                                  </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="merge" id="merge-mode" />
                                  <Label htmlFor="merge-mode" className="text-xs text-gray-400 cursor-pointer">
                                    {t('pricing_tuning_studio.bulk_ops.merge_mode', 'Merge')}
                                  </Label>
                                </div>
                              </RadioGroup>

                              {/* File Upload */}
                              <div className="border-2 border-dashed border-gray-700 rounded-lg p-4">
                                <div className="flex flex-col items-center justify-center gap-3">
                                  <Input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".json,.csv"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleImportFile(file);
                                    }}
                                    className="hidden"
                                    id="import-file-input"
                                  />
                                  <Label
                                    htmlFor="import-file-input"
                                    className="cursor-pointer flex flex-col items-center gap-2"
                                  >
                                    <Upload className="h-8 w-8 text-gray-400" />
                                    <span className="text-xs text-gray-400">
                                      {importFile
                                        ? importFile.name
                                        : t(
                                            'pricing_tuning_studio.bulk_ops.select_file',
                                            'Click to select file (JSON/CSV)'
                                          )}
                                    </span>
                                  </Label>
                                  {importFile && (
                                    <Button
                                      size="sm"
                                      onClick={handleImportPricing}
                                      disabled={importProgress > 0 && importProgress < 100}
                                      className="text-xs"
                                    >
                                      {importProgress > 0 ? (
                                        <>
                                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2" />
                                          {importProgress}%
                                        </>
                                      ) : (
                                        <>
                                          <Upload className="h-3 w-3 mr-1" />
                                          {t('pricing_tuning_studio.bulk_ops.import', 'Import')}
                                        </>
                                      )}
                                    </Button>
                                  )}
                                  {importProgress > 0 && importProgress < 100 && (
                                    <Progress value={importProgress} className="w-full h-2" />
                                  )}
                                </div>
                              </div>

                              {/* Import Result */}
                              {importResult && (
                                <div
                                  className={`p-3 rounded-lg border ${
                                    importResult.success
                                      ? 'bg-emerald-500/10 border-emerald-500/30'
                                      : 'bg-red-500/10 border-red-500/30'
                                  }`}
                                >
                                  {importResult.success ? (
                                    <div className="flex items-start gap-2">
                                      <CheckCircle className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                                      <div className="flex-1">
                                        <p className="text-xs font-medium text-emerald-300">
                                          {t('pricing_tuning_studio.bulk_ops.import_success', 'Import successful')}
                                        </p>
                                        {importResult.warnings.length > 0 && (
                                          <p className="text-[10px] text-amber-400 mt-1">
                                            {t('pricing_tuning_studio.bulk_ops.warnings', 'Warnings:')}{' '}
                                            {importResult.warnings.slice(0, 2).join(', ')}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-start gap-2">
                                      <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                                      <div className="flex-1">
                                        <p className="text-xs font-medium text-red-300">
                                          {t('pricing_tuning_studio.bulk_ops.import_failed', 'Import failed')}
                                        </p>
                                        <ul className="text-[10px] text-red-400 mt-1 list-disc list-inside">
                                          {importResult.errors.slice(0, 3).map((error, idx) => (
                                            <li key={idx}>{error}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>

                        {/* Bulk Percentage Adjustment */}
                        <Card className="card-glass-dark">
                          <CardHeader className="pb-3 border-b border-gray-700">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Percent className="h-4 w-4 text-amber-400" />
                              {t('pricing_tuning_studio.bulk_ops.percentage_adjust', 'Percentage Adjustment')}
                            </CardTitle>
                            <CardDescription className="text-xs text-gray-400">
                              {t(
                                'pricing_tuning_studio.bulk_ops.percentage_desc',
                                'Apply percentage increase or decrease to all prices'
                              )}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="p-4 space-y-4">
                            <div className="flex gap-3 items-end">
                              <div className="flex-1">
                                <Label htmlFor="bulk-percentage" className="text-xs text-gray-300 mb-1 block">
                                  {t('pricing_tuning_studio.bulk_ops.percentage', 'Percentage (%)')}
                                </Label>
                                <Input
                                  id="bulk-percentage"
                                  type="number"
                                  step="0.1"
                                  value={bulkPercentage}
                                  onChange={(e) => setBulkPercentage(e.target.value)}
                                  placeholder="e.g., 10 or -5"
                                  className="text-xs"
                                />
                              </div>
                              <Button
                                onClick={handleBulkPercentageChange}
                                disabled={!bulkPercentage || !pricingState || saving}
                                size="sm"
                                className="text-xs"
                              >
                                <TrendingUp className="h-3 w-3 mr-1" />
                                {t('pricing_tuning_studio.bulk_ops.apply', 'Apply')}
                              </Button>
                            </div>
                            <p className="text-[10px] text-gray-500">
                              {t(
                                'pricing_tuning_studio.bulk_ops.percentage_hint',
                                'Enter positive value for increase (e.g., 10 for +10%) or negative for decrease (e.g., -5 for -5%)'
                              )}
                            </p>
                          </CardContent>
                        </Card>

                        {/* Copy Pricing Section */}
                        <Card className="card-glass-dark">
                          <CardHeader className="pb-3 border-b border-gray-700">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Copy className="h-4 w-4 text-amber-400" />
                              {t('pricing_tuning_studio.bulk_ops.copy_pricing', 'Copy Pricing')}
                            </CardTitle>
                            <CardDescription className="text-xs text-gray-400">
                              {t(
                                'pricing_tuning_studio.bulk_ops.copy_desc',
                                'Copy pricing configuration from another system pack'
                              )}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="p-4 space-y-4">
                            <div className="flex gap-3 items-end">
                              <div className="flex-1">
                                <Label htmlFor="copy-from-system" className="text-xs text-gray-300 mb-1 block">
                                  {t('pricing_tuning_studio.bulk_ops.copy_from', 'Copy From System Pack')}
                                </Label>
                                <Select
                                  value={copyFromSystemPack}
                                  onValueChange={setCopyFromSystemPack}
                                >
                                  <SelectTrigger id="copy-from-system" className="text-xs h-8">
                                    <SelectValue placeholder={t('pricing_tuning_studio.bulk_ops.select_system', 'Select system pack...')} />
                                  </SelectTrigger>
                                  <SelectContent className="bg-gray-900 border-gray-700">
                                    {systemPacks
                                      .filter((packId) => packId !== selectedSystemPackId)
                                      .map((packId) => {
                                        const packProfiles = profiles.filter((p) => {
                                          const specs = p.specifications as any;
                                          const systemName =
                                            specs?.window_system || p.systemBrand || specs?.systemPackId;
                                          return systemName === packId;
                                        });
                                        return (
                                          <SelectItem key={packId} value={packId} className="text-xs">
                                            {packId} ({packProfiles.length} profiles)
                                          </SelectItem>
                                        );
                                      })}
                                  </SelectContent>
                                </Select>
                              </div>
                              <Button
                                onClick={handleCopyPricing}
                                disabled={!copyFromSystemPack || !pricingState || saving}
                                size="sm"
                                className="text-xs"
                              >
                                <Copy className="h-3 w-3 mr-1" />
                                {t('pricing_tuning_studio.bulk_ops.copy', 'Copy')}
                              </Button>
                            </div>
                            <p className="text-[10px] text-gray-500">
                              {t(
                                'pricing_tuning_studio.bulk_ops.copy_hint',
                                'This will replace current pricing with pricing from the selected system pack'
                              )}
                            </p>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Bulk Operation Confirmation Dialog */}
                      <Dialog open={showBulkConfirmDialog} onOpenChange={setShowBulkConfirmDialog}>
                        <DialogContent className="bg-gray-900 border-gray-700">
                          <DialogHeader>
                            <DialogTitle className="text-sm text-amber-300">
                              {bulkOperationType === 'percentage'
                                ? t('pricing_tuning_studio.bulk_ops.confirm_percentage', 'Confirm Percentage Adjustment')
                                : bulkOperationType === 'copy'
                                ? t('pricing_tuning_studio.bulk_ops.confirm_copy', 'Confirm Copy Pricing')
                                : t('pricing_tuning_studio.bulk_ops.confirm', 'Confirm Bulk Operation')}
                            </DialogTitle>
                            <DialogDescription className="text-xs text-gray-400">
                              {bulkOperationType === 'percentage' && (
                                <>
                                  {t(
                                    'pricing_tuning_studio.bulk_ops.confirm_percentage_desc',
                                    `Apply ${bulkPercentage}% adjustment to all prices? This will affect all profile prices, hardware, gaskets, and glazing types.`
                                  )}
                                </>
                              )}
                              {bulkOperationType === 'copy' && (
                                <>
                                  {t(
                                    'pricing_tuning_studio.bulk_ops.confirm_copy_desc',
                                    `Copy pricing from ${copyFromSystemPack} to ${selectedSystemPackId}? This will replace the current pricing configuration.`
                                  )}
                                </>
                              )}
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter className="gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setShowBulkConfirmDialog(false);
                                setBulkOperationType(null);
                              }}
                              className="text-xs"
                            >
                              {t('pricing_tuning_studio.actions.cancel', 'Cancel')}
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => {
                                if (bulkOperationType === 'percentage') {
                                  handleConfirmBulkPercentage();
                                } else if (bulkOperationType === 'copy') {
                                  handleConfirmCopyPricing();
                                }
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                            >
                              {t('pricing_tuning_studio.actions.confirm', 'Confirm')}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Unsaved Changes Dialog */}
        <UnsavedChangesDialog
          open={showUnsavedDialog}
          onOpenChange={setShowUnsavedDialog}
          onConfirm={handleUnsavedConfirm}
          onCancel={handleUnsavedCancel}
          showSaveOption={true}
          onSave={handleUnsavedSave}
          isSaving={saving}
          context="Pricing Tuning Studio"
          title={t('pricing_tuning_studio.unsaved.title', 'Unsaved Pricing Changes')}
          description={t(
            'pricing_tuning_studio.unsaved.description',
            'You have unsaved pricing changes that will be lost if you leave.'
          )}
        />

        {/* Quantity Break Dialog */}
        <Dialog open={showQuantityBreakDialog} onOpenChange={setShowQuantityBreakDialog}>
          <DialogContent className="bg-gray-900 border-gray-700 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-sm text-amber-300">
                {editingQuantityBreak?.id && pricingState?.pricingRules?.quantityBreaks?.find((b) => b.id === editingQuantityBreak.id)
                  ? t('pricing_tuning_studio.quantity_breaks.edit', 'Edit Quantity Break')
                  : t('pricing_tuning_studio.quantity_breaks.add', 'Add Quantity Break')}
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-400">
                {t(
                  'pricing_tuning_studio.quantity_breaks.dialog_description',
                  'Configure volume discount based on order quantity'
                )}
              </DialogDescription>
            </DialogHeader>
            {editingQuantityBreak && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-300">
                      {t('pricing_tuning_studio.quantity_breaks.min_quantity', 'Min Quantity')}
                    </Label>
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      value={editingQuantityBreak.minQuantity}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (!isNaN(value)) {
                          setEditingQuantityBreak({
                            ...editingQuantityBreak,
                            minQuantity: value,
                          });
                        }
                      }}
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-300">
                      {t('pricing_tuning_studio.quantity_breaks.max_quantity', 'Max Quantity (Optional)')}
                    </Label>
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      value={editingQuantityBreak.maxQuantity || ''}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        setEditingQuantityBreak({
                          ...editingQuantityBreak,
                          maxQuantity: isNaN(value) ? undefined : value,
                        });
                      }}
                      placeholder="Leave empty for unlimited"
                      className="text-xs"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-gray-300">
                    {t('pricing_tuning_studio.quantity_breaks.discount', 'Discount Percentage (%)')}
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={editingQuantityBreak.discountPercentage || ''}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      setEditingQuantityBreak({
                        ...editingQuantityBreak,
                        discountPercentage: isNaN(value) ? undefined : value,
                      });
                    }}
                    placeholder="0.0"
                    className="text-xs"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="qb-active"
                    checked={editingQuantityBreak.isActive}
                    onChange={(e) => {
                      setEditingQuantityBreak({
                        ...editingQuantityBreak,
                        isActive: e.target.checked,
                      });
                    }}
                    className="rounded border-gray-600 bg-gray-800 text-amber-500 focus:ring-amber-500"
                  />
                  <Label htmlFor="qb-active" className="text-xs text-gray-300 cursor-pointer">
                    {t('pricing_tuning_studio.quantity_breaks.active', 'Active')}
                  </Label>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-gray-300">
                    {t('pricing_tuning_studio.quantity_breaks.notes', 'Notes (Optional)')}
                  </Label>
                  <Input
                    value={editingQuantityBreak.notes || ''}
                    onChange={(e) => {
                      setEditingQuantityBreak({
                        ...editingQuantityBreak,
                        notes: e.target.value,
                      });
                    }}
                    placeholder="Additional notes"
                    className="text-xs"
                  />
                </div>
              </div>
            )}
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowQuantityBreakDialog(false);
                  setEditingQuantityBreak(null);
                }}
                className="text-xs"
              >
                {t('pricing_tuning_studio.actions.cancel', 'Cancel')}
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  if (editingQuantityBreak && pricingState) {
                    const currentRules = pricingState.pricingRules || {
                      quantityBreaks: [],
                      customerTiers: [],
                      seasonalAdjustments: [],
                    };
                    const existingBreaks = currentRules.quantityBreaks || [];
                    const isEditing = existingBreaks.some((b) => b.id === editingQuantityBreak.id);
                    const updatedBreaks = isEditing
                      ? existingBreaks.map((b) => (b.id === editingQuantityBreak.id ? editingQuantityBreak : b))
                      : [...existingBreaks, editingQuantityBreak];
                    setPricingState({
                      ...pricingState,
                      pricingRules: {
                        ...currentRules,
                        quantityBreaks: updatedBreaks,
                      },
                    });
                    setIsDirty(true);
                    setShowQuantityBreakDialog(false);
                    setEditingQuantityBreak(null);
                  }
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
              >
                {t('pricing_tuning_studio.actions.save', 'Save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Customer Tier Dialog */}
        <Dialog open={showCustomerTierDialog} onOpenChange={setShowCustomerTierDialog}>
          <DialogContent className="bg-gray-900 border-gray-700 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-sm text-amber-300">
                {editingCustomerTier?.id && pricingState?.pricingRules?.customerTiers?.find((t) => t.id === editingCustomerTier.id)
                  ? t('pricing_tuning_studio.customer_tiers.edit', 'Edit Customer Tier')
                  : t('pricing_tuning_studio.customer_tiers.add', 'Add Customer Tier')}
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-400">
                {t(
                  'pricing_tuning_studio.customer_tiers.dialog_description',
                  'Configure pricing tier for customer segments'
                )}
              </DialogDescription>
            </DialogHeader>
            {editingCustomerTier && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label className="text-xs text-gray-300">
                    {t('pricing_tuning_studio.customer_tiers.tier_name', 'Tier Name')}
                  </Label>
                  <Input
                    value={editingCustomerTier.tierName}
                    onChange={(e) => {
                      setEditingCustomerTier({
                        ...editingCustomerTier,
                        tierName: e.target.value,
                      });
                    }}
                    placeholder="e.g., VIP, Premium, Standard"
                    className="text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-300">
                      {t('pricing_tuning_studio.customer_tiers.discount', 'Discount (%)')}
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={editingCustomerTier.discountPercentage || ''}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        setEditingCustomerTier({
                          ...editingCustomerTier,
                          discountPercentage: isNaN(value) ? undefined : value,
                        });
                      }}
                      placeholder="0.0"
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-300">
                      {t('pricing_tuning_studio.customer_tiers.min_order', 'Min Order Value')}
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={editingCustomerTier.minOrderValue || ''}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        setEditingCustomerTier({
                          ...editingCustomerTier,
                          minOrderValue: isNaN(value) ? undefined : value,
                        });
                      }}
                      placeholder="0.0"
                      className="text-xs"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="ct-active"
                    checked={editingCustomerTier.isActive}
                    onChange={(e) => {
                      setEditingCustomerTier({
                        ...editingCustomerTier,
                        isActive: e.target.checked,
                      });
                    }}
                    className="rounded border-gray-600 bg-gray-800 text-amber-500 focus:ring-amber-500"
                  />
                  <Label htmlFor="ct-active" className="text-xs text-gray-300 cursor-pointer">
                    {t('pricing_tuning_studio.customer_tiers.active', 'Active')}
                  </Label>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-gray-300">
                    {t('pricing_tuning_studio.customer_tiers.notes', 'Notes (Optional)')}
                  </Label>
                  <Input
                    value={editingCustomerTier.notes || ''}
                    onChange={(e) => {
                      setEditingCustomerTier({
                        ...editingCustomerTier,
                        notes: e.target.value,
                      });
                    }}
                    placeholder="Additional notes"
                    className="text-xs"
                  />
                </div>
              </div>
            )}
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowCustomerTierDialog(false);
                  setEditingCustomerTier(null);
                }}
                className="text-xs"
              >
                {t('pricing_tuning_studio.actions.cancel', 'Cancel')}
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  if (editingCustomerTier && pricingState && editingCustomerTier.tierName.trim()) {
                    const currentRules = pricingState.pricingRules || {
                      quantityBreaks: [],
                      customerTiers: [],
                      seasonalAdjustments: [],
                    };
                    const existingTiers = currentRules.customerTiers || [];
                    const isEditing = existingTiers.some((t) => t.id === editingCustomerTier.id);
                    const updatedTiers = isEditing
                      ? existingTiers.map((t) => (t.id === editingCustomerTier.id ? editingCustomerTier : t))
                      : [...existingTiers, editingCustomerTier];
                    setPricingState({
                      ...pricingState,
                      pricingRules: {
                        ...currentRules,
                        customerTiers: updatedTiers,
                      },
                    });
                    setIsDirty(true);
                    setShowCustomerTierDialog(false);
                    setEditingCustomerTier(null);
                  }
                }}
                disabled={!editingCustomerTier?.tierName?.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
              >
                {t('pricing_tuning_studio.actions.save', 'Save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Seasonal Adjustment Dialog */}
        <Dialog open={showSeasonalAdjustmentDialog} onOpenChange={setShowSeasonalAdjustmentDialog}>
          <DialogContent className="bg-gray-900 border-gray-700 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-sm text-amber-300">
                {editingSeasonalAdjustment?.id && pricingState?.pricingRules?.seasonalAdjustments?.find((a) => a.id === editingSeasonalAdjustment.id)
                  ? t('pricing_tuning_studio.seasonal_adjustments.edit', 'Edit Seasonal Adjustment')
                  : t('pricing_tuning_studio.seasonal_adjustments.add', 'Add Seasonal Adjustment')}
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-400">
                {t(
                  'pricing_tuning_studio.seasonal_adjustments.dialog_description',
                  'Configure time-based pricing adjustments'
                )}
              </DialogDescription>
            </DialogHeader>
            {editingSeasonalAdjustment && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label className="text-xs text-gray-300">
                    {t('pricing_tuning_studio.seasonal_adjustments.name', 'Adjustment Name')}
                  </Label>
                  <Input
                    value={editingSeasonalAdjustment.name}
                    onChange={(e) => {
                      setEditingSeasonalAdjustment({
                        ...editingSeasonalAdjustment,
                        name: e.target.value,
                      });
                    }}
                    placeholder="e.g., Summer Sale, Winter Premium"
                    className="text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-300">
                      {t('pricing_tuning_studio.seasonal_adjustments.start_date', 'Start Date')}
                    </Label>
                    <Input
                      type="date"
                      value={editingSeasonalAdjustment.startDate}
                      onChange={(e) => {
                        setEditingSeasonalAdjustment({
                          ...editingSeasonalAdjustment,
                          startDate: e.target.value,
                        });
                      }}
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-300">
                      {t('pricing_tuning_studio.seasonal_adjustments.end_date', 'End Date')}
                    </Label>
                    <Input
                      type="date"
                      value={editingSeasonalAdjustment.endDate}
                      onChange={(e) => {
                        setEditingSeasonalAdjustment({
                          ...editingSeasonalAdjustment,
                          endDate: e.target.value,
                        });
                      }}
                      className="text-xs"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-300">
                      {t('pricing_tuning_studio.seasonal_adjustments.adjustment_type', 'Adjustment Type')}
                    </Label>
                    <Select
                      value={editingSeasonalAdjustment.adjustmentType}
                      onValueChange={(value) => {
                        setEditingSeasonalAdjustment({
                          ...editingSeasonalAdjustment,
                          adjustmentType: value as 'markup' | 'discount' | 'multiplier',
                        });
                      }}
                    >
                      <SelectTrigger className="text-xs h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-gray-700">
                        <SelectItem value="discount">Discount</SelectItem>
                        <SelectItem value="markup">Markup</SelectItem>
                        <SelectItem value="multiplier">Multiplier</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-300">
                      {t('pricing_tuning_studio.seasonal_adjustments.percentage', 'Percentage (%)')}
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={editingSeasonalAdjustment.adjustmentPercentage}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        if (!isNaN(value)) {
                          setEditingSeasonalAdjustment({
                            ...editingSeasonalAdjustment,
                            adjustmentPercentage: value,
                          });
                        }
                      }}
                      className="text-xs"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="sa-active"
                    checked={editingSeasonalAdjustment.isActive}
                    onChange={(e) => {
                      setEditingSeasonalAdjustment({
                        ...editingSeasonalAdjustment,
                        isActive: e.target.checked,
                      });
                    }}
                    className="rounded border-gray-600 bg-gray-800 text-amber-500 focus:ring-amber-500"
                  />
                  <Label htmlFor="sa-active" className="text-xs text-gray-300 cursor-pointer">
                    {t('pricing_tuning_studio.seasonal_adjustments.active', 'Active')}
                  </Label>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-gray-300">
                    {t('pricing_tuning_studio.seasonal_adjustments.notes', 'Notes (Optional)')}
                  </Label>
                  <Input
                    value={editingSeasonalAdjustment.notes || ''}
                    onChange={(e) => {
                      setEditingSeasonalAdjustment({
                        ...editingSeasonalAdjustment,
                        notes: e.target.value,
                      });
                    }}
                    placeholder="Additional notes"
                    className="text-xs"
                  />
                </div>
              </div>
            )}
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowSeasonalAdjustmentDialog(false);
                  setEditingSeasonalAdjustment(null);
                }}
                className="text-xs"
              >
                {t('pricing_tuning_studio.actions.cancel', 'Cancel')}
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  if (editingSeasonalAdjustment && pricingState && editingSeasonalAdjustment.name.trim()) {
                    const currentRules = pricingState.pricingRules || {
                      quantityBreaks: [],
                      customerTiers: [],
                      seasonalAdjustments: [],
                    };
                    const existingAdjustments = currentRules.seasonalAdjustments || [];
                    const isEditing = existingAdjustments.some((a) => a.id === editingSeasonalAdjustment.id);
                    const updatedAdjustments = isEditing
                      ? existingAdjustments.map((a) => (a.id === editingSeasonalAdjustment.id ? editingSeasonalAdjustment : a))
                      : [...existingAdjustments, editingSeasonalAdjustment];
                    setPricingState({
                      ...pricingState,
                      pricingRules: {
                        ...currentRules,
                        seasonalAdjustments: updatedAdjustments,
                      },
                    });
                    setIsDirty(true);
                    setShowSeasonalAdjustmentDialog(false);
                    setEditingSeasonalAdjustment(null);
                  }
                }}
                disabled={!editingSeasonalAdjustment?.name?.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
              >
                {t('pricing_tuning_studio.actions.save', 'Save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Custom Material Rule Dialog */}
        <Dialog open={showCustomRuleDialog} onOpenChange={setShowCustomRuleDialog}>
          <DialogContent className="bg-gray-900 border-gray-700 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-sm text-amber-300">
                {editingCustomRule?.id && pricingState?.materialMarkups?.customRules?.find((r) => r.id === editingCustomRule.id)
                  ? t('pricing_tuning_studio.custom_rules.edit', 'Edit Custom Material Rule')
                  : t('pricing_tuning_studio.custom_rules.add', 'Add Custom Material Rule')}
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-400">
                {t(
                  'pricing_tuning_studio.custom_rules.dialog_description',
                  'Configure a custom markup rule for specific materials or conditions'
                )}
              </DialogDescription>
            </DialogHeader>
            {editingCustomRule && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label className="text-xs text-gray-300">
                    {t('pricing_tuning_studio.custom_rules.material_type', 'Material Type')}
                  </Label>
                  <Select
                    value={editingCustomRule.materialType}
                    onValueChange={(value) => {
                      setEditingCustomRule({
                        ...editingCustomRule,
                        materialType: value as 'aluminum' | 'upvc' | 'wood' | 'custom',
                        materialName: value === 'custom' ? editingCustomRule.materialName : undefined,
                      });
                    }}
                  >
                    <SelectTrigger className="text-xs h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700">
                      <SelectItem value="aluminum">Aluminum</SelectItem>
                      <SelectItem value="upvc">UPVC</SelectItem>
                      <SelectItem value="wood">Wood</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {editingCustomRule.materialType === 'custom' && (
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-300">
                      {t('pricing_tuning_studio.custom_rules.material_name', 'Material Name')}
                    </Label>
                    <Input
                      value={editingCustomRule.materialName || ''}
                      onChange={(e) => {
                        setEditingCustomRule({
                          ...editingCustomRule,
                          materialName: e.target.value,
                        });
                      }}
                      placeholder="e.g., Steel, Composite"
                      className="text-xs"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-xs text-gray-300">
                    {t('pricing_tuning_studio.custom_rules.markup', 'Markup Percentage (%)')}
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={editingCustomRule.markupPercentage}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      if (!isNaN(value)) {
                        setEditingCustomRule({
                          ...editingCustomRule,
                          markupPercentage: value,
                        });
                      }
                    }}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-gray-300">
                    {t('pricing_tuning_studio.custom_rules.region', 'Region (Optional)')}
                  </Label>
                  <Select
                    value={editingCustomRule.region || 'none'}
                    onValueChange={(value) => {
                      setEditingCustomRule({
                        ...editingCustomRule,
                        region: value === 'none' ? undefined : value,
                      });
                    }}
                  >
                    <SelectTrigger className="text-xs h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700">
                      <SelectItem value="none">None (All Regions)</SelectItem>
                      <SelectItem value="cairo">Cairo</SelectItem>
                      <SelectItem value="alexandria">Alexandria</SelectItem>
                      <SelectItem value="upperEgypt">Upper Egypt</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-gray-300">
                    {t('pricing_tuning_studio.custom_rules.min_quantity', 'Minimum Quantity (Optional)')}
                  </Label>
                  <Input
                    type="number"
                    step="1"
                    min="1"
                    value={editingCustomRule.minQuantity || ''}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      setEditingCustomRule({
                        ...editingCustomRule,
                        minQuantity: isNaN(value) ? undefined : value,
                      });
                    }}
                    placeholder="Leave empty for no threshold"
                    className="text-xs"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="cmr-active"
                    checked={editingCustomRule.isActive}
                    onChange={(e) => {
                      setEditingCustomRule({
                        ...editingCustomRule,
                        isActive: e.target.checked,
                      });
                    }}
                    className="rounded border-gray-600 bg-gray-800 text-amber-500 focus:ring-amber-500"
                  />
                  <Label htmlFor="cmr-active" className="text-xs text-gray-300 cursor-pointer">
                    {t('pricing_tuning_studio.custom_rules.active', 'Active')}
                  </Label>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-gray-300">
                    {t('pricing_tuning_studio.custom_rules.notes', 'Notes (Optional)')}
                  </Label>
                  <Input
                    value={editingCustomRule.notes || ''}
                    onChange={(e) => {
                      setEditingCustomRule({
                        ...editingCustomRule,
                        notes: e.target.value,
                      });
                    }}
                    placeholder="Additional notes about this rule"
                    className="text-xs"
                  />
                </div>
              </div>
            )}
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowCustomRuleDialog(false);
                  setEditingCustomRule(null);
                }}
                className="text-xs"
              >
                {t('pricing_tuning_studio.actions.cancel', 'Cancel')}
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  if (editingCustomRule && pricingState) {
                    const currentMarkups = pricingState.materialMarkups || {
                      materialMarkups: {},
                      regionalMarkups: {},
                      customRules: [],
                    };
                    const existingRules = currentMarkups.customRules || [];
                    const isEditing = existingRules.some((r) => r.id === editingCustomRule.id);
                    const updatedRules = isEditing
                      ? existingRules.map((r) => (r.id === editingCustomRule.id ? editingCustomRule : r))
                      : [...existingRules, editingCustomRule];
                    setPricingState({
                      ...pricingState,
                      materialMarkups: {
                        ...currentMarkups,
                        customRules: updatedRules,
                      },
                    });
                    setIsDirty(true);
                    setShowCustomRuleDialog(false);
                    setEditingCustomRule(null);
                  }
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
              >
                {t('pricing_tuning_studio.actions.save', 'Save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Rollback Confirmation Dialog */}
        <Dialog open={showRollbackDialog} onOpenChange={setShowRollbackDialog}>
          <DialogContent className="bg-gray-900 border-gray-700">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-300">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
                {t('pricing_tuning_studio.rollback.title', 'Confirm Rollback')}
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                {selectedHistoryEntry && (
                  <>
                    {t(
                      'pricing_tuning_studio.rollback.description',
                      'Are you sure you want to rollback to version'
                    )}{' '}
                    <span className="font-semibold text-amber-300">
                      {selectedHistoryEntry.versionNumber}
                    </span>
                    ?{' '}
                    {t(
                      'pricing_tuning_studio.rollback.warning',
                      'This will replace your current pricing configuration. This action will be saved to history.'
                    )}
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            {selectedHistoryEntry && (
              <div className="py-4 space-y-2 text-xs text-gray-300">
                <p>
                  <span className="font-semibold text-gray-200">Date:</span>{' '}
                  {new Date(selectedHistoryEntry.createdAt).toLocaleString()}
                </p>
                {selectedHistoryEntry.reason && (
                  <p>
                    <span className="font-semibold text-gray-200">Reason:</span>{' '}
                    {selectedHistoryEntry.reason}
                  </p>
                )}
                <p>
                  <span className="font-semibold text-gray-200">Change Type:</span>{' '}
                  {selectedHistoryEntry.changeType}
                </p>
              </div>
            )}
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRollbackDialog(false);
                  setSelectedHistoryEntry(null);
                }}
                disabled={saving}
                className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
              >
                {t('pricing_tuning_studio.rollback.cancel', 'Cancel')}
              </Button>
              <Button
                onClick={handleRollback}
                disabled={saving}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    {t('pricing_tuning_studio.rollback.rolling_back', 'Rolling back...')}
                  </>
                ) : (
                  <>
                    <History className="h-4 w-4 mr-2" />
                    {t('pricing_tuning_studio.rollback.confirm', 'Confirm Rollback')}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ErrorBoundary>
  );
};

// Export with ErrorBoundary wrapper
export const PricingTuningStudio: React.FC<PricingTuningStudioProps> = (props) => {
  return <PricingTuningStudioComponent {...props} />;
};
