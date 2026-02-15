import React, { useState } from 'react';
import { LazyMotionDiv } from '@/utils/lazyMotion';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Input } from '@/shared/ui/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import { 
  Truck, 
  Package, 
  Clock, 
  DollarSign, 
  Route,
  Ship,
  Plane,
  Calculator,
  Info,
  CheckCircle,
  Globe,
  Phone,
  Mail,
  Download
} from 'lucide-react';
import { MachineSpec } from '@/types/shop';

/**
 * Props for the FreightCalculator component
 */
interface FreightCalculatorProps {
  /** Machine specification containing weight and other details */
  machine: MachineSpec | null;
}

interface ShippingOption {
  id: string;
  name: string;
  nameAr: string;
  icon: React.ReactNode;
  description: string;
  baseRate: number;
  minCost: number;
  maxWeight: number;
  estimatedDays: string;
  features: string[];
  color: string;
}

interface Port {
  id: string;
  name: string;
  nameAr: string;
  type: 'sea' | 'air' | 'land';
  coordinates: { lat: number; lng: number };
  facilities: string[];
}

/**
 * Enhanced FreightCalculator Component
 * 
 * Comprehensive shipping cost calculator for machines across Egypt and international destinations.
 * Features:
 * - Multiple shipping methods (Sea, Air, Land, Nile River)
 * - Egyptian governorate and international destinations
 * - Weight and dimension-based calculations
 * - Real-time cost updates with detailed breakdowns
 * - Arabic and English interface
 * - Shipping tracking and insurance options
 */
