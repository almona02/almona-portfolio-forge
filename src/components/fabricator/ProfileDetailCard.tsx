/**
 * ProfileDetailCard - Enhanced profile card component with detailed information
 * 
 * Features:
 * - Visual profile preview
 * - Technical specifications display
 * - Machining macros preview
 * - Compatible accessories display
 * - Action buttons for edit and technical sheet download
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Button } from '@/shared/ui/ui/button';
import { Badge } from '@/shared/ui/ui/badge';
import { Label } from '@/shared/ui/ui/label';
import { Package, Edit2, Download } from 'lucide-react';
import { Profile, Accessory, MachiningMacro } from '@/types/fabricator';

interface ProfileDetailCardProps {
  profile: Profile;
  accessories: Accessory[];
  onEdit?: (profile: Profile) => void;
  onMachiningPreview?: (macro: MachiningMacro) => void;
}

export const ProfileDetailCard: React.FC<ProfileDetailCardProps> = ({
  profile,
  accessories,
  onEdit,
  onMachiningPreview,
}) => {
  const compatibleAccessories = accessories.filter(
    (acc) => profile.compatibleAccessories?.includes(acc.id)
  );

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {profile.name}
          </CardTitle>
          <Badge variant={profile.category === 'accessory' ? 'secondary' : 'default'}>
            {profile.category || 'window'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Visual Section */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Profile Preview</Label>
            {profile.technicalDrawings?.[0]?.previewUrl ? (
              <img
                src={profile.technicalDrawings[0].previewUrl}
                alt={profile.name}
                className="w-full h-32 object-contain border border-gray-600 rounded"
              />
            ) : profile.specifications?.previewImageUrl ? (
              <img
                src={profile.specifications.previewImageUrl}
                alt={profile.name}
                className="w-full h-32 object-contain border border-gray-600 rounded"
              />
            ) : (
              <div className="w-full h-32 bg-gray-700 border border-gray-600 rounded flex items-center justify-center">
                <span className="text-gray-400">No preview</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div
              className="w-full h-8 rounded border border-gray-600"
              style={{ backgroundColor: profile.color }}
            />
          </div>
        </div>

        {/* Technical Specifications */}
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Dimensions:</span>
            <div>{profile.width}×{profile.height || 'N/A'}mm</div>
          </div>
          <div>
            <span className="text-gray-400">Thickness:</span>
            <div>{profile.thickness || 'N/A'}mm</div>
          </div>
          <div>
            <span className="text-gray-400">Weight:</span>
            <div>{profile.weightPerMeter ? `${profile.weightPerMeter} kg/m` : 'N/A'}</div>
          </div>
        </div>

        {/* System Information */}
        {(profile.systemType || profile.profileRole) && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            {profile.systemType && (
              <div>
                <span className="text-gray-400">System Type:</span>
                <div className="capitalize">{profile.systemType.replace('_', ' ')}</div>
              </div>
            )}
            {profile.profileRole && (
              <div>
                <span className="text-gray-400">Profile Role:</span>
                <div className="capitalize">{profile.profileRole.replace('_', ' ')}</div>
              </div>
            )}
          </div>
        )}

        {/* Machining Macros Section */}
        {profile.machiningMacros && profile.machiningMacros.length > 0 && (
          <div>
            <Label>Machining Operations</Label>
            <div className="space-y-2 mt-2">
              {profile.machiningMacros.map((macro) => (
                <div key={macro.id} className="flex justify-between items-center p-2 bg-gray-700 rounded">
                  <div>
                    <div className="font-medium">{macro.name}</div>
                    <div className="text-xs text-gray-400">
                      {macro.operation} - {macro.dimensions.width}×{macro.dimensions.height}×{macro.dimensions.depth}mm
                    </div>
                  </div>
                  {onMachiningPreview && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onMachiningPreview(macro)}
                    >
                      Preview
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Compatible Accessories */}
        {profile.compatibleAccessories && profile.compatibleAccessories.length > 0 && (
          <div>
            <Label>Compatible Accessories</Label>
            <div className="flex flex-wrap gap-1 mt-2">
              {compatibleAccessories.map((accessory) => (
                <Badge key={accessory.id} variant="outline" className="bg-blue-500/20">
                  {accessory.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* System Packs */}
        {profile.systemPackIds && profile.systemPackIds.length > 0 && (
          <div>
            <Label>System Packs</Label>
            <div className="flex flex-wrap gap-1 mt-2">
              {profile.systemPackIds.map((packId) => (
                <Badge key={packId} variant="outline" className="bg-green-500/20">
                  {packId}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {onEdit && (
            <Button variant="outline" size="sm" onClick={() => onEdit(profile)}>
              <Edit2 className="h-4 w-4 mr-1" />
              Edit
            </Button>
          )}
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" />
            Technical Sheet
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

