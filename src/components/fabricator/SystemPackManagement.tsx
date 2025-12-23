/**
 * System Pack Management Page
 * 
 * Allows users to view all system packs, see tuning status,
 * and navigate to tune individual profiles within each system pack.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/ui/card';
import { Button } from '@/shared/ui/ui/button';
import { Badge } from '@/shared/ui/ui/badge';
import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { 
  Settings, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight,
  Package,
  Wrench,
  Layers,
  Search
} from 'lucide-react';
import { LazyMotionDiv } from '@/utils/lazyMotion';
import { SYSTEM_PACKS } from '@/data/systemPacks';
import { loadCustomSystems } from '@/lib/fabricator/customSystemStorage';
import { getSystemPackTuningStatus, saveReturnUrl } from '@/lib/fabricator/systemTuningUtils';
import { Input } from '@/shared/ui/ui/input';

export const SystemPackManagement: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'tuned' | 'untuned'>('all');
  const [customSystems, setCustomSystems] = useState<any[]>([]);

  useEffect(() => {
    const saved = loadCustomSystems();
    setCustomSystems(saved);
    
    // Listen for system pack updates
    const handleSystemPackTuned = () => {
      setCustomSystems(loadCustomSystems());
    };
    
    window.addEventListener('systemPackTuned', handleSystemPackTuned);
    return () => window.removeEventListener('systemPackTuned', handleSystemPackTuned);
  }, []);

  const allSystems = useMemo(() => {
    // SYSTEM_PACKS already includes EGYPTIAN_UPVC_SYSTEMS, so we don't need to add it again
    // Deduplicate by meta.id to ensure unique keys
    const systemsMap = new Map<string, any>();
    
    // Add SYSTEM_PACKS first (includes EGYPTIAN_UPVC_SYSTEMS)
    SYSTEM_PACKS.forEach(system => {
      systemsMap.set(system.meta.id, system);
    });
    
    // Add custom systems (will overwrite if duplicate ID exists, which is fine)
    customSystems.forEach(system => {
      systemsMap.set(system.meta.id, system);
    });
    
    return Array.from(systemsMap.values());
  }, [customSystems]);

  const filteredSystems = useMemo(() => {
    let filtered = allSystems;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(system => 
        system.meta.name.toLowerCase().includes(query) ||
        system.meta.brands?.some((b: string) => b.toLowerCase().includes(query)) ||
        system.meta.id.toLowerCase().includes(query)
      );
    }

    // Filter by tuning status
    if (filterType !== 'all') {
      filtered = filtered.filter(system => {
        const status = getSystemPackTuningStatus(system);
        return filterType === 'tuned' ? status.isTuned : status.needsTuning;
      });
    }

    return filtered;
  }, [allSystems, searchQuery, filterType]);

  const handleTuneSystem = (systemPackId: string) => {
    // Save return URL
    saveReturnUrl('/fabricator/system-packs', {
      returnToSystemPacks: 'true',
    });
    // Navigate to tuning studio
    navigate(`/fabricator/tuning-studio-no-dxf?systemPackId=${systemPackId}`);
  };

  const handleTuneProfile = (systemPackId: string, profileId?: string) => {
    // Save return URL
    saveReturnUrl('/fabricator/system-packs', {
      returnToSystemPacks: 'true',
    });
    // Navigate to system pack tuning studio (with DXF support)
    const url = profileId 
      ? `/fabricator/tuning-studio?systemPackId=${systemPackId}&profileId=${profileId}`
      : `/fabricator/tuning-studio?systemPackId=${systemPackId}`;
    navigate(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <LazyMotionDiv
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Package className="h-8 w-8 text-orange-400" />
              System Pack Management
            </h1>
            <p className="text-sm text-gray-400 mt-2">
              View all system packs, check tuning status, and configure profiles for accurate cut lists
            </p>
          </div>
        </LazyMotionDiv>

        {/* Filters */}
        <Card className="bg-gray-900/60 border-gray-700">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search system packs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-gray-800 border-gray-700"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={filterType === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterType('all')}
                  className={filterType === 'all' ? 'bg-orange-600' : ''}
                >
                  All ({allSystems.length})
                </Button>
                <Button
                  variant={filterType === 'tuned' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterType('tuned')}
                  className={filterType === 'tuned' ? 'bg-green-600' : ''}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-2" />
                  Tuned ({allSystems.filter(s => getSystemPackTuningStatus(s).isTuned).length})
                </Button>
                <Button
                  variant={filterType === 'untuned' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterType('untuned')}
                  className={filterType === 'untuned' ? 'bg-yellow-600' : ''}
                >
                  <AlertTriangle className="h-3.5 w-3.5 mr-2" />
                  Needs Tuning ({allSystems.filter(s => getSystemPackTuningStatus(s).needsTuning).length})
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Packs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSystems.map((system) => {
            const tuningStatus = getSystemPackTuningStatus(system);
            const isUPVC = !!(system as any).upvcSpec;
            const profiles = (system as any).profiles || [];
            const frameProfiles = profiles.filter((p: any) => 
              p.profileRole === 'frame' || p.type === 'frame'
            );
            const sashProfiles = profiles.filter((p: any) => 
              p.profileRole === 'sash' || p.type === 'sash'
            );

            return (
              <Card 
                key={system.meta.id} 
                className={`bg-gray-900/60 border-gray-700 hover:border-orange-500/50 transition-colors ${
                  tuningStatus.isTuned ? 'ring-2 ring-green-500/30' : ''
                }`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base flex items-center gap-2">
                        {system.meta.name}
                        {tuningStatus.isTuned && (
                          <Badge className="bg-green-600 text-white">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Tuned
                          </Badge>
                        )}
                        {tuningStatus.needsTuning && (
                          <Badge variant="outline" className="border-yellow-500 text-yellow-400">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Needs Tuning
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="text-xs mt-1">
                        {system.meta.brands?.join(', ') || 'Custom System'}
                        {isUPVC && <span className="ml-2 text-green-400">• UPVC</span>}
                        {!isUPVC && <span className="ml-2 text-blue-400">• Aluminum</span>}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Profile Status */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">Frame Profiles:</span>
                      <span className={frameProfiles.length > 0 ? 'text-green-400' : 'text-gray-500'}>
                        {frameProfiles.length > 0 ? `${frameProfiles.length} configured` : 'Not configured'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">Sash Profiles:</span>
                      <span className={sashProfiles.length > 0 ? 'text-green-400' : 'text-gray-500'}>
                        {sashProfiles.length > 0 ? `${sashProfiles.length} configured` : 'Not configured'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">Total Profiles:</span>
                      <span className="text-gray-300">{profiles.length}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 pt-2 border-t border-gray-700">
                    {tuningStatus.needsTuning ? (
                      <Button
                        size="sm"
                        className="w-full bg-yellow-600 hover:bg-yellow-500"
                        onClick={() => handleTuneSystem(system.meta.id)}
                      >
                        <Settings className="h-3.5 w-3.5 mr-2" />
                        Tune System (No DXF)
                        <ArrowRight className="h-3.5 w-3.5 ml-2" />
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full border-gray-600"
                        onClick={() => handleTuneProfile(system.meta.id)}
                      >
                        <Wrench className="h-3.5 w-3.5 mr-2" />
                        Edit Tuning
                      </Button>
                    )}
                    
                    {profiles.length > 0 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-full text-xs"
                        onClick={() => handleTuneProfile(system.meta.id)}
                      >
                        <Layers className="h-3.5 w-3.5 mr-2" />
                        View Profiles ({profiles.length})
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredSystems.length === 0 && (
          <Alert className="bg-gray-900/60 border-gray-700">
            <AlertTriangle className="h-4 w-4 text-gray-400" />
            <AlertDescription>
              No system packs found matching your search criteria.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
};

