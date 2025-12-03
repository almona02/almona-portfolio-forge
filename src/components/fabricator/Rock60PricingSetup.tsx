import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/ui/ui/card';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import { AlertCircle, DollarSign, Save, Plus, Trash2 } from 'lucide-react';
import type { Profile } from '@/types/fabricator';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { SYSTEM_PACKS, JUMBO100_WINDOW_SYSTEM_SPEC, ROCK60_WINDOW_SYSTEM_TEMPLATE } from '@/data/systemPacks';
import { useRegionalConfig } from '@/hooks/useRegionDetection';

// Helper function to guess role from JUMBO 100 profile number
function guessRoleFromProfileNumber(profileNumber: string): Profile['profileRole'] {
  const num = profileNumber.replace(/\s/g, '');
  // JUMBO 100 pattern: 2 100 XXXX
  // 1XXX = frames, 2XXX = sashes, 6XXX = small/accessories
  if (num.startsWith('21001')) return 'frame';
  if (num.startsWith('21002')) return 'sash';
  if (num.startsWith('21006')) return 'accessory';
  if (num.startsWith('21009')) return 'accessory';
  return 'frame'; // Default
}

// Hardware and Gasket definitions
const HARDWARE_LIST = [
  { code: '0253', label: 'Hinges (2 pcs)' },
  { code: '0707', label: 'Common Handle (1 pc)' },
  { code: 'KIT 10451', label: 'Locking Kit (1 set)' },
] as const;

const GASKET_LIST = [
  { code: 'GT 0122', label: 'Glass Gasket' },
  { code: 'GT 0118', label: 'Glass Gasket' },
  { code: 'GT 0137', label: 'Central Gasket' },
  { code: 'GT 0146', label: 'Sash Striker Gasket' },
  { code: 'GT 0152', label: 'Frame Gasket' },
] as const;

interface SystemPricingSetupProps {
  profiles: Profile[];
  userId?: string;
  selectedProfileId?: string;
  onProfileChange?: (profileId: string) => void;
}

type GlazingType = {
  id: string;
  name: string;
  description?: string;
  pricePerSquareMeter: number;
};

type Rock60PricingState = {
  currency: string;
  aluminumPricePerKg: number; // Main input: daily aluminum price per kg
  framePricePerMeter: number;
  sashPricePerMeter: number;
  beadPricePerMeter: number;
  glassPricePerSquareMeter: number; // Legacy field for backward compatibility
  glazingTypes: GlazingType[]; // New: array of glazing types with prices
  hardware: Record<string, number>;
  gaskets: Record<string, number>;
  profilePrices: Record<string, number>; // Dynamic profile prices: profileCode -> price per meter
};

/**
 * SystemPricingSetup (formerly Rock60PricingSetup)
 * Generic pricing editor for any window system pack elements (profiles, glass, hardware, gaskets).
 * Automatically detects the system pack from profile specifications and allows editing pricing for any profile.
 */
