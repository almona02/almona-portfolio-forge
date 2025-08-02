import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Button } from '@/shared/ui/ui/button';
import { Badge } from '@/shared/ui/ui/badge';
import { Input } from '@/shared/ui/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { ChevronRight, MapPin, Factory, Calendar, Gauge } from 'lucide-react';
import { usedMachines } from '@/data/usedMachines';
import SellUsedMachineForm from '@/components/used-machines/SellUsedMachineForm';
import { useAuth } from '@/context/AuthContext';

const UsedMachines = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('browse');
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [machineTypeFilter, setMachineTypeFilter] = useState('all');

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
    
    return matchesSearch && matchesLocation && matchesType;
  });

  return (
    <div className="flex flex-col min-h-screen bg-almona-dark text-white">
      <Navbar />
      <main className="flex-grow pt-24">
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
              <div className="mb-8 bg-almona-darker p-6 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <Input
                      placeholder="Search for a machine (copy router, cutting, CNC...)"
                      className="bg-almona-dark border-almona-light"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div>
                    <Select onValueChange={setLocationFilter} value={locationFilter}>
                      <SelectTrigger className="bg-almona-dark border-almona-light">
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
                </div>
              </div>

              {filteredMachines.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-xl text-gray-400">No machines found matching your search.</p>
                  <Button 
                    className="mt-4"
                    onClick={() => {
                      setSearchQuery('');
                      setLocationFilter('all');
                      setMachineTypeFilter('all');
                    }}
                  >
                    Clear All Filters
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filteredMachines.map(machine => (
                    <Card key={machine.id} className="bg-almona-darker border-almona-light overflow-hidden">
                      <div className="relative">
                        <div className="h-48 overflow-hidden">
                          <img 
                            src={machine.images[0]} 
                            alt={machine.title}
                            className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                          />
                        </div>
                        <Badge className="absolute top-2 left-2 bg-green-600">
                          {machine.condition === 'Excellent' ? 'Excellent' : 'Good'}
                        </Badge>
                      </div>
                      <CardHeader>
                        <CardTitle className="text-xl">{machine.title}</CardTitle>
                        <div className="flex justify-between items-center text-orange-400 font-bold text-lg">
                          {machine.price}
                          {machine.seller.verified && (
                            <Badge className="bg-blue-600">
                              Verified
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-400 mb-4">{machine.description}</p>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 mr-2 text-orange-500" />
                            <span>{machine.location}</span>
                          </div>
                          <div className="flex items-center">
                            <Factory className="w-4 h-4 mr-2 text-orange-500" />
                            <span>{machine.seller.name}</span>
                          </div>
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-2 text-orange-500" />
                            <span>Year: {machine.year}</span>
                          </div>
                          <div className="flex items-center">
                            <Gauge className="w-4 h-4 mr-2 text-orange-500" />
                            <span>Hours: {machine.hours.toLocaleString()}</span>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-between">
                        <Button className="border-orange-500 text-orange-500">
                          Request Inspection
                        </Button>
                        <Button asChild>
                          <Link to={`/used-machines/${machine.id}`} className="flex items-center">
                            Details <ChevronRight className="w-4 h-4 mr-1" />
                          </Link>
                        </Button>
                      </CardFooter>
                    </Card>
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
                      Our technical team inspects every machine before it's listed.
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
      <Footer />
    </div>
  );
};

export default UsedMachines;