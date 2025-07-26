import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { AlertTriangle, Check, HardHat, Loader2, Search, Wrench } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

type MachineInfo = {
  model: string;
  serial: string;
  installationDate: string;
  lastService: string;
  warranty: string;
  manualUrl: string;
};

type TroubleshootingStep = {
  id: string;
  title: string;
  description: string;
  solution?: string;
};

type Part = {
  id: string;
  name: string;
  partNumber: string;
  compatibleModels: string[];
  price: number;
  inStock: boolean;
};

export const SupportPortal = () => {
  const [machineInfo, setMachineInfo] = useState<MachineInfo | null>(null);
  const [serialValidating, setSerialValidating] = useState(false);
  const [serialValid, setSerialValid] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState('troubleshooting');
  const [selectedStep, setSelectedStep] = useState<string | null>(null);
  const [parts, setParts] = useState<Part[]>([]);
  const [cart, setCart] = useState<Part[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'card'>('cod');

  const handleCheckout = () => {
    if (paymentMethod === 'cod') {
      alert('You have selected Cash on Delivery. Our representative will contact you soon.');
      // Implement COD order processing logic here
    } else {
      alert('Redirecting to card payment gateway...');
      // Implement card payment processing logic here
    }
  };

  // Mock machine data
  const mockMachineInfo: MachineInfo = {
    model: 'DK-502',
    serial: 'DK502-2023-0567',
    installationDate: '2023-05-15',
    lastService: '2024-01-20',
    warranty: '2025-05-15',
    manualUrl: '/documents/specs/DK-502.pdf'
  };

  // Mock troubleshooting guide
  const troubleshootingSteps: TroubleshootingStep[] = [
    {
      id: '1',
      title: 'Machine not powering on',
      description: 'The machine does not respond when power button is pressed',
      solution: 'Check power supply connections and circuit breaker. Ensure emergency stop is not engaged.'
    },
    {
      id: '2', 
      title: 'Abnormal noises during operation',
      description: 'Unusual grinding or knocking sounds coming from machine',
      solution: 'Inspect for loose components. Check lubrication levels. Contact technician if noise persists.'
    },
    {
      id: '3',
      title: 'Error code E-05 displayed',
      description: 'Control panel shows error code E-05',
      solution: 'This indicates a motor overload. Allow machine to cool down for 30 minutes before restarting.'
    }
  ];

  // Mock parts data
  const mockParts: Part[] = [
    {
      id: 'p1',
      name: 'Cutting Blade Assembly',
      partNumber: 'CB-DK502',
      compatibleModels: ['DK-502', 'DK-501'],
      price: 2450,
      inStock: true
    },
    {
      id: 'p2',
      name: 'Control Board',
      partNumber: 'CTRL-DK5',
      compatibleModels: ['DK-502', 'DK-501', 'DK-400'],
      price: 3800,
      inStock: true
    },
    {
      id: 'p3',
      name: 'Hydraulic Pump',
      partNumber: 'HP-502',
      compatibleModels: ['DK-502'],
      price: 5200,
      inStock: false
    }
  ];

  const validateSerial = async (serial: string) => {
    setSerialValidating(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      const isValid = serial.length >= 8;
      setSerialValid(isValid);
      if (isValid) {
        setMachineInfo(mockMachineInfo);
        setParts(mockParts);
      } else {
        setMachineInfo(null);
        setParts([]);
      }
    } catch (error) {
      console.error('Validation error:', error);
      setSerialValid(null);
    } finally {
      setSerialValidating(false);
    }
  };

  const handleSerialChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const serial = e.target.value;
    if (serial.length >= 8) {
      validateSerial(serial);
    } else {
      setSerialValid(null);
      setMachineInfo(null);
      setParts([]);
    }
  };

  const addToCart = (part: Part) => {
    setCart([...cart, part]);
  };

  const removeFromCart = (partId: string) => {
    setCart(cart.filter(item => item.id !== partId));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="machineSerial">Enter Machine Serial Number</Label>
        <div className="relative">
          <Input
            id="machineSerial"
            placeholder="DK502-2023-XXXX"
            onChange={handleSerialChange}
            className="pr-10"
          />
          {serialValidating && (
            <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin" />
          )}
          {serialValid === true && (
            <Check className="absolute right-3 top-3 h-4 w-4 text-green-500" />
          )}
          {serialValid === false && (
            <AlertTriangle className="absolute right-3 top-3 h-4 w-4 text-red-500" />
          )}
        </div>
      </div>

      {machineInfo && (
        <div className="bg-almona-darker/50 p-4 rounded-lg border border-almona-light/10">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-bold">{machineInfo.model}</h3>
              <div className="text-sm space-y-1 mt-2">
                <div>Serial: {machineInfo.serial}</div>
                <div>Warranty until: {machineInfo.warranty}</div>
                <div>Last service: {machineInfo.lastService}</div>
              </div>
            </div>
            <Button variant="outline" size="sm" asChild>
              <a href={machineInfo.manualUrl} target="_blank" rel="noopener noreferrer">
                <HardHat className="mr-2 h-4 w-4" />
                View Manual
              </a>
            </Button>
          </div>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-almona-darker">
          <TabsTrigger value="troubleshooting">Troubleshooting</TabsTrigger>
          <TabsTrigger value="ar">AR Guides</TabsTrigger>
          <TabsTrigger value="parts">Spare Parts</TabsTrigger>
        </TabsList>

        <TabsContent value="troubleshooting" className="mt-6">
          {machineInfo ? (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Troubleshooting Guide for {machineInfo.model}</h3>
              
              <div className="space-y-2">
                {troubleshootingSteps.map(step => (
                  <div 
                    key={step.id} 
                    className={`p-4 rounded-lg border ${selectedStep === step.id ? 'border-almona-orange bg-almona-darker/30' : 'border-almona-light/10'}`}
                    onClick={() => setSelectedStep(step.id === selectedStep ? null : step.id)}
                  >
                    <div className="flex items-center justify-between cursor-pointer">
                      <div className="font-medium">{step.title}</div>
                      <Wrench className="h-4 w-4 text-almona-orange" />
                    </div>
                    {selectedStep === step.id && (
                      <div className="mt-3 pt-3 border-t border-almona-light/10">
                        <p className="text-sm text-gray-400 mb-2">{step.description}</p>
                        <div className="bg-almona-darker/50 p-3 rounded">
                          <p className="font-medium text-almona-orange">Solution:</p>
                          <p className="text-sm">{step.solution}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-4">
                <Button variant="outline" className="w-full">
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Request Technician Support
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Search className="mx-auto h-8 w-8 mb-4" />
              <p>Enter your machine serial number to access troubleshooting guides</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="ar" className="mt-6">
          <div className="text-center py-12">
            <div className="bg-almona-darker/50 h-64 rounded-lg flex items-center justify-center mb-4">
              <p className="text-gray-500">AR Viewer Placeholder</p>
            </div>
            <p className="text-gray-500">
              Point your camera at your machine to access interactive AR guides
            </p>
            <Button className="mt-4">
              Launch AR Assistant
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="parts" className="mt-6">
          {machineInfo ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {parts.map(part => (
                  <div key={part.id} className="border border-almona-light/10 rounded-lg p-4">
                    <div className="font-medium">{part.name}</div>
                    <div className="text-sm text-gray-400 mb-2">Part #: {part.partNumber}</div>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold">{part.price} EGP</span>
                        <Badge variant={part.inStock ? 'default' : 'destructive'} className="ml-2">
                          {part.inStock ? 'In Stock' : 'Backorder'}
                        </Badge>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => addToCart(part)}
                        disabled={cart.some(item => item.id === part.id)}
                      >
                        {cart.some(item => item.id === part.id) ? 'Added' : 'Add to Cart'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {cart.length > 0 && (
                <div className="border-t border-almona-light/10 pt-4">
                  <h4 className="font-medium mb-3">Your Cart ({cart.length})</h4>
                  <div className="space-y-3">
                    {cart.map(item => (
                      <div key={item.id} className="flex justify-between items-center">
                        <div>
                          <span className="font-medium">{item.name}</span>
                          <span className="text-sm text-gray-400 ml-2">{item.partNumber}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{item.price} EGP</span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => removeFromCart(item.id)}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center mt-4 pt-4 border-t border-almona-light/10">
                    <div className="font-bold">Total:</div>
                    <div className="font-bold">
                      {cart.reduce((sum, item) => sum + item.price, 0)} EGP
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <label className="inline-flex items-center space-x-2">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="cod"
                        checked={paymentMethod === 'cod'}
                        onChange={() => setPaymentMethod('cod')}
                        className="form-radio"
                      />
                      <span>Cash on Delivery</span>
                    </label>
                    <label className="inline-flex items-center space-x-2">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="card"
                        checked={paymentMethod === 'card'}
                        onChange={() => setPaymentMethod('card')}
                        className="form-radio"
                      />
                      <span>Credit/Debit Card</span>
                    </label>
                  </div>
                  <Button className="w-full mt-4" onClick={handleCheckout}>
                    Proceed to Checkout
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Search className="mx-auto h-8 w-8 mb-4" />
              <p>Enter your machine serial number to view compatible spare parts</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
