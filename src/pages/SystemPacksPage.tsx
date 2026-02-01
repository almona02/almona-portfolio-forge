/**
 * System Packs Page - Premium Ultimate Cards Design
 * 
 * Displays all system packs in a beautiful card gallery inspired by FC26 ultimate cards.
 * Features premium gradients, glassmorphism, and smooth animations.
 */

import { SystemTuningStudio } from '@/components/fabricator/SystemTuningStudio';
import { UnifiedStudioWizard } from '@/components/fabricator/unifiedWorkflow/UnifiedStudioWizard';
import { SYSTEM_PACKS } from '@/data/systemPacks';
import { addCustomSystemAsync, loadCustomSystems } from '@/lib/fabricator/customSystemStorage';
import { getSystemPackTuningStatus, saveReturnUrl } from '@/lib/fabricator/systemTuningUtils';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Input } from '@/shared/ui/ui/input';
import { AnimatePresence, motion } from 'framer-motion';
import {
    AlertTriangle,
    ArrowRight,
    CheckCircle2,
    Globe,
    Layers,
    Package,
    Plus,
    Search,
    Settings,
    Shield,
    Sparkles,
    Wrench,
    Zap
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const SystemPacksPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'tuned' | 'untuned' | 'upvc' | 'aluminum'>('all');
  const [customSystems, setCustomSystems] = useState<any[]>([]);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [showSystemWizard, setShowSystemWizard] = useState(false);
  const [showUnifiedWizard, setShowUnifiedWizard] = useState(false);
  const [unifiedWizardType, _setUnifiedWizardType] = useState<'profile' | 'system-pack' | 'tuning'>('system-pack');
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const getUserId = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUserId(session?.user?.id || null);
    };
    getUserId();
  }, []);

  useEffect(() => {
    const loadSystems = async () => {
      const saved = loadCustomSystems(); // Use sync version for now
      setCustomSystems(saved);
    };
    loadSystems();
    
    const handleSystemPackTuned = () => {
      setCustomSystems(loadCustomSystems());
    };
    
    window.addEventListener('systemPackTuned', handleSystemPackTuned);
    return () => window.removeEventListener('systemPackTuned', handleSystemPackTuned);
  }, []);

  const allSystems = useMemo(() => {
    const systemsMap = new Map<string, any>();
    SYSTEM_PACKS.forEach(system => {
      systemsMap.set(system.meta.id, system);
    });
    customSystems.forEach(system => {
      systemsMap.set(system.meta.id, system);
    });
    return Array.from(systemsMap.values());
  }, [customSystems]);

  const filteredSystems = useMemo(() => {
    let filtered = allSystems;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(system => 
        system.meta.name.toLowerCase().includes(query) ||
        system.meta.brands?.some((b: string) => b.toLowerCase().includes(query)) ||
        system.meta.id.toLowerCase().includes(query)
      );
    }

    if (filterType !== 'all') {
      filtered = filtered.filter(system => {
        const status = getSystemPackTuningStatus(system);
        const isUPVC = !!(system as any).upvcSpec;
        
        if (filterType === 'tuned') return status.isTuned;
        if (filterType === 'untuned') return status.needsTuning;
        if (filterType === 'upvc') return isUPVC;
        if (filterType === 'aluminum') return !isUPVC;
        return true;
      });
    }

    return filtered;
  }, [allSystems, searchQuery, filterType]);

  const handleTuneSystem = (systemPackId: string) => {
    saveReturnUrl('/fabricator/studio/data', {
      returnToSystemPacks: 'true',
    });
    navigate(`/fabricator/studio/data/tuning-no-dxf?systemPackId=${systemPackId}`);
  };

  const handleTuneProfile = (systemPackId: string, profileId?: string) => {
    saveReturnUrl('/fabricator/studio/data', {
      returnToSystemPacks: 'true',
    });
    const url = profileId 
      ? `/fabricator/studio/data/tuning?systemPackId=${systemPackId}&profileId=${profileId}`
      : `/fabricator/studio/data/tuning?systemPackId=${systemPackId}`;
    navigate(url);
  };

  const getCardGradient = (system: any, isHovered: boolean) => {
    const isUPVC = !!(system as any).upvcSpec;
    const tuningStatus = getSystemPackTuningStatus(system);
    
    if (tuningStatus.isTuned) {
      return isHovered
        ? 'from-emerald-600/20 via-emerald-500/15 to-teal-600/20'
        : 'from-emerald-700/30 via-emerald-600/20 to-teal-700/30';
    }
    
    if (isUPVC) {
      return isHovered
        ? 'from-green-600/20 via-green-500/15 to-emerald-600/20'
        : 'from-green-700/30 via-green-600/20 to-emerald-700/30';
    }
    
    return isHovered
      ? 'from-blue-600/20 via-blue-500/15 to-indigo-600/20'
      : 'from-blue-700/30 via-blue-600/20 to-indigo-700/30';
  };

  const getCardBorder = (system: any) => {
    const tuningStatus = getSystemPackTuningStatus(system);
    if (tuningStatus.isTuned) {
      return 'border-emerald-500/50';
    }
    if (tuningStatus.needsTuning) {
      return 'border-yellow-500/50';
    }
    return 'border-slate-600/50';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-4">
              <div className="btn-primary-gradient">
                <Package className="h-8 w-8 text-amber-400" />
              </div>
              <div>
                <h1 className="typography-h1 md:text-4xl text-white flex items-center gap-3">
                  System Packs Gallery
                  <Sparkles className="h-6 w-6 text-amber-400" />
                </h1>
                <p className="text-slate-400 mt-2 text-sm md:text-base">
                  Explore and manage all available window and door system packs
                </p>
              </div>
            </div>
            <Button
              onClick={() => setShowSystemWizard(true)}
              className="btn-primary-gradient"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add New System Pack
            </Button>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div className="bg-slate-900/60 -sm border border-slate-700/50 rounded-2xl p-6 card-glass-dark">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  placeholder="Search system packs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 border-slate-700/50 text-slate-100 placeholder-slate-500 h-12 rounded-xl focus:border-amber- 500/50 focus:ring-2 focus:ring-amber-500/20 card-premium"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={filterType === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterType('all')}
                  className={`h-12 px-4 rounded-xl transition-all ${
                    filterType === 'all' 
                      ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-500/20' 
                      : 'bg-slate-800/50 border-slate-700/50 text-slate-300 hover:bg-slate-700/50'
                  }`}
                >
                  All ({allSystems.length})
                </Button>
                <Button
                  variant={filterType === 'tuned' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterType('tuned')}
                  className={`h-12 px-4 rounded-xl transition-all ${
                    filterType === 'tuned' 
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                      : 'bg-slate-800/50 border-slate-700/50 text-slate-300 hover:bg-slate-700/50'
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Tuned ({allSystems.filter(s => getSystemPackTuningStatus(s).isTuned).length})
                </Button>
                <Button
                  variant={filterType === 'untuned' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterType('untuned')}
                  className={`h-12 px-4 rounded-xl transition-all ${
                    filterType === 'untuned' 
                      ? 'bg-yellow-600 hover:bg-yellow-500 text-white shadow-lg shadow-yellow-500/20' 
                      : 'bg-slate-800/50 border-slate-700/50 text-slate-300 hover:bg-slate-700/50'
                  }`}
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Needs Tuning ({allSystems.filter(s => getSystemPackTuningStatus(s).needsTuning).length})
                </Button>
                <Button
                  variant={filterType === 'upvc' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterType('upvc')}
                  className={`h-12 px-4 rounded-xl transition-all ${
                    filterType === 'upvc' 
                      ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-500/20' 
                      : 'bg-slate-800/50 border-slate-700/50 text-slate-300 hover:bg-slate-700/50'
                  }`}
                >
                  UPVC ({allSystems.filter(s => !!(s as any).upvcSpec).length})
                </Button>
                <Button
                  variant={filterType === 'aluminum' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterType('aluminum')}
                  className={`h-12 px-4 rounded-xl transition-all ${
                    filterType === 'aluminum' 
                      ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20' 
                      : 'bg-slate-800/50 border-slate-700/50 text-slate-300 hover:bg-slate-700/50'
                  }`}
                >
                  Aluminum ({allSystems.filter(s => !(s as any).upvcSpec).length})
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* System Packs Grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={filterType + searchQuery}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredSystems.map((system, index) => {
              const tuningStatus = getSystemPackTuningStatus(system);
              const isUPVC = !!(system as any).upvcSpec;
              const profiles = (system as any).profiles || [];
              const frameProfiles = profiles.filter((p: any) => 
                p.profileRole === 'frame' || p.type === 'frame'
              );
              const sashProfiles = profiles.filter((p: any) => 
                p.profileRole === 'sash' || p.type === 'sash'
              );
              const isHovered = hoveredCard === system.meta.id;

              return (
                <motion.div
                  key={system.meta.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onMouseEnter={() => setHoveredCard(system.meta.id)}
                  onMouseLeave={() => setHoveredCard(null)}
                >
                  <div
                    className={`
                      relative h-full rounded-2xl overflow-hidden
                      bg-gradient-to-br ${getCardGradient(system, isHovered)}
                      border-2 ${getCardBorder(system)}
                      backdrop-blur-xl
                      transition-all duration-300
                      ${isHovered ? 'scale-105 shadow-2xl shadow-amber-500/20' : 'shadow-lg'}
                    `}
                  >
                    {/* Glowing effect on hover */}
                    {isHovered && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"
                      />
                    )}

                    {/* Card Content */}
                    <div className="relative p-6 h-full flex flex-col">
                      {/* Header */}
                      <div className="mb-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="typography-h3 text-white mb-2 flex items-center gap-2">
                              {system.meta.name}
                              {tuningStatus.isTuned && (
                                <Badge className="bg-emerald-600/80 text-white border-emerald-400/50">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Tuned
                                </Badge>
                              )}
                              {tuningStatus.needsTuning && (
                                <Badge variant="outline" className="border-yellow-500/50 text-yellow-300 bg-yellow-500/10">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Needs Tuning
                                </Badge>
                              )}
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-slate-300">
                              {system.meta.brands?.map((brand: string, i: number) => (
                                <span key={i} className="px-2 py-1 bg-slate-800/50 rounded-lg text-xs">
                                  {brand}
                                </span>
                              ))}
                              {isUPVC ? (
                                <Badge className="bg-green-600/20 text-green-300 border-green-500/30">
                                  <Shield className="h-3 w-3 mr-1" />
                                  UPVC
                                </Badge>
                              ) : (
                                <Badge className="bg-blue-600/20 text-blue-300 border-blue-500/30">
                                  <Zap className="h-3 w-3 mr-1" />
                                  Aluminum
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="bg-slate-900/40 backdrop-blur-sm rounded-xl p-3 border border-slate-700/30">
                          <div className="text-xs text-slate-400 mb-1">Frame</div>
                          <div className="text-lg font-bold text-white">{frameProfiles.length}</div>
                        </div>
                        <div className="bg-slate-900/40 backdrop-blur-sm rounded-xl p-3 border border-slate-700/30">
                          <div className="text-xs text-slate-400 mb-1">Sash</div>
                          <div className="text-lg font-bold text-white">{sashProfiles.length}</div>
                        </div>
                        <div className="bg-slate-900/40 backdrop-blur-sm rounded-xl p-3 border border-slate-700/30">
                          <div className="text-xs text-slate-400 mb-1">Total</div>
                          <div className="text-lg font-bold text-white">{profiles.length}</div>
                        </div>
                      </div>

                      {/* Regions */}
                      {system.meta.regions && system.meta.regions.length > 0 && (
                        <div className="mb-4 flex items-center gap-2 flex-wrap">
                          <Globe className="h-4 w-4 text-slate-400" />
                          {system.meta.regions.slice(0, 3).map((region: string, i: number) => (
                            <Badge key={i} variant="outline" className="text-xs bg-slate-800/30 border-slate-700 /30 text-slate-300 card-dark">
                              {region}
                            </Badge>
                          ))}
                          {system.meta.regions.length > 3 && (
                            <Badge variant="outline" className="text-xs bg-slate-800/30 border-slate-700 /30 text-slate-300 card-dark">
                              +{system.meta.regions.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="mt-auto pt-4 border-t border-slate-700/30 space-y-2">
                        {tuningStatus.needsTuning ? (
                          <Button
                            size="sm"
                            className="w-full bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-white shadow-lg shadow-yellow-500/20"
                            onClick={() => handleTuneSystem(system.meta.id)}
                          >
                            <Settings className="h-4 w-4 mr-2" />
                            Tune System
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="btn-secondary"
                            onClick={() => handleTuneProfile(system.meta.id)}
                          >
                            <Wrench className="h-4 w-4 mr-2" />
                            Edit Tuning
                          </Button>
                        )}
                        
                        {profiles.length > 0 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="w-full text-slate-300 hover:text-white hover:bg-slate-800/50"
                            onClick={() => handleTuneProfile(system.meta.id)}
                          >
                            <Layers className="h-4 w-4 mr-2" />
                            View Profiles ({profiles.length})
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Decorative corner accent */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/5 to-transparent rounded-bl-full pointer-events-none" />
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatePresence>

        {filteredSystems.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <Package className="h-16 w-16 text-slate-600 mx-auto mb-4" />
            <h3 className="typography-h3 text-slate-400 mb-2">No system packs found</h3>
            <p className="text-slate-500">Try adjusting your search or filter criteria</p>
          </motion.div>
        )}
      </div>

      {/* System Pack Wizard */}
      <SystemTuningStudio
        open={showSystemWizard}
        onClose={() => setShowSystemWizard(false)}
        onSave={async (customPack) => {
          const updated = await addCustomSystemAsync(customPack, userId);
          setCustomSystems(updated);
          setShowSystemWizard(false);
          // Navigate to the new system pack
          navigate(`/fabricator/studio/data/tuning?systemPackId=${customPack.meta.id}`);
        }}
      />
      
      {/* Unified Studio Wizard */}
      <UnifiedStudioWizard
        open={showUnifiedWizard}
        onOpenChange={setShowUnifiedWizard}
        studioType={unifiedWizardType}
        onComplete={async (_data) => {
          // Refresh system packs list
          if (userId) {
            const updated = await loadCustomSystems();
            setCustomSystems(updated);
          }
          setShowUnifiedWizard(false);
        }}
      />
    </div>
  );
};

