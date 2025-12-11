import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import { Label } from '@/shared/ui/ui/label';
import { ImportedProfile } from './DXFProfileImporter';

export type ProfileRole =
  | 'frame'
  | 'sash'
  | 'mullion'
  | 'transom'
  | 'glazing_bead'
  | 'screen_adapter'
  | 'screen_sash'
  | 'panel';

interface RoleTaggerProps {
  profiles: ImportedProfile[];
  roles: Record<string, ProfileRole | undefined>;
  onChangeRole: (id: string, role: ProfileRole) => void;
}

const ROLE_OPTIONS: { value: ProfileRole; label: string }[] = [
  { value: 'frame', label: 'Frame' },
  { value: 'sash', label: 'Sash' },
  { value: 'mullion', label: 'Mullion' },
  { value: 'transom', label: 'Transom' },
  { value: 'glazing_bead', label: 'Glazing Bead' },
  { value: 'screen_adapter', label: 'Screen Adapter (Barour Shabaak)' },
  { value: 'screen_sash', label: 'Screen Sash' },
  { value: 'panel', label: 'Panel / Filler' },
];

export const RoleTagger: React.FC<RoleTaggerProps> = ({ profiles, roles, onChangeRole }) => {
  if (!profiles.length) {
    return <p className="text-xs text-gray-400">Import profiles to start tagging roles.</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {profiles.map((p) => {
        const current = roles[p.id];
        return (
          <div key={p.id} className="rounded border border-gray-800 bg-gray-900/50 p-3 space-y-2">
            <div className="text-sm text-white font-semibold">{p.name || p.fileName}</div>
            <div className="text-[11px] text-gray-400">
              {p.widthMm} × {p.heightMm} mm
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-gray-400">Assign Role</Label>
              <Select value={current} onValueChange={(val) => onChangeRole(p.id, val as ProfileRole)}>
                <SelectTrigger className="bg-gray-800 border-gray-700 h-9 text-xs">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700 text-xs">
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      })}
    </div>
  );
};

