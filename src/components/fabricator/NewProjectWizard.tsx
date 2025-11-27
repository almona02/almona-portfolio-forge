import React, { useEffect, useState } from 'react';
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
import { Factory, MapPin, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Database, SectorType } from '@/types/database';

type FabricatorCustomerRow = Database['public']['Tables']['fabricator_customers']['Row'];

export interface ProjectHeaderMeta {
  clientName: string;
  projectName: string;
  siteName?: string;
  currency: string;
  region: 'egypt' | 'turkey' | 'mena' | 'gulf' | 'global';
  projectCode?: string;
  customerCode?: string;
  customerId?: string;
  contactPhone?: string;
  orderNumber?: string;
  orderDate?: string;
}

interface NewProjectWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (meta: ProjectHeaderMeta) => void;
  initialMeta?: Partial<ProjectHeaderMeta>;
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
  initialMeta,
}) => {
  const [clientName, setClientName] = useState(initialMeta?.clientName ?? '');
  const [projectName, setProjectName] = useState(initialMeta?.projectName ?? '');
  const [siteName, setSiteName] = useState(initialMeta?.siteName ?? '');
  const [currency, setCurrency] = useState(initialMeta?.currency ?? 'EGP');
  const [region, setRegion] = useState<ProjectHeaderMeta['region']>(
    initialMeta?.region ?? 'egypt',
  );
  const [customers, setCustomers] = useState<FabricatorCustomerRow[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    initialMeta?.customerId ?? '',
  );
  const [contactPhone, setContactPhone] = useState(initialMeta?.contactPhone ?? '');
  const [orderNumber, setOrderNumber] = useState(initialMeta?.orderNumber ?? '');
  const [orderDate, setOrderDate] = useState(initialMeta?.orderDate ?? '');

  // Load saved fabricator customers so they can be used from the dropdown
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();
        if (authError || !user) return;

        const { data, error } = await supabase
          .from('fabricator_customers')
          .select('*')
          .eq('owner_user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          // eslint-disable-next-line no-console
          console.warn('Failed to load fabricator customers for project wizard:', error);
          return;
        }

        setCustomers((data as FabricatorCustomerRow[]) || []);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('Error loading fabricator customers for project wizard:', e);
      }
    };

    void loadCustomers();
  }, []);

  const canSubmit = clientName.trim().length > 0 && projectName.trim().length > 0;

  const handleCreate = () => {
    if (!canSubmit) return;
    onSubmit({
      clientName: clientName.trim(),
      projectName: projectName.trim(),
      siteName: siteName.trim() || undefined,
      currency,
      region,
      customerId: selectedCustomerId || undefined,
      contactPhone: contactPhone.trim() || undefined,
      orderNumber: orderNumber.trim() || undefined,
      orderDate: orderDate || undefined,
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
              {customers.length > 0 && (
                <div className="mb-1">
                  <Label className="text-[10px] text-gray-400">
                    Select from saved customers
                  </Label>
                  <Select
                    value={selectedCustomerId}
                    onValueChange={(id) => {
                      setSelectedCustomerId(id);
                      const customer = customers.find((c) => c.id === id);
                      if (customer) {
                        setClientName(customer.name);
                        setContactPhone(customer.phone || '');
                      }
                    }}
                  >
                    <SelectTrigger className="h-7 text-[11px] bg-gray-800 border-gray-700 mt-0.5">
                      <SelectValue placeholder="Choose saved customer (optional)" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700 text-xs max-h-64">
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium text-gray-100">{c.name}</span>
                            <span className="text-[10px] text-gray-500">
                              {c.contact_person || c.email || c.phone || 'Fabricator customer'}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
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
              <Label className="text-xs">Contact Phone</Label>
              <Input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+20..."
                className="h-8 text-xs bg-gray-800 border-gray-700"
              />
            </div>
            <div>
              <Label className="text-xs">Order Number (optional)</Label>
              <Input
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="Your internal order no."
                className="h-8 text-xs bg-gray-800 border-gray-700"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">Order Date</Label>
            <Input
              type="date"
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
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
              <Select
                value={region}
                onValueChange={(v) => {
                  const nextRegion = v as ProjectHeaderMeta['region'];
                  setRegion(nextRegion);
                }}
              >
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