const FreightCalculator: React.FC<FreightCalculatorProps> = ({ machine }) => {
  const [activeTab, setActiveTab] = useState('calculator');
  const [shippingMethod, setShippingMethod] = useState<string>('nile-river');
  const [fromPort, setFromPort] = useState<string>('Alexandria');
  const [toDestination, setToDestination] = useState<string>('Cairo');
  const [weight, setWeight] = useState<number>(machine?.specs?.weight ? Number(machine.specs.weight) : 1000);
  const [dimensions, setDimensions] = useState({
    length: machine?.specs?.length ? Number(machine.specs.length) : 200,
    width: machine?.specs?.width ? Number(machine.specs.width) : 100,
    height: machine?.specs?.height ? Number(machine.specs.height) : 150
  });
  const [insurance, setInsurance] = useState(false);
  const [urgent, setUrgent] = useState(false);
  const [calculatedCost, setCalculatedCost] = useState<number | null>(null);
  const [costBreakdown, setCostBreakdown] = useState<any>(null);

  const shippingOptions: ShippingOption[] = [
    {
      id: 'nile-river',
      name: 'Nile River Freight',
      nameAr: 'شحن نهر النيل',
      icon: <Ship className="h-6 w-6" />,
      description: 'Traditional Nile River transportation for heavy machinery',
      baseRate: 0.5,
      minCost: 500,
      maxWeight: 50000,
      estimatedDays: '3-7 days',
      features: ['Eco-friendly', 'Cost-effective', 'Heavy cargo support', 'Historical route'],
      color: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    },
    {
      id: 'sea-freight',
      name: 'Sea Freight',
      nameAr: 'الشحن البحري',
      icon: <Ship className="h-6 w-6" />,
      description: 'International sea freight for large machinery',
      baseRate: 0.8,
      minCost: 2000,
      maxWeight: 100000,
      estimatedDays: '7-21 days',
      features: ['International', 'Large capacity', 'Container options', 'Tracking available'],
      color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
    },
    {
      id: 'air-freight',
      name: 'Air Freight',
      nameAr: 'الشحن الجوي',
      icon: <Plane className="h-6 w-6" />,
      description: 'Fast air transportation for urgent deliveries',
      baseRate: 2.5,
      minCost: 5000,
      maxWeight: 10000,
      estimatedDays: '1-3 days',
      features: ['Fastest delivery', 'Global reach', 'Priority handling', 'Real-time tracking'],
      color: 'bg-sky-500/20 text-sky-400 border-sky-500/30'
    },
    {
      id: 'land-freight',
      name: 'Land Freight',
      nameAr: 'الشحن البري',
      icon: <Truck className="h-6 w-6" />,
      description: 'Road transportation within Egypt and neighboring countries',
      baseRate: 0.7,
      minCost: 800,
      maxWeight: 30000,
      estimatedDays: '1-5 days',
      features: ['Door-to-door', 'Flexible routes', 'Real-time tracking', 'Local expertise'],
      color: 'bg-green-500/20 text-green-400 border-green-500/30'
    }
  ];

  const ports: Port[] = [
    {
      id: 'Alexandria',
      name: 'Alexandria Port',
      nameAr: 'ميناء الإسكندرية',
      type: 'sea',
      coordinates: { lat: 31.2001, lng: 29.9187 },
      facilities: ['Container terminal', 'Bulk cargo', 'RoRo terminal', 'Customs clearance']
    },
    {
      id: 'PortSaid',
      name: 'Port Said',
      nameAr: 'بورسعيد',
      type: 'sea',
      coordinates: { lat: 31.2653, lng: 32.3019 },
      facilities: ['Suez Canal access', 'Container terminal', 'Bulk cargo', 'Free zone']
    },
    {
      id: 'Suez',
      name: 'Suez Port',
      nameAr: 'ميناء السويس',
      type: 'sea',
      coordinates: { lat: 29.9668, lng: 32.5498 },
      facilities: ['Suez Canal', 'Oil terminal', 'Container terminal', 'Industrial zone']
    },
    {
      id: 'CairoAirport',
      name: 'Cairo International Airport',
      nameAr: 'مطار القاهرة الدولي',
      type: 'air',
      coordinates: { lat: 30.1127, lng: 31.4000 },
      facilities: ['Cargo terminal', 'Customs clearance', 'Cold storage', 'Dangerous goods']
    }
  ];

  const destinations = [
    { id: 'Cairo', name: 'Cairo', nameAr: 'القاهرة', type: 'governorate' },
    { id: 'Giza', name: 'Giza', nameAr: 'الجيزة', type: 'governorate' },
    { id: 'Alexandria', name: 'Alexandria', nameAr: 'الإسكندرية', type: 'governorate' },
    { id: 'PortSaid', name: 'Port Said', nameAr: 'بورسعيد', type: 'governorate' },
    { id: 'Suez', name: 'Suez', nameAr: 'السويس', type: 'governorate' },
    { id: 'Dakahlia', name: 'Dakahlia', nameAr: 'الدقهلية', type: 'governorate' },
    { id: 'Sharqia', name: 'Sharqia', nameAr: 'الشرقية', type: 'governorate' },
    { id: 'Qalyubia', name: 'Qalyubia', nameAr: 'القليوبية', type: 'governorate' },
    { id: 'Beheira', name: 'Beheira', nameAr: 'البحيرة', type: 'governorate' },
    { id: 'Minya', name: 'Minya', nameAr: 'المنيا', type: 'governorate' },
    { id: 'Asyut', name: 'Asyut', nameAr: 'أسيوط', type: 'governorate' },
    { id: 'Sohag', name: 'Sohag', nameAr: 'سوهاج', type: 'governorate' },
    { id: 'Qena', name: 'Qena', nameAr: 'قنا', type: 'governorate' },
    { id: 'Aswan', name: 'Aswan', nameAr: 'أسوان', type: 'governorate' },
    { id: 'Dubai', name: 'Dubai, UAE', nameAr: 'دبي، الإمارات', type: 'international' },
    { id: 'Riyadh', name: 'Riyadh, Saudi Arabia', nameAr: 'الرياض، السعودية', type: 'international' },
    { id: 'Istanbul', name: 'Istanbul, Turkey', nameAr: 'إسطنبول، تركيا', type: 'international' },
    { id: 'Casablanca', name: 'Casablanca, Morocco', nameAr: 'الدار البيضاء، المغرب', type: 'international' }
  ];

  const portDistances = {
    Alexandria: {
      'Cairo': 220, 'Giza': 225, 'Alexandria': 0, 'PortSaid': 240,
      'Suez': 250, 'Dakahlia': 180, 'Sharqia': 200, 'Qalyubia': 200,
      'Beheira': 50, 'Minya': 350, 'Asyut': 400, 'Sohag': 500,
      'Qena': 550, 'Aswan': 700, 'Dubai': 1200, 'Riyadh': 800,
      'Istanbul': 600, 'Casablanca': 2000
    },
    PortSaid: {
      'Cairo': 180, 'Giza': 185, 'Alexandria': 240, 'PortSaid': 0,
      'Suez': 150, 'Dakahlia': 120, 'Sharqia': 100, 'Qalyubia': 150,
      'Beheira': 200, 'Minya': 300, 'Asyut': 350, 'Sohag': 450,
      'Qena': 500, 'Aswan': 650, 'Dubai': 1000, 'Riyadh': 600,
      'Istanbul': 500, 'Casablanca': 1800
    },
    Suez: {
      'Cairo': 130, 'Giza': 135, 'Alexandria': 250, 'PortSaid': 150,
      'Suez': 0, 'Dakahlia': 200, 'Sharqia': 80, 'Qalyubia': 120,
      'Beheira': 250, 'Minya': 280, 'Asyut': 330, 'Sohag': 430,
      'Qena': 480, 'Aswan': 630, 'Dubai': 800, 'Riyadh': 400,
      'Istanbul': 400, 'Casablanca': 1600
    }
  };

  const calculateShippingCost = () => {
    const selectedOption = shippingOptions.find(opt => opt.id === shippingMethod);
    if (!selectedOption) return;

    const distance = portDistances[fromPort as keyof typeof portDistances]?.[toDestination] || 300;
    const volume = (dimensions.length * dimensions.width * dimensions.height) / 1000000; // Convert to cubic meters
    const volumetricWeight = volume * 200; // 200 kg per cubic meter
    const chargeableWeight = Math.max(weight, volumetricWeight);

    let baseCost = chargeableWeight * distance * selectedOption.baseRate / 100;
    baseCost = Math.max(baseCost, selectedOption.minCost);

    // Apply multipliers
    if (urgent) baseCost *= 1.5;
    if (insurance) baseCost *= 1.2;

    const breakdown = {
      baseCost: baseCost / (urgent ? 1.5 : 1) / (insurance ? 1.2 : 1),
      urgentFee: urgent ? baseCost * 0.33 : 0,
      insuranceFee: insurance ? baseCost * 0.17 : 0,
      totalCost: baseCost,
      weight: chargeableWeight,
      distance,
      volume,
      estimatedDays: selectedOption.estimatedDays
    };

    setCalculatedCost(parseFloat(baseCost.toFixed(2)));
    setCostBreakdown(breakdown);
  };

  const getShippingMethodColor = (methodId: string) => {
    const method = shippingOptions.find(opt => opt.id === methodId);
    return method?.color || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <LazyMotionDiv
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="flex items-center justify-center gap-3 mb-4">
          <Truck className="h-12 w-12 text-amber-400" />
          <h1 className="typography-h1 md:text-5xl">
            <span className="text-gradient-orange">Nile Logistics Calculator</span>
          </h1>
        </div>
        <p className="text-xl text-gray-400 max-w-4xl mx-auto mb-6">
          Comprehensive shipping cost calculator for machinery across Egypt and international destinations
        </p>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-amber-400">4</div>
              <div className="text-sm text-gray-400">Shipping Methods</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-400">18+</div>
              <div className="text-sm text-gray-400">Destinations</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-400">24/7</div>
              <div className="text-sm text-gray-400">Tracking</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-amber-400">99%</div>
              <div className="text-sm text-gray-400">On-Time</div>
            </CardContent>
          </Card>
        </div>
      </LazyMotionDiv>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="calculator">Cost Calculator</TabsTrigger>
          <TabsTrigger value="methods">Shipping Methods</TabsTrigger>
          <TabsTrigger value="tracking">Tracking & Support</TabsTrigger>
        </TabsList>

        {/* Cost Calculator Tab */}
        <TabsContent value="calculator" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Calculator Form */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-6 w-6 text-amber-400" />
                  Shipping Cost Calculator
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Shipping Method Selection */}
                <div>
                  <label className="typography-label block text-sm font-medium mb-3">Shipping Method</label>
                  <div className="grid grid-cols-2 gap-3">
                    {shippingOptions.map((option) => (
                      <LazyMotionDiv
                        key={option.id}
                        whileHover={{ scale: 1.02 }}
                        className={`cursor-pointer ${getShippingMethodColor(option.id)} border-2 rounded-lg p-3 transition-all ${
                          shippingMethod === option.id ? 'border-opacity-100' : 'border-opacity-50'
                        }`}
                        onClick={() => setShippingMethod(option.id)}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          {option.icon}
                          <span className="font-medium text-sm">{option.name}</span>
                        </div>
                        <p className="text-xs opacity-80">{option.nameAr}</p>
                      </LazyMotionDiv>
                    ))}
                  </div>
                </div>

                {/* Origin and Destination */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="typography-label block text-sm font-medium mb-2">Origin Port</label>
                    <select
                      value={fromPort}
                      onChange={(e) => setFromPort(e.target.value)}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                    >
                      {ports.map((port) => (
                        <option key={port.id} value={port.id}>
                          {port.name} ({port.nameAr})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="typography-label block text-sm font-medium mb-2">Destination</label>
                    <select
                      value={toDestination}
                      onChange={(e) => setToDestination(e.target.value)}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                    >
                      {destinations.map((dest) => (
                        <option key={dest.id} value={dest.id}>
                          {dest.name} ({dest.nameAr})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Weight and Dimensions */}
                <div>
                  <label className="typography-label block text-sm font-medium mb-2">Weight (kg)</label>
                  <Input
                    type="number"
                    value={weight}
                    onChange={(e) => setWeight(Number(e.target.value))}
                    placeholder="Enter weight in kg"
                  />
                </div>

                <div>
                  <label className="typography-label block text-sm font-medium mb-3">Dimensions (cm)</label>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="typography-label block text-xs text-gray-400 mb-1">Length</label>
                      <Input
                        type="number"
                        value={dimensions.length}
                        onChange={(e) => setDimensions(prev => ({ ...prev, length: Number(e.target.value) }))}
                        placeholder="L"
                      />
                    </div>
                    <div>
                      <label className="typography-label block text-xs text-gray-400 mb-1">Width</label>
                      <Input
                        type="number"
                        value={dimensions.width}
                        onChange={(e) => setDimensions(prev => ({ ...prev, width: Number(e.target.value) }))}
                        placeholder="W"
                      />
                    </div>
                    <div>
                      <label className="typography-label block text-xs text-gray-400 mb-1">Height</label>
                      <Input
                        type="number"
                        value={dimensions.height}
                        onChange={(e) => setDimensions(prev => ({ ...prev, height: Number(e.target.value) }))}
                        placeholder="H"
                      />
                    </div>
                  </div>
                </div>

                {/* Additional Options */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="insurance"
                      checked={insurance}
                      onChange={(e) => setInsurance(e.target.checked)}
                      className="rounded border-gray-600 bg-gray-700 text-amber-500 focus:ring-amber-500"
                    />
                    <label htmlFor="insurance" className="typography-label text-sm">Insurance Coverage (+20%)</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="urgent"
                      checked={urgent}
                      onChange={(e) => setUrgent(e.target.checked)}
                      className="rounded border-gray-600 bg-gray-700 text-amber-500 focus:ring-amber-500"
                    />
                    <label htmlFor="urgent" className="typography-label text-sm">Urgent Delivery (+50%)</label>
                  </div>
                </div>

                <Button 
                  onClick={calculateShippingCost}
                  className="btn-primary"
                >
                  <Calculator className="h-4 w-4 mr-2" />
                  Calculate Shipping Cost
                </Button>
              </CardContent>
            </Card>

            {/* Results */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-6 w-6 text-amber-400" />
                  Shipping Quote
                </CardTitle>
              </CardHeader>
              <CardContent>
                {calculatedCost ? (
                  <div className="space-y-4">
                    <div className="btn-primary">
                      <h3 className="typography-h3 text-3xl text-amber-400 mb-2">
                        {calculatedCost.toLocaleString('en-US')} EGP
                      </h3>
                      <p className="text-gray-400">
                        {shippingOptions.find(opt => opt.id === shippingMethod)?.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        From {fromPort} to {toDestination}
                      </p>
                    </div>

                    {costBreakdown && (
                      <div className="space-y-3">
                        <h4 className="typography-h4">Cost Breakdown:</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Base Cost:</span>
                            <span>{costBreakdown.baseCost.toLocaleString('en-US')} EGP</span>
                          </div>
                          {costBreakdown.urgentFee > 0 && (
                            <div className="flex justify-between">
                              <span>Urgent Fee:</span>
                              <span>+{costBreakdown.urgentFee.toLocaleString('en-US')} EGP</span>
                            </div>
                          )}
                          {costBreakdown.insuranceFee > 0 && (
                            <div className="flex justify-between">
                              <span>Insurance:</span>
                              <span>+{costBreakdown.insuranceFee.toLocaleString('en-US')} EGP</span>
                            </div>
                          )}
                          <div className="border-t border-gray-600 pt-2 flex justify-between font-semibold">
                            <span>Total:</span>
                            <span>{costBreakdown.totalCost.toLocaleString('en-US')} EGP</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-400">Weight:</span>
                            <p className="font-medium">{costBreakdown.weight.toLocaleString('en-US')} kg</p>
                          </div>
                          <div>
                            <span className="text-gray-400">Distance:</span>
                            <p className="font-medium">{costBreakdown.distance} km</p>
                          </div>
                          <div>
                            <span className="text-gray-400">Volume:</span>
                            <p className="font-medium">{costBreakdown.volume.toFixed(2)} m³</p>
                          </div>
                          <div>
                            <span className="text-gray-400">Est. Delivery:</span>
                            <p className="font-medium">{costBreakdown.estimatedDays}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <Button className="btn-primary">
                        <Phone className="h-4 w-4 mr-2" />
                        Book Now
                      </Button>
                      <Button variant="outline" className="flex-1">
                        <Download className="h-4 w-4 mr-2" />
                        Download Quote
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Calculator className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">Enter your shipping details and click "Calculate" to get a quote</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Shipping Methods Tab */}
        <TabsContent value="methods" className="space-y-6">
          <div className="grid gap-6">
            {shippingOptions.map((option) => (
              <LazyMotionDiv
                key={option.id}
                whileHover={{ scale: 1.02 }}
                className="cursor-pointer"
              >
                <Card className={`${option.color} border-2 hover:border-opacity-60 transition-all`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {option.icon}
                        <div>
                          <CardTitle className="text-lg">{option.name}</CardTitle>
                          <p className="text-sm opacity-80">{option.nameAr}</p>
                          <p className="text-sm opacity-70 mt-1">{option.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="mb-2">
                          {option.estimatedDays}
                        </Badge>
                        <p className="text-sm opacity-80">
                          Max: {option.maxWeight.toLocaleString('en-US')} kg
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="typography-h4 text-sm mb-2">Features:</h4>
                        <ul className="space-y-1">
                          {option.features.map((feature, index) => (
                            <li key={index} className="flex items-center gap-2 text-sm">
                              <CheckCircle className="h-4 w-4 text-green-400" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Package className="h-4 w-4" />
                          <span>Base Rate: {option.baseRate} EGP/kg/km</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign className="h-4 w-4" />
                          <span>Min Cost: {option.minCost.toLocaleString('en-US')} EGP</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4" />
                          <span>Delivery: {option.estimatedDays}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </LazyMotionDiv>
            ))}
          </div>
        </TabsContent>

        {/* Tracking & Support Tab */}
        <TabsContent value="tracking" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Route className="h-6 w-6 text-amber-400" />
                  Track Your Shipment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="typography-label block text-sm font-medium mb-2">Tracking Number</label>
                  <Input placeholder="Enter your tracking number" />
                </div>
                <Button className="btn-primary">
                  <Route className="h-4 w-4 mr-2" />
                  Track Shipment
                </Button>
                
                <div className="space-y-3">
                  <h4 className="typography-h4">Recent Shipments:</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded">
                      <div>
                        <p className="text-sm font-medium">#NL2024001</p>
                        <p className="text-xs text-gray-400">Cairo → Alexandria</p>
                      </div>
                      <Badge variant="outline" className="text-green-400 border-green-400">
                        Delivered
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded">
                      <div>
                        <p className="text-sm font-medium">#NL2024002</p>
                        <p className="text-xs text-gray-400">Port Said → Suez</p>
                      </div>
                      <Badge variant="outline" className="text-blue-400 border-blue-400">
                        In Transit
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-6 w-6 text-amber-400" />
                  Customer Support
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-gray-700/50 rounded">
                    <Phone className="h-5 w-5 text-amber-400" />
                    <div>
                      <p className="font-medium">Phone Support</p>
                      <p className="text-sm text-gray-400">+20 2 2274 0000</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-700/50 rounded">
                    <Mail className="h-5 w-5 text-amber-400" />
                    <div>
                      <p className="font-medium">Email Support</p>
                      <p className="text-sm text-gray-400">logistics@almona.com</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-700/50 rounded">
                    <Globe className="h-5 w-5 text-amber-400" />
                    <div>
                      <p className="font-medium">Live Chat</p>
                      <p className="text-sm text-gray-400">Available 24/7</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="typography-h4">Support Hours:</h4>
                  <div className="text-sm space-y-1">
                    <p>Monday - Friday: 8:00 AM - 6:00 PM</p>
                    <p>Saturday: 9:00 AM - 4:00 PM</p>
                    <p>Sunday: Closed</p>
                    <p className="text-amber-400">Emergency: 24/7</p>
                  </div>
                </div>

                <Button variant="outline" className="w-full">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Start Live Chat
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-6 w-6 text-amber-400" />
                Shipping Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-gray-700/30 rounded">
                  <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2" />
                  <h4 className="typography-h4 mb-1">Insurance Coverage</h4>
                  <p className="text-sm text-gray-400">Full coverage up to 100,000 EGP</p>
                </div>
                <div className="text-center p-4 bg-gray-700/30 rounded">
                  <Route className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                  <h4 className="typography-h4 mb-1">Real-time Tracking</h4>
                  <p className="text-sm text-gray-400">GPS tracking and status updates</p>
                </div>
                <div className="text-center p-4 bg-gray-700/30 rounded">
                  <Shield className="h-8 w-8 text-amber-400 mx-auto mb-2" />
                  <h4 className="typography-h4 mb-1">Secure Handling</h4>
                  <p className="text-sm text-gray-400">Professional packaging and handling</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FreightCalculator;