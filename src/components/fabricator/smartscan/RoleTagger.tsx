import React from 'react';
import { Button } from '@/shared/ui/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import { Label } from '@/shared/ui/ui/label';
import { Download } from 'lucide-react';
import { exportProfileRolesToCSV } from '@/lib/csvExport';
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
  const handleExportCSV = () => {
    exportProfileRolesToCSV(profiles, roles);
  };

  if (!profiles.length) {
    return <p className="text-xs text-gray-400">Import profiles to start tagging roles.</p>;
  }

  return (
    <div className="space-y-4">
      {/* Export Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleExportCSV}
          variant="outline"
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 rounded-md px-3"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Profile Role Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {profiles.map((p) => {
          const current = roles[p.id];
          return (
            <div key={p.id} className="rounded border border-gray-800 bg-gray-900 /50 p-3 space-y-2 card-dark">
              <div className="text-sm text-white font-semibold">{p.name || p.fileName}</div>
              <div className="text-[11px] text-gray-400">
                {p.widthMm} × {p.heightMm} mm
              </div>
              <div className="space-y-1">
                <Label className="typography-label text-[11px] text-gray-400">Assign Role</Label>
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
    </div>
  );
};

