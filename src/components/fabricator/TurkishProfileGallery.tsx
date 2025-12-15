/**
 * Turkish Profile Gallery - View and manage custom Turkish profiles
 * 
 * Displays all profiles created via ProfileStudioLite
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Button } from '@/shared/ui/ui/button';
import { Badge } from '@/shared/ui/ui/badge';
import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { Trash2, CheckCircle2, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TurkishProfile {
  id: string;
  name: string;
  manufacturer: string;
  profileType: string;
  material: string;
  barLength: number;
  sawKerf: number;
  weldingAllowance: number;
  millingDepth?: number;
  unitWeight?: number;
  createdAt?: string;
}

export const TurkishProfileGallery: React.FC = () => {
  const [profiles, setProfiles] = useState<TurkishProfile[]>([]);
  const [selectedManufacturer, setSelectedManufacturer] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadProfiles = () => {
    const loadedProfiles: TurkishProfile[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('custom-profile-')) {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const profileData = JSON.parse(stored);
            // Extract profile info from the stored pack structure
            if (profileData.profiles && profileData.profiles.length > 0) {
              const mainProfile = profileData.profiles[0];
              loadedProfiles.push({
                id: profileData.id,
                name: profileData.name || mainProfile.name,
                manufacturer: profileData.manufacturer || 'Unknown',
                profileType: mainProfile.type || 'frame',
                material: mainProfile.material || 'aluminum',
                barLength: mainProfile.barLength || mainProfile.micronConfig?.barLength || 6500,
                sawKerf: mainProfile.micronConfig?.sawKerf || 4.5,
                weldingAllowance: mainProfile.micronConfig?.weldingAllowance || 0,
                millingDepth: mainProfile.micronConfig?.millingDepth,
                unitWeight: mainProfile.unitWeight,
                createdAt: profileData.createdAt,
              });
            }
          }
        } catch (error) {
          console.error('Error loading profile:', key, error);
        }
      }
    }
    
    // Sort by creation date (newest first)
    loadedProfiles.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
    
    setProfiles(loadedProfiles);
  };

  useEffect(() => {
    loadProfiles();
    
    // Listen for new profiles
    const handleProfileAdded = () => {
      loadProfiles();
    };
    
    window.addEventListener('customProfileAdded', handleProfileAdded);
    return () => window.removeEventListener('customProfileAdded', handleProfileAdded);
  }, []);

  const manufacturers = ['all', ...new Set(profiles.map(p => p.manufacturer))];
  const filteredProfiles = selectedManufacturer === 'all' 
    ? profiles 
    : profiles.filter(p => p.manufacturer === selectedManufacturer);

  const handleDelete = (profileId: string) => {
    if (!confirm('Are you sure you want to delete this profile?')) return;
    
    setDeletingId(profileId);
    try {
      localStorage.removeItem(`custom-profile-${profileId}`);
      loadProfiles();
      setDeletingId(null);
    } catch (error) {
      console.error('Error deleting profile:', error);
      setDeletingId(null);
    }
  };

  const handleLoadIntoDesign = (profile: TurkishProfile) => {
    // Dispatch event for PrecisionDesignInterface to load
    window.dispatchEvent(new CustomEvent('loadTurkishProfile', { detail: profile }));
    
    // Navigate to design interface
    window.location.href = '/fabricator/design';
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Package className="h-6 w-6" />
            🇹🇷 Turkish Profile Gallery
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium">Filter by Manufacturer:</label>
              <select
                value={selectedManufacturer}
                onChange={(e) => setSelectedManufacturer(e.target.value)}
                className="px-3 py-2 border rounded-md bg-white"
              >
                {manufacturers.map(mfg => (
                  <option key={mfg} value={mfg}>
                    {mfg === 'all' ? 'All Manufacturers' : mfg}
                  </option>
                ))}
              </select>
            </div>
            
            <Button
              onClick={() => window.location.href = '/fabricator/profile-studio'}
              className="h-11"
            >
              + Add Turkish Profile
            </Button>
          </div>

          {/* Profiles Grid */}
          {filteredProfiles.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-lg font-medium text-gray-600 mb-2">
                No Turkish profiles defined yet.
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Create your first Turkish profile to start using custom systems.
              </p>
              <Button
                onClick={() => window.location.href = '/fabricator/profile-studio'}
                size="lg"
              >
                Create Your First Turkish Profile
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProfiles.map(profile => (
                <Card
                  key={profile.id}
                  className={cn(
                    "hover:shadow-lg transition-shadow",
                    deletingId === profile.id && "opacity-50"
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="text-xs">
                          {profile.manufacturer}
                        </Badge>
                        <Badge
                          variant={profile.material === 'aluminum' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {profile.material}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(profile.id)}
                        disabled={deletingId === profile.id}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <h3 className="font-semibold text-lg mb-3">{profile.name}</h3>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Type:</span>
                        <span className="font-medium capitalize">{profile.profileType}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Bar Length:</span>
                        <span className="font-mono font-medium">{profile.barLength}mm</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Saw Kerf:</span>
                        <span className="font-mono font-medium">{profile.sawKerf}mm</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Welding:</span>
                        <span className="font-mono font-medium">{profile.weldingAllowance}mm</span>
                      </div>
                      {profile.unitWeight && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Weight:</span>
                          <span className="font-mono font-medium">{profile.unitWeight} kg/m</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2 pt-3 border-t">
                      <Button
                        onClick={() => handleLoadIntoDesign(profile)}
                        className="flex-1 h-10"
                        size="sm"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Use in Design
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Info Alert */}
          {profiles.length > 0 && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                <strong>{profiles.length}</strong> Turkish profile{profiles.length !== 1 ? 's' : ''} available.
                Select "Use in Design" to load a profile into Precision Design Interface.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

