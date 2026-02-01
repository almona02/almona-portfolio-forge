import React, { useMemo, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/ui/card';
import { Button } from '@/shared/ui/ui/button';
import { Badge } from '@/shared/ui/ui/badge';
import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { CheckCircle2, Wrench, Layers, Package, Scan, Save, X } from 'lucide-react';
import { DXFProfileImporter, ImportedProfile } from './smartscan/DXFProfileImporter';
import { RoleTagger, ProfileRole } from './smartscan/RoleTagger';
import { HardwareLinker } from './smartscan/HardwareLinker';
import { MachiningZoneEditor, type MachiningZone } from './smartscan/MachiningZoneEditor';
import { buildCustomSystemPack } from '@/lib/fabricator/systemPackBuilder';
import { supabase } from '@/lib/supabase';
import {
  ASYNC_DELAYS,
  DIALOG_DIMENSIONS,
  GRID_LAYOUT,
  UI_DIMENSIONS,
} from './systemTuningStudioConstants';

interface SystemTuningStudioProps {
  open: boolean;
  onClose: () => void;
  onSave?: (systemPack: any) => void;
  initialSystem?: any;
}

export const SystemTuningStudio: React.FC<SystemTuningStudioProps> = ({
  open,
  onClose,
  onSave,
  initialSystem,
}) => {
  const [importedProfiles, setImportedProfiles] = useState<ImportedProfile[]>([]);
  const [roles, setRoles] = useState<Record<string, ProfileRole>>({});
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [linkedHardware, setLinkedHardware] = useState<any[]>([]);
  const [machiningZones, setMachiningZones] = useState<MachiningZone[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const getUserId = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUserId(session?.user?.id || null);
    };
    if (open) {
      getUserId();
    }
  }, [open]);

  const readyToSave = useMemo(() => {
    return importedProfiles.length > 0 && importedProfiles.every((p) => roles[p.id]);
  }, [importedProfiles, roles]);

  const handleSave = () => {
    if (!readyToSave) return;
    setIsSaving(true);
    const pack = buildCustomSystemPack({
      name: initialSystem?.meta?.name ? `${initialSystem.meta.name} (Tuned)` : 'Custom Egyptian Pack',
      profiles: importedProfiles.map((p) => ({
        ...p,
        role: roles[p.id],
      })),
      hardware: linkedHardware,
      machiningZones,
    });
    setTimeout(() => {
      setIsSaving(false);
      if (onSave) onSave(pack);
    }, ASYNC_DELAYS.SAVE_DELAY_MS);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={`${DIALOG_DIMENSIONS.MAX_WIDTH} bg-gray-950 border-gray-800 text-white`}>
        <DialogHeader className="flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="flex items-center gap-2">
              <Badge variant="outline" className="btn-primary">
                System Tuning Studio
              </Badge>
              <span className="text-sm text-gray-400">Import → Tag → Hardware → Machining → Review</span>
            </DialogTitle>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-400 hover:text-white">
            <X className={UI_DIMENSIONS.ICON_MEDIUM} />
          </Button>
        </DialogHeader>
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 mt-1">
            DXF import, role tagging, hardware linking, and machining prep for Egyptian systems.
          </p>
        </div>
        <Button disabled={!readyToSave || isSaving} onClick={handleSave} className="bg-green-600 hover:bg-green-500">
          {isSaving ? 'Saving…' : 'Save System Pack'}
          <Save className={`${UI_DIMENSIONS.ICON_MEDIUM} ml-2`} />
        </Button>
      </div>

      <Tabs defaultValue="import" className="w-full">
        <TabsList className={`grid ${GRID_LAYOUT.TABS_COLS} bg-gray-900`}>
          <TabsTrigger value="import" className="text-xs">
            <Scan className={`${UI_DIMENSIONS.ICON_SMALL} mr-1`} /> Import
          </TabsTrigger>
          <TabsTrigger value="roles" className="text-xs">
            <Layers className={`${UI_DIMENSIONS.ICON_SMALL} mr-1`} /> Tag Roles
          </TabsTrigger>
          <TabsTrigger value="hardware" className="text-xs">
            <Package className={`${UI_DIMENSIONS.ICON_SMALL} mr-1`} /> Hardware
          </TabsTrigger>
          <TabsTrigger value="machining" className="text-xs">
            <Wrench className={`${UI_DIMENSIONS.ICON_SMALL} mr-1`} /> Machining
          </TabsTrigger>
          <TabsTrigger value="review" className="text-xs">
            <CheckCircle2 className={`${UI_DIMENSIONS.ICON_SMALL} mr-1`} /> Review
          </TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="mt-4">
          <Card className="bg-gray-900/60 border-gray-800 card-dark">
            <CardHeader>
              <CardTitle className="text-base">DXF Import</CardTitle>
              <CardDescription>Upload supplier DXF/DWG. We’ll extract basic dims and preview.</CardDescription>
            </CardHeader>
            <CardContent>
              <DXFProfileImporter
                onImported={(profiles) => {
                  setImportedProfiles(profiles);
                  if (profiles.length) setSelectedProfileId(profiles[0].id);
                }}
                selectedProfileId={selectedProfileId}
                onSelectProfile={(id) => setSelectedProfileId(id)}
                userId={userId}
                onProfileSaved={(profileId) => {
                  // Optionally reload or update UI after save
                  console.log('Profile saved:', profileId);
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="mt-4">
          <Card className="bg-gray-900/60 border-gray-800 card-dark">
            <CardHeader>
              <CardTitle className="text-base">Role Tagging</CardTitle>
              <CardDescription>Assign Frame, Sash, Mullion, Transom, Screen Adapter, etc.</CardDescription>
            </CardHeader>
            <CardContent>
              <RoleTagger
                profiles={importedProfiles}
                roles={roles}
                onChangeRole={(id, role) => setRoles((prev) => ({ ...prev, [id]: role }))}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hardware" className="mt-4">
          <Card className="bg-gray-900/60 border-gray-800 card-dark">
            <CardHeader>
              <CardTitle className="text-base">Hardware Linking</CardTitle>
              <CardDescription>Link hinges, locks, rollers; validate compatibility.</CardDescription>
            </CardHeader>
            <CardContent>
              <HardwareLinker
                profiles={importedProfiles}
                selectedProfileId={selectedProfileId || (importedProfiles[0]?.id ?? null)}
                onHardwareLinked={setLinkedHardware}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="machining" className="mt-4">
          <Card className="bg-gray-900/60 border-gray-800 card-dark">
            <CardHeader>
              <CardTitle className="text-base">Machining Zones</CardTitle>
              <CardDescription>Define hinge slots and lock pockets with safe offsets.</CardDescription>
            </CardHeader>
            <CardContent>
              <MachiningZoneEditor
                profiles={importedProfiles}
                selectedProfileId={selectedProfileId}
                linkedHardware={linkedHardware}
                onZonesChange={setMachiningZones}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="review" className="mt-4">
          <Card className="bg-gray-900/60 border-gray-800 card-dark">
            <CardHeader>
              <CardTitle className="text-base">Review & Save</CardTitle>
              <CardDescription>Confirm roles and readiness before saving as a system pack.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {importedProfiles.length === 0 && (
                <Alert className="bg-gray-800 border-gray-700">
                  <AlertDescription>Import at least one profile DXF to proceed.</AlertDescription>
                </Alert>
              )}
              {importedProfiles.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded border border-gray-800 bg-gray-900 /50 px-3 py-2 text-sm card-dark"
                >
                  <div>
                    <div className="font-semibold text-white">{p.name || p.fileName}</div>
                    <div className="text-xs text-gray-400">
                      {p.widthMm} × {p.heightMm} mm · {p.fileName}
                    </div>
                  </div>
                  <Badge variant="outline" className="border-blue-500 text-blue-200">
                    {roles[p.id] || 'Unassigned'}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
      </DialogContent>
    </Dialog>
  );
};

