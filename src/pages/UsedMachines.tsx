import { reportMarketplaceEvent } from '@/lib/marketplace/monitoring';
import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePublicCopy } from '@/hooks/usePublicCopy';
import { Button } from '@/shared/ui/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import { Input } from '@/shared/ui/ui/input';
import { Search, Plus } from 'lucide-react';
import { UsedMachine, mapListingToMachine } from '@/data/usedMachines';
import SellUsedMachineForm from '@/components/used-machines/SellUsedMachineForm';
import { withErrorBoundary } from '@/hocs/withErrorBoundary';
import MachineSEO from '@/components/used-machines/MachineSEO';
import MachineCard from '@/components/used-machines/MachineCard';
import { UsedMachineService } from '@/lib/usedMachines/UsedMachineService';

const CATEGORIES = ['Cutting Machine', 'Copy Router', 'CNC Machining Center', 'Welding Machine', 'Corner Cleaning', 'End Milling', 'Punch Press', 'Saw', 'Other'];
const GOVERNORATES = ['Cairo', 'Giza', 'Alexandria', 'Dakahlia', 'Sharqia', 'Qalyubia', 'Beheira', 'Minya', 'Gharbia', 'Sohag', 'Asyut', 'Monufia', 'Qena', 'Faiyum', 'Kafr El Sheikh', 'Beni Suef', 'Port Said'];

