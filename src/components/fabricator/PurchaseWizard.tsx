import React, { useState, useEffect, useMemo } from 'react';
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
import { ScrollArea } from '@/shared/ui/ui/scroll-area';
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

interface PurchaseWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onPurchaseComplete: () => void;
}

type WizardStep = 'system-select' | 'profile-select' | 'review';

interface PurchaseItem {
  profile: CatalogProfile;
  quantity: number; // bars
  lengthMm: number; // usually stock length (6000)
  color: string;
}

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

  useEffect(() => {
    if (open) {
      UnifiedProfileCatalog.getAllSystems(userId).then(setSystems);
      setStep('system-select');
      setCart([]);
      setSelectedSystem(null);
    }
  }, [open, userId]);

  const filteredSystems = useMemo(() => {
    if (!searchQuery) return systems;
    return systems.filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.brand.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [systems, searchQuery]);

  const currentSystemProfiles = useMemo(() => {
    if (!selectedSystem) return [];
    return selectedSystem.profiles;
  }, [selectedSystem]);

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
    setCart(prev => {
      const existing = prev.find(item => item.profile.profileCode === profile.profileCode);
      if (existing) {
        return prev.map(item => 
          item.profile.profileCode === profile.profileCode 
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
    setEditingQuantityFor(profile.profileCode);
    setQuantityInput(1);
  };

  const handleConfirmQuantity = (profile: CatalogProfile) => {
    if (quantityInput > 0) {
      addToCart(profile, quantityInput);
    }
  };

  const handleUpdateRole = async (profileCode: string, newRole: Profile['profileRole']) => {
    if (!userId) return;
    
    try {
      // Find the profile in database by code
      const db = supabase as any;
      
      // Try to find by supplierCode first
      let { data: profiles } = await db
        .from('fabricator_profiles')
        .select('id, specifications')
        .eq('user_id', userId)
        .eq('specifications->>supplierCode', profileCode);
      
      // If not found, try internalCode
      if (!profiles || profiles.length === 0) {
        const result = await db
          .from('fabricator_profiles')
          .select('id, specifications')
          .eq('user_id', userId)
          .eq('specifications->>internalCode', profileCode);
        profiles = result.data;
      }
      
      if (profiles && profiles.length > 0) {
        // Update the first matching profile
        const profile = profiles[0];
        const specs = profile.specifications || {};
        await db
          .from('fabricator_profiles')
          .update({
            specifications: { ...specs, profileRole: newRole },
            updated_at: new Date().toISOString()
          })
          .eq('id', profile.id)
          .eq('user_id', userId);
        
        // Refresh systems to reflect the change
        const updatedSystems = await UnifiedProfileCatalog.getAllSystems(userId);
        setSystems(updatedSystems);
        toast.success(`Role updated to ${newRole}`);
      } else {
        toast.info('Profile not found in database. Role will be saved when you add it to inventory.');
      }
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
    }
    setEditingRoleFor(null);
  };

  const removeFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const updateCartItem = (index: number, field: keyof PurchaseItem, value: any) => {
    setCart(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const handlePurchase = async () => {
    if (!userId || cart.length === 0) return;
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
        console.warn('Prop userId does not match authenticated user ID. Using authenticated user ID for RLS compliance.');
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

      // 1. Ensure profiles exist in DB, create if missing
      // This is the "Unify" part - ensuring scalable categories/roles
      
      for (const item of cart) {
        const p = item.profile;
        
        // Check if exists
        const { data: existing } = await db
          .from('fabricator_profiles')
          .select('id, stock_quantity')
          .eq('user_id', authenticatedUserId)
          .eq('name', p.name) // Using name as key for now, ideally supplier code
          .maybeSingle();

        let profileId = existing?.id;
        const currentStock = existing?.stock_quantity || 0;

        if (!profileId) {
          // Create new profile
          const { data: newProfile, error: createError } = await db
            .from('fabricator_profiles')
            .insert({
              user_id: authenticatedUserId,
              name: p.name,
              material: 'aluminum', // Simplified assumption
              width: p.dimensions?.width || 50,
              height: p.dimensions?.height || 50,
              thickness: p.dimensions?.thickness || 1.5,
              color: item.color,
              cost_per_meter: 0, // Needs pricing input ideally
              stock_quantity: 0,
              min_stock_level: 10,
              supplier: selectedSystem?.brand || 'Unknown',
              system_brand: selectedSystem?.name,
              specifications: {
                profileRole: p.role,
                supplierCode: p.profileCode,
                internalCode: p.oldProfileCode,
                systemPackId: p.systemPackId,
                ...p.specifications
              }
            })
            .select()
            .single();
          
          if (createError) throw createError;
          profileId = newProfile.id;
        }

        // 2. Record Stock Movement (Purchase)
        // Use authenticatedUserId to ensure RLS policy compliance (auth.uid() = user_id)
        // Note: movement_type must be 'in' (not 'purchase') per table constraint
        const quantityMeters = parseFloat((item.quantity * (item.lengthMm / 1000)).toFixed(2));
        const stockBefore = parseFloat((currentStock || 0).toFixed(2));
        const stockAfter = parseFloat((stockBefore + quantityMeters).toFixed(2));
        
        // Prepare stock movement data
        const movementData = {
          user_id: authenticatedUserId,
          profile_id: profileId,
          movement_type: 'in', // 'in' is the correct type for stock intake/purchases
          quantity: quantityMeters,
          unit: 'meters',
          stock_before: stockBefore,
          stock_after: stockAfter,
          notes: `Purchase Wizard - ${selectedSystem?.name || 'Unknown'} Batch`,
          created_by: authenticatedUserId,
        };

        // Verify session is still valid and matches authenticatedUserId
        const { data: { session: currentSession }, error: sessionCheckError } = await supabase.auth.getSession();
        if (sessionCheckError || !currentSession) {
          console.error('Session check failed before insert:', sessionCheckError);
          throw new Error('Session expired. Please log in again.');
        }

        // Critical: Ensure the session user ID matches what we're inserting
        if (currentSession.user.id !== authenticatedUserId) {
          console.error('Session user ID mismatch:', {
            sessionUserId: currentSession.user.id,
            authenticatedUserId: authenticatedUserId,
          });
          throw new Error('Session user ID does not match. Please log in again.');
        }

        console.log('Inserting stock movement with data:', {
          ...movementData,
          user_id: authenticatedUserId,
          profile_id: profileId,
          session_user_id: currentSession.user.id,
          session_valid: !!currentSession,
          access_token_present: !!currentSession.access_token,
        });

        // Use supabase directly (not db cast) to ensure auth headers are included
        const { error: movementError, data: movementDataResult } = await (supabase as any)
          .from('stock_movements')
          .insert(movementData)
          .select();

        if (movementError) {
          console.error('Error recording stock movement:', {
            error: movementError,
            code: movementError.code,
            message: movementError.message,
            details: movementError.details,
            hint: movementError.hint,
            user_id: authenticatedUserId,
            profile_id: profileId,
          });
          throw new Error(`Failed to record stock movement: ${movementError.message || movementError.details || 'Unknown error'}`);
        }

        console.log('Stock movement recorded successfully:', movementDataResult);

        // 3. Update Stock Level (use stockAfter from movementData to ensure consistency)
        const { error: updateError } = await db.from('fabricator_profiles')
          .update({ 
            stock_quantity: stockAfter,
            updated_at: new Date().toISOString()
          })
          .eq('id', profileId)
          .eq('user_id', authenticatedUserId);

        if (updateError) {
          console.error('Error updating stock quantity:', updateError);
          throw new Error(`Failed to update stock quantity: ${updateError.message || updateError.details || 'Unknown error'}`);
        }
      }

      // Refresh and resolve stock alerts after purchase
      // This will automatically resolve alerts when stock is restored above thresholds
      try {
        const db = supabase as any;
        const alertResult = await db.rpc('check_stock_levels', { p_user_id: authenticatedUserId });
        console.log('Stock alerts refreshed:', alertResult);
      } catch (alertError) {
        console.warn('Failed to refresh stock alerts:', alertError);
        // Don't fail the purchase if alert refresh fails
      }

      toast.success('Purchase recorded and inventory updated!');
      
      // Call onPurchaseComplete which should refresh the dashboard and alerts
      onPurchaseComplete();
      onOpenChange(false);
    } catch (error) {
      console.error('Purchase failed:', error);
      const errorMessage = (error as any)?.message || (error as any)?.details || (error as any)?.error_description || 'Unknown error';
      toast.error(`Failed to record stock intake: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 bg-gray-900 border-gray-800 card-dark">
        <div className="p-6 border-b border-gray-800">
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

        <ScrollArea className="flex-1 p-6">
          {step === 'system-select' && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  placeholder="Search systems (e.g. Rock60, Jumbo)..." 
                  className="pl-10 bg-gray-800 border-gray-700"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSystems.map(sys => (
                  <Card 
                    key={sys.id} 
                    className="bg-gray-800 border-gray-700 cursor-pointer transition-all card-premium"
                    onClick={() => {
                      setSelectedSystem(sys);
                      setStep('profile-select');
                    }}
                  >
                    <CardContent className="p-6 flex items-center justify-between">
                      <div>
                        <h3 className="typography-h3 text-lg text-gray-100">{sys.name}</h3>
                        <p className="text-sm text-gray-400">{sys.brand}</p>
                        <Badge variant="outline" className="mt-2 bg-gray-900/50">
                          {sys.profiles.length} profiles
                        </Badge>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-500" />
                    </CardContent>
                  </Card>
                ))}
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

              <Tabs value={activeRoleTab} onValueChange={setActiveRoleTab} className="w-full">
                <TabsList className="w-full justify-start bg-gray-800 p-1 mb-4 overflow-x-auto">
                  <TabsTrigger value="frame">Frames</TabsTrigger>
                  <TabsTrigger value="sash">Sashes</TabsTrigger>
                  <TabsTrigger value="mullion">Mullions</TabsTrigger>
                  <TabsTrigger value="glazing_bead">Beads</TabsTrigger>
                  <TabsTrigger value="interlock">Interlocks</TabsTrigger>
                  <TabsTrigger value="accessory">Accessory</TabsTrigger>
                </TabsList>

                {Object.entries(profilesByRole).map(([role, profiles]) => (
                  <TabsContent key={role} value={role} className="space-y-4">
                    {profiles.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        No profiles found for this role.
                      </div>
                    ) : (
                      <ScrollArea className="h-[400px] pr-4">
                        <div className="grid grid-cols-1 gap-3">
                        {profiles.map(profile => {
                          const inCart = cart.find(i => i.profile.profileCode === profile.profileCode);
                          const isEditingQuantity = editingQuantityFor === profile.profileCode;
                          const isEditingRole = editingRoleFor === profile.profileCode;
                          
                          return (
                            <div key={profile.profileCode} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg border border-gray-700">
                              <div className="flex items-center gap-3 flex-1">
                                <div className="h-10 w-10 bg-gray-700 rounded flex items-center justify-center">
                                  <Layers className="h-5 w-5 text-gray-400" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium">{profile.name}</span>
                                    <Badge variant="outline" className="text-[10px]">
                                      {profile.role || 'other'}
                                    </Badge>
                                    {isEditingRole ? (
                                      <Select
                                        value={profile.role || 'other'}
                                        onValueChange={(value) => handleUpdateRole(profile.profileCode, value as Profile['profileRole'])}
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
                                        onClick={() => setEditingRoleFor(profile.profileCode)}
                                        title="Edit role"
                                      >
                                        <Edit2 className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                  <div className="text-xs text-gray-400 flex gap-2">
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
                                      type="number"
                                      min="1"
                                      value={quantityInput}
                                      onChange={(e) => setQuantityInput(parseInt(e.target.value) || 1)}
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
                      </ScrollArea>
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
                {cart.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-gray-800 rounded-lg border border-gray-700">
                    <div className="flex-1">
                      <div className="font-medium">{item.profile.name}</div>
                      <div className="text-xs text-gray-400">
                        {item.profile.systemName} • {item.profile.role}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div>
                        <label className="typography-label text-[10px] text-gray-500 block">Bars</label>
                        <Input 
                          type="number" 
                          className="h-8 w-20 text-center"
                          value={item.quantity}
                          onChange={(e) => updateCartItem(idx, 'quantity', parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <label className="typography-label text-[10px] text-gray-500 block">Length (mm)</label>
                        <Input 
                          type="number" 
                          className="h-8 w-24 text-center"
                          value={item.lengthMm}
                          onChange={(e) => updateCartItem(idx, 'lengthMm', parseInt(e.target.value) || 0)}
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
                            type="text" 
                            className="h-8 w-24"
                            value={item.color}
                            onChange={(e) => updateCartItem(idx, 'color', e.target.value)}
                          />
                        </div>
                      </div>
                      
                      <Button 
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
        </ScrollArea>

        <div className="p-4 border-t border-gray-800 bg-gray-900 card-dark">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-400">
              {cart.length > 0 && (
                <span>
                  Total Bars: <span className="text-gray-200">{cart.reduce((a,b) => a + b.quantity, 0)}</span>
                </span>
              )}
            </div>
            <div className="flex gap-3">
              {step !== 'system-select' && (
                <Button variant="outline" onClick={() => setStep(prev => prev === 'review' ? 'profile-select' : 'system-select')}>
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
                  disabled={loading}
                  onClick={handlePurchase}
                >
                  {loading ? 'Processing...' : 'Confirm & Add to Inventory'} 
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
