/**
 * Role Manager Component
 * 
 * Manages DXF import, role tagging, and profile management for the Tuning Workbench.
 * Bridges ImportedProfile (from DXF) to Profile (for system pack).
 */

import React, { useState, useMemo } from 'react';
import { DXFProfileImporter, type ImportedProfile } from '@/components/fabricator/smartscan/DXFProfileImporter';
import { RoleTagger, type ProfileRole } from '@/components/fabricator/smartscan/RoleTagger';
import type { MutableSystemPack } from '@/types/tuning';
import type { Profile } from '@/types/fabricator';

interface RoleManagerProps {
  system: MutableSystemPack;
  onSystemUpdate: (system: MutableSystemPack) => void;
}

/**
 * Convert ImportedProfile to Profile type
 */
function convertImportedToProfile(
  imported: ImportedProfile,
  role?: ProfileRole,
  systemCategory: 'aluminum' | 'upvc' = 'aluminum'
): Profile {
  return {
    id: imported.id,
    name: imported.name || imported.fileName.replace(/\.(dxf|dwg)$/i, ''),
    code: imported.name || imported.fileName,
    material: systemCategory === 'upvc' ? 'upvc' : 'aluminum',
    width: imported.widthMm || 50,
    height: imported.heightMm || 30,
    thickness: 1.5, // Default, can be tuned later
    color: '#C0C0C0',
    costPerMeter: 0,
    cuttingAllowance: 3,
    stockQuantity: 0,
    minStockLevel: 0,
    supplier: 'Imported',
    profileRole: role,
    systemBrand: system.meta.brands[0] || 'Custom',
    systemPackIds: [system.meta.id],
    specifications: {
      importSource: imported.fileName,
      areaMm2: imported.areaMm2,
      perimeterMm: imported.perimeterMm,
      weightKgPerM: imported.weightKgPerM,
      isThermalBreak: imported.isThermalBreak,
      svgPreview: imported.svgPreview,
      previewUrl: imported.previewUrl,
    },
    calibrations: [],
    machiningMacros: [],
  };
}

