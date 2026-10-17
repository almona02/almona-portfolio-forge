import { useState, useMemo, useEffect } from 'react';
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
  const [machines, setMachines] = useState<UsedMachine[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('browse');
  const [q, setQ] = useState('');
  const [location, setLocation] = useState('all');
  const [category, setCategory] = useState('all');

  const load = () => {
    UsedMachineService.listActiveListings()
      .then((rows) => setMachines(rows.map(mapListingToMachine)))
      .catch(() => setMachines([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return machines.filter((m) => {
      if (location !== 'all' && m.location !== location) return false;
      if (category !== 'all' && m.type !== category) return false;
      if (query && !(m.title.toLowerCase().includes(query) || m.description.toLowerCase().includes(query))) return false;
      return true;
    });
  }, [machines, q, location, category]);

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
            <Button size="lg" className="bg-white text-amber-700 hover:bg-amber-100" onClick={() => setTab('sell')}>
              <Plus className="w-5 h-5 mr-2" /> {copy('Post your machine — free')}
            </Button>
          </div>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid w-full grid-cols-2 max-w-xl mx-auto mb-8">
              <TabsTrigger value="browse">{copy('Browse Machines')}</TabsTrigger>
              <TabsTrigger value="sell">{copy('Sell a Machine')}</TabsTrigger>
            </TabsList>

            <TabsContent value="browse">
              {/* Search + filters */}
              <div className="mb-6 bg-almona-darker p-4 rounded-lg border border-almona-light/20 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="relative md:col-span-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={copy('Search machines…')} className="pl-9 bg-almona-dark border-almona-light text-white" />
                </div>
                <Select value={location} onValueChange={setLocation}>
                  <SelectTrigger className="bg-almona-dark border-almona-light text-white"><SelectValue placeholder={copy('All governorates')} /></SelectTrigger>
                  <SelectContent className="bg-almona-darker text-white">
                    <SelectItem value="all">{copy('All governorates')}</SelectItem>
                    {GOVERNORATES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="bg-almona-dark border-almona-light text-white"><SelectValue placeholder={copy('All categories')} /></SelectTrigger>
                  <SelectContent className="bg-almona-darker text-white">
                    <SelectItem value="all">{copy('All categories')}</SelectItem>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{copy(c)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {loading ? (
                <div className="text-center py-16 text-gray-400">{copy('Loading listings…')}</div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-xl text-gray-300 mb-2">{copy('No listings yet — be the first to post.')}</p>
                  <p className="text-sm text-gray-500 mb-6">{copy('Free, no account needed.')}</p>
                  <Button className="btn-primary" onClick={() => setTab('sell')}>
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
