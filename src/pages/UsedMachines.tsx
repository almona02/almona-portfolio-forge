import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/ui/ui/button';
import { Badge } from '@/shared/ui/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import { Filter, Brain } from 'lucide-react';
import { usedMachines } from '@/data/usedMachines';
import SellUsedMachineForm from '@/components/used-machines/SellUsedMachineForm';
import { useAuth } from '@/context/AuthContext';
import { withErrorBoundary } from '@/hocs/withErrorBoundary';
import PriceRangeFilter from '@/components/used-machines/PriceRangeFilter';
import MachineSEO from '@/components/used-machines/MachineSEO';
import MachineCard from '@/components/used-machines/MachineCard';
import SmartSearchBox from '@/components/search/SmartSearchBox';
import RelatedMachinesSection from '@/components/search/RelatedMachinesSection';
import { getPriceRange } from '@/utils/priceUtils';
import { SearchResultsManager, SearchResult } from '@/services/SearchResultsManager';
import { ParsedQuery } from '@/services/NaturalLanguageProcessor';

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
  
  // Smart search state
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [parsedQuery, setParsedQuery] = useState<ParsedQuery | null>(null);
  const [_currentSearchEventId, setCurrentSearchEventId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Handles the sell button click, redirecting to login if user is not authenticated
   */
  const handleSellClick = () => {
    if (user) {
      navigate('/used-machines/sell');
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

  // Perform intelligent search when filters change
  useEffect(() => {
    setIsLoading(true);
    
    const searchFilters = {
      query: searchQuery,
      priceRange: priceFilter,
      location: locationFilter,
      machineType: machineTypeFilter
    };
    
    const { results, analytics, eventId } = SearchResultsManager.searchMachines(
      usedMachines,
      searchFilters
    );
    
    setSearchResults(results);
    setParsedQuery(analytics);
    setCurrentSearchEventId(eventId);
    setIsLoading(false);
  }, [searchQuery, locationFilter, machineTypeFilter, priceFilter]);

  const clearAllFilters = () => {
    setSearchQuery('');
    setLocationFilter('all');
    setMachineTypeFilter('all');
    setPriceFilter([priceRange.min, priceRange.max]);
  };

  // Handle search from SmartSearchBox
  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  // Get machines to display
  const _machinesToShow = searchResults.map(result => result.machine);

  return (
    <>
      {/* SEO Component */}
      <MachineSEO machines={usedMachines} isListingPage={true} />
      
      <main className="flex-grow pt-20">
        <div id="top" className="sr-only" aria-hidden="true" />
        <div className="container mx-auto px-4 py-8">
          <div className="mb-12 text-center bg-gradient-to-r from-amber-900 to-amber-700 py-12 px-4 rounded-xl">
            <h1 className="typography-h1 md:text-5xl mb-6">
              <span className="text-white">Used Machines Marketplace</span>
            </h1>
            <p className="text-xl text-amber-100 max-w-3xl mx-auto mb-8">
              A trusted platform for buying and selling used aluminum and uPVC machinery in Egypt.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                className="bg-white text-amber-700 hover:bg-amber-100"
                onClick={handleSellClick}
              >
                Sell Your Used Machines
              </Button>
              <Button 
                className="text-white border-white hover:bg-amber-800"
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
              {/* AI-Powered Search Section */}
              <div className="mb-8 bg-almona-darker p-6 rounded-lg border border-almona-light/20">
                {/* Smart Search Header */}
                <div className="flex items-center mb-4">
                  <Brain className="w-5 h-5 text-amber-400 mr-2" />
                  <h3 className="typography-h3 text-lg text-almona-light">AI-Powered Search</h3>
                  {parsedQuery && (
                    <Badge className="ml-3 bg-blue-600/20 text-blue-400 border-blue-400/30">
                      {parsedQuery.intent} • {parsedQuery.urgency} priority
                    </Badge>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div className="md:col-span-2">
                    <SmartSearchBox
                      value={searchQuery}
                      onChange={setSearchQuery}
                      onSearch={handleSearch}
                      placeholder="Try: 'cheap CNC machine in Cairo' or 'copy router under 100k'"
                      className=""
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
                      className="btn-primary"
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
                    
                    {/* Smart Results Summary */}
                    <div className="bg-almona-dark p-4 rounded-lg">
                      <div className="flex items-center mb-3">
                        <Brain className="w-4 h-4 text-amber-400 mr-2" />
                        <h4 className="typography-h4 text-sm font-medium text-almona-light">Search Results</h4>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span>Machines Found:</span>
                          <span className="text-amber-400 font-bold">{searchResults.length}</span>
                        </div>
                        {searchQuery && (
                          <div className="flex items-center justify-between">
                            <span>Search:</span>
                            <span className="text-blue-400">"{searchQuery}"</span>
                          </div>
                        )}
                        {locationFilter !== 'all' && (
                          <div className="flex items-center justify-between">
                            <span>Location:</span>
                            <span className="text-green-400">{locationFilter}</span>
                          </div>
                        )}
                        {machineTypeFilter !== 'all' && (
                          <div className="flex items-center justify-between">
                            <span>Type:</span>
                            <span className="text-amber-400">{machineTypes.find(t => t.value === machineTypeFilter)?.label}</span>
                          </div>
                        )}
                        {parsedQuery?.expandedTerms && parsedQuery.expandedTerms.length > 1 && (
                          <div className="text-xs text-almona-light/60 mt-2 p-2 bg-almona-light/5 rounded">
                            <strong>AI Enhanced:</strong> Also searching for {parsedQuery.expandedTerms.slice(1, 4).join(', ')}
                          </div>
                        )}
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

              {isLoading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400 mb-4"></div>
                  <p className="text-almona-light">Searching with AI...</p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🔍</div>
                  <p className="text-xl text-gray-400 mb-2">No machines found matching your search.</p>
                  <p className="text-sm text-gray-500 mb-6">Try adjusting your filters or search terms</p>
                  <Button 
                    className="btn-primary"
                    onClick={clearAllFilters}
                  >
                    Clear All Filters
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {searchResults.map((result) => (
                    <div key={result.machine.id} className="relative">
                      {/* Relevance Score Badge */}
                      {result.relevanceScore > 0.8 && (
                        <Badge className="absolute -top-2 -right-2 z-10 bg-green-600 text-white text-xs">
                          {Math.round(result.relevanceScore * 100)}% match
                        </Badge>
                      )}
                      <MachineCard 
                        machine={result.machine}
                        showSellerRating={true}
                      />
                      {/* Match Reasons */}
                      {result.matchReasons.length > 0 && searchQuery.trim() && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {result.matchReasons.slice(0, 3).map((reason, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs bg-blue-600/10 text-blue-400 border-blue-400/30">
                              {reason}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              {/* Trending Machines Section */}
              {!searchQuery.trim() && (
                <RelatedMachinesSection
                  allMachines={usedMachines}
                  showTrending={true}
                  title="🔥 Trending This Week"
                  className="mt-16"
                />
              )}

              <div className="mt-16 text-center">
                <h3 className="typography-h3 mb-6">Why Trust Almona?</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="bg-almona-darker/50 p-6 rounded-lg border border-almona-light/20">
                    <div className="text-5xl mb-4">🔍</div>
                    <h4 className="typography-h4 mb-2">Thorough Technical Inspection</h4>
                    <p className="text-gray-400">
                      Our technical team inspects every machine before it&apos;s listed.
                    </p>
                  </div>
                  <div className="bg-almona-darker/50 p-6 rounded-lg border border-almona-light/20">
                    <div className="text-5xl mb-4">🤝</div>
                    <h4 className="typography-h4 mb-2">Secure Transaction Guarantee</h4>
                    <p className="text-gray-400">
                      A secure payment system protects both buyer and seller until the deal is complete.
                    </p>
                  </div>
                  <div className="bg-almona-darker/50 p-6 rounded-lg border border-almona-light/20">
                    <div className="text-5xl mb-4">🚚</div>
                    <h4 className="typography-h4 mb-2">Logistical Services</h4>
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
                <div className="bg-gradient-to-r from-amber-900 to-amber-800 p-8 rounded-xl mt-8">
                  <h3 className="typography-h3 mb-4 text-center">Benefits of Selling with Almona</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start">
                      <div className="btn-primary">
                        <span className="text-white">1</span>
                      </div>
                      <p className="text-amber-100">
                        <span className="font-bold">Free Technical Inspection:</span> Our team visits your factory to evaluate the machine.
                      </p>
                    </div>
                    <div className="flex items-start">
                      <div className="btn-primary">
                        <span className="text-white">2</span>
                      </div>
                      <p className="text-amber-100">
                        <span className="font-bold">Guaranteed Marketing:</span> We reach over 5,000 fabricators in Egypt.
                      </p>
                    </div>
                    <div className="flex items-start">
                      <div className="btn-primary">
                        <span className="text-white">3</span>
                      </div>
                      <p className="text-amber-100">
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