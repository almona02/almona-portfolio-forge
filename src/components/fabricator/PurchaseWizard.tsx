import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/shared/ui/ui/dialog';
import { Button } from '@/shared/ui/ui/button';
import { Input } from '@/shared/ui/ui/input';
import { Badge } from '@/shared/ui/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import { Card, CardContent } from '@/shared/ui/ui/card';
import { 
  ShoppingCart, 
  Check, 
  Search, 
  ChevronRight, 
  Layers, 
  ArrowRight,
  Trash2,
  Plus,
  Edit2
} from 'lucide-react';
import { UnifiedProfileCatalog, CatalogSystem, CatalogProfile } from '@/lib/catalog/UnifiedProfileCatalog';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import { Profile } from '@/types/fabricator';
import { purchaseProfileKey, purchaseValidationError, type PurchaseItem } from '@/lib/fabricator/inventory/purchaseDraft';

interface PurchaseWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onPurchaseComplete: () => void;
}

type WizardStep = 'system-select' | 'profile-select' | 'review';

export const PurchaseWizard: React.FC<PurchaseWizardProps> = ({
  open,
  onOpenChange,
  userId,
  onPurchaseComplete
}) => {
  const [step, setStep] = useState<WizardStep>('system-select');
  const [systems, setSystems] = useState<CatalogSystem[]>([]);
  const [selectedSystem, setSelectedSystem] = useState<CatalogSystem | null>(null);
  const [cart, setCart] = useState<PurchaseItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeRoleTab, setActiveRoleTab] = useState<string>('frame');
  const [loading, setLoading] = useState(false);
  const [editingQuantityFor, setEditingQuantityFor] = useState<string | null>(null);
  const [quantityInput, setQuantityInput] = useState<number>(1);
  const [editingRoleFor, setEditingRoleFor] = useState<string | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState('');
  const [catalogAttempt, setCatalogAttempt] = useState(0);
  const [profileQuery, setProfileQuery] = useState('');
  const [supplier, setSupplier] = useState('');
  const [invoice, setInvoice] = useState('');
  const submitting = useRef(false);
  const validationError = purchaseValidationError(cart);
  const totalBars = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalMetres = cart.reduce((sum, item) => sum + item.quantity * item.lengthMm / 1000, 0);

  useEffect(() => {
    let cancelled = false;
    if (open) {
      setCatalogLoading(true);
      setCatalogError('');
      setSystems([]);
      UnifiedProfileCatalog.getAllSystems(userId)
        .then(data => { if (!cancelled) setSystems(data); })
        .catch(() => { if (!cancelled) setCatalogError('Unable to load the catalogue. Please retry.'); })
        .finally(() => { if (!cancelled) setCatalogLoading(false); });
      setStep('system-select');
      setCart([]);
      setSelectedSystem(null);
      setSearchQuery('');
      setProfileQuery('');
      setActiveRoleTab('frame');
      setEditingQuantityFor(null);
      setEditingRoleFor(null);
      setQuantityInput(1);
      setSupplier('');
      setInvoice('');
    }
    return () => { cancelled = true; };
  }, [open, userId, catalogAttempt]);

  const filteredSystems = useMemo(() => {
    if (!searchQuery) return systems;
    return systems.filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.brand.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [systems, searchQuery]);

  const currentSystemProfiles = useMemo(() => {
    if (!selectedSystem) return [];
    const query = profileQuery.trim().toLowerCase();
    return selectedSystem.profiles.filter(p => !query || `${p.name} ${p.profileCode} ${p.oldProfileCode || ''}`.toLowerCase().includes(query));
  }, [selectedSystem, profileQuery]);

  const profilesByRole = useMemo(() => {
    const grouped: Record<string, CatalogProfile[]> = {
      frame: [],
      sash: [],
      mullion: [],
      glazing_bead: [],
      interlock: [],
      accessory: [],
      other: []
    };

    currentSystemProfiles.forEach(p => {
      const role = p.role || 'other';
      if (grouped[role]) {
        grouped[role].push(p);
      } else {
        grouped.other.push(p);
      }
    });

    return grouped;
  }, [currentSystemProfiles]);

  const addToCart = (profile: CatalogProfile, quantity: number) => {
    if (!Number.isSafeInteger(quantity) || quantity < 1) {
      toast.error('Enter a positive whole number of bars.');
      return;
    }
    setCart(prev => {
      const existing = prev.find(item => purchaseProfileKey(item.profile) === purchaseProfileKey(profile));
      if (existing) {
        return prev.map(item => 
          purchaseProfileKey(item.profile) === purchaseProfileKey(profile)
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { profile, quantity, lengthMm: 6000, color: '#FFFFFF' }]; // Default 6m white
    });
    toast.success(`Added ${quantity} bars of ${profile.name}`);
    setEditingQuantityFor(null);
    setQuantityInput(1);
  };

  const handleQuickAdd = (profile: CatalogProfile) => {
    setEditingQuantityFor(purchaseProfileKey(profile));
    setQuantityInput(1);
  };

  const handleConfirmQuantity = (profile: CatalogProfile) => {
    addToCart(profile, quantityInput);
  };

  // Role changes belong to this purchase draft; inventory is written atomically on confirmation.
  const handleUpdateRole = (profile: CatalogProfile, newRole: Profile['profileRole']) => {
    const key = purchaseProfileKey(profile);
    const update = (p: CatalogProfile) => purchaseProfileKey(p) === key ? { ...p, role: newRole } : p;
    setSelectedSystem(prev => prev ? { ...prev, profiles: prev.profiles.map(update) } : prev);
    setSystems(prev => prev.map(system => ({ ...system, profiles: system.profiles.map(update) })));
    setCart(prev => prev.map(item => ({ ...item, profile: update(item.profile) })));
    setEditingRoleFor(null);
  };

  const removeFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const updateCartItem = (index: number, field: 'quantity' | 'lengthMm' | 'color', value: number | string) => {
    setCart(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const handlePurchase = async () => {
    if (submitting.current) return;
    const error = purchaseValidationError(cart);
    if (error || !userId) {
      toast.error(error || 'Please sign in before recording stock.');
      return;
    }
    submitting.current = true;
    setLoading(true);

    try {
      // Get authenticated user ID from Supabase Auth to ensure RLS policy compliance
      // RLS policy requires auth.uid() = user_id, so we must use the authenticated user's ID
      // getUser() will automatically refresh the session if needed
      let authenticatedUserId: string;
      
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        console.error('Authentication error:', authError);
        // If it's a session error, try to get session to refresh
        if (authError.message?.includes('session') || authError.message?.includes('JWT')) {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          if (sessionError || !session) {
            throw new Error('Session expired. Please log in again.');
          }
          // Retry getUser after session refresh
          const { data: { user: retryUser }, error: retryError } = await supabase.auth.getUser();
          if (retryError || !retryUser) {
            throw new Error('User not authenticated. Please log in again.');
          }
          authenticatedUserId = retryUser.id;
        } else {
          throw new Error('User not authenticated. Please log in again.');
        }
      } else if (!authUser) {
        throw new Error('User not authenticated. Please log in again.');
      } else {
        authenticatedUserId = authUser.id;
      }
      
      // Verify that the prop userId matches the authenticated user (security check)
      if (authenticatedUserId !== userId) {
        throw new Error('Your signed-in account changed. Reopen the purchase wizard before recording stock.');
      }

      // Verify that a profile exists for this user (required for foreign key constraint)
      const db = supabase as any;
      const { data: userProfile, error: profileCheckError } = await db
        .from('profiles')
        .select('id')
        .eq('id', authenticatedUserId)
        .maybeSingle();
      
      if (profileCheckError) {
        console.error('Error checking user profile:', profileCheckError);
        throw new Error('Failed to verify user profile. Please contact support.');
      }
      
      if (!userProfile) {
        throw new Error('User profile not found. Please complete your profile setup first.');
      }

      const { hashIntakePayload, recordAtomicStockIntake } = await import(
        '@/lib/fabricator/inventory/stockIntake'
      );
      const { clearPendingStockIntake, resolveIntakeRequestId } = await import(
        '@/lib/fabricator/inventory/stockIntakeRequest'
      );

      const lines = cart.map((item) => {
        const p = item.profile;
        const material =
          (typeof p.specifications?.material === 'string' && p.specifications.material) ||
          (selectedSystem as { material?: string } | null)?.material ||
          'aluminum';
        const barLengthM = item.lengthMm / 1000;
        return {
          createIfMissing: true,
          catalogueKey: p.profileCode,
          pack: p.systemPackId || selectedSystem?.id || '',
          material: String(material).toLowerCase(),
          finish: item.color.trim(),
          profileName: p.name,
          inputUnit: 'pieces' as const,
          quantity: item.quantity,
          barLengthM,
          notes: `Purchase Wizard - ${p.systemName} Batch`,
          supplier: supplier.trim() || null,
          invoice: invoice.trim() || null,
          systemBrand: p.systemName,
          width: p.dimensions?.width || 50,
          height: p.dimensions?.height || 50,
          thickness: p.dimensions?.thickness || 1.5,
          minStockLevel: 10,
          specifications: {
            ...(p.specifications || {}),
            profileRole: p.role,
            supplierCode: p.profileCode,
            internalCode: p.oldProfileCode,
            systemPackId: p.systemPackId,
            finish: item.color.trim(),
          },
          lotMetadata: {
            source: 'purchase_wizard',
            system: p.systemName,
            length_mm: item.lengthMm,
          },
        };
      });

      const draftKey = `wizard:${lines.map((l) => `${l.catalogueKey}:${l.pack}:${l.finish}`).join('|')}`;
      const payloadHash = await hashIntakePayload(lines);
      const requestId = resolveIntakeRequestId({
        userId: authenticatedUserId,
        draftKey,
        payloadHash,
      });

      const intake = await recordAtomicStockIntake({ requestId, lines });
      if (!intake.ok) {
        throw new Error(intake.error);
      }
      clearPendingStockIntake(authenticatedUserId);

      // Refresh stock alerts after purchase (owner-scoped RPC).
      try {
        const alertResult = await db.rpc('check_stock_levels', { p_user_id: authenticatedUserId });
        console.log('Stock alerts refreshed:', alertResult);
      } catch (alertError) {
        console.warn('Failed to refresh stock alerts:', alertError);
      }

      toast.success('Purchase recorded and inventory updated!');
      
      onOpenChange(false);
      // Stock is already committed. A dashboard refresh failure must not invite a second intake.
      try {
        onPurchaseComplete();
      } catch {
        toast.error('Stock was recorded. Reload the inventory dashboard to refresh balances.');
      }
    } catch (error) {
      console.error('Purchase failed:', error);
      const errorMessage = (error as any)?.message || (error as any)?.details || (error as any)?.error_description || 'Unknown error';
      toast.error(`Failed to record stock intake: ${errorMessage}`);
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={next => { if (!submitting.current) onOpenChange(next); }}>
      <DialogContent className="max-w-4xl h-[90dvh] max-h-[90dvh] flex flex-col gap-0 p-0 bg-gray-900 border-gray-800 card-dark">
        <div className="shrink-0 p-4 sm:p-6 border-b border-gray-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <ShoppingCart className="h-6 w-6 text-amber-400" />
              Purchase Wizard
            </DialogTitle>
            <DialogDescription>
              Stock intake for standard systems. Profiles will be automatically categorized.
            </DialogDescription>
          </DialogHeader>
          
          {/* Progress Stepper */}
          <div className="flex items-center gap-2 mt-6">
            <div className={`flex items-center gap-2 ${step === 'system-select' ? 'text-amber-400' : 'text-gray-400'}`}>
              <div className="flex items-center justify-center w-6 h-6 rounded-full border border-current text-xs">1</div>
              <span className="text-sm font-medium">System</span>
            </div>
            <div className="w-8 h-px bg-gray-700" />
            <div className={`flex items-center gap-2 ${step === 'profile-select' ? 'text-amber-400' : 'text-gray-400'}`}>
              <div className="flex items-center justify-center w-6 h-6 rounded-full border border-current text-xs">2</div>
              <span className="text-sm font-medium">Profiles</span>
            </div>
            <div className="w-8 h-px bg-gray-700" />
            <div className={`flex items-center gap-2 ${step === 'review' ? 'text-amber-400' : 'text-gray-400'}`}>
              <div className="flex items-center justify-center w-6 h-6 rounded-full border border-current text-xs">3</div>
              <span className="text-sm font-medium">Review</span>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6" aria-busy={catalogLoading || loading}>
          <fieldset disabled={loading} className="min-w-0">
          {step === 'system-select' && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  aria-label="Search systems"
                  placeholder="Search systems (e.g. Rock60, Jumbo)..." 
                  className="pl-10 bg-gray-800 border-gray-700"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              {catalogLoading && <p role="status">Loading material catalogue…</p>}
              {catalogError && <div role="alert" className="text-red-300"><p>{catalogError}</p><Button variant="outline" onClick={() => setCatalogAttempt(value => value + 1)}>Retry catalogue</Button></div>}
              {!catalogLoading && !catalogError && filteredSystems.length === 0 && <p className="text-gray-400">No systems match your search.</p>}
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSystems.map(sys => {
                  const purchasableCount = sys.profiles.length;
                  const isEmptyPack = purchasableCount === 0;
                  return (
                  <Card 
                    role="button"
                    tabIndex={isEmptyPack ? -1 : 0}
                    onKeyDown={event => {
                      if (!isEmptyPack && (event.key === "Enter" || event.key === " ")) {
                        event.preventDefault();
                        event.currentTarget.click();
                      }
                    }}
                    key={sys.id} 
                    className={`bg-gray-800 border-gray-700 transition-all card-premium ${
                      isEmptyPack
                        ? 'opacity-60 cursor-not-allowed'
                        : 'cursor-pointer hover:border-amber-500/50'
                    }`}
                    aria-disabled={isEmptyPack}
                    onClick={() => {
                      if (isEmptyPack) {
                        toast.message('This catalogue pack has no purchasable profiles yet.', {
                          description: 'Populate the system pack catalogue (or choose another pack) before purchasing stock.',
                        });
                        return;
                      }
                      setSelectedSystem(sys);
                      setProfileQuery('');
                      setEditingQuantityFor(null);
                      const firstRole = sys.profiles[0]?.role || 'other';
                      setActiveRoleTab(['frame', 'sash', 'mullion', 'glazing_bead', 'interlock', 'accessory'].includes(firstRole) ? firstRole : 'other');
                      setStep('profile-select');
                    }}
                  >
                    <CardContent className="p-6 flex items-center justify-between">
                      <div>
                        <h3 className="typography-h3 text-lg text-gray-100">{sys.name}</h3>
                        <p className="text-sm text-gray-400">{sys.brand}</p>
                        <Badge variant="outline" className="mt-2 bg-gray-900/50">
                          {isEmptyPack ? 'No purchasable profiles' : `${purchasableCount} profiles`}
                        </Badge>
                        {isEmptyPack ? (
                          <p className="text-[11px] text-amber-300/90 mt-2 max-w-[220px]">
                            Empty catalogue pack — disabled until profiles are configured.
                          </p>
                        ) : null}
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-500" />
                    </CardContent>
                  </Card>
                  );
                })}
              </div>
            </div>
          )}

          {step === 'profile-select' && selectedSystem && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="typography-h3 text-lg">{selectedSystem.name}</h3>
                  <p className="text-sm text-gray-400">Select profiles to purchase</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setStep('system-select')}>
                  Change System
                </Button>
              </div>

              <Input aria-label="Search profiles" placeholder="Search profile name or code…" value={profileQuery} onChange={event => setProfileQuery(event.target.value)} />
              <Tabs value={activeRoleTab} onValueChange={setActiveRoleTab} className="w-full">
                <TabsList className="flex w-full justify-start bg-gray-800 p-1 mb-4 overflow-x-auto">
                  <TabsTrigger value="frame">Frames</TabsTrigger>
                  <TabsTrigger value="sash">Sashes</TabsTrigger>
                  <TabsTrigger value="mullion">Mullions</TabsTrigger>
                  <TabsTrigger value="glazing_bead">Beads</TabsTrigger>
                  <TabsTrigger value="interlock">Interlocks</TabsTrigger>
                  <TabsTrigger value="accessory">Accessory</TabsTrigger>
                  <TabsTrigger value="other">Other roles</TabsTrigger>
                </TabsList>

                {Object.entries(profilesByRole).map(([role, profiles]) => (
                  <TabsContent key={role} value={role} className="space-y-4">
                    {profiles.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        No profiles found for this role.
                      </div>
                    ) : (
                      <div>
                        <div className="grid grid-cols-1 gap-3">
                        {profiles.map(profile => {
                          const inCart = cart.find(i => purchaseProfileKey(i.profile) === purchaseProfileKey(profile));
                          const isEditingQuantity = editingQuantityFor === purchaseProfileKey(profile);
                          const isEditingRole = editingRoleFor === purchaseProfileKey(profile);
                          
                          return (
                            <div key={profile.profileCode} className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between p-3 bg-gray-800 rounded-lg border border-gray-700">
                              <div className="flex items-center gap-3 flex-1">
                                <div className="h-10 w-10 bg-gray-700 rounded flex items-center justify-center">
                                  <Layers className="h-5 w-5 text-gray-400" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex flex-wrap items-center gap-2 mb-1">
                                    <span className="font-medium">{profile.name}</span>
                                    <Badge variant="outline" className="text-[10px]">
                                      {profile.role || 'other'}
                                    </Badge>
                                    {isEditingRole ? (
                                      <Select
                                        value={profile.role || 'other'}
                                        onValueChange={(value) => handleUpdateRole(profile, value as Profile['profileRole'])}
                                        onOpenChange={(open) => !open && setEditingRoleFor(null)}
                                      >
                                        <SelectTrigger className="h-6 w-24 text-[10px]">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="frame">Frame</SelectItem>
                                          <SelectItem value="sash">Sash</SelectItem>
                                          <SelectItem value="mullion">Mullion</SelectItem>
                                          <SelectItem value="glazing_bead">Bead</SelectItem>
                                          <SelectItem value="interlock">Interlock</SelectItem>
                                          <SelectItem value="accessory">Accessory</SelectItem>
                                          <SelectItem value="other">Other</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    ) : (
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-5 w-5"
                                        onClick={() => setEditingRoleFor(purchaseProfileKey(profile))}
                                        title="Edit role for this purchase" aria-label={`Edit purchase role for ${profile.name}`}
                                      >
                                        <Edit2 className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                  <div className="text-xs text-gray-400 flex flex-wrap gap-2">
                                    <span>Code: {profile.profileCode}</span>
                                    {profile.weightPerMeter && (
                                      <span>• {profile.weightPerMeter} kg/m</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-3">
                                {inCart ? (
                                  <div className="flex items-center gap-2 bg-gray-900 rounded px-2 py-1">
                                    <span className="text-sm font-medium">{inCart.quantity} bars</span>
                                    <Button 
                                      aria-label={`Add one bar of ${profile.name}`}
                                      size="icon" 
                                      variant="ghost" 
                                      className="h-6 w-6"
                                      onClick={() => addToCart(profile, 1)}
                                    >
                                      <Plus className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ) : isEditingQuantity ? (
                                  <div className="flex items-center gap-2">
                                    <Input
                                      aria-label={`Bars to add for ${profile.name}`}
                                      type="number"
                                      min="1"
                                      step="1"
                                      value={quantityInput}
                                      onChange={(e) => setQuantityInput(Number(e.target.value))}
                                      className="h-8 w-20 text-center"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          handleConfirmQuantity(profile);
                                        } else if (e.key === 'Escape') {
                                          setEditingQuantityFor(null);
                                          setQuantityInput(1);
                                        }
                                      }}
                                    />
                                    <Button
                                      size="sm"
                                      variant="default"
                                      onClick={() => handleConfirmQuantity(profile)}
                                    >
                                      Add
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setEditingQuantityFor(null);
                                        setQuantityInput(1);
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                ) : (
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => handleQuickAdd(profile)}
                                  >
                                    Add
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        </div>
                      </div>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          )}

          {step === 'review' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="typography-h3 text-lg">Review Order</h3>
                <Badge>{cart.length} items</Badge>
              </div>

              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm">Supplier (optional)<Input value={supplier} onChange={event => setSupplier(event.target.value)} placeholder="Supplier name" /></label>
                  <label className="text-sm">Invoice / reference (optional)<Input value={invoice} onChange={event => setInvoice(event.target.value)} placeholder="Delivery note or invoice" /></label>
                </div>
                <p className="text-sm text-gray-400">Record received profile bars. Each line keeps its own system, length, and finish.</p>
                {validationError && <p role="alert" className="text-sm text-red-300">{validationError}</p>}
                {cart.map((item, idx) => (
                  <div key={idx} className="flex flex-col gap-3 p-4 bg-gray-800 rounded-lg border border-gray-700">
                    <div className="flex-1">
                      <div className="font-medium">{item.profile.name}</div>
                      <div className="text-xs text-gray-400">
                        {item.profile.systemName} • {item.profile.role}
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-end gap-3">
                      <div>
                        <label className="typography-label text-[10px] text-gray-500 block">Bars</label>
                        <Input 
                          aria-label={`Bars for ${item.profile.name}`}
                          type="number" 
                          min="1"
                          step="1"
                          className="h-8 w-20 text-center"
                          value={item.quantity}
                          onChange={(e) => updateCartItem(idx, 'quantity', Number(e.target.value))}
                        />
                      </div>
                      <div>
                        <label className="typography-label text-[10px] text-gray-500 block">Length (mm)</label>
                        <Input 
                          aria-label={`Stock length in millimetres for ${item.profile.name}`}
                          type="number" 
                          min="0.01"
                          step="any"
                          className="h-8 w-24 text-center"
                          value={item.lengthMm}
                          onChange={(e) => updateCartItem(idx, 'lengthMm', Number(e.target.value))}
                        />
                      </div>
                      <div>
                        <label className="typography-label text-[10px] text-gray-500 block">Color</label>
                        <div className="flex items-center gap-1">
                          <div 
                            className="w-6 h-6 rounded border border-gray-600"
                            style={{ backgroundColor: item.color }}
                          />
                          <Input 
                            aria-label={`Finish for ${item.profile.name}`}
                            type="text" 
                            className="h-8 w-24"
                            value={item.color}
                            onChange={(e) => updateCartItem(idx, 'color', e.target.value)}
                          />
                        </div>
                      </div>
                      
                      <Button 
                        aria-label={`Remove ${item.profile.name} from purchase`}
                        size="icon" 
                        variant="ghost" 
                        className="text-red-400 hover:bg-red-900/20"
                        onClick={() => removeFromCart(idx)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          </fieldset>
        </div>

        <div className="shrink-0 p-3 sm:p-4 border-t border-gray-800 bg-gray-900 card-dark">
          <div className="flex flex-wrap gap-3 justify-between items-center">
            <div className="text-sm text-gray-400">
              {cart.length > 0 && (
                <span>
                  Total Bars: <span className="text-gray-200">{totalBars}</span>
                 · {totalMetres.toLocaleString(undefined, { maximumFractionDigits: 2 })} m
                </span>
              )}
            </div>
            <div className="flex gap-3">
              {step !== 'system-select' && (
                <Button variant="outline" disabled={loading} onClick={() => setStep(prev => prev === 'review' ? 'profile-select' : 'system-select')}>
                  Back
                </Button>
              )}
              
              {step === 'profile-select' && (
                <Button 
                  className="btn-primary"
                  disabled={cart.length === 0}
                  onClick={() => setStep('review')}
                >
                  Review Purchase <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}

              {step === 'review' && (
                <Button 
                  className="bg-green-600 hover:bg-green-700"
                  disabled={loading || !!validationError || !userId}
                  onClick={handlePurchase}
                >
                  {loading ? 'Recording...' : 'Record stock intake'}
                  <Check className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