const UsedMachines = () => {
  const copy = usePublicCopy();
  const [searchParams, setSearchParams] = useSearchParams();
  const [machines, setMachines] = useState<UsedMachine[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [tab, setTab] = useState(searchParams.get('tab') === 'sell' ? 'sell' : 'browse');
  const [q, setQ] = useState('');
  const [location, setLocation] = useState('all');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');
  const [within, setWithin] = useState<'all' | '24h' | '7d' | '30d'>('all');

  const load = () => {
    setLoading(true);
    setLoadError(false);
    UsedMachineService.listActiveListings()
      .then((rows) => { setMachines(rows.map(mapListingToMachine)); reportMarketplaceEvent('inventory_success'); })
      .catch(() => { setLoadError(true); reportMarketplaceEvent('inventory_failure', 'request'); })
      .finally(() => setLoading(false));
  };

  const handleTabChange = (value: string) => {
    setTab(value);
    // Keep the URL in sync so the header "Post a machine" link and the tab
    // selection stay consistent (and the tab survives a reload).
    const params = new URLSearchParams(searchParams);
    if (value === 'sell') params.set('tab', 'sell');
    else params.delete('tab');
    setSearchParams(params, { replace: true });
  };

  useEffect(() => {
    // Open the marketplace at the top of the page on every visit.
    window.scrollTo(0, 0);
    load();
  }, []);

  // Follow the URL when the header "Post a machine" link changes ?tab=.
  useEffect(() => {
    setTab(searchParams.get('tab') === 'sell' ? 'sell' : 'browse');
  }, [searchParams]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    const now = Date.now();
    const withinMs = within === '24h' ? 86400000 : within === '7d' ? 7 * 86400000 : within === '30d' ? 30 * 86400000 : 0;
    return machines
      .filter((m) => {
        if (location !== 'all' && m.location !== location) return false;
        if (category !== 'all' && m.type !== category) return false;
        if (query && !(m.title.toLowerCase().includes(query) || m.description.toLowerCase().includes(query))) return false;
        if (withinMs && now - new Date(m.createdAt).getTime() > withinMs) return false;
        return true;
      })
      .sort((a, b) => {
        const d = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        return sort === 'newest' ? d : -d;
      });
  }, [machines, q, location, category, sort, within]);

  return (
    <>
      <MachineSEO machines={machines} isListingPage={true} />
      <main className="flex-grow pt-20">
        <div className="container mx-auto px-4 py-8">
          {/* Hero — simple & fast */}
          <div className="mb-8 text-center bg-gradient-to-r from-amber-900 to-amber-700 py-10 px-4 rounded-xl">
            <h1 className="typography-h1 md:text-5xl mb-3 text-white">{copy('Used Machines Marketplace')}</h1>
            <p className="text-xl text-amber-100 mb-2">{copy('Simple & fast — buy and sell used machinery, free.')}</p>
            <p className="text-sm text-amber-200/80 mb-6">{copy('Post in 2 minutes. No account needed. Buyers contact you directly.')}</p>
            <Button size="lg" className="bg-white text-amber-700 hover:bg-amber-100" onClick={() => handleTabChange('sell')}>
              <Plus className="w-5 h-5 mr-2" /> {copy('Post your machine — free')}
            </Button>
          </div>

          <Tabs value={tab} onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-2 max-w-xl mx-auto mb-8">
              <TabsTrigger value="browse">{copy('Browse Machines')}</TabsTrigger>
              <TabsTrigger value="sell">{copy('Sell a Machine')}</TabsTrigger>
            </TabsList>

            <TabsContent value="browse">
              {/* Search + filters */}
              <div className="mb-6 bg-almona-darker p-4 rounded-lg border border-almona-light/20 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
                <div className="relative md:col-span-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={copy('Search machines…')} className="pl-9 bg-almona-dark border-almona-light text-white" />
                </div>
                <Select value={location} onValueChange={setLocation}>
                  <SelectTrigger className="bg-almona-dark border-almona-light text-white"><SelectValue placeholder={copy('All governorates')} /></SelectTrigger>
                  <SelectContent className="bg-almona-darker text-white">
                    <SelectItem value="all">{copy('All governorates')}</SelectItem>
                    {GOVERNORATES.map((g) => <SelectItem key={g} value={g}>{copy(g)}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="bg-almona-dark border-almona-light text-white"><SelectValue placeholder={copy('All categories')} /></SelectTrigger>
                  <SelectContent className="bg-almona-darker text-white">
                    <SelectItem value="all">{copy('All categories')}</SelectItem>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{copy(c)}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={sort} onValueChange={(v) => setSort(v as 'newest' | 'oldest')}>
                  <SelectTrigger className="bg-almona-dark border-almona-light text-white"><SelectValue placeholder={copy('Sort by')} /></SelectTrigger>
                  <SelectContent className="bg-almona-darker text-white">
                    <SelectItem value="newest">{copy('Newest first')}</SelectItem>
                    <SelectItem value="oldest">{copy('Oldest first')}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={within} onValueChange={(v) => setWithin(v as 'all' | '24h' | '7d' | '30d')}>
                  <SelectTrigger className="bg-almona-dark border-almona-light text-white"><SelectValue placeholder={copy('All time')} /></SelectTrigger>
                  <SelectContent className="bg-almona-darker text-white">
                    <SelectItem value="all">{copy('All time')}</SelectItem>
                    <SelectItem value="24h">{copy('Last 24 hours')}</SelectItem>
                    <SelectItem value="7d">{copy('Last 7 days')}</SelectItem>
                    <SelectItem value="30d">{copy('Last 30 days')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" aria-busy="true" aria-label={copy('Loading listings…')}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-almona-darker border border-almona-light/20 rounded-lg overflow-hidden animate-pulse">
                      <div className="h-48 bg-almona-dark" />
                      <div className="p-4 space-y-3">
                        <div className="h-4 bg-almona-light/20 rounded w-3/4" />
                        <div className="h-5 bg-almona-light/20 rounded w-1/3" />
                        <div className="h-3 bg-almona-light/20 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : loadError ? (
                <div role="alert" className="text-center py-16">
                  <p className="text-xl text-gray-300 mb-2">{copy('We could not load the machines right now.')}</p>
                  <p className="text-sm text-gray-400 mb-6">{copy('Please check your connection and try again. You can still post your machine using the Sell tab.')}</p>
                  <Button onClick={load}>{copy('Retry loading machines')}</Button>
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-xl text-gray-300 mb-2">{copy('No listings yet — be the first to post.')}</p>
                  <p className="text-sm text-gray-500 mb-6">{copy('Free, no account needed.')}</p>
                  <Button className="btn-primary" onClick={() => handleTabChange('sell')}>
                    <Plus className="w-4 h-4 mr-2" /> {copy('Post a machine')}
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filtered.map((m) => <MachineCard key={m.id} machine={m} />)}
                </div>
              )}

              {filtered.length > 0 && (
                <p className="text-center text-xs text-gray-500 mt-10">
                  {filtered.length} {filtered.length === 1 ? copy('listing') : copy('listings')} · {copy('prices are indicative — confirm with the seller.')}
                </p>
              )}
            </TabsContent>

            <TabsContent value="sell">
              <div className="max-w-3xl mx-auto">
                <SellUsedMachineForm onSuccess={load} />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </>
  );
};

export default withErrorBoundary(UsedMachines);
