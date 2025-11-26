import React, { useState } from 'react';
import { Button } from '@/shared/ui/ui/button';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import { Badge } from '@/shared/ui/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/ui/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import { SYSTEM_PACKS } from '@/data/systemPacks';
import { Factory, MapPin, Users } from 'lucide-react';

export interface ProjectHeaderMeta {
  clientName: string;
  projectName: string;
  siteName?: string;
  currency: string;
  region: 'egypt' | 'turkey' | 'mena' | 'gulf' | 'global';
  systemPackId: string;
  projectCode?: string;
  customerCode?: string;
}

interface NewProjectWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (meta: ProjectHeaderMeta) => void;
}

/**
 * NewProjectWizard
 * Mandatory project header for professional workflows – captures
 * client, site, currency, region and system pack before any measuring.
 */
export const NewProjectWizard: React.FC<NewProjectWizardProps> = ({
  open,
  onOpenChange,
  onSubmit,
}) => {
  const [clientName, setClientName] = useState('');
  const [projectName, setProjectName] = useState('');
  const [siteName, setSiteName] = useState('');
  const [currency, setCurrency] = useState('EGP');
  const [region, setRegion] = useState<ProjectHeaderMeta['region']>('egypt');
  const [systemPackId, setSystemPackId] = useState<string>(SYSTEM_PACKS[0]?.meta.id ?? 'rock60');

  const canSubmit = clientName.trim().length > 0 && projectName.trim().length > 0 && !!systemPackId;

  const handleCreate = () => {
    if (!canSubmit) return;
    onSubmit({
      clientName: clientName.trim(),
      projectName: projectName.trim(),
      siteName: siteName.trim() || undefined,
      currency,
      region,
      systemPackId,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Factory className="h-5 w-5 text-orange-400" />
            New Project – Professional Header
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-400">
            Define client, site and system before measuring. This mirrors how mature technical
            offices structure projects and ensures consistent reports and exports.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs flex items-center gap-1">
                <Users className="h-3 w-3 text-orange-400" />
                Client / Company *
              </Label>
              <Input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g. ABC Aluminium"
                className="h-8 text-xs bg-gray-800 border-gray-700"
              />
            </div>
            <div>
              <Label className="text-xs">Project Name *</Label>
              <Input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g. Cairo Compound – Tower B"
                className="h-8 text-xs bg-gray-800 border-gray-700"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs flex items-center gap-1">
              <MapPin className="h-3 w-3 text-blue-400" />
              Site / Address
            </Label>
            <Input
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              placeholder="e.g. New Cairo, Plot 17"
              className="h-8 text-xs bg-gray-800 border-gray-700"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Currency</Label>
              <Select value={currency} onValueChange={(v) => setCurrency(v)}>
                <SelectTrigger className="h-8 text-xs bg-gray-800 border-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700 text-xs">
                  <SelectItem value="EGP">EGP – Egyptian Pound</SelectItem>
                  <SelectItem value="TRY">TRY – Turkish Lira</SelectItem>
                  <SelectItem value="SAR">SAR – Saudi Riyal</SelectItem>
                  <SelectItem value="AED">AED – UAE Dirham</SelectItem>
                  <SelectItem value="USD">USD – US Dollar</SelectItem>
                  <SelectItem value="EUR">EUR – Euro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Region</Label>
              <Select value={region} onValueChange={(v) => setRegion(v as ProjectHeaderMeta['region'])}>
                <SelectTrigger className="h-8 text-xs bg-gray-800 border-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700 text-xs">
                  <SelectItem value="egypt">Egypt</SelectItem>
                  <SelectItem value="turkey">Turkey</SelectItem>
                  <SelectItem value="mena">MENA</SelectItem>
                  <SelectItem value="gulf">Gulf</SelectItem>
                  <SelectItem value="global">Global</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs">System Pack *</Label>
            <Select value={systemPackId} onValueChange={(v) => setSystemPackId(v)}>
              <SelectTrigger className="h-8 text-xs bg-gray-800 border-gray-700">
                <SelectValue placeholder="Select system" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700 text-xs max-h-64">
                {SYSTEM_PACKS.map((pack) => (
                  <SelectItem key={pack.meta.id} value={pack.meta.id}>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-gray-100">{pack.meta.name}</span>
                      <span className="text-[10px] text-gray-500">
                        {pack.meta.brands.join(', ')} · {pack.meta.regions.join('/')}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-gray-500 mt-1">
              This controls cutting rules, constraints and reports (e.g. ROCK 60 vs JUMBO100).
            </p>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button
            type="button"
            variant="outline"
            className="text-xs"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-orange-500 hover:bg-orange-600 text-xs"
            disabled={!canSubmit}
            onClick={handleCreate}
          >
            Create Project & Start Measuring
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NewProjectWizard;


