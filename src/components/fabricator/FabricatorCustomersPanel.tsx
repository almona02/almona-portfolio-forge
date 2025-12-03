import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import type { Database, SectorType } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/ui/card';
import { Button } from '@/shared/ui/ui/button';
import { Input } from '@/shared/ui/ui/input';
import { Badge } from '@/shared/ui/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/ui/table';
import { Users, Plus, Filter, Calendar, Edit2, Trash2, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/ui/dialog';
import { Label } from '@/shared/ui/ui/label';

type FabricatorCustomerRow = Database['public']['Tables']['fabricator_customers']['Row'];

export const FabricatorCustomersPanel: React.FC = () => {
  const { t } = useTranslation('fabricator');
  const [customers, setCustomers] = useState<FabricatorCustomerRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [sector, setSector] = useState<SectorType | 'all'>('all');
  const [year, setYear] = useState<string>('all');

  // New customer form
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [formSector, setFormSector] = useState<SectorType>('GENERAL');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<FabricatorCustomerRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();
        if (authError || !user) {
          setCustomers([]);
          setIsLoading(false);
          return;
        }

        const { data, error: fetchError } = await supabase
          .from('fabricator_customers')
          .select('*')
          .eq('owner_user_id', user.id)
          .order('created_at', { ascending: false });

        if (fetchError) {
          throw fetchError;
        }

        setCustomers((data as FabricatorCustomerRow[]) || []);
      } catch (e) {
        console.error('Failed to load fabricator customers', e);
        setError('Failed to load customers. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, []);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    customers.forEach((c) => {
      if (c.created_at) {
        const y = new Date(c.created_at).getFullYear();
        if (!Number.isNaN(y)) years.add(String(y));
      }
    });
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return customers.filter((c) => {
      if (sector !== 'all' && c.sector !== sector) return false;

      if (year !== 'all' && c.created_at) {
        const y = new Date(c.created_at).getFullYear();
        if (String(y) !== year) return false;
      }

      if (!query) return true;

      return (
        c.name.toLowerCase().includes(query) ||
        (c.contact_person && c.contact_person.toLowerCase().includes(query)) ||
        (c.email && c.email.toLowerCase().includes(query)) ||
        (c.phone && c.phone.toLowerCase().includes(query)) ||
        (c.notes && c.notes.toLowerCase().includes(query))
      );
    });
  }, [customers, search, sector, year]);

  const canSave = name.trim().length > 0 && !saving;

  const resetForm = () => {
    setName('');
    setContactPerson('');
    setEmail('');
    setPhone('');
    setNotes('');
    setFormSector('GENERAL');
    setEditingId(null);
  };

  const handleEdit = (customer: FabricatorCustomerRow) => {
    setEditingId(customer.id);
    setName(customer.name || '');
    setContactPerson(customer.contact_person || '');
    setEmail(customer.email || '');
    setPhone(customer.phone || '');
    setNotes(customer.notes || '');
    setFormSector(customer.sector || 'GENERAL');
    setWizardOpen(true);
    setCurrentStep(2);
  };

  const handleCancelEdit = () => {
    resetForm();
    setWizardOpen(false);
    setCurrentStep(1);
  };

  const handleCreate = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        setError('You must be logged in to add customers.');
        setSaving(false);
        return;
      }

      const payload: Database['public']['Tables']['fabricator_customers']['Insert'] = {
        owner_user_id: user.id,
        name: name.trim(),
        contact_person: contactPerson.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        sector: formSector,
        notes: notes.trim() || null,
      };

      const { data, error: insertError } = await supabase
        .from('fabricator_customers')
        .insert(payload as any)
        .select('*')
        .single();

      if (insertError) throw insertError;

      setCustomers((prev) => (data ? [data as FabricatorCustomerRow, ...prev] : prev));
      toast.success(t('customers.messages.created', 'Customer created successfully'));
      resetForm();
    } catch (e) {
      console.error('Failed to create fabricator customer', e);
      setError('Failed to create customer. Please check the data and try again.');
      toast.error(t('customers.messages.create_error', 'Failed to create customer'));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingId || !canSave) return;
    setSaving(true);
    setError(null);
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        setError('You must be logged in to update customers.');
        setSaving(false);
        return;
      }

      const payload: Database['public']['Tables']['fabricator_customers']['Update'] = {
        name: name.trim(),
        contact_person: contactPerson.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        sector: formSector,
        notes: notes.trim() || null,
        updated_at: new Date().toISOString(),
      };

      const { data, error: updateError } = await supabase
        .from('fabricator_customers')
        .update(payload as any)
        .eq('id', editingId)
        .eq('owner_user_id', user.id)
        .select('*')
        .single();

      if (updateError) throw updateError;

      setCustomers((prev) =>
        prev.map((c) => (c.id === editingId ? (data as FabricatorCustomerRow) : c))
      );
      toast.success(t('customers.messages.updated', 'Customer updated successfully'));
      resetForm();
    } catch (e) {
      console.error('Failed to update fabricator customer', e);
      setError('Failed to update customer. Please check the data and try again.');
      toast.error(t('customers.messages.update_error', 'Failed to update customer'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (customer: FabricatorCustomerRow) => {
    setCustomerToDelete(customer);
    setDeleteConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!customerToDelete) return;

    setDeleting(true);
    setError(null);
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        setError('You must be logged in to delete customers.');
        setDeleting(false);
        return;
      }

      const { error: deleteError } = await supabase
        .from('fabricator_customers')
        .delete()
        .eq('id', customerToDelete.id)
        .eq('owner_user_id', user.id);

      if (deleteError) throw deleteError;

      setCustomers((prev) => prev.filter((c) => c.id !== customerToDelete.id));
      if (selectedCustomerId === customerToDelete.id) {
        setSelectedCustomerId(null);
      }
      if (editingId === customerToDelete.id) {
        resetForm();
      }
      toast.success(t('customers.messages.deleted', 'Customer deleted successfully'));
      setDeleteConfirmOpen(false);
      setCustomerToDelete(null);
    } catch (e) {
      console.error('Failed to delete fabricator customer', e);
      setError('Failed to delete customer. Please try again.');
      toast.error(t('customers.messages.delete_error', 'Failed to delete customer'));
    } finally {
      setDeleting(false);
    }
  };

  const selectedCustomer = useMemo(
    () => filteredCustomers.find((c) => c.id === selectedCustomerId) || null,
    [filteredCustomers, selectedCustomerId],
  );

  return (
    <div className="space-y-6">
      <Card className="bg-gray-900/80 border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-orange-400" />
            {t('customers.title', 'Fabricator Customers')}
          </CardTitle>
          <CardDescription className="text-xs text-gray-400">
            {t('customers.description', 'Per-workshop customer directory used by the New Project Wizard. Create a customer once, then reuse it from the dropdown when starting new projects.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="space-y-3">
              <div className="flex items-center gap-2 text-[11px] text-gray-400 uppercase tracking-wide">
                <Filter className="h-3 w-3 text-orange-400" />
                {t('customers.filters.smart_filters', 'Smart Filters')}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div>
                  <label className="text-[11px] text-gray-400">{t('customers.filters.search', 'Search')}</label>
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t('customers.filters.search_placeholder', 'Name, contact, email, phone…')}
                    className="h-8 text-xs bg-gray-800 border-gray-700"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-400">{t('customers.filters.sector', 'Sector')}</label>
                  <Select
                    value={sector}
                    onValueChange={(v) => setSector(v as SectorType | 'all')}
                  >
                    <SelectTrigger className="h-8 text-xs bg-gray-800 border-gray-700">
                      <SelectValue placeholder={t('customers.filters.all_sectors', 'All sectors')} />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700 text-xs">
                      <SelectItem value="all">{t('customers.sectors.all', 'All')}</SelectItem>
                      <SelectItem value="ALUMINIUM">{t('customers.sectors.aluminium', 'Aluminium')}</SelectItem>
                      <SelectItem value="UPVC">{t('customers.sectors.upvc', 'UPVC')}</SelectItem>
                      <SelectItem value="STEEL">{t('customers.sectors.steel', 'Steel')}</SelectItem>
                      <SelectItem value="GLASS">{t('customers.sectors.glass', 'Glass')}</SelectItem>
                      <SelectItem value="GENERAL">{t('customers.sectors.general', 'General')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-orange-400" />
                    {t('customers.filters.registered_year', 'Registered Year')}
                  </label>
                  <Select value={year} onValueChange={(v) => setYear(v)}>
                    <SelectTrigger className="h-8 text-xs bg-gray-800 border-gray-700">
                      <SelectValue placeholder={t('customers.filters.all_years', 'All years')} />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700 text-xs max-h-64">
                      <SelectItem value="all">{t('customers.filters.all_years', 'All years')}</SelectItem>
                      {availableYears.map((y) => (
                        <SelectItem key={y} value={y}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

          {error && (
            <div className="text-xs text-red-400">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-gray-900/80 border-gray-800">
        <CardHeader className="pb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4 text-orange-400" />
            {t('customers.directory.title', 'Customer Directory')}
            <Badge variant="outline" className="ml-1 text-[10px]">
              {filteredCustomers.length} / {customers.length}
            </Badge>
          </CardTitle>
          <CardDescription className="text-[11px] text-gray-400">
            {t('customers.directory.description', 'These customers are available in the New Project Wizard dropdown.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="h-32 rounded-lg bg-gray-800/60 animate-pulse" />
          ) : filteredCustomers.length === 0 ? (
            <div className="py-12 text-center space-y-4">
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-gray-800/60 flex items-center justify-center">
                  <Users className="h-8 w-8 text-gray-500" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-300">
                    {t('customers.directory.no_customers', 'No customers found')}
                  </p>
                  <p className="text-xs text-gray-500">
                    {t('customers.directory.no_customers_desc', 'Get started by adding your first customer.')}
                  </p>
                </div>
                <Button
                  onClick={() => {
                    resetForm();
                    setCurrentStep(1);
                    setWizardOpen(true);
                  }}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('customers.form.add_button', 'Add New Customer')}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-2">
                <Button
                  onClick={() => {
                    resetForm();
                    setCurrentStep(1);
                    setWizardOpen(true);
                  }}
                  size="sm"
                  className="bg-orange-500 hover:bg-orange-600 text-white text-xs"
                >
                  <Plus className="h-3 w-3 mr-1.5" />
                  {t('customers.form.add_button', 'Add New Customer')}
                </Button>
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    className="text-xs bg-orange-500 hover:bg-orange-600 disabled:opacity-40"
                    disabled={!selectedCustomer}
                    onClick={() => {
                      if (!selectedCustomer) return;
                      navigate('/fabricator-workflow', {
                        state: {
                          fromCustomer: {
                            id: selectedCustomer.id,
                            name: selectedCustomer.name,
                            contactPerson: selectedCustomer.contact_person,
                            email: selectedCustomer.email,
                            phone: selectedCustomer.phone,
                          },
                        },
                      });
                    }}
                  >
                    {t('customers.directory.new_order', 'New Order for selected customer')}
                  </Button>
                </div>
              </div>
              <div className="rounded-lg border border-gray-800 overflow-hidden">
                <Table className="text-[11px]">
                  <TableHeader>
                    <TableRow className="bg-gray-900/80">
                      <TableHead className="w-48">{t('customers.directory.table.name', 'Name')}</TableHead>
                      <TableHead className="w-40">{t('customers.directory.table.contact', 'Contact')}</TableHead>
                      <TableHead className="w-40">{t('customers.directory.table.email', 'Email')}</TableHead>
                      <TableHead className="w-32">{t('customers.directory.table.phone', 'Phone')}</TableHead>
                      <TableHead className="w-24">{t('customers.directory.table.sector', 'Sector')}</TableHead>
                      <TableHead className="w-32">{t('customers.directory.table.registered', 'Registered')}</TableHead>
                      <TableHead>{t('customers.directory.table.notes', 'Notes')}</TableHead>
                      <TableHead className="w-24 text-right">{t('customers.directory.table.actions', 'Actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map((c) => {
                      const isSelected = c.id === selectedCustomerId;
                      const isEditing = editingId === c.id;
                      return (
                        <TableRow
                          key={c.id}
                          className={isSelected ? 'bg-orange-500/10' : ''}
                        >
                          <TableCell
                            className="font-medium text-gray-100 cursor-pointer"
                            onClick={() =>
                              setSelectedCustomerId((prev) => (prev === c.id ? null : c.id))
                            }
                          >
                            {c.name}
                          </TableCell>
                          <TableCell
                            onClick={() =>
                              setSelectedCustomerId((prev) => (prev === c.id ? null : c.id))
                            }
                            className="cursor-pointer"
                          >
                            {c.contact_person}
                          </TableCell>
                          <TableCell
                            onClick={() =>
                              setSelectedCustomerId((prev) => (prev === c.id ? null : c.id))
                            }
                            className="cursor-pointer"
                          >
                            {c.email}
                          </TableCell>
                          <TableCell
                            onClick={() =>
                              setSelectedCustomerId((prev) => (prev === c.id ? null : c.id))
                            }
                            className="cursor-pointer"
                          >
                            {c.phone}
                          </TableCell>
                          <TableCell
                            onClick={() =>
                              setSelectedCustomerId((prev) => (prev === c.id ? null : c.id))
                            }
                            className="cursor-pointer"
                          >
                            <Badge
                              variant="outline"
                              className="text-[10px] border-gray-600 text-gray-200"
                            >
                              {c.sector || 'GENERAL'}
                            </Badge>
                          </TableCell>
                          <TableCell
                            onClick={() =>
                              setSelectedCustomerId((prev) => (prev === c.id ? null : c.id))
                            }
                            className="cursor-pointer"
                          >
                            {new Date(c.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell
                            onClick={() =>
                              setSelectedCustomerId((prev) => (prev === c.id ? null : c.id))
                            }
                            className="max-w-xs truncate text-gray-300 cursor-pointer"
                          >
                            {c.notes}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 text-gray-400 hover:text-orange-400 hover:bg-orange-500/10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(c);
                                }}
                                disabled={saving || isEditing}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 text-gray-400 hover:text-red-400 hover:bg-red-500/10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteClick(c);
                                }}
                                disabled={saving || isEditing || deleting}
                                title="Delete customer"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Add Customer Wizard Dialog */}
      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-orange-400" />
              {editingId ? t('customers.edit_customer', 'Edit Customer') : t('customers.add_new', 'Add New Customer')}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-400">
              {editingId
                ? t('customers.wizard.edit_desc', 'Update customer information below.')
                : t('customers.wizard.desc', 'Fill in the customer details to add them to your directory.')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Step Indicator */}
            {!editingId && (
              <div className="flex items-center justify-center gap-2 pb-4">
                <div className={`flex items-center gap-2 ${currentStep >= 1 ? 'text-orange-400' : 'text-gray-600'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                    currentStep >= 1 ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-500'
                  }`}>
                    1
                  </div>
                  <span className="text-xs">Basic Info</span>
                </div>
                <div className={`w-12 h-0.5 ${currentStep >= 2 ? 'bg-orange-500' : 'bg-gray-700'}`} />
                <div className={`flex items-center gap-2 ${currentStep >= 2 ? 'text-orange-400' : 'text-gray-600'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                    currentStep >= 2 ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-500'
                  }`}>
                    2
                  </div>
                  <span className="text-xs">Contact & Details</span>
                </div>
              </div>
            )}

            {/* Step 1: Basic Information */}
            {(currentStep === 1 || editingId) && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs text-gray-300">
                    {t('customers.form.name', 'Customer / Company name')} <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('customers.form.name', 'Customer / Company name *')}
                    className="h-9 text-sm bg-gray-800 border-gray-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-gray-300">{t('customers.form.sector', 'Sector')}</Label>
                  <Select
                    value={formSector}
                    onValueChange={(v) => setFormSector(v as SectorType)}
                  >
                    <SelectTrigger className="h-9 text-sm bg-gray-800 border-gray-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700 text-sm">
                      <SelectItem value="GENERAL">{t('customers.sectors.general', 'General')}</SelectItem>
                      <SelectItem value="ALUMINIUM">{t('customers.sectors.aluminium', 'Aluminium')}</SelectItem>
                      <SelectItem value="UPVC">{t('customers.sectors.upvc', 'UPVC')}</SelectItem>
                      <SelectItem value="STEEL">{t('customers.sectors.steel', 'Steel')}</SelectItem>
                      <SelectItem value="GLASS">{t('customers.sectors.glass', 'Glass')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Step 2: Contact & Details */}
            {(currentStep === 2 || editingId) && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs text-gray-300">{t('customers.form.contact_person', 'Contact person')}</Label>
                  <Input
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder={t('customers.form.contact_person', 'Contact person')}
                    className="h-9 text-sm bg-gray-800 border-gray-700"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-300">{t('customers.form.email', 'Email')}</Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t('customers.form.email', 'Email')}
                      className="h-9 text-sm bg-gray-800 border-gray-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-300">{t('customers.form.phone', 'Phone')}</Label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={t('customers.form.phone', 'Phone')}
                      className="h-9 text-sm bg-gray-800 border-gray-700"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-gray-300">{t('customers.form.notes', 'Notes (optional)')}</Label>
                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t('customers.form.notes', 'Notes (optional)')}
                    className="h-9 text-sm bg-gray-800 border-gray-700"
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex items-center justify-between">
            <div className="flex gap-2">
              {editingId && (
                <Button
                  variant="outline"
                  onClick={handleCancelEdit}
                  className="text-xs border-gray-600 hover:bg-gray-800"
                >
                  <X className="h-3 w-3 mr-1" />
                  {t('customers.form.cancel', 'Cancel')}
                </Button>
              )}
              {!editingId && currentStep > 1 && (
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(currentStep - 1)}
                  className="text-xs border-gray-600 hover:bg-gray-800"
                >
                  Previous
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              {editingId ? (
                <Button
                  className="bg-orange-500 hover:bg-orange-600 text-white text-xs"
                  disabled={!canSave}
                  onClick={() => {
                    handleUpdate();
                    setWizardOpen(false);
                  }}
                >
                  <Save className="h-3 w-3 mr-1" />
                  {t('customers.form.update_button', 'Update')}
                </Button>
              ) : currentStep < 2 ? (
                <Button
                  className="bg-orange-500 hover:bg-orange-600 text-white text-xs"
                  disabled={!name.trim()}
                  onClick={() => setCurrentStep(2)}
                >
                  Next
                  <span className="ml-1">→</span>
                </Button>
              ) : (
                <Button
                  className="bg-orange-500 hover:bg-orange-600 text-white text-xs"
                  disabled={!canSave}
                  onClick={() => {
                    handleCreate();
                    setWizardOpen(false);
                    setCurrentStep(1);
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {t('customers.form.add_button', 'Add Customer')}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="bg-gray-900 border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-100">Delete Customer?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to delete customer{' '}
              <span className="font-semibold text-orange-400">
                {customerToDelete?.name}
              </span>
              ?
              <br />
              <br />
              {customerToDelete && (
                <div className="space-y-1 mt-2">
                  {customerToDelete.contact_person && (
                    <div className="text-sm">
                      <span className="text-gray-500">Contact:</span>{' '}
                      <span className="text-gray-200">{customerToDelete.contact_person}</span>
                    </div>
                  )}
                  {customerToDelete.email && (
                    <div className="text-sm">
                      <span className="text-gray-500">Email:</span>{' '}
                      <span className="text-gray-200">{customerToDelete.email}</span>
                    </div>
                  )}
                  {customerToDelete.phone && (
                    <div className="text-sm">
                      <span className="text-gray-500">Phone:</span>{' '}
                      <span className="text-gray-200">{customerToDelete.phone}</span>
                    </div>
                  )}
                  <div className="text-sm">
                    <span className="text-gray-500">Sector:</span>{' '}
                    <span className="text-gray-200">{customerToDelete.sector || 'GENERAL'}</span>
                  </div>
                </div>
              )}
              <br />
              This action cannot be undone. All associated projects and orders will remain, but this customer record will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete Customer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FabricatorCustomersPanel;


