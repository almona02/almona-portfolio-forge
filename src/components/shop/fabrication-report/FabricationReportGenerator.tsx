import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { generateFabricationReport, compareMachines } from '@/lib/reports/generateReport';
import { saveAs } from 'file-saver';


ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

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
    saveAs(blob, `fabrication-report-${new Date().toISOString().slice(0,10)}.pdf`);

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

  const chartData = {
    labels: ['Profile', 'Locks', 'Handles', 'Espanglites', 'Rails'],
    datasets: [
      {
        label: 'Cost Breakdown (EGP)',
        data: [
          customPrices.profile,
          customPrices.accessories.locks,
          customPrices.accessories.handles,
          customPrices.accessories.espanglites,
          customPrices.accessories.rails
        ],
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1
      }
    ]
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Fabrication Report Generator</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div>
          <Label htmlFor="material-type">Material Type</Label>
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
          <Label htmlFor="profile-price">Profile Price (EGP)</Label>
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
          <Label htmlFor="locks">Locks (EGP)</Label>
          <Input
            type="number"
            id="locks"
            name="locks"
            value={customPrices.accessories.locks}
            onChange={handlePriceChange}
          />
        </div>
        <div>
          <Label htmlFor="handles">Handles (EGP)</Label>
          <Input
            type="number"
            id="handles"
            name="handles"
            value={customPrices.accessories.handles}
            onChange={handlePriceChange}
          />
        </div>
        <div>
          <Label htmlFor="espanglites">Espanglites (EGP)</Label>
          <Input
            type="number"
            id="espanglites"
            name="espanglites"
            value={customPrices.accessories.espanglites}
            onChange={handlePriceChange}
          />
        </div>
        <div>
          <Label htmlFor="rails">Rails (EGP)</Label>
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
        <Bar 
          data={chartData}
          options={{
            responsive: true,
            plugins: {
              title: {
                display: true,
                text: 'Material Cost Breakdown'
              }
            }
          }}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div>
          <Label htmlFor="machine-model">Machine Model</Label>
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
          <Label htmlFor="profile-length">Profile Length (meters)</Label>
          <Input
            type="number"
            id="profile-length"
            value={profileLength}
            onChange={(e) => setProfileLength(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="flex items-center space-x-2 mb-6">
        <Label htmlFor="language">Language</Label>
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
          <h2 className="text-xl font-bold mb-4">Machine Comparison</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-100 rounded-lg">
              <h3 className="font-semibold">YILMAZ KM-212</h3>
              <p>Power: {comparisonData.yilmaz.power} kW</p>
              <p>Price: EGP {comparisonData.yilmaz.price.toLocaleString()}</p>
              <p>Cutting Time: {comparisonData.yilmaz.cuttingTime.toFixed(2)} hours</p>
            </div>
            <div className="p-4 bg-gray-100 rounded-lg">
              <h3 className="font-semibold">Chinese Model</h3>
              <p>Power: {comparisonData.chinese[0].power} kW</p>
              <p>Price: EGP {comparisonData.chinese[0].price.toLocaleString()}</p>
              <p>Cutting Time: {comparisonData.chinese[0].cuttingTime.toFixed(2)} hours</p>
            </div>
            <div className="p-4 bg-gray-100 rounded-lg">
              <h3 className="font-semibold">Comparison</h3>
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
