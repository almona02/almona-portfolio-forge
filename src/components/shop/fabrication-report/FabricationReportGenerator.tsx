import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { compareMachines, generateFabricationReport } from '@/lib/reports/generateReport';
import { useCallback, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
// Lazy import file-saver to avoid adding to initial bundle
let saveAsFn: ((data: Blob | File, filename?: string, opts?: unknown) => void) | null = null;

export default function FabricationReportGenerator() {
  const [materialType, setMaterialType] = useState<'aluminum' | 'upvc'>('aluminum');
  const [machineModel, setMachineModel] = useState('KM-212');
  const [profileLength, setProfileLength] = useState(1);
  // Prioritize Arabic language support by default for Egypt users
  const [isArabic, setIsArabic] = useState(true);
  const [customPrices, setCustomPrices] = useState({
    profile: 0,
    accessories: {
      locks: 0,
      handles: 0,
      espanglites: 0,
      rails: 0
    }
  });
  interface MachineComparison {
    model: string;
    power: number;
    price: number;
    cuttingTime: number;
  }

  interface ComparisonResult {
    yilmaz: MachineComparison;
    chinese: MachineComparison[];
    powerDifference: number;
    priceDifference: number;
    timeDifference: number;
  }

  const [comparisonData, setComparisonData] = useState<ComparisonResult | null>(null);



  const handleGenerateReport = useCallback(async () => {
    const report = await generateFabricationReport({
      materialType,
      profileLength,
      profilePrice: customPrices.profile,
      accessories: customPrices.accessories,
      machineModel,
      isArabic
    });

    // Save PDF
    const blob = new Blob([report.pdfBytes], { type: 'application/pdf' });
    if (!saveAsFn) {
      const mod = await import('file-saver');
      saveAsFn = mod.saveAs;
    }
    saveAsFn!(blob, `fabrication-report-${new Date().toISOString().slice(0,10)}.pdf`);

    // Set comparison data
    setComparisonData(compareMachines(report.comparisons));
  }, [materialType, machineModel, profileLength, customPrices, isArabic]);

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {

    const { name, value } = e.target;
    if (name in customPrices.accessories) {
      setCustomPrices(prev => ({
        ...prev,
        accessories: {
          ...prev.accessories,
          [name]: Number(value)
        }
      }));
    } else {
      setCustomPrices(prev => ({
        ...prev,
        [name]: Number(value)
      }));
    }
  };

  const chartData = useMemo(
    () => [
      { name: 'Profile', value: customPrices.profile },
      { name: 'Locks', value: customPrices.accessories.locks },
      { name: 'Handles', value: customPrices.accessories.handles },
      { name: 'Espanglites', value: customPrices.accessories.espanglites },
      { name: 'Rails', value: customPrices.accessories.rails },
    ],
    [customPrices]
  );

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="typography-h1 text-2xl mb-6">Fabrication Report Generator</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div>
          <Label htmlFor="material-type" className="typography-label">Material Type</Label>
          <Select value={materialType} onValueChange={(val: 'aluminum' | 'upvc') => setMaterialType(val)}>
            <SelectTrigger>
              <SelectValue placeholder="Select material" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="aluminum">Aluminum</SelectItem>
              <SelectItem value="upvc">UPVC</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="profile-price" className="typography-label">Profile Price (EGP)</Label>
          <Input
            type="number"
            id="profile-price"
            name="profile"
            value={customPrices.profile}
            onChange={handlePriceChange}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div>
          <Label htmlFor="locks" className="typography-label">Locks (EGP)</Label>
          <Input
            type="number"
            id="locks"
            name="locks"
            value={customPrices.accessories.locks}
            onChange={handlePriceChange}
          />
        </div>
        <div>
          <Label htmlFor="handles" className="typography-label">Handles (EGP)</Label>
          <Input
            type="number"
            id="handles"
            name="handles"
            value={customPrices.accessories.handles}
            onChange={handlePriceChange}
          />
        </div>
        <div>
          <Label htmlFor="espanglites" className="typography-label">Espanglites (EGP)</Label>
          <Input
            type="number"
            id="espanglites"
            name="espanglites"
            value={customPrices.accessories.espanglites}
            onChange={handlePriceChange}
          />
        </div>
        <div>
          <Label htmlFor="rails" className="typography-label">Rails (EGP)</Label>
          <Input
            type="number"
            id="rails"
            name="rails"
            value={customPrices.accessories.rails}
            onChange={handlePriceChange}
          />
        </div>
      </div>

      <div className="h-96 mb-8">
        <h3 className="text-lg font-semibold mb-4">Material Cost Breakdown</h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(156, 163, 175, 0.1)" />
            <XAxis dataKey="name" tick={{ fill: '#9ca3af' }} stroke="#9ca3af" />
            <YAxis tick={{ fill: '#9ca3af' }} stroke="#9ca3af" tickFormatter={(v) => `EGP ${v}`} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '0.5rem',
              }}
              formatter={(value: number) => [`EGP ${value.toLocaleString()}`, 'Cost']}
            />
            <Bar
              dataKey="value"
              name="Cost Breakdown (EGP)"
              fill="rgba(54, 162, 235, 0.6)"
              stroke="rgba(54, 162, 235, 1)"
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div>
          <Label htmlFor="machine-model" className="typography-label">Machine Model</Label>
          <Select value={machineModel} onValueChange={setMachineModel}>
            <SelectTrigger>
              <SelectValue placeholder="Select machine" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="KM-212">YILMAZ KM-212</SelectItem>
              <SelectItem value="Chinese-1">Chinese Model 1</SelectItem>
              <SelectItem value="Chinese-2">Chinese Model 2</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="profile-length" className="typography-label">Profile Length (meters)</Label>
          <Input
            type="number"
            id="profile-length"
            value={profileLength}
            onChange={(e) => setProfileLength(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="flex items-center space-x-2 mb-6">
        <Label htmlFor="language" className="typography-label">Language</Label>
        <Select value={isArabic ? 'ar' : 'en'} onValueChange={(val) => setIsArabic(val === 'ar')}>
          <SelectTrigger className="w-[100px]">
            <SelectValue placeholder="Language" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="ar">العربية</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button 
        className="w-full md:w-auto mb-8"
        onClick={handleGenerateReport}
      >
        Generate PDF Report
      </Button>

      {comparisonData && (
        <div className="mt-8 p-4 border rounded-lg">
          <h2 className="typography-h2 text-xl mb-4">Machine Comparison</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-100 rounded-lg">
              <h3 className="typography-h3">YILMAZ KM-212</h3>
              <p>Power: {comparisonData.yilmaz.power} kW</p>
              <p>Price: EGP {comparisonData.yilmaz.price.toLocaleString()}</p>
              <p>Cutting Time: {comparisonData.yilmaz.cuttingTime.toFixed(2)} hours</p>
            </div>
            <div className="p-4 bg-gray-100 rounded-lg">
              <h3 className="typography-h3">Chinese Model</h3>
              <p>Power: {comparisonData.chinese[0].power} kW</p>
              <p>Price: EGP {comparisonData.chinese[0].price.toLocaleString()}</p>
              <p>Cutting Time: {comparisonData.chinese[0].cuttingTime.toFixed(2)} hours</p>
            </div>
            <div className="p-4 bg-gray-100 rounded-lg">
              <h3 className="typography-h3">Comparison</h3>
              <p>Power Difference: +{comparisonData.powerDifference} kW</p>
              <p>Price Difference: +EGP {comparisonData.priceDifference.toLocaleString()}</p>
              <p>Time Saved: {comparisonData.timeDifference.toFixed(2)} hours</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
