import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/shared/ui/ui/button';
import { Badge } from '@/shared/ui/ui/badge';
import { Input } from '@/shared/ui/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { ChevronRight, MapPin, Factory, Calendar, Gauge, Filter } from 'lucide-react';
import { usedMachines } from '@/data/usedMachines';
import SellUsedMachineForm from '@/components/used-machines/SellUsedMachineForm';
import { useAuth } from '@/context/AuthContext';
import { withErrorBoundary } from '@/hocs/withErrorBoundary';
import OptimizedImage from '@/components/shared/OptimizedImage';
import PriceRangeFilter from '@/components/used-machines/PriceRangeFilter';
import ConditionBadge from '@/components/used-machines/ConditionBadge';
import MachineSEO from '@/components/used-machines/MachineSEO';
import MachineCard from '@/components/used-machines/MachineCard';
import { getPriceRange, isPriceInRange } from '@/utils/priceUtils';

/**
 * UsedMachines Component
 * 
 * A comprehensive marketplace for buying and selling used industrial machinery.
 * Features include machine browsing, filtering, search, and selling functionality.
 * 
 * @returns {JSX.Element} The UsedMachines page component
 */
const UsedMachines = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('browse');
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [machineTypeFilter, setMachineTypeFilter] = useState('all');
  
  // Enhanced filtering state
  const priceRange = useMemo(() => getPriceRange(usedMachines), []);
  const [priceFilter, setPriceFilter] = useState<[number, number]>([priceRange.min, priceRange.max]);
  const [showFilters, setShowFilters] = useState(false);

  /**
   * Handles the sell button click, redirecting to login if user is not authenticated
   */
  const handleSellClick = () => {
    if (user) {
      navigate('/usedmachines/sell');
    } else {
      navigate('/login');
    }
  };

  const machineTypes = [
    { value: 'all', label: 'All Types' },
    { value: 'copy-router', label: 'Copy Routers' },
    { value: 'cutting', label: 'Cutting Machines' },
    { value: 'cnc', label: 'CNC Centers' },
    { value: 'welding', label: 'Welding Machines' },
    { value: 'corner-cleaning', label: 'Corner Cleaning' },
  ];

  const governorates = [
    'Cairo', 'Giza', 'Alexandria', 'Dakahlia', 'Sharqia', 'Qalyubia',
    'Beheira', 'Minya', 'Gharbia', 'Sohag', 'Asyut', 'Monufia',
    'Qena', 'Faiyum', 'Kafr El Sheikh', 'Beni Suef', 'Port Said'
  ];

  const filteredMachines = usedMachines.filter(machine => {
    const matchesSearch = machine.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          machine.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLocation = locationFilter === 'all' || machine.location === locationFilter;
    const matchesType = machineTypeFilter === 'all' || machine.type === machineTypeFilter;
    const matchesPrice = isPriceInRange(machine.price, priceFilter);
    
    return matchesSearch && matchesLocation && matchesType && matchesPrice;
  });

  const clearAllFilters = () => {
    setSearchQuery('');
    setLocationFilter('all');
    setMachineTypeFilter('all');
    setPriceFilter([priceRange.min, priceRange.max]);
  };

  return (
    <>
      {/* SEO Component */}
      <MachineSEO machines={usedMachines} isListingPage={true} />
      
      <main className="flex-grow pt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-12 text-center bg-gradient-to-r from-orange-900 to-orange-700 py-12 px-4 rounded-xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="text-white">Used Machines Marketplace</span>
            </h1>
            <p className="text-xl text-orange-100 max-w-3xl mx-auto mb-8">
              A trusted platform for buying and selling used aluminum and uPVC machinery in Egypt.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                className="bg-white text-orange-700 hover:bg-orange-100"
                onClick={handleSellClick}
              >
                Sell Your Used Machines
              </Button>
              <Button 
                className="text-white border-white hover:bg-orange-800"
              >
                Get a Free Consultation
              </Button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 max-w-xl mx-auto mb-12" aria-label="Used Machines Tabs">
              <TabsTrigger value="browse">Browse Machines</TabsTrigger>
              <TabsTrigger value="sell">Sell a Machine</TabsTrigger>
            </TabsList>

            <TabsContent value="browse">
              {/* Enhanced Search and Filter Section */}
              <div className="mb-8 bg-almona-darker p-6 rounded-lg border border-almona-light/20">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div className="md:col-span-2">
                    <Input
                      placeholder="Search for a machine (copy router, cutting, CNC...)"
                      className="bg-almona-dark border-almona-light h-11"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div>
                    <Select onValueChange={setLocationFilter} value={locationFilter}>
                      <SelectTrigger className="bg-almona-dark border-almona-light h-11">
                        <SelectValue placeholder="All Governorates" />
                      </SelectTrigger>
                      <SelectContent className="bg-almona-darker text-white">
                        <SelectItem value="all">All Governorates</SelectItem>
                        {governorates.map(gov => (
                          <SelectItem key={gov} value={gov}>{gov}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Button
                      onClick={() => setShowFilters(!showFilters)}
                      className="w-full h-11 bg-orange-600 hover:bg-orange-700"
                    >
                      <Filter className="w-4 h-4 mr-2" />
                      Advanced Filters
                    </Button>
                  </div>
                </div>

                {/* Machine Type Filter */}
                <div className="mb-4">
                  <Select onValueChange={setMachineTypeFilter} value={machineTypeFilter}>
                    <SelectTrigger className="bg-almona-dark border-almona-light">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent className="bg-almona-darker text-white">
                      {machineTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Advanced Filters Panel */}
                {showFilters && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-4 border-t border-almona-light/20">
                    <PriceRangeFilter
                      minPrice={priceRange.min}
                      maxPrice={priceRange.max}
                      currentRange={priceFilter}
                      onRangeChange={setPriceFilter}
                    />
                    
                    {/* Filter Summary */}
                    <div className="bg-almona-dark p-4 rounded-lg">
                      <h4 className="text-sm font-medium text-almona-light mb-3">Active Filters</h4>
                      <div className="space-y-2 text-sm">
                        <div>Machines Found: <span className="text-orange-400 font-bold">{filteredMachines.length}</span></div>
                        {searchQuery && <div>Search: <span className="text-blue-400">"{searchQuery}"</span></div>}
                        {locationFilter !== 'all' && <div>Location: <span className="text-green-400">{locationFilter}</span></div>}
                        {machineTypeFilter !== 'all' && <div>Type: <span className="text-purple-400">{machineTypes.find(t => t.value === machineTypeFilter)?.label}</span></div>}
                        <Button
                          onClick={clearAllFilters}
                          className="mt-2 h-8 px-3 text-xs bg-almona-light/10 hover:bg-almona-light/20"
                          size="sm"
                        >
                          Clear All Filters
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {filteredMachines.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🔍</div>
                  <p className="text-xl text-gray-400 mb-2">No machines found matching your search.</p>
                  <p className="text-sm text-gray-500 mb-6">Try adjusting your filters or search terms</p>
                  <Button 
                    className="mt-4 bg-orange-600 hover:bg-orange-700"
                    onClick={clearAllFilters}
                  >
                    Clear All Filters
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filteredMachines.map(machine => (
                    <MachineCard 
                      key={machine.id} 
                      machine={machine}
                      showSellerRating={true}
                    />
                  ))}
                </div>
              )}

              <div className="mt-16 text-center">
                <h3 className="text-2xl font-semibold mb-6">Why Trust Almona?</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="bg-almona-darker/50 p-6 rounded-lg border border-almona-light/20">
                    <div className="text-5xl mb-4">🔍</div>
                    <h4 className="text-xl font-semibold mb-2">Thorough Technical Inspection</h4>
                    <p className="text-gray-400">
                      Our technical team inspects every machine before it&apos;s listed.
                    </p>
                  </div>
                  <div className="bg-almona-darker/50 p-6 rounded-lg border border-almona-light/20">
                    <div className="text-5xl mb-4">🤝</div>
                    <h4 className="text-xl font-semibold mb-2">Secure Transaction Guarantee</h4>
                    <p className="text-gray-400">
                      A secure payment system protects both buyer and seller until the deal is complete.
                    </p>
                  </div>
                  <div className="bg-almona-darker/50 p-6 rounded-lg border border-almona-light/20">
                    <div className="text-5xl mb-4">🚚</div>
                    <h4 className="text-xl font-semibold mb-2">Logistical Services</h4>
                    <p className="text-gray-400">
                      We arrange transportation and installation at preferential rates with our partners.
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="sell">
              <div className="max-w-4xl mx-auto">
                <SellUsedMachineForm />
                <div className="bg-gradient-to-r from-orange-900 to-orange-800 p-8 rounded-xl mt-8">
                  <h3 className="text-xl font-semibold mb-4 text-center">Benefits of Selling with Almona</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start">
                      <div className="bg-orange-600 p-2 rounded-full mr-3 mt-1">
                        <span className="text-white">1</span>
                      </div>
                      <p className="text-orange-100">
                        <span className="font-bold">Free Technical Inspection:</span> Our team visits your factory to evaluate the machine.
                      </p>
                    </div>
                    <div className="flex items-start">
                      <div className="bg-orange-600 p-2 rounded-full mr-3 mt-1">
                        <span className="text-white">2</span>
                      </div>
                      <p className="text-orange-100">
                        <span className="font-bold">Guaranteed Marketing:</span> We reach over 5,000 fabricators in Egypt.
                      </p>
                    </div>
                    <div className="flex items-start">
                      <div className="bg-orange-600 p-2 rounded-full mr-3 mt-1">
                        <span className="text-white">3</span>
                      </div>
                      <p className="text-orange-100">
                        <span className="font-bold">Logistical Support:</span> We arrange transport and installation at preferential rates.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </>
  );
};

export default withErrorBoundary(UsedMachines);