export const RoleManager: React.FC<RoleManagerProps> = ({ system, onSystemUpdate }) => {
  const [view, setView] = useState<'list' | 'import' | 'tag'>('list');
  const [importedProfiles, setImportedProfiles] = useState<ImportedProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [roles, setRoles] = useState<Record<string, ProfileRole | undefined>>({});

  // Build roles map from system profiles
  const systemRoles = useMemo(() => {
    const roleMap: Record<string, ProfileRole | undefined> = {};
    system.profiles.forEach(p => {
      if (p.profileRole) {
        roleMap[p.id] = p.profileRole;
      }
    });
    return roleMap;
  }, [system.profiles]);

  // Merge system roles with imported roles
  const allRoles = useMemo(() => ({ ...systemRoles, ...roles }), [systemRoles, roles]);

  // Get imported profiles that aren't yet in system
  const untaggedImported = useMemo(() => {
    return importedProfiles.filter(ip => !system.profiles.some(sp => sp.id === ip.id));
  }, [importedProfiles, system.profiles]);

  const handleImportComplete = (profiles: ImportedProfile[]) => {
    setImportedProfiles(prev => [...prev, ...profiles]);
    setView('list');
  };

  const handleRoleChange = (profileId: string, role: ProfileRole) => {
    setRoles(prev => ({ ...prev, [profileId]: role }));
    
    // If profile is already in system, update it
    const existingProfile = system.profiles.find(p => p.id === profileId);
    if (existingProfile) {
      const updatedProfiles = system.profiles.map(p => 
        p.id === profileId 
          ? { ...p, profileRole: role, roleAssigned: true }
          : p
      );
      onSystemUpdate({
        ...system,
        profiles: updatedProfiles,
        meta: { ...system.meta, updatedAt: new Date() },
      });
    } else {
      // Convert imported profile to system profile
      const imported = importedProfiles.find(ip => ip.id === profileId);
      if (imported) {
        const systemCategory = system.windowSystemSpec?.category === 'upvc' ? 'upvc' : 'aluminum';
        const newProfile = convertImportedToProfile(imported, role, systemCategory);
        const updatedProfiles = [...system.profiles, { ...newProfile, roleAssigned: true }];
        onSystemUpdate({
          ...system,
          profiles: updatedProfiles,
          meta: { ...system.meta, updatedAt: new Date() },
        });
      }
    }
  };

  const handleRemoveProfile = (profileId: string) => {
    const updatedProfiles = system.profiles.filter(p => p.id !== profileId);
    onSystemUpdate({
      ...system,
      profiles: updatedProfiles,
      meta: { ...system.meta, updatedAt: new Date() },
    });
  };

  const systemCategory = system.windowSystemSpec?.category === 'upvc' ? 'upvc' : 'aluminum';

  return (
    <div className="flex flex-col h-full space-y-4" dir="ltr">
      {/* Toolbar */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-bold text-gray-700 text-lg">Profile Roles</h3>
          <p className="text-xs text-gray-500">Import DXF files and assign roles to profiles</p>
        </div>
        <button 
          onClick={() => setView('import')}
          className="px-4 py-2 bg-[#003366] text-white text-sm rounded-lg hover:bg-[#004488] transition-colors flex items-center gap-2"
        >
          <span>📁</span>
          <span>Import DXF</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto space-y-4">
        
        {/* VIEW: List of Profiles */}
        {view === 'list' && (
          <div className="space-y-3">
            {system.profiles.length === 0 && untaggedImported.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-3">📐</div>
                <p className="text-sm font-medium mb-1">No profiles yet</p>
                <p className="text-xs">Import a DXF file to begin building your system pack</p>
              </div>
            )}

            {/* System Profiles (Tagged) */}
            {system.profiles.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-gray-500 mb-2 uppercase">System Profiles ({system.profiles.length})</h4>
                <div className="space-y-2">
                  {system.profiles.map(profile => (
                    <div 
                      key={profile.id}
                      className="p-3 border border-gray-200 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors flex justify-between items-center"
                    >
                      <div className="flex-1">
                        <div className="font-bold text-sm text-gray-800">{profile.name}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {profile.width} × {profile.height}mm • {profile.material}
                        </div>
                        {profile.code && (
                          <div className="text-xs text-gray-400 mt-0.5 font-mono">{profile.code}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {profile.profileRole ? (
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] rounded uppercase font-bold">
                            {profile.profileRole}
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-100 text-gray-500 text-[10px] rounded">
                            Untagged
                          </span>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProfileId(profile.id);
                            setView('tag');
                          }}
                          className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveProfile(profile.id);
                          }}
                          className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Untagged Imported Profiles */}
            {untaggedImported.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-gray-500 mb-2 uppercase">Imported (Needs Tagging) ({untaggedImported.length})</h4>
                <div className="space-y-2">
                  {untaggedImported.map(imported => (
                    <div 
                      key={imported.id}
                      onClick={() => {
                        setSelectedProfileId(imported.id);
                        setView('tag');
                      }}
                      className="p-3 border border-yellow-200 bg-yellow-50 rounded-lg hover:bg-yellow-100 cursor-pointer transition-colors flex justify-between items-center"
                    >
                      <div className="flex-1">
                        <div className="font-bold text-sm text-gray-800">{imported.name || imported.fileName}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {imported.widthMm} × {imported.heightMm}mm
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5 font-mono">{imported.fileName}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-[10px] rounded">
                          Click to Tag
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW: DXF Importer */}
        {view === 'import' && (
          <div className="h-full flex flex-col bg-white rounded-lg border border-gray-200 p-4">
            <button 
              onClick={() => setView('list')} 
              className="text-sm text-blue-600 mb-4 hover:underline flex items-center gap-1"
            >
              <span>←</span>
              <span>Back to List</span>
            </button>
            <div className="flex-1">
              <DXFProfileImporter 
                onImported={handleImportComplete}
                selectedProfileId={selectedProfileId}
                onSelectProfile={setSelectedProfileId}
              />
            </div>
          </div>
        )}

        {/* VIEW: Role Tagger */}
        {view === 'tag' && (
          <div className="h-full flex flex-col bg-white rounded-lg border border-gray-200 p-4">
            <button 
              onClick={() => setView('list')} 
              className="text-sm text-blue-600 mb-4 hover:underline flex items-center gap-1"
            >
              <span>←</span>
              <span>Back to List</span>
            </button>
            
            {selectedProfileId && (
              <div className="flex-1">
                <RoleTagger
                  profiles={[
                    ...system.profiles.filter(p => p.id === selectedProfileId).map(p => ({
                      id: p.id,
                      fileName: p.code || p.name || 'profile',
                      name: p.name,
                      widthMm: p.width,
                      heightMm: p.height,
                    })),
                    ...importedProfiles.filter(ip => ip.id === selectedProfileId),
                  ]}
                  roles={allRoles}
                  onChangeRole={handleRoleChange}
                />
              </div>
            )}
            
            {!selectedProfileId && view === 'tag' && (
              <div className="text-center py-8 text-gray-400">
                <p className="text-sm">No profile selected</p>
                <button 
                  onClick={() => setView('list')}
                  className="text-xs text-blue-600 hover:underline mt-2"
                >
                  Go back to list
                </button>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Summary Footer */}
      {system.profiles.length > 0 && (
        <div className="border-t pt-3 mt-auto">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Total Profiles: {system.profiles.length}</span>
            <span>Tagged: {system.profiles.filter(p => p.profileRole).length}</span>
          </div>
        </div>
      )}
    </div>
  );
};

