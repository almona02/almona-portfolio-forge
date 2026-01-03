import { SYSTEM_PACKS } from '@/data/systemPacks';
import { addCustomSystem, loadCustomSystems } from '@/lib/fabricator/customSystemStorage';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/shared/ui/ui/dialog';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import type { Database } from '@/types/database';
import { Factory, MapPin, Users } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CustomSystemManager } from './CustomSystemManager';
import { ProjectCockpit, getProjectTypeConfig, type ProjectType } from './ProjectCockpit';
import { SystemTuningStudio } from './SystemTuningStudio';
import {
    DIALOG_DIMENSIONS,
    SCROLL_LIMITS,
    UI_DIMENSIONS,
} from './newProjectWizardConstants';

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
  projectType?: ProjectType;
  /** Optional default/system pack for backward compatibility */
  systemPackId?: string;
  /** Optional shortlist of allowed system packs for this project */
  allowedSystemPackIds?: string[];
  /** Egyptian constraints captured by the wizard */
  egyptianConstraints?: {
    governorate?: string;
    windZone?: string;
    exposure?: string;
    floorLevel?: number;
    usageType?: string;
    baseShape?: string;
    openingType?: string;
    recommendedByWizard?: boolean;
    wizardVersion?: string;
  };
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
  const { t } = useTranslation('fabricator');
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
  const [projectType, setProjectType] = useState<ProjectType | undefined>(initialMeta?.projectType);
  const [showProjectTypeSelection, setShowProjectTypeSelection] = useState(!initialMeta?.projectType);
  const [selectedSystemPackIds, setSelectedSystemPackIds] = useState<string[]>(
    initialMeta?.allowedSystemPackIds ||
      (initialMeta?.systemPackId ? [initialMeta.systemPackId] : [])
  );
  const [customSystems, setCustomSystems] = useState<any[]>(() => loadCustomSystems());
  const [showTuningStudio, setShowTuningStudio] = useState(false);
  const [tuningInitialSystem, setTuningInitialSystem] = useState<any | null>(null);

  const allSystems = useMemo(() => [...SYSTEM_PACKS, ...customSystems], [customSystems]);

  // Pre-select system pack based on project type
  useEffect(() => {
    if (projectType) {
      const config = getProjectTypeConfig(projectType);
      if (config && config.suggestedSystems.length > 0) {
        const suggestedSystem = config.suggestedSystems[0];
        const pack = allSystems.find(
          (p) =>
            p.meta.id === suggestedSystem.toUpperCase() ||
            p.meta.name.toUpperCase().includes(suggestedSystem.toUpperCase())
        );
        if (pack) {
          setSelectedSystemPackIds([pack.meta.id]);
        }
      }
    }
  }, [projectType, allSystems]);

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
          console.warn('Failed to load fabricator customers for project wizard:', error);
          return;
        }

        setCustomers((data as FabricatorCustomerRow[]) || []);
      } catch (e) {
        console.warn('Error loading fabricator customers for project wizard:', e);
      }
    };

    void loadCustomers();
  }, []);

  const canSubmit = clientName.trim().length > 0 && projectName.trim().length > 0;

  const handleCreate = () => {
    if (!canSubmit) return;
    const primarySystem = selectedSystemPackIds[0];

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
      projectType,
      systemPackId: primarySystem || undefined,
      allowedSystemPackIds: selectedSystemPackIds.length ? selectedSystemPackIds : undefined,
    });
  };

  const handleProjectTypeSelect = (type: ProjectType) => {
    setProjectType(type);
    setShowProjectTypeSelection(false);
  };

  const getPackStats = (pack: (typeof SYSTEM_PACKS)[number]) => {
    const profilesList = (pack as any).windowSystemSpec?.profiles_cutting_list;
    const accessoriesList = (pack as any).windowSystemSpec?.accessories_list;
    const profileCount = Array.isArray(profilesList) ? profilesList.length : 0;
    const accessoryCount = Array.isArray(accessoriesList) ? accessoriesList.length : 0;
    return { profileCount, accessoryCount };
  };

  const togglePack = (id: string) => {
    setSelectedSystemPackIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`bg-gray-900 border-gray-700 text-white ${DIALOG_DIMENSIONS.MAX_WIDTH} ${DIALOG_DIMENSIONS.MAX_HEIGHT} overflow-y-auto`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Factory className={`${UI_DIMENSIONS.ICON_LARGE} text-orange-400`} />
            {t('new_project_wizard.title', 'New Project – Professional Header')}
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-400">
            {t('new_project_wizard.description', 'Define client, site and system before measuring. This mirrors how mature technical offices structure projects and ensures consistent reports and exports.')}
          </DialogDescription>
        </DialogHeader>

        {showProjectTypeSelection ? (
          <div className="mt-4">
            <ProjectCockpit
              selectedType={projectType}
              onSelectType={handleProjectTypeSelect}
            />
            {projectType && (
              <div className="mt-4 flex justify-end">
                <Button
                  onClick={() => setShowProjectTypeSelection(false)}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  {t('new_project_wizard.continue_to_details', 'Continue to Project Details')}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <>
            {projectType && (
              <div className="mb-4 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-300">
                      {t('new_project_wizard.project_type', 'Project Type: {name}', { name: getProjectTypeConfig(projectType)?.name || '' })}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {getProjectTypeConfig(projectType)?.description}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowProjectTypeSelection(true)}
                    className="text-xs"
                  >
                    {t('new_project_wizard.change', 'Change')}
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs flex items-center gap-1">
                  {t('new_project_wizard.project_system_packs', 'Project System Packs (multi-select)')}
                  <span className="text-[10px] text-gray-500">({t('new_project_wizard.use_to_shortlist', 'use to shortlist relevant systems')})</span>
                </Label>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setShowTuningStudio(true)}
              >
                <Factory className={`${UI_DIMENSIONS.ICON_SMALL} mr-1`} />
                Tune Custom System
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-2 overflow-y-auto pr-1" style={{ maxHeight: `${SCROLL_LIMITS.MAX_SYSTEM_PACK_SCROLL_HEIGHT_PX}px` }}>
              {allSystems.map((pack) => {
                const stats = getPackStats(pack);
                const isSelected = selectedSystemPackIds.includes(pack.meta.id);
                return (
                  <button
                    key={pack.meta.id}
                    type="button"
                    onClick={() => togglePack(pack.meta.id)}
                    className={`w-full text-left p-3 rounded border transition-all ${
                      isSelected
                        ? 'border-orange-500 bg-orange-500/10 shadow-[0_0_8px_rgba(249,115,22,0.15)]'
                        : 'border-gray-800 hover:bg-gray-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div
                          className={`${UI_DIMENSIONS.CHECKBOX_SIZE} rounded flex items-center justify-center border transition-colors ${
                            isSelected ? 'bg-orange-500 border-orange-500' : 'border-gray-600 bg-gray-900'
                          }`}
                        >
                          {isSelected && (
                            <svg viewBox="0 0 24 24" className={UI_DIMENSIONS.CHECKMARK_SIZE + ' text-white'} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <p className={`text-sm font-semibold ${isSelected ? 'text-orange-100' : 'text-gray-100'}`}>
                            {pack.meta.name}
                          </p>
                          <p className="text-[11px] text-gray-400">{pack.meta.brands?.join(', ')}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 items-center">
                        <Badge variant="outline" className="text-[10px] border-gray-700">
                          {stats.profileCount} {t('new_project_wizard.profiles', 'Profiles')}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] border-gray-700">
                          {stats.accessoryCount} {t('new_project_wizard.accessories', 'Accessories')}
                        </Badge>
                        {pack.meta.id.startsWith('custom') && (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                            }}
                            onPointerDown={(e) => e.stopPropagation()}
                          >
                            <CustomSystemManager
                              systemId={pack.meta.id}
                              systemName={pack.meta.name}
                              onDelete={() => setCustomSystems(loadCustomSystems())}
                              onArchive={() => setCustomSystems(loadCustomSystems())}
                              onDuplicate={() => setCustomSystems(loadCustomSystems())}
                              onEdit={() => {
                                setTuningInitialSystem(pack as any);
                                setShowTuningStudio(true);
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs flex items-center gap-1">
                <Users className="h-3 w-3 text-orange-400" />
                {t('new_project_wizard.client_company', 'Client / Company *')}
              </Label>
              {customers.length > 0 && (
                <div className="mb-1">
                  <Label className="text-[10px] text-gray-400">
                    {t('new_project_wizard.select_from_saved', 'Select from saved customers')}
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
                      <SelectValue placeholder={t('new_project_wizard.choose_saved', 'Choose saved customer (optional)')} />
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
                placeholder={t('new_project_wizard.client_placeholder', 'e.g. ABC Aluminium')}
                className="h-8 text-xs bg-gray-800 border-gray-700"
              />
            </div>
            <div>
              <Label className="text-xs">{t('new_project_wizard.project_name', 'Project Name *')}</Label>
              <Input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder={t('new_project_wizard.project_placeholder', 'e.g. Cairo Compound – Tower B')}
                className="h-8 text-xs bg-gray-800 border-gray-700"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs flex items-center gap-1">
              <MapPin className="h-3 w-3 text-blue-400" />
              {t('new_project_wizard.site_address', 'Site / Address')}
            </Label>
            <Input
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              placeholder={t('new_project_wizard.site_placeholder', 'e.g. New Cairo, Plot 17')}
              className="h-8 text-xs bg-gray-800 border-gray-700"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">{t('new_project_wizard.contact_phone', 'Contact Phone')}</Label>
              <Input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder={t('new_project_wizard.phone_placeholder', '+20...')}
                className="h-8 text-xs bg-gray-800 border-gray-700"
              />
            </div>
            <div>
              <Label className="text-xs">{t('new_project_wizard.order_number', 'Order Number (optional)')}</Label>
              <Input
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder={t('new_project_wizard.order_placeholder', 'Your internal order no.')}
                className="h-8 text-xs bg-gray-800 border-gray-700"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">{t('new_project_wizard.order_date', 'Order Date')}</Label>
            <Input
              type="date"
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
              className="h-8 text-xs bg-gray-800 border-gray-700"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">{t('new_project_wizard.currency', 'Currency')}</Label>
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
              <Label className="text-xs">{t('new_project_wizard.region', 'Region')}</Label>
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
          </>
        )}

        <DialogFooter className="mt-4">
          {!showProjectTypeSelection && (
            <>
              <Button
                type="button"
                variant="outline"
                className="text-xs"
                onClick={() => onOpenChange(false)}
              >
                {t('new_project_wizard.cancel', 'Cancel')}
              </Button>
              <Button
                type="button"
                className="bg-orange-500 hover:bg-orange-600 text-xs"
                disabled={!canSubmit}
                onClick={handleCreate}
              >
                {t('new_project_wizard.create_project', 'Create Project & Start Measuring')}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <SystemTuningStudio
      open={showTuningStudio}
      onClose={() => setShowTuningStudio(false)}
      initialSystem={tuningInitialSystem}
      onSave={(customPack) => {
        const updated = addCustomSystem(customPack);
        setCustomSystems(updated);
        setSelectedSystemPackIds((prev) => [...prev, customPack.meta.id]);
        setShowTuningStudio(false);
      }}
    />
    </>
  );
};

export default NewProjectWizard;


