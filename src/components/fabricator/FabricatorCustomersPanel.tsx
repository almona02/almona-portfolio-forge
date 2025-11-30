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
import { Users, Plus, Filter, Calendar } from 'lucide-react';

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
  const [saving, setSaving] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
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
        sector: sector === 'all' ? 'GENERAL' : sector,
        notes: notes.trim() || null,
      };

      const { data, error: insertError } = await supabase
        .from('fabricator_customers')
        .insert(payload as any)
        .select('*')
        .single();

      if (insertError) throw insertError;

      setCustomers((prev) => (data ? [data as FabricatorCustomerRow, ...prev] : prev));

      // Reset form
      setName('');
      setContactPerson('');
      setEmail('');
      setPhone('');
      setNotes('');
    } catch (e) {
      console.error('Failed to create fabricator customer', e);
      setError('Failed to create customer. Please check the data and try again.');
    } finally {
      setSaving(false);
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-1 space-y-2">
              <div className="text-[11px] uppercase tracking-wide text-gray-500">
                {t('customers.add_new', 'Add New Customer')}
              </div>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('customers.form.name', 'Customer / Company name *')}
                className="h-8 text-xs bg-gray-800 border-gray-700"
              />
              <Input
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder={t('customers.form.contact_person', 'Contact person')}
                className="h-8 text-xs bg-gray-800 border-gray-700"
              />
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('customers.form.email', 'Email')}
                className="h-8 text-xs bg-gray-800 border-gray-700"
              />
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t('customers.form.phone', 'Phone')}
                className="h-8 text-xs bg-gray-800 border-gray-700"
              />
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('customers.form.notes', 'Notes (optional)')}
                className="h-8 text-xs bg-gray-800 border-gray-700"
              />
              <Button
                size="sm"
                className="mt-1 bg-orange-500 hover:bg-orange-600 text-xs"
                disabled={!canSave}
                onClick={handleCreate}
              >
                <Plus className="h-3 w-3 mr-1" />
                {t('customers.form.add_button', 'Add Customer')}
              </Button>
            </div>

            {/* Filters */}
            <div className="md:col-span-2 space-y-3">
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
            <div className="py-6 text-center text-xs text-gray-400">
              {t('customers.directory.no_customers', 'No customers found for the current filters.')}
            </div>
          ) : (
            <>
              <div className="flex justify-end mb-2">
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map((c) => {
                      const isSelected = c.id === selectedCustomerId;
                      return (
                        <TableRow
                          key={c.id}
                          className={isSelected ? 'bg-orange-500/10' : ''}
                          onClick={() =>
                            setSelectedCustomerId((prev) => (prev === c.id ? null : c.id))
                          }
                        >
                          <TableCell className="font-medium text-gray-100">{c.name}</TableCell>
                          <TableCell>{c.contact_person}</TableCell>
                          <TableCell>{c.email}</TableCell>
                          <TableCell>{c.phone}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="text-[10px] border-gray-600 text-gray-200"
                            >
                              {c.sector || 'GENERAL'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(c.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="max-w-xs truncate text-gray-300">
                            {c.notes}
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
    </div>
  );
};

export default FabricatorCustomersPanel;


