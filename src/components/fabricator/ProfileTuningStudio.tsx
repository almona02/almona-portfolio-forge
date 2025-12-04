/**
 * Profile Tuning Studio
 * ----------------------------------------------------------------------------
 * Prestige-grade cockpit for tuning a single profile:
 * - Shows tuning status and key metadata
 * - Embeds CalibrationWizard for K-factor / cutting calibration
 * - Embeds MachiningZoneEditor for machining zones
 * - Marks profile as "tuned" in specifications for quick scanning
 */

import React, { useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/shared/ui/ui/card';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Wand2,
  Settings,
  Ruler,
  ArrowLeft,
  Droplets,
  Shield,
  Wrench,
  Wallet,
  Activity,
} from 'lucide-react';
import type { Profile } from '@/types/fabricator';
import { CalibrationWizard } from './CalibrationWizard';
import { MachiningZoneEditor, type MachiningZone } from './MachiningZoneEditor';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface ProfileTuningStudioProps {
  profile: Profile;
  userId: string;
  onClose: () => void;
  onProfileUpdated?: () => void;
}

type TuningStatus = 'untuned' | 'in_progress' | 'tuned';

export const ProfileTuningStudio: React.FC<ProfileTuningStudioProps> = ({
  profile,
  userId,
  onClose,
  onProfileUpdated,
}) => {
  const [savingStatus, setSavingStatus] = useState(false);
  const [zones, setZones] = useState<MachiningZone[]>(
    ((profile.specifications as any)?.machiningZones as MachiningZone[]) || []
  );

  const specs = profile.specifications || {};

  const [cuttingConfig, setCuttingConfig] = useState({
    borderExtraAllowanceMm: (specs as any)?.borderExtraAllowanceMm ?? '',
    preferredBarLengthMm: (specs as any)?.preferredBarLengthMm ?? '',
    minOffcutMm: (specs as any)?.minOffcutMm ?? '',
    roundToNearestMm: (specs as any)?.roundToNearestMm ?? '',
    cornerTechnology: ((specs as any)?.cornerTechnology as string) || 'crimped',
    miter45JointAllowanceMm: (specs as any)?.miter45JointAllowanceMm ?? '',
    butt90JointAllowanceMm: (specs as any)?.butt90JointAllowanceMm ?? '',
    tJointAllowanceMm: (specs as any)?.tJointAllowanceMm ?? '',
    mullionJointAllowanceMm: (specs as any)?.mullionJointAllowanceMm ?? '',
  });

  const [glazingConfig, setGlazingConfig] = useState({
    glazingMinMm: (specs as any)?.glazingMinMm ?? '',
    glazingMaxMm: (specs as any)?.glazingMaxMm ?? '',
    gasketCompressionTargetMm: (specs as any)?.gasketCompressionTargetMm ?? '',
    allowedGlassPackagesText: Array.isArray((specs as any)?.allowedGlassPackages)
      ? ((specs as any).allowedGlassPackages as string[]).join(', ')
      : '',
  });

  const [structuralConfig, setStructuralConfig] = useState({
    maxFrameSpanMm: (specs as any)?.maxFrameSpanMm ?? '',
    maxMullionSpanMm: (specs as any)?.maxMullionSpanMm ?? '',
    maxSashWidthMm: (specs as any)?.maxSashWidthMm ?? '',
    maxSashHeightMm: (specs as any)?.maxSashHeightMm ?? '',
    maxSashWeightKg: (specs as any)?.maxSashWeightKg ?? '',
    maxUnitWidthMm: (specs as any)?.maxUnitWidthMm ?? '',
    maxUnitHeightMm: (specs as any)?.maxUnitHeightMm ?? '',
    structuralNotes: (specs as any)?.structuralNotes ?? '',
    physicsStiffnessClass:
      ((specs as any)?.physicsStiffnessClass as string) || 'standard',
  });

  const [hardwareConfig, setHardwareConfig] = useState({
    primaryHingeFamily: (specs as any)?.primaryHingeFamily ?? '',
    primaryLockFamily: (specs as any)?.primaryLockFamily ?? '',
    preferredHandleFamily: (specs as any)?.preferredHandleFamily ?? '',
    hardwarePackTagsText: Array.isArray((specs as any)?.hardwarePackTags)
      ? ((specs as any).hardwarePackTags as string[]).join(', ')
      : '',
  });

  const [costConfig, setCostConfig] = useState({
    aluminumPricePerKg: (specs as any)?.aluminumPricePerKg ?? '',
    machiningCostPerOp: (specs as any)?.machiningCostPerOp ?? '',
    coatingCostPerSqm: (specs as any)?.coatingCostPerSqm ?? '',
    scrapCostPerKg: (specs as any)?.scrapCostPerKg ?? '',
    erpItemCode: (specs as any)?.erpItemCode ?? '',
    warehouseLocation: (specs as any)?.warehouseLocation ?? '',
  });

  const [qaConfig, _setQaConfig] = useState({
    cutToleranceMm: (specs as any)?.cutToleranceMm ?? '',
    assemblyToleranceMm: (specs as any)?.assemblyToleranceMm ?? '',
    qaNotes: (specs as any)?.qaNotes ?? '',
  });

  const systemPackId =
    profile.systemPackIds?.[0] ||
    (profile.specifications as any)?.systemPackId ||
    'generic';

  const tuningStatus: TuningStatus = useMemo(() => {
    const specs = profile.specifications || {};
    const raw = (specs as any).tuningStatus as TuningStatus | undefined;
    if (raw === 'tuned' || raw === 'in_progress' || raw === 'untuned') return raw;
    // Heuristic: if any calibration or machining macros exist, mark as in_progress
    if ((profile.calibrations && profile.calibrations.length > 0) || profile.machiningMacros?.length) {
      return 'in_progress';
    }
    return 'untuned';
  }, [profile]);

  const statusBadge = useMemo(() => {
    switch (tuningStatus) {
      case 'tuned':
        return (
          <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/50 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Tuned for Production
          </Badge>
        );
      case 'in_progress':
        return (
          <Badge className="bg-blue-500/15 text-blue-300 border-blue-500/50 flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            Tuning in Progress
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-500/15 text-yellow-300 border-yellow-500/50 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Not Tuned Yet
          </Badge>
        );
    }
  }, [tuningStatus]);

  const markAsTuned = async () => {
    try {
      setSavingStatus(true);
      const db = supabase as unknown as { from: (table: string) => any };
      const nextSpecs = {
        ...(profile.specifications || {}),
        tuningStatus: 'tuned',
      };
      const { error } = await db
        .from('fabricator_profiles')
        .update({ specifications: nextSpecs })
        .eq('id', profile.id)
        .eq('user_id', userId);

      if (error) throw error;

      toast.success(`Profile "${profile.name}" marked as tuned`);
      onProfileUpdated?.();
    } catch (err) {
      console.error('Error marking profile as tuned:', err);
      toast.error('Failed to mark profile as tuned');
    } finally {
      setSavingStatus(false);
    }
  };

  const handleSaveZones = async (updatedZones: MachiningZone[]) => {
    try {
      setSavingStatus(true);
      const db = supabase as unknown as { from: (table: string) => any };
      const nextSpecs = {
        ...(profile.specifications || {}),
        machiningZones: updatedZones,
      };
      const { error } = await db
        .from('fabricator_profiles')
        .update({ specifications: nextSpecs })
        .eq('id', profile.id)
        .eq('user_id', userId);

      if (error) throw error;
      toast.success('Machining zones saved');
      onProfileUpdated?.();
    } catch (err) {
      console.error('Error saving machining zones:', err);
      toast.error('Failed to save machining zones');
    } finally {
      setSavingStatus(false);
    }
  };

  const saveCuttingConfig = async () => {
    try {
      setSavingStatus(true);
      const db = supabase as unknown as { from: (table: string) => any };
      const nextSpecs = {
        ...(profile.specifications || {}),
        borderExtraAllowanceMm: cuttingConfig.borderExtraAllowanceMm !== ''
          ? parseFloat(cuttingConfig.borderExtraAllowanceMm as any)
          : undefined,
        preferredBarLengthMm: cuttingConfig.preferredBarLengthMm !== ''
          ? parseFloat(cuttingConfig.preferredBarLengthMm as any)
          : undefined,
        minOffcutMm: cuttingConfig.minOffcutMm !== ''
          ? parseFloat(cuttingConfig.minOffcutMm as any)
          : undefined,
        roundToNearestMm: cuttingConfig.roundToNearestMm !== ''
          ? parseFloat(cuttingConfig.roundToNearestMm as any)
          : undefined,
        cornerTechnology: cuttingConfig.cornerTechnology,
        miter45JointAllowanceMm: cuttingConfig.miter45JointAllowanceMm !== ''
          ? parseFloat(cuttingConfig.miter45JointAllowanceMm as any)
          : undefined,
        butt90JointAllowanceMm: cuttingConfig.butt90JointAllowanceMm !== ''
          ? parseFloat(cuttingConfig.butt90JointAllowanceMm as any)
          : undefined,
        tJointAllowanceMm: cuttingConfig.tJointAllowanceMm !== ''
          ? parseFloat(cuttingConfig.tJointAllowanceMm as any)
          : undefined,
        mullionJointAllowanceMm: cuttingConfig.mullionJointAllowanceMm !== ''
          ? parseFloat(cuttingConfig.mullionJointAllowanceMm as any)
          : undefined,
      };

      const { error } = await db
        .from('fabricator_profiles')
        .update({ specifications: nextSpecs })
        .eq('id', profile.id)
        .eq('user_id', userId);

      if (error) throw error;
      toast.success('Cutting & joint rules saved');
      onProfileUpdated?.();
    } catch (err) {
      console.error('Error saving cutting config:', err);
      toast.error('Failed to save cutting rules');
    } finally {
      setSavingStatus(false);
    }
  };

  const saveGlazingConfig = async () => {
    try {
      setSavingStatus(true);
      const db = supabase as unknown as { from: (table: string) => any };
      const allowedGlassPackages =
        glazingConfig.allowedGlassPackagesText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);

      const nextSpecs = {
        ...(profile.specifications || {}),
        glazingMinMm: glazingConfig.glazingMinMm !== ''
          ? parseFloat(glazingConfig.glazingMinMm as any)
          : undefined,
        glazingMaxMm: glazingConfig.glazingMaxMm !== ''
          ? parseFloat(glazingConfig.glazingMaxMm as any)
          : undefined,
        gasketCompressionTargetMm: glazingConfig.gasketCompressionTargetMm !== ''
          ? parseFloat(glazingConfig.gasketCompressionTargetMm as any)
          : undefined,
        allowedGlassPackages,
      };

      const { error } = await db
        .from('fabricator_profiles')
        .update({ specifications: nextSpecs })
        .eq('id', profile.id)
        .eq('user_id', userId);

      if (error) throw error;
      toast.success('Glazing & seal rules saved');
      onProfileUpdated?.();
    } catch (err) {
      console.error('Error saving glazing config:', err);
      toast.error('Failed to save glazing & seal rules');
    } finally {
      setSavingStatus(false);
    }
  };

  const saveStructuralConfig = async () => {
    try {
      setSavingStatus(true);
      const db = supabase as unknown as { from: (table: string) => any };
      const nextSpecs = {
        ...(profile.specifications || {}),
        maxFrameSpanMm:
          structuralConfig.maxFrameSpanMm !== ''
            ? parseFloat(structuralConfig.maxFrameSpanMm as any)
            : undefined,
        maxMullionSpanMm:
          structuralConfig.maxMullionSpanMm !== ''
            ? parseFloat(structuralConfig.maxMullionSpanMm as any)
            : undefined,
        maxSashWidthMm:
          structuralConfig.maxSashWidthMm !== ''
            ? parseFloat(structuralConfig.maxSashWidthMm as any)
            : undefined,
        maxSashHeightMm:
          structuralConfig.maxSashHeightMm !== ''
            ? parseFloat(structuralConfig.maxSashHeightMm as any)
            : undefined,
        maxSashWeightKg:
          structuralConfig.maxSashWeightKg !== ''
            ? parseFloat(structuralConfig.maxSashWeightKg as any)
            : undefined,
        maxUnitWidthMm:
          structuralConfig.maxUnitWidthMm !== ''
            ? parseFloat(structuralConfig.maxUnitWidthMm as any)
            : undefined,
        maxUnitHeightMm:
          structuralConfig.maxUnitHeightMm !== ''
            ? parseFloat(structuralConfig.maxUnitHeightMm as any)
            : undefined,
        structuralNotes: structuralConfig.structuralNotes || undefined,
        physicsStiffnessClass: structuralConfig.physicsStiffnessClass,
      };

      const { error } = await db
        .from('fabricator_profiles')
        .update({ specifications: nextSpecs })
        .eq('id', profile.id)
        .eq('user_id', userId);

      if (error) throw error;
      toast.success('Structural & span limits saved');
      onProfileUpdated?.();
    } catch (err) {
      console.error('Error saving structural config:', err);
      toast.error('Failed to save structural rules');
    } finally {
      setSavingStatus(false);
    }
  };

  const saveHardwareConfig = async () => {
    try {
      setSavingStatus(true);
      const db = supabase as unknown as { from: (table: string) => any };

      const hardwarePackTags =
        hardwareConfig.hardwarePackTagsText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);

      const nextSpecs = {
        ...(profile.specifications || {}),
        primaryHingeFamily: hardwareConfig.primaryHingeFamily || undefined,
        primaryLockFamily: hardwareConfig.primaryLockFamily || undefined,
        preferredHandleFamily: hardwareConfig.preferredHandleFamily || undefined,
        hardwarePackTags,
      };

      const { error } = await db
        .from('fabricator_profiles')
        .update({ specifications: nextSpecs })
        .eq('id', profile.id)
        .eq('user_id', userId);

      if (error) throw error;
      toast.success('Hardware presets saved');
      onProfileUpdated?.();
    } catch (err) {
      console.error('Error saving hardware config:', err);
      toast.error('Failed to save hardware presets');
    } finally {
      setSavingStatus(false);
    }
  };

  const saveCostConfig = async () => {
    try {
      setSavingStatus(true);
      const db = supabase as unknown as { from: (table: string) => any };
      const nextSpecs = {
        ...(profile.specifications || {}),
        aluminumPricePerKg:
          costConfig.aluminumPricePerKg !== ''
            ? parseFloat(costConfig.aluminumPricePerKg as any)
            : undefined,
        machiningCostPerOp:
          costConfig.machiningCostPerOp !== ''
            ? parseFloat(costConfig.machiningCostPerOp as any)
            : undefined,
        coatingCostPerSqm:
          costConfig.coatingCostPerSqm !== ''
            ? parseFloat(costConfig.coatingCostPerSqm as any)
            : undefined,
        scrapCostPerKg:
          costConfig.scrapCostPerKg !== ''
            ? parseFloat(costConfig.scrapCostPerKg as any)
            : undefined,
        erpItemCode: costConfig.erpItemCode || undefined,
        warehouseLocation: costConfig.warehouseLocation || undefined,
      };

      const { error } = await db
        .from('fabricator_profiles')
        .update({ specifications: nextSpecs })
        .eq('id', profile.id)
        .eq('user_id', userId);

      if (error) throw error;
      toast.success('Cost & ERP mapping saved');
      onProfileUpdated?.();
    } catch (err) {
      console.error('Error saving cost config:', err);
      toast.error('Failed to save cost & ERP data');
    } finally {
      setSavingStatus(false);
    }
  };

  const saveQaConfig = async () => {
    try {
      setSavingStatus(true);
      const db = supabase as unknown as { from: (table: string) => any };
      const nextSpecs = {
        ...(profile.specifications || {}),
        cutToleranceMm:
          qaConfig.cutToleranceMm !== ''
            ? parseFloat(qaConfig.cutToleranceMm as any)
            : undefined,
        assemblyToleranceMm:
          qaConfig.assemblyToleranceMm !== ''
            ? parseFloat(qaConfig.assemblyToleranceMm as any)
            : undefined,
        qaNotes: qaConfig.qaNotes || undefined,
      };

      const { error } = await db
        .from('fabricator_profiles')
        .update({ specifications: nextSpecs })
        .eq('id', profile.id)
        .eq('user_id', userId);

      if (error) throw error;
      toast.success('QA tolerances saved');
      onProfileUpdated?.();
    } catch (err) {
      console.error('Error saving QA config:', err);
      toast.error('Failed to save QA tolerances');
    } finally {
      setSavingStatus(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-2xl border border-orange-500/40 bg-gradient-to-br from-gray-950 via-gray-900 to-black shadow-[0_0_60px_rgba(248,113,113,0.35)]">
        <Card className="bg-transparent border-none h-full flex flex-col">
          <CardHeader className="border-b border-orange-500/30 pb-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-full bg-orange-500/20 border border-orange-400/60">
                  <Sparkles className="h-5 w-5 text-orange-300" />
                </div>
                <div>
                  <CardTitle className="text-lg md:text-xl flex items-center gap-2">
                    Profile Tuning Studio
                    {statusBadge}
                  </CardTitle>
                  <CardDescription className="text-xs md:text-sm text-gray-300 mt-1">
                    {profile.name} • {profile.material.toUpperCase()} •{' '}
                    {profile.width}×{profile.height ?? profile.width}mm{' '}
                    {profile.systemBrand && <>• {profile.systemBrand}</>}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  className="border-gray-600 text-gray-200 hover:bg-gray-800"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
                <Button
                  size="sm"
                  onClick={markAsTuned}
                  disabled={savingStatus || tuningStatus === 'tuned'}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  {tuningStatus === 'tuned' ? 'Already Tuned' : 'Mark as Tuned'}
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-hidden p-4 md:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
              {/* Left column: Overview & status */}
              <div className="space-y-4 lg:col-span-1">
                <Card className="bg-gray-900/70 border-gray-700">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Settings className="h-4 w-4 text-orange-400" />
                      Tuning Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs text-gray-300">
                    <p>
                      <span className="font-semibold text-gray-200">Role:</span>{' '}
                      {profile.profileRole || (profile.specifications as any)?.profileRole || 'Frame'}
                    </p>
                    <p>
                      <span className="font-semibold text-gray-200">System Pack:</span>{' '}
                      {systemPackId}
                    </p>
                    <p>
                      <span className="font-semibold text-gray-200">Twin Code:</span>{' '}
                      {(profile.specifications as any)?.internalCode || profile.id.slice(0, 8)}
                    </p>
                    <p>
                      <span className="font-semibold text-gray-200">Supplier Code:</span>{' '}
                      {(profile.specifications as any)?.supplierCode || '—'}
                    </p>
                    <p className="mt-2 text-[11px] text-gray-400">
                      Use the tabs on the right to calibrate cutting (K-factors), define machining
                      zones, and validate production accuracy. Once you are confident, mark this
                      profile as tuned.
                    </p>
                  </CardContent>
                </Card>

                <Alert className="bg-orange-900/20 border-orange-500/60 text-xs text-orange-100">
                  <AlertDescription className="flex gap-2">
                    <Wand2 className="h-4 w-4 mt-0.5 text-orange-300" />
                    <span>
                      Tuning is per-profile and per-system. Repeat the process for each critical
                      frame/sash profile in your ROCK 60, JUMBO 100, or Caluminium packs to reach
                      Titanium‑grade reliability.
                    </span>
                  </AlertDescription>
                </Alert>
              </div>

              {/* Right columns: Tabs with embedded tools */}
              <div className="lg:col-span-2 h-full">
                <Tabs defaultValue="calibration" className="h-full flex flex-col">
                  <TabsList className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-8 mb-3 bg-gray-900/70 border border-gray-700">
                    <TabsTrigger value="calibration" className="text-xs flex items-center gap-1">
                      <Ruler className="h-3 w-3" />
                      Live Calibration
                    </TabsTrigger>
                    <TabsTrigger value="cutting-rules" className="text-xs flex items-center gap-1">
                      <Settings className="h-3 w-3" />
                      Cutting Rules
                    </TabsTrigger>
                    <TabsTrigger value="glazing" className="text-xs flex items-center gap-1">
                      <Droplets className="h-3 w-3" />
                      Glazing & Seals
                    </TabsTrigger>
                    <TabsTrigger value="structural" className="text-xs flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      Structural
                    </TabsTrigger>
                    <TabsTrigger value="hardware" className="text-xs flex items-center gap-1">
                      <Wrench className="h-3 w-3" />
                      Hardware
                    </TabsTrigger>
                    <TabsTrigger value="cost-erp" className="text-xs flex items-center gap-1">
                      <Wallet className="h-3 w-3" />
                      Cost & ERP
                    </TabsTrigger>
                    <TabsTrigger value="machining" className="text-xs flex items-center gap-1">
                      <Settings className="h-3 w-3" />
                      Machining Zones
                    </TabsTrigger>
                    <TabsTrigger value="summary" className="text-xs flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      Tuning Summary
                    </TabsTrigger>
                  </TabsList>

                  <div className="flex-1 min-h-0 overflow-y-auto rounded-xl border border-gray-800 bg-gray-900/60 p-3">
                    <TabsContent value="calibration" className="mt-0">
                      <CalibrationWizard
                        profile={profile}
                        systemPackId={systemPackId}
                        userId={userId}
                      />
                    </TabsContent>

                    <TabsContent value="cutting-rules" className="mt-0 space-y-4">
                      <Card className="bg-gray-900/80 border-gray-700">
                        <CardHeader>
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Settings className="h-4 w-4 text-orange-400" />
                            Cutting, Joints & Scrap Policy
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-xs text-gray-200">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <p className="text-[11px] text-gray-400">
                                Joint allowances are extra mm applied at each corner or joint before
                                optimization. Use positive values to intentionally overshoot and let
                                assembly trim; use 0 for “exact math”.
                              </p>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block mb-1 text-[11px] text-gray-300">
                                    45° Miter Joint (+mm)
                                  </label>
                                  <input
                                    type="number"
                                    step="0.1"
                                    className="w-full rounded border border-gray-700 bg-gray-950 px-2 py-1 text-xs"
                                    value={cuttingConfig.miter45JointAllowanceMm}
                                    onChange={(e) =>
                                      setCuttingConfig((prev) => ({
                                        ...prev,
                                        miter45JointAllowanceMm: e.target.value,
                                      }))
                                    }
                                  />
                                </div>
                                <div>
                                  <label className="block mb-1 text-[11px] text-gray-300">
                                    90° Butt Joint (+mm)
                                  </label>
                                  <input
                                    type="number"
                                    step="0.1"
                                    className="w-full rounded border border-gray-700 bg-gray-950 px-2 py-1 text-xs"
                                    value={cuttingConfig.butt90JointAllowanceMm}
                                    onChange={(e) =>
                                      setCuttingConfig((prev) => ({
                                        ...prev,
                                        butt90JointAllowanceMm: e.target.value,
                                      }))
                                    }
                                  />
                                </div>
                                <div>
                                  <label className="block mb-1 text-[11px] text-gray-300">
                                    T‑Joint Allowance (+mm)
                                  </label>
                                  <input
                                    type="number"
                                    step="0.1"
                                    className="w-full rounded border border-gray-700 bg-gray-950 px-2 py-1 text-xs"
                                    value={cuttingConfig.tJointAllowanceMm}
                                    onChange={(e) =>
                                      setCuttingConfig((prev) => ({
                                        ...prev,
                                        tJointAllowanceMm: e.target.value,
                                      }))
                                    }
                                  />
                                </div>
                                <div>
                                  <label className="block mb-1 text-[11px] text-gray-300">
                                    Mullion/Transom Joint (+mm)
                                  </label>
                                  <input
                                    type="number"
                                    step="0.1"
                                    className="w-full rounded border border-gray-700 bg-gray-950 px-2 py-1 text-xs"
                                    value={cuttingConfig.mullionJointAllowanceMm}
                                    onChange={(e) =>
                                      setCuttingConfig((prev) => ({
                                        ...prev,
                                        mullionJointAllowanceMm: e.target.value,
                                      }))
                                    }
                                  />
                                </div>
                              </div>
                            </div>
                            <div className="space-y-3">
                              <div>
                                <label className="block mb-1 text-[11px] text-gray-300">
                                  Extra Allowance for Border Frames (mm)
                                </label>
                                <input
                                  type="number"
                                  step="0.1"
                                  className="w-full rounded border border-gray-700 bg-gray-950 px-2 py-1 text-xs"
                                  value={cuttingConfig.borderExtraAllowanceMm}
                                  onChange={(e) =>
                                    setCuttingConfig((prev) => ({
                                      ...prev,
                                      borderExtraAllowanceMm: e.target.value,
                                    }))
                                  }
                                />
                                <p className="mt-1 text-[11px] text-gray-400">
                                  Used when frame has external borders (e.g. +5mm for plaster
                                  tolerance).
                                </p>
                              </div>
                              <div className="grid grid-cols-3 gap-3">
                                <div>
                                  <label className="block mb-1 text-[11px] text-gray-300">
                                    Preferred Bar Length (mm)
                                  </label>
                                  <input
                                    type="number"
                                    step="1"
                                    className="w-full rounded border border-gray-700 bg-gray-950 px-2 py-1 text-xs"
                                    value={cuttingConfig.preferredBarLengthMm}
                                    onChange={(e) =>
                                      setCuttingConfig((prev) => ({
                                        ...prev,
                                        preferredBarLengthMm: e.target.value,
                                      }))
                                    }
                                  />
                                </div>
                                <div>
                                  <label className="block mb-1 text-[11px] text-gray-300">
                                    Min Usable Offcut (mm)
                                  </label>
                                  <input
                                    type="number"
                                    step="1"
                                    className="w-full rounded border border-gray-700 bg-gray-950 px-2 py-1 text-xs"
                                    value={cuttingConfig.minOffcutMm}
                                    onChange={(e) =>
                                      setCuttingConfig((prev) => ({
                                        ...prev,
                                        minOffcutMm: e.target.value,
                                      }))
                                    }
                                  />
                                </div>
                                <div>
                                  <label className="block mb-1 text-[11px] text-gray-300">
                                    Round Cuts to (mm)
                                  </label>
                                  <input
                                    type="number"
                                    step="1"
                                    className="w-full rounded border border-gray-700 bg-gray-950 px-2 py-1 text-xs"
                                    value={cuttingConfig.roundToNearestMm}
                                    onChange={(e) =>
                                      setCuttingConfig((prev) => ({
                                        ...prev,
                                        roundToNearestMm: e.target.value,
                                      }))
                                    }
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="block mb-1 text-[11px] text-gray-300">
                                  Corner Technology
                                </label>
                                <select
                                  className="w-full rounded border border-gray-700 bg-gray-950 px-2 py-1 text-xs"
                                  value={cuttingConfig.cornerTechnology}
                                  onChange={(e) =>
                                    setCuttingConfig((prev) => ({
                                      ...prev,
                                      cornerTechnology: e.target.value,
                                    }))
                                  }
                                >
                                  <option value="crimped">Crimped Corner</option>
                                  <option value="cleated">Cleated</option>
                                  <option value="welded">Welded (PVC/Steel)</option>
                                  <option value="cut_only">Cut‑Only / Manual Assembly</option>
                                </select>
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-end">
                            <Button
                              size="sm"
                              onClick={saveCuttingConfig}
                              disabled={savingStatus}
                              className="bg-orange-500 hover:bg-orange-600 text-white"
                            >
                              Save Cutting Rules
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="structural" className="mt-0 space-y-4">
                      <Card className="bg-gray-900/80 border-gray-700">
                        <CardHeader>
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Shield className="h-4 w-4 text-teal-300" />
                            Structural Limits & Physics Class
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-xs text-gray-200">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block mb-1 text-[11px] text-gray-300">
                                    Max Frame Span (mm)
                                  </label>
                                  <input
                                    type="number"
                                    step="1"
                                    className="w-full rounded border border-gray-700 bg-gray-950 px-2 py-1 text-xs"
                                    value={structuralConfig.maxFrameSpanMm}
                                    onChange={(e) =>
                                      setStructuralConfig((prev) => ({
                                        ...prev,
                                        maxFrameSpanMm: e.target.value,
                                      }))
                                    }
                                  />
                                </div>
                                <div>
                                  <label className="block mb-1 text-[11px] text-gray-300">
                                    Max Mullion Span (mm)
                                  </label>
                                  <input
                                    type="number"
                                    step="1"
                                    className="w-full rounded border border-gray-700 bg-gray-950 px-2 py-1 text-xs"
                                    value={structuralConfig.maxMullionSpanMm}
                                    onChange={(e) =>
                                      setStructuralConfig((prev) => ({
                                        ...prev,
                                        maxMullionSpanMm: e.target.value,
                                      }))
                                    }
                                  />
                                </div>
                                <div>
                                  <label className="block mb-1 text-[11px] text-gray-300">
                                    Max Unit Width (mm)
                                  </label>
                                  <input
                                    type="number"
                                    step="1"
                                    className="w-full rounded border border-gray-700 bg-gray-950 px-2 py-1 text-xs"
                                    value={structuralConfig.maxUnitWidthMm}
                                    onChange={(e) =>
                                      setStructuralConfig((prev) => ({
                                        ...prev,
                                        maxUnitWidthMm: e.target.value,
                                      }))
                                    }
                                  />
                                </div>
                                <div>
                                  <label className="block mb-1 text-[11px] text-gray-300">
                                    Max Unit Height (mm)
                                  </label>
                                  <input
                                    type="number"
                                    step="1"
                                    className="w-full rounded border border-gray-700 bg-gray-950 px-2 py-1 text-xs"
                                    value={structuralConfig.maxUnitHeightMm}
                                    onChange={(e) =>
                                      setStructuralConfig((prev) => ({
                                        ...prev,
                                        maxUnitHeightMm: e.target.value,
                                      }))
                                    }
                                  />
                                </div>
                              </div>
                              <p className="text-[11px] text-gray-400">
                                These limits are used to warn when a window or frame dimension
                                exceeds the safe span for this profile (based on supplier tables or
                                your own experience).
                              </p>
                            </div>
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block mb-1 text-[11px] text-gray-300">
                                    Max Sash Width (mm)
                                  </label>
                                  <input
                                    type="number"
                                    step="1"
                                    className="w-full rounded border border-gray-700 bg-gray-950 px-2 py-1 text-xs"
                                    value={structuralConfig.maxSashWidthMm}
                                    onChange={(e) =>
                                      setStructuralConfig((prev) => ({
                                        ...prev,
                                        maxSashWidthMm: e.target.value,
                                      }))
                                    }
                                  />
                                </div>
                                <div>
                                  <label className="block mb-1 text-[11px] text-gray-300">
                                    Max Sash Height (mm)
                                  </label>
                                  <input
                                    type="number"
                                    step="1"
                                    className="w-full rounded border border-gray-700 bg-gray-950 px-2 py-1 text-xs"
                                    value={structuralConfig.maxSashHeightMm}
                                    onChange={(e) =>
                                      setStructuralConfig((prev) => ({
                                        ...prev,
                                        maxSashHeightMm: e.target.value,
                                      }))
                                    }
                                  />
                                </div>
                                <div>
                                  <label className="block mb-1 text-[11px] text-gray-300">
                                    Max Sash Weight (kg)
                                  </label>
                                  <input
                                    type="number"
                                    step="0.1"
                                    className="w-full rounded border border-gray-700 bg-gray-950 px-2 py-1 text-xs"
                                    value={structuralConfig.maxSashWeightKg}
                                    onChange={(e) =>
                                      setStructuralConfig((prev) => ({
                                        ...prev,
                                        maxSashWeightKg: e.target.value,
                                      }))
                                    }
                                  />
                                </div>
                                <div>
                                  <label className="block mb-1 text-[11px] text-gray-300">
                                    Physics Stiffness Class
                                  </label>
                                  <select
                                    className="w-full rounded border border-gray-700 bg-gray-950 px-2 py-1 text-xs"
                                    value={structuralConfig.physicsStiffnessClass}
                                    onChange={(e) =>
                                      setStructuralConfig((prev) => ({
                                        ...prev,
                                        physicsStiffnessClass: e.target.value,
                                      }))
                                    }
                                  >
                                    <option value="standard">Standard</option>
                                    <option value="stiff">Stiff / Heavy Duty</option>
                                    <option value="flexible">Flexible / Light</option>
                                  </select>
                                </div>
                              </div>
                              <div>
                                <label className="block mb-1 text-[11px] text-gray-300">
                                  Structural Notes
                                </label>
                                <textarea
                                  rows={3}
                                  className="w-full rounded border border-gray-700 bg-gray-950 px-2 py-1 text-xs"
                                  placeholder="e.g. Balcony door use only with reinforcement; wind zone C not recommended."
                                  value={structuralConfig.structuralNotes}
                                  onChange={(e) =>
                                    setStructuralConfig((prev) => ({
                                      ...prev,
                                      structuralNotes: e.target.value,
                                    }))
                                  }
                                />
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-end">
                            <Button
                              size="sm"
                              onClick={saveStructuralConfig}
                              disabled={savingStatus}
                              className="bg-teal-500 hover:bg-teal-600 text-white"
                            >
                              Save Structural Rules
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="hardware" className="mt-0 space-y-4">
                      <Card className="bg-gray-900/80 border-gray-700">
                        <CardHeader>
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Wrench className="h-4 w-4 text-amber-300" />
                            Hardware Families & Packs
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-xs text-gray-200">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-3">
                              <div>
                                <label className="block mb-1 text-[11px] text-gray-300">
                                  Primary Hinge Family
                                </label>
                                <input
                                  type="text"
                                  className="w-full rounded border border-gray-700 bg-gray-950 px-2 py-1 text-xs"
                                  placeholder="e.g. Roto NT, GU, generic"
                                  value={hardwareConfig.primaryHingeFamily}
                                  onChange={(e) =>
                                    setHardwareConfig((prev) => ({
                                      ...prev,
                                      primaryHingeFamily: e.target.value,
                                    }))
                                  }
                                />
                              </div>
                              <div>
                                <label className="block mb-1 text-[11px] text-gray-300">
                                  Primary Lock Family
                                </label>
                                <input
                                  type="text"
                                  className="w-full rounded border border-gray-700 bg-gray-950 px-2 py-1 text-xs"
                                  placeholder="e.g. multipoint A, sliding lock B"
                                  value={hardwareConfig.primaryLockFamily}
                                  onChange={(e) =>
                                    setHardwareConfig((prev) => ({
                                      ...prev,
                                      primaryLockFamily: e.target.value,
                                    }))
                                  }
                                />
                              </div>
                            </div>
                            <div className="space-y-3">
                              <div>
                                <label className="block mb-1 text-[11px] text-gray-300">
                                  Preferred Handle Family
                                </label>
                                <input
                                  type="text"
                                  className="w-full rounded border border-gray-700 bg-gray-950 px-2 py-1 text-xs"
                                  placeholder="e.g. Alumil series X, generic lever"
                                  value={hardwareConfig.preferredHandleFamily}
                                  onChange={(e) =>
                                    setHardwareConfig((prev) => ({
                                      ...prev,
                                      preferredHandleFamily: e.target.value,
                                    }))
                                  }
                                />
                              </div>
                              <div>
                                <label className="block mb-1 text-[11px] text-gray-300">
                                  Hardware Pack Tags (comma‑separated)
                                </label>
                                <input
                                  type="text"
                                  className="w-full rounded border border-gray-700 bg-gray-950 px-2 py-1 text-xs"
                                  placeholder="e.g. bathroom_turn, balcony_slider, jumbo_door"
                                  value={hardwareConfig.hardwarePackTagsText}
                                  onChange={(e) =>
                                    setHardwareConfig((prev) => ({
                                      ...prev,
                                      hardwarePackTagsText: e.target.value,
                                    }))
                                  }
                                />
                                <p className="mt-1 text-[11px] text-gray-400">
                                  These tags will later map to predefined hardware & machining packs
                                  (hinges, locks, screws) for this profile.
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-end">
                            <Button
                              size="sm"
                              onClick={saveHardwareConfig}
                              disabled={savingStatus}
                              className="bg-amber-500 hover:bg-amber-600 text-white"
                            >
                              Save Hardware Presets
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="cost-erp" className="mt-0 space-y-4">
                      <Card className="bg-gray-900/80 border-gray-700">
                        <CardHeader>
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Wallet className="h-4 w-4 text-lime-300" />
                            Cost Model & ERP Mapping
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-xs text-gray-200">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block mb-1 text-[11px] text-gray-300">
                                    Aluminum Price (per kg)
                                  </label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    className="w-full rounded border border-gray-700 bg-gray-950 px-2 py-1 text-xs"
                                    value={costConfig.aluminumPricePerKg}
                                    onChange={(e) =>
                                      setCostConfig((prev) => ({
                                        ...prev,
                                        aluminumPricePerKg: e.target.value,
                                      }))
                                    }
                                  />
                                </div>
                                <div>
                                  <label className="block mb-1 text-[11px] text-gray-300">
                                    Machining Cost / Operation
                                  </label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    className="w-full rounded border border-gray-700 bg-gray-950 px-2 py-1 text-xs"
                                    value={costConfig.machiningCostPerOp}
                                    onChange={(e) =>
                                      setCostConfig((prev) => ({
                                        ...prev,
                                        machiningCostPerOp: e.target.value,
                                      }))
                                    }
                                  />
                                </div>
                                <div>
                                  <label className="block mb-1 text-[11px] text-gray-300">
                                    Coating Cost / m²
                                  </label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    className="w-full rounded border border-gray-700 bg-gray-950 px-2 py-1 text-xs"
                                    value={costConfig.coatingCostPerSqm}
                                    onChange={(e) =>
                                      setCostConfig((prev) => ({
                                        ...prev,
                                        coatingCostPerSqm: e.target.value,
                                      }))
                                    }
                                  />
                                </div>
                                <div>
                                  <label className="block mb-1 text-[11px] text-gray-300">
                                    Scrap Cost / kg
                                  </label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    className="w-full rounded border border-gray-700 bg-gray-950 px-2 py-1 text-xs"
                                    value={costConfig.scrapCostPerKg}
                                    onChange={(e) =>
                                      setCostConfig((prev) => ({
                                        ...prev,
                                        scrapCostPerKg: e.target.value,
                                      }))
                                    }
                                  />
                                </div>
                              </div>
                              <p className="text-[11px] text-gray-400">
                                These fields let the optimizer and reports estimate true production
                                cost per meter for this profile, including coatings and machining.
                              </p>
                            </div>
                            <div className="space-y-3">
                              <div>
                                <label className="block mb-1 text-[11px] text-gray-300">
                                  ERP Item Code
                                </label>
                                <input
                                  type="text"
                                  className="w-full rounded border border-gray-700 bg-gray-950 px-2 py-1 text-xs"
                                  placeholder="e.g. ERP-ALU-6001"
                                  value={costConfig.erpItemCode}
                                  onChange={(e) =>
                                    setCostConfig((prev) => ({
                                      ...prev,
                                      erpItemCode: e.target.value,
                                    }))
                                  }
                                />
                              </div>
                              <div>
                                <label className="block mb-1 text-[11px] text-gray-300">
                                  Warehouse Location
                                </label>
                                <input
                                  type="text"
                                  className="w-full rounded border border-gray-700 bg-gray-950 px-2 py-1 text-xs"
                                  placeholder="e.g. Rack A3, Level 2"
                                  value={costConfig.warehouseLocation}
                                  onChange={(e) =>
                                    setCostConfig((prev) => ({
                                      ...prev,
                                      warehouseLocation: e.target.value,
                                    }))
                                  }
                                />
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-end">
                            <Button
                              size="sm"
                              onClick={saveCostConfig}
                              disabled={savingStatus}
                              className="bg-lime-500 hover:bg-lime-600 text-white"
                            >
                              Save Cost & ERP
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="glazing" className="mt-0 space-y-4">
                      <Card className="bg-gray-900/80 border-gray-700">
                        <CardHeader>
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Droplets className="h-4 w-4 text-blue-300" />
                            Glazing Thickness, Gaskets & Packages
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-xs text-gray-200">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block mb-1 text-[11px] text-gray-300">
                                    Glazing Min (mm)
                                  </label>
                                  <input
                                    type="number"
                                    step="0.1"
                                    className="w-full rounded border border-gray-700 bg-gray-950 px-2 py-1 text-xs"
                                    value={glazingConfig.glazingMinMm}
                                    onChange={(e) =>
                                      setGlazingConfig((prev) => ({
                                        ...prev,
                                        glazingMinMm: e.target.value,
                                      }))
                                    }
                                  />
                                </div>
                                <div>
                                  <label className="block mb-1 text-[11px] text-gray-300">
                                    Glazing Max (mm)
                                  </label>
                                  <input
                                    type="number"
                                    step="0.1"
                                    className="w-full rounded border border-gray-700 bg-gray-950 px-2 py-1 text-xs"
                                    value={glazingConfig.glazingMaxMm}
                                    onChange={(e) =>
                                      setGlazingConfig((prev) => ({
                                        ...prev,
                                        glazingMaxMm: e.target.value,
                                      }))
                                    }
                                  />
                                </div>
                              </div>
                              <p className="text-[11px] text-gray-400">
                                These limits are used to validate glass packages and prevent
                                impossible glazing combinations for this profile (e.g. too thick IGU
                                for the bead).
                              </p>
                            </div>
                            <div className="space-y-3">
                              <div>
                                <label className="block mb-1 text-[11px] text-gray-300">
                                  Target Gasket Compression (mm)
                                </label>
                                <input
                                  type="number"
                                  step="0.1"
                                  className="w-full rounded border border-gray-700 bg-gray-950 px-2 py-1 text-xs"
                                  value={glazingConfig.gasketCompressionTargetMm}
                                  onChange={(e) =>
                                    setGlazingConfig((prev) => ({
                                      ...prev,
                                      gasketCompressionTargetMm: e.target.value,
                                    }))
                                  }
                                />
                                <p className="mt-1 text-[11px] text-gray-400">
                                  Typical values are 1.5–2.0mm for good sealing without crushing
                                  the gasket.
                                </p>
                              </div>
                              <div>
                                <label className="block mb-1 text-[11px] text-gray-300">
                                  Allowed Glass Packages (comma‑separated)
                                </label>
                                <input
                                  type="text"
                                  className="w-full rounded border border-gray-700 bg-gray-950 px-2 py-1 text-xs"
                                  placeholder="e.g. 4-16-4, 6-16-6, laminated 33.1, single 6"
                                  value={glazingConfig.allowedGlassPackagesText}
                                  onChange={(e) =>
                                    setGlazingConfig((prev) => ({
                                      ...prev,
                                      allowedGlassPackagesText: e.target.value,
                                    }))
                                  }
                                />
                                <p className="mt-1 text-[11px] text-gray-400">
                                  Used by the design engine to propose only compatible glass
                                  structures for this profile.
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-end">
                            <Button
                              size="sm"
                              onClick={saveGlazingConfig}
                              disabled={savingStatus}
                              className="bg-blue-500 hover:bg-blue-600 text-white"
                            >
                              Save Glazing Rules
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="machining" className="mt-0">
                      <MachiningZoneEditor
                        profile={profile}
                        zones={zones}
                        onZonesChange={setZones}
                        onSave={(updated) => handleSaveZones(updated)}
                      />
                    </TabsContent>

                    <TabsContent value="summary" className="mt-0 space-y-4">
                      <Card className="bg-gray-900/80 border-gray-700">
                        <CardHeader>
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-emerald-400" />
                            Tuning Status & Confidence
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-xs text-gray-300">
                          <p>
                            Current status: <span className="font-semibold">{tuningStatus}</span>
                          </p>
                          <p>
                            This panel will surface calibration analytics and test results (cut
                            deviations, confidence scores) as they accumulate over real jobs.
                          </p>
                        </CardContent>
                      </Card>

                        <Card className="bg-gray-900/80 border-gray-700">
                          <CardHeader>
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Activity className="h-4 w-4 text-sky-300" />
                              QA Tolerances
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3 text-xs text-gray-300">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div>
                                <span className="block text-[11px] text-gray-400 mb-1">
                                  Cut Tolerance (±mm)
                                </span>
                                <span className="font-semibold">
                                  {qaConfig.cutToleranceMm || '—'}
                                </span>
                              </div>
                              <div>
                                <span className="block text-[11px] text-gray-400 mb-1">
                                  Assembly Tolerance (±mm)
                                </span>
                                <span className="font-semibold">
                                  {qaConfig.assemblyToleranceMm || '—'}
                                </span>
                              </div>
                              <div>
                                <span className="block text-[11px] text-gray-400 mb-1">
                                  Notes
                                </span>
                                <span className="font-semibold">
                                  {qaConfig.qaNotes || 'No QA notes yet'}
                                </span>
                              </div>
                            </div>
                            <div className="flex justify-end">
                              <Button
                                size="sm"
                                onClick={saveQaConfig}
                                disabled={savingStatus}
                                className="bg-sky-500 hover:bg-sky-600 text-white"
                              >
                                Edit & Save QA Tolerances
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                    </TabsContent>
                  </div>
                </Tabs>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfileTuningStudio;