export const Rock60PricingSetup: React.FC<SystemPricingSetupProps> = ({ 
  profiles, 
  userId, 
  selectedProfileId,
  onProfileChange 
}) => {
  // Get regional config for currency
  const { config: regionalConfig } = useRegionalConfig();
  const currency = regionalConfig.currency.code || 'EGP'; // Default to EGP for Egypt
  const [selectedGlazingTypeId, setSelectedGlazingTypeId] = useState<string>('');
  const [selectedHardwareCode, setSelectedHardwareCode] = useState<string>('');
  const [selectedGasketCode, setSelectedGasketCode] = useState<string>('');

  // Get all profiles that have a system pack (window_system in specifications or systemBrand)
  // AND create virtual profiles from system pack data for profiles not yet in inventory
  const systemProfiles = useMemo(() => {
    const inventoryProfiles = profiles.filter((p) => {
      const specs = p.specifications as any;
      const hasSystem = 
        p.systemBrand || 
        specs?.window_system || 
        specs?.systemPackId ||
        SYSTEM_PACKS.some(pack => 
          p.systemBrand === pack.meta.name || 
          specs?.window_system === pack.meta.name
        );
      return hasSystem;
    });

    // Create virtual profiles from system pack data for profiles not in inventory
    const virtualProfiles: Profile[] = [];
    
    SYSTEM_PACKS.forEach((pack) => {
      const packSpec = pack.windowSystemSpec as any;
      
      // JUMBO 100 - get all aluminum_profiles and small_profiles
      if (packSpec.aluminum_profiles) {
        packSpec.aluminum_profiles.forEach((p: any) => {
          // Check if this profile already exists in inventory
          const exists = inventoryProfiles.some(inv => {
            const invSpecs = inv.specifications as any;
            return invSpecs?.supplierCode === p.profile_number ||
                   invSpecs?.internalCode === p.profile_number ||
                   inv.name.includes(p.profile_number);
          });
          
          if (!exists) {
            // Create virtual profile from system pack data
            virtualProfiles.push({
              id: `virtual-${pack.meta.id}-${p.profile_number}`,
              name: `Profile ${p.profile_number}`,
              material: 'aluminum',
              width: p.dimensions_mm?.A || 0,
              height: p.dimensions_mm?.B || 0,
              thickness: 1.8,
              color: '#C0C0C0',
              costPerMeter: 0,
              cuttingAllowance: 3,
              stockQuantity: 0,
              minStockLevel: 0,
              maxStockLevel: 1000,
              supplier: packSpec.catalog_metadata?.company || 'ELSHERIF',
              systemBrand: pack.meta.name,
              specifications: {
                window_system: packSpec.window_system,
                systemPackId: pack.meta.id,
                supplierCode: p.profile_number,
                internalCode: p.old_profile_number,
                profileRole: guessRoleFromProfileNumber(p.profile_number), // Guess role from profile number
                weightPerMeterKg: p.weight_kg_per_ml,
              },
              userId: userId || '',
            } as Profile);
          }
        });
      }
      
      // Also include small_profiles for JUMBO 100
      if (packSpec.small_profiles) {
        packSpec.small_profiles.forEach((p: any) => {
          const exists = inventoryProfiles.some(inv => {
            const invSpecs = inv.specifications as any;
            return invSpecs?.supplierCode === p.profile_number ||
                   invSpecs?.internalCode === p.profile_number ||
                   inv.name.includes(p.profile_number);
          });
          
          if (!exists) {
            virtualProfiles.push({
              id: `virtual-${pack.meta.id}-${p.profile_number}`,
              name: `Profile ${p.profile_number}`,
              material: 'aluminum',
              width: p.dimensions_mm?.A || 0,
              height: p.dimensions_mm?.B || 0,
              thickness: 1.8,
              color: '#C0C0C0',
              costPerMeter: 0,
              cuttingAllowance: 3,
              stockQuantity: 0,
              minStockLevel: 0,
              maxStockLevel: 1000,
              supplier: packSpec.catalog_metadata?.company || 'ELSHERIF',
              systemBrand: pack.meta.name,
              specifications: {
                window_system: packSpec.window_system,
                systemPackId: pack.meta.id,
                supplierCode: p.profile_number,
                internalCode: p.old_profile_number,
                profileRole: 'accessory', // Small profiles are usually accessories
                weightPerMeterKg: p.weight_kg_per_ml,
              },
              userId: userId || '',
            } as Profile);
          }
        });
      }
    });

    // Combine inventory profiles with virtual profiles
    return [...inventoryProfiles, ...virtualProfiles];
  }, [profiles, userId]);

  // Group profiles by system pack - normalize system names for matching
  const profilesBySystem = useMemo(() => {
    const grouped: Record<string, Profile[]> = {};
    
    // Helper to normalize system names for matching
    const normalizeSystemName = (name: string | undefined | null): string => {
      if (!name) return 'Unknown';
      return name.toUpperCase().replace(/\s+/g, '').replace(/[^A-Z0-9]/g, '');
    };
    
    systemProfiles.forEach((profile) => {
      const specs = profile.specifications as any;
      const rawSystemName = 
        specs?.window_system || 
        profile.systemBrand || 
        specs?.systemPackId || 
        'Unknown';
      
      // Normalize system name for consistent grouping
      // Try to match with known system pack names
      const normalized = normalizeSystemName(rawSystemName);
      let matchedSystemName = rawSystemName; // Keep original for display
      
      // Try to find matching system pack
      const matchingPack = SYSTEM_PACKS.find(pack => {
        const packNameNorm = normalizeSystemName(pack.meta.name);
        const packIdNorm = normalizeSystemName(pack.meta.id);
        return normalized === packNameNorm || 
               normalized === packIdNorm ||
               normalized.includes(packNameNorm) ||
               packNameNorm.includes(normalized);
      });
      
      if (matchingPack) {
        matchedSystemName = matchingPack.meta.name; // Use canonical name
      }
      
      if (!grouped[matchedSystemName]) {
        grouped[matchedSystemName] = [];
      }
      grouped[matchedSystemName].push(profile);
    });
    
    // Sort profiles within each system by profile number/code
    Object.keys(grouped).forEach(system => {
      grouped[system].sort((a, b) => {
        const aCode = (a.specifications as any)?.supplierCode || a.name;
        const bCode = (b.specifications as any)?.supplierCode || b.name;
        return aCode.localeCompare(bCode);
      });
    });
    
    return grouped;
  }, [systemProfiles]);

  // Determine which profile to use
  const [currentProfileId, setCurrentProfileId] = useState<string | undefined>(
    selectedProfileId || systemProfiles[0]?.id
  );

  const selectedProfile = useMemo(
    () => systemProfiles.find((p) => p.id === currentProfileId) || systemProfiles[0],
    [systemProfiles, currentProfileId]
  );

  // Update currentProfileId when selectedProfileId prop changes
  useEffect(() => {
    if (selectedProfileId && selectedProfileId !== currentProfileId) {
      setCurrentProfileId(selectedProfileId);
    }
  }, [selectedProfileId, currentProfileId]);

  // Get system name from profile
  const systemName = useMemo(() => {
    if (!selectedProfile) return null;
    const specs = selectedProfile.specifications as any;
    return specs?.window_system || selectedProfile.systemBrand || specs?.systemPackId || 'Unknown';
  }, [selectedProfile]);

  // Use generic key: system_pricing (with fallback to rock60_pricing for backward compatibility)
  const existingPricing = useMemo(() => {
    if (!selectedProfile) return undefined;
    const specs = selectedProfile.specifications as any;
    return (specs?.system_pricing || specs?.rock60_pricing) as
      | (Rock60PricingState & { initialized?: boolean })
      | undefined;
  }, [selectedProfile]);

  // Get system pack profiles from specifications - includes ALL profiles from system pack data
  const systemPackProfiles = useMemo(() => {
    if (!selectedProfile) return [];
    const specs = selectedProfile.specifications as any;
    const systemLabel = systemName || '';
    
    // Get profiles from system pack data
    const pack = SYSTEM_PACKS.find(p => 
      p.meta.name === systemLabel || 
      p.meta.id === (specs?.systemPackId || '').toLowerCase() ||
      p.meta.name.toLowerCase().includes(systemLabel.toLowerCase()) ||
      systemLabel.toLowerCase().includes(p.meta.name.toLowerCase())
    );
    
    if (!pack) return [];
    
    const packSpec = pack.windowSystemSpec as any;
    const profiles: Array<{code: string; name: string; weight: number; role?: string}> = [];
    
    // JUMBO 100 style - include ALL aluminum_profiles (20 profiles)
    if (packSpec.aluminum_profiles) {
      packSpec.aluminum_profiles.forEach((p: any) => {
        profiles.push({
          code: p.profile_number,
          name: `Profile ${p.profile_number}`,
          weight: p.weight_kg_per_ml || 0,
          role: guessRoleFromProfileNumber(p.profile_number),
        });
      });
    }
    
    // JUMBO 100 - also include small_profiles (accessories, beads, etc.)
    if (packSpec.small_profiles) {
      packSpec.small_profiles.forEach((p: any) => {
        profiles.push({
          code: p.profile_number,
          name: `Profile ${p.profile_number}`,
          weight: p.weight_kg_per_ml || 0,
          role: 'accessory', // Small profiles are usually accessories/beads
        });
      });
    }
    
    // ROCK 60 style (from config)
    if (packSpec.rock60_45_degree_config) {
      const cfg = packSpec.rock60_45_degree_config;
      if (cfg.frame_profiles?.main_frame) {
        profiles.push({
          code: 'RC 6111-8',
          name: 'Frame RC 6111-8',
          weight: cfg.frame_profiles.main_frame.weight_kg_m || 0,
          role: 'frame',
        });
      }
      if (cfg.sash_profiles?.main_sash) {
        profiles.push({
          code: 'RC 6122',
          name: 'Sash RC 6122',
          weight: cfg.sash_profiles.main_sash.weight_kg_m || 0,
          role: 'sash',
        });
      }
      if (cfg.glazing_beads?.bead_profile) {
        profiles.push({
          code: 'RC 6166',
          name: 'Bead RC 6166',
          weight: cfg.glazing_beads.bead_profile.weight_kg_m || 0,
          role: 'glazing_bead',
        });
      }
    }
    
    return profiles;
  }, [selectedProfile, systemName]);

  // Default glazing types
  const defaultGlazingTypes: GlazingType[] = [
    { id: 'single', name: 'Single Glass', description: 'Single pane glass (typically 4-6mm)', pricePerSquareMeter: 0 },
    { id: 'double', name: 'Double Glass', description: 'Double pane glass 24mm – dimensions per job: (L - 167) × (H - 167)', pricePerSquareMeter: 0 },
    { id: 'triple', name: 'Triple Glass', description: 'Triple pane glass (typically 44mm)', pricePerSquareMeter: 0 },
    { id: 'georgian', name: 'Georgian Glass', description: 'Georgian divided lite glass', pricePerSquareMeter: 0 },
    { id: 'low-e', name: 'Low-E Glass', description: 'Low-emissivity coated glass', pricePerSquareMeter: 0 },
    { id: 'laminated', name: 'Laminated Glass', description: 'Safety laminated glass', pricePerSquareMeter: 0 },
  ];

  // Initialize state from existing pricing
  const getInitialState = (pricing: (Rock60PricingState & { initialized?: boolean }) | undefined): Rock60PricingState => {
    // Migrate legacy glassPricePerSquareMeter to glazingTypes if needed
    let glazingTypes: GlazingType[] = pricing?.glazingTypes || [];
    
    // If no glazing types but legacy price exists, create default with that price
    if (glazingTypes.length === 0 && pricing?.glassPricePerSquareMeter) {
      glazingTypes = defaultGlazingTypes.map(type => ({
        ...type,
        pricePerSquareMeter: type.id === 'double' ? pricing.glassPricePerSquareMeter : 0,
      }));
    }
    
    // If still empty, use defaults
    if (glazingTypes.length === 0) {
      glazingTypes = [...defaultGlazingTypes];
    }

    return {
      currency: pricing?.currency || currency,
      aluminumPricePerKg: pricing?.aluminumPricePerKg ?? 0,
      framePricePerMeter: pricing?.framePricePerMeter ?? 0,
      sashPricePerMeter: pricing?.sashPricePerMeter ?? 0,
      beadPricePerMeter: pricing?.beadPricePerMeter ?? 0,
      glassPricePerSquareMeter: pricing?.glassPricePerSquareMeter ?? 0, // Keep for backward compatibility
      glazingTypes,
      hardware: {
        '0253': pricing?.hardware?.['0253'] ?? 0,
        '0707': pricing?.hardware?.['0707'] ?? 0,
        'KIT 10451': pricing?.hardware?.['KIT 10451'] ?? 0,
        ...pricing?.hardware,
      },
      gaskets: {
        'GT 0122': pricing?.gaskets?.['GT 0122'] ?? 0,
        'GT 0118': pricing?.gaskets?.['GT 0118'] ?? 0,
        'GT 0137': pricing?.gaskets?.['GT 0137'] ?? 0,
        'GT 0146': pricing?.gaskets?.['GT 0146'] ?? 0,
        'GT 0152': pricing?.gaskets?.['GT 0152'] ?? 0,
        ...pricing?.gaskets,
      },
      profilePrices: pricing?.profilePrices || {},
    };
  };

  const [saving, setSaving] = useState(false);
  const [state, setState] = useState<Rock60PricingState>(() => getInitialState(existingPricing));

  // Update state when profile changes
  useEffect(() => {
    if (selectedProfile) {
      const specs = selectedProfile.specifications as any;
      const pricing = (specs?.system_pricing || specs?.rock60_pricing) as
        | (Rock60PricingState & { initialized?: boolean })
        | undefined;
      
      const newState = getInitialState(pricing);
      setState(newState);
      // Auto-select first glazing type if available
      if (newState.glazingTypes.length > 0 && !selectedGlazingTypeId) {
        setSelectedGlazingTypeId(newState.glazingTypes[0].id);
      }
      // Auto-select first hardware if available
      if (HARDWARE_LIST.length > 0 && !selectedHardwareCode) {
        setSelectedHardwareCode(HARDWARE_LIST[0].code);
      }
      // Auto-select first gasket if available
      if (GASKET_LIST.length > 0 && !selectedGasketCode) {
        setSelectedGasketCode(GASKET_LIST[0].code);
      }
    }
  }, [selectedProfile]);

  // Auto-select first glazing type when types are added
  useEffect(() => {
    if (state.glazingTypes.length > 0 && !selectedGlazingTypeId) {
      setSelectedGlazingTypeId(state.glazingTypes[0].id);
    } else if (state.glazingTypes.length === 0) {
      setSelectedGlazingTypeId('');
    }
  }, [state.glazingTypes.length]);

  const isConfigured = !!existingPricing?.initialized;

  const handleProfileChange = (profileId: string) => {
    if (profileId && profileId !== currentProfileId) {
      setCurrentProfileId(profileId);
      onProfileChange?.(profileId);
    }
  };

  if (systemProfiles.length === 0) {
    return null;
  }

  if (!selectedProfile) {
    return null;
  }

  const handleChange = (field: keyof Rock60PricingState, value: number | string) => {
    setState((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleHardwareChange = (code: string, value: number) => {
    setState((prev) => ({
      ...prev,
      hardware: {
        ...prev.hardware,
        [code]: value,
      },
    }));
  };

  const handleGasketChange = (code: string, value: number) => {
    setState((prev) => ({
      ...prev,
      gaskets: {
        ...prev.gaskets,
        [code]: value,
      },
    }));
  };

  const handleGlazingTypeChange = (id: string, field: keyof GlazingType, value: string | number) => {
    setState((prev) => ({
      ...prev,
      glazingTypes: prev.glazingTypes.map((type) =>
        type.id === id ? { ...type, [field]: value } : type
      ),
    }));
  };

  const handleAddGlazingType = () => {
    const newId = `custom-${Date.now()}`;
    setState((prev) => ({
      ...prev,
      glazingTypes: [
        ...prev.glazingTypes,
        {
          id: newId,
          name: 'New Glazing Type',
          description: '',
          pricePerSquareMeter: 0,
        },
      ],
    }));
    // Auto-select the newly added type
    setSelectedGlazingTypeId(newId);
  };

  const handleDeleteGlazingType = (id: string) => {
    setState((prev) => {
      const newTypes = prev.glazingTypes.filter((type) => type.id !== id);
      // If deleting the selected type, select the first remaining one
      if (id === selectedGlazingTypeId && newTypes.length > 0) {
        setSelectedGlazingTypeId(newTypes[0].id);
      } else if (newTypes.length === 0) {
        setSelectedGlazingTypeId('');
      }
      return {
        ...prev,
        glazingTypes: newTypes,
      };
    });
  };

  const selectedGlazingType = state.glazingTypes.find((t) => t.id === selectedGlazingTypeId);
  const selectedHardware = HARDWARE_LIST.find((h) => h.code === selectedHardwareCode);
  const selectedGasket = GASKET_LIST.find((g) => g.code === selectedGasketCode);

  const handleSave = async () => {
    if (!userId || !selectedProfile) {
      toast.error('User ID or profile not available');
      return;
    }

    try {
      setSaving(true);

      const nextSpecs = {
        ...(selectedProfile.specifications || {}),
        system_pricing: {
          ...state,
          initialized: true,
          systemName: systemName,
        },
      };

      const { error } = await (supabase as any)
        .from('fabricator_profiles')
        .update({ specifications: nextSpecs })
        .eq('id', selectedProfile.id)
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      toast.success(`${systemName} pricing saved`);
    } catch (error) {
      console.error('Error saving system pricing:', error);
      toast.error(`Failed to save ${systemName} pricing`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="bg-gray-900/70 border-gray-700">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm flex items-center gap-2">
            System Pricing Setup
            <Badge
              variant={isConfigured ? 'outline' : 'destructive'}
              className="text-[10px]"
            >
              {isConfigured ? 'Configured' : 'Required'}
            </Badge>
          </CardTitle>
          <CardDescription className="text-[11px]">
            Set base prices for {systemName} elements: profiles, glass, hardware, and gaskets.
          </CardDescription>
        </div>
        <DollarSign className="h-4 w-4 text-green-400" />
      </CardHeader>
      <CardContent className="space-y-4 text-[11px]">
        {/* System Pack Selector */}
        {Object.keys(profilesBySystem).length > 1 && (
          <div className="space-y-2">
            <label className="text-xs text-gray-400">Select System Pack</label>
            <Select 
              value={systemName || ''} 
              onValueChange={(system) => {
                const firstProfile = profilesBySystem[system]?.[0];
                if (firstProfile) {
                  handleProfileChange(firstProfile.id);
                }
              }}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select a system pack" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(profilesBySystem).map(([system, profs]) => (
                  <SelectItem key={system} value={system}>
                    {system} ({profs.length} profiles)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Profile Selector - Show all profiles with code and role */}
        {profilesBySystem[systemName || ''] && profilesBySystem[systemName || ''].length > 0 && (
          <div className="space-y-2">
            <label className="text-xs text-gray-400">
              Select Profile • <span className="font-semibold text-gray-300">{systemName}</span> ({profilesBySystem[systemName || '']?.length} available)
            </label>
            <Select value={currentProfileId} onValueChange={handleProfileChange}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder={`Select a ${systemName || 'system'} profile`} />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {profilesBySystem[systemName || '']?.map((profile) => {
                  const specs = profile.specifications as any;
                  const code = specs?.supplierCode || specs?.internalCode || profile.name.replace('Profile ', '');
                  const role = specs?.profileRole || 'other';
                  const isVirtual = profile.id.startsWith('virtual-');
                  // Use profile name as primary text for SelectValue to display
                  const displayName = `${profile.name}${isVirtual ? ' (from catalog)' : ''}`;
                  return (
                    <SelectItem key={profile.id} value={profile.id}>
                      {/* Profile name as first text node for SelectValue */}
                      {displayName}
                      <div className="flex flex-col gap-0.5 w-full mt-0.5">
                        <span className="text-[10px] text-gray-400">
                          Profile: {code} • Role: {role}
                        </span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        )}

        {!isConfigured && (
          <Alert className="bg-yellow-900/20 border-yellow-700 text-[11px]">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              First time setup: please review and fill prices before using {systemName || 'this system'} for quotations.
            </AlertDescription>
          </Alert>
        )}

        {/* Aluminum Price Per Kg - Main Input */}
        <div className="space-y-2 border-b border-gray-700 pb-4">
          <div className="font-semibold text-gray-200">Daily Aluminum Price</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Price per kg ({currency})</label>
              <Input
                type="number"
                step="0.01"
                value={state.aluminumPricePerKg}
                onChange={(e) => {
                  const pricePerKg = parseFloat(e.target.value) || 0;
                  handleChange('aluminumPricePerKg', pricePerKg);
                  // Auto-calculate profile prices based on weight ONLY for frame, sash, and other roles
                  // Accessories are NOT calculated per weight - they need separate pricing
                  const newProfilePrices: Record<string, number> = {};
                  systemPackProfiles.forEach(profile => {
                    const role = profile.role || 'other';
                    // Only calculate for frame, sash, and other - NOT accessories
                    if (profile.weight > 0 && role !== 'accessory' && role !== 'glazing_bead') {
                      newProfilePrices[profile.code] = pricePerKg * profile.weight;
                    }
                    // Keep existing manual prices for accessories
                  });
                  setState(prev => ({
                    ...prev,
                    aluminumPricePerKg: pricePerKg,
                    profilePrices: { ...prev.profilePrices, ...newProfilePrices },
                  }));
                }}
                placeholder={`Enter daily aluminum price per kg (${currency})`}
                className="font-semibold"
              />
              <p className="text-[10px] text-gray-500 mt-1">
                Auto-calculates prices for <strong>frame, sash, and other</strong> profiles only. Accessories need separate pricing.
              </p>
            </div>
          </div>
        </div>

        {/* Profiles - Read-only table showing auto-calculated prices */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-gray-200">Profiles (per meter)</div>
            <span className="text-[10px] text-gray-400">
              {systemPackProfiles.length} profiles • Frame/Sash auto-calc • Accessories manual
            </span>
          </div>
          <div className="border border-gray-700 rounded-md overflow-hidden">
            <div className="max-h-[500px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-800/50 sticky top-0">
                  <tr className="border-b border-gray-700">
                    <th className="text-left p-2 font-semibold text-gray-300">Profile</th>
                    <th className="text-left p-2 font-semibold text-gray-300">Code</th>
                    <th className="text-center p-2 font-semibold text-gray-300">Role</th>
                    <th className="text-right p-2 font-semibold text-gray-300">Weight (kg/m)</th>
                    <th className="text-right p-2 font-semibold text-gray-300">Price ({currency}/m)</th>
                  </tr>
                </thead>
                <tbody>
                  {systemPackProfiles.map((profile, idx) => {
                    const role = profile.role || 'other';
                    const isAccessory = role === 'accessory' || role === 'glazing_bead';
                    
                    // Only auto-calculate for frame, sash, and other - NOT accessories
                    const calculatedPrice = isAccessory 
                      ? (state.profilePrices[profile.code] || 0) // Accessories use manual price only
                      : (state.profilePrices[profile.code] || 
                          (state.aluminumPricePerKg > 0 && profile.weight > 0 
                            ? state.aluminumPricePerKg * profile.weight 
                            : 0));
                    
                    return (
                      <tr 
                        key={profile.code} 
                        className={`border-b border-gray-800/50 hover:bg-gray-800/30 ${
                          idx % 2 === 0 ? 'bg-gray-900/30' : ''
                        } ${isAccessory ? 'opacity-75' : ''}`}
                      >
                        <td className="p-2 text-gray-200 font-medium">
                          {profile.name}
                          {isAccessory && <span className="text-[9px] text-yellow-400 ml-1">(manual)</span>}
                        </td>
                        <td className="p-2 text-gray-400 font-mono text-[10px]">{profile.code}</td>
                        <td className="p-2 text-center">
                          <Badge 
                            variant={isAccessory ? "secondary" : "outline"} 
                            className="text-[9px] px-1.5 py-0"
                          >
                            {role}
                          </Badge>
                        </td>
                        <td className="p-2 text-right text-gray-300 font-mono">
                          {profile.weight.toFixed(3)}
                        </td>
                        <td className="p-2 text-right">
                          {isAccessory ? (
                            <Input
                              type="number"
                              step="0.01"
                              value={calculatedPrice > 0 ? calculatedPrice.toFixed(2) : ''}
                              onChange={(e) => {
                                const manualPrice = parseFloat(e.target.value) || 0;
                                setState(prev => ({
                                  ...prev,
                                  profilePrices: {
                                    ...prev.profilePrices,
                                    [profile.code]: manualPrice,
                                  },
                                }));
                              }}
                              placeholder="Manual"
                              className="h-7 w-20 text-xs text-right font-mono bg-gray-800 border-gray-600 text-yellow-400"
                            />
                          ) : state.aluminumPricePerKg > 0 ? (
                            <span className="text-green-400 font-semibold font-mono">
                              {calculatedPrice.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-gray-500">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {systemPackProfiles.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-xs">
                  No profiles found in system pack data. Please check system pack configuration.
                </div>
              )}
            </div>
          </div>
          {state.aluminumPricePerKg > 0 && (
            <p className="text-[10px] text-gray-500 mt-1">
              💡 Frame/Sash/Other prices: <span className="font-mono">{state.aluminumPricePerKg.toFixed(2)} {currency}/kg</span> × weight
              {' • '}
              <span className="text-yellow-400">Accessories require manual pricing</span>
            </p>
          )}
        </div>

        {/* Glass - Multiple Glazing Types (Dropdown Interface) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-gray-200 text-xs">Glazing Types & Prices</div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleAddGlazingType}
              className="text-xs h-6 px-2"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add
            </Button>
          </div>
          
          {state.glazingTypes.length === 0 ? (
            <div className="text-xs text-gray-500 text-center py-3 border border-gray-700 rounded bg-gray-800/30">
              No glazing types configured. Click "Add" to add one.
            </div>
          ) : (
            <div className="space-y-2">
              {/* Dropdown Selector */}
              <Select value={selectedGlazingTypeId} onValueChange={setSelectedGlazingTypeId}>
                <SelectTrigger className="h-8 text-xs bg-gray-800 border-gray-700">
                  <SelectValue placeholder="Select glazing type">
                    {selectedGlazingType ? (
                      <span className="font-medium">{selectedGlazingType.name}</span>
                    ) : (
                      'Select glazing type'
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {state.glazingTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id} className="text-xs">
                      <div className="flex items-center justify-between w-full pr-2">
                        <span className="font-medium">{type.name}</span>
                        <span className="text-gray-400 ml-2 font-mono text-[10px]">
                          {type.pricePerSquareMeter > 0 
                            ? `${type.pricePerSquareMeter.toFixed(2)} ${currency}/m²`
                            : '—'}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Edit Form for Selected Type */}
              {selectedGlazingType && (
                <div className="grid grid-cols-12 gap-2 p-2 rounded-lg border border-gray-700 bg-gray-800/50">
                  <div className="col-span-5">
                    <Label className="text-[10px] text-gray-400 mb-1 block">Name</Label>
                    <Input
                      type="text"
                      value={selectedGlazingType.name}
                      onChange={(e) => handleGlazingTypeChange(selectedGlazingType.id, 'name', e.target.value)}
                      placeholder="Glazing type name"
                      className="h-7 text-xs bg-gray-700 border-gray-600"
                    />
                  </div>
                  <div className="col-span-4">
                    <Label className="text-[10px] text-gray-400 mb-1 block">Price / m²</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={selectedGlazingType.pricePerSquareMeter || ''}
                      onChange={(e) => handleGlazingTypeChange(selectedGlazingType.id, 'pricePerSquareMeter', parseFloat(e.target.value) || 0)}
                      placeholder={`0.00 ${currency}`}
                      className="h-7 text-xs bg-gray-700 border-gray-600 font-mono"
                    />
                  </div>
                  <div className="col-span-3 flex items-end gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteGlazingType(selectedGlazingType.id)}
                      className="h-7 px-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs"
                      disabled={state.glazingTypes.length <= 1}
                      title="Delete this glazing type"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  {selectedGlazingType.description && (
                    <div className="col-span-12">
                      <Label className="text-[10px] text-gray-400 mb-1 block">Description</Label>
                      <Input
                        type="text"
                        value={selectedGlazingType.description}
                        onChange={(e) => handleGlazingTypeChange(selectedGlazingType.id, 'description', e.target.value)}
                        placeholder="Optional description"
                        className="h-7 text-xs bg-gray-700 border-gray-600"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Hardware (Dropdown Interface) */}
        <div className="space-y-2">
          <div className="font-semibold text-gray-200 text-xs">Hardware (per piece / set)</div>
          <div className="space-y-2">
            <Select value={selectedHardwareCode} onValueChange={setSelectedHardwareCode}>
              <SelectTrigger className="h-8 text-xs bg-gray-800 border-gray-700">
                <SelectValue placeholder="Select hardware">
                  {selectedHardware ? (
                    <span className="font-medium">{selectedHardware.code} - {selectedHardware.label}</span>
                  ) : (
                    'Select hardware'
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-[200px]">
                {HARDWARE_LIST.map((hw) => (
                  <SelectItem key={hw.code} value={hw.code} className="text-xs">
                    <div className="flex items-center justify-between w-full pr-2">
                      <span className="font-medium">{hw.code}</span>
                      <span className="text-gray-400 ml-2 text-[10px]">
                        {state.hardware[hw.code] > 0 
                          ? `${state.hardware[hw.code].toFixed(2)} ${currency}`
                          : '—'}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedHardware && (
              <div className="grid grid-cols-12 gap-2 p-2 rounded-lg border border-gray-700 bg-gray-800/50">
                <div className="col-span-9">
                  <Label className="text-[10px] text-gray-400 mb-1 block">
                    {selectedHardware.code} - {selectedHardware.label}
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={state.hardware[selectedHardwareCode] || ''}
                    onChange={(e) => handleHardwareChange(selectedHardwareCode, parseFloat(e.target.value) || 0)}
                    placeholder={`Price (${currency})`}
                    className="h-7 text-xs bg-gray-700 border-gray-600 font-mono"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Gaskets (Dropdown Interface) */}
        <div className="space-y-2">
          <div className="font-semibold text-gray-200 text-xs">Gaskets (per meter)</div>
          <div className="space-y-2">
            <Select value={selectedGasketCode} onValueChange={setSelectedGasketCode}>
              <SelectTrigger className="h-8 text-xs bg-gray-800 border-gray-700">
                <SelectValue placeholder="Select gasket">
                  {selectedGasket ? (
                    <span className="font-medium">{selectedGasket.code} - {selectedGasket.label}</span>
                  ) : (
                    'Select gasket'
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-[200px]">
                {GASKET_LIST.map((g) => (
                  <SelectItem key={g.code} value={g.code} className="text-xs">
                    <div className="flex items-center justify-between w-full pr-2">
                      <span className="font-medium">{g.code}</span>
                      <span className="text-gray-400 ml-2 text-[10px]">
                        {state.gaskets[g.code] > 0 
                          ? `${state.gaskets[g.code].toFixed(2)} ${currency}/m`
                          : '—'}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedGasket && (
              <div className="grid grid-cols-12 gap-2 p-2 rounded-lg border border-gray-700 bg-gray-800/50">
                <div className="col-span-9">
                  <Label className="text-[10px] text-gray-400 mb-1 block">
                    {selectedGasket.code} - {selectedGasket.label}
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={state.gaskets[selectedGasketCode] || ''}
                    onChange={(e) => handleGasketChange(selectedGasketCode, parseFloat(e.target.value) || 0)}
                    placeholder={`Price / m (${currency})`}
                    className="h-7 text-xs bg-gray-700 border-gray-600 font-mono"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !userId}
            className="bg-orange-500 hover:bg-orange-600 text-xs"
          >
            <Save className="h-4 w-4 mr-1" />
            {saving ? 'Saving...' : `Save ${systemName} Pricing`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default Rock60PricingSetup;


