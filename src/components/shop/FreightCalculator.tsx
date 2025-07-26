import React, { useState } from 'react';
import { MachineSpec } from '@/types/shop';

interface FreightCalculatorProps {
  machine: MachineSpec;
}

const FreightCalculator: React.FC<FreightCalculatorProps> = ({ machine }) => {
  const [fromPort, setFromPort] = useState<'Alexandria' | 'PortSaid' | 'Suez'>('Alexandria');
  const [toGovernorate, setToGovernorate] = useState('Cairo');
  const [cost, setCost] = useState<number | null>(null);
  
  const governorates = [
    'القاهرة', 'الجيزة', 'الإسكندرية', 'بورسعيد', 
    'السويس', 'المنصورة', 'المنيا', 'أسيوط', 'سوهاج', 'قنا', 'أسوان'
  ];
  
  const portDistances = {
    Alexandria: {
      'القاهرة': 220, 'الجيزة': 225, 'الإسكندرية': 0, 'بورسعيد': 240,
      'السويس': 250, 'المنصورة': 180, 'المنيا': 350, 'أسيوط': 400,
      'سوهاج': 500, 'قنا': 550, 'أسوان': 700
    },
    PortSaid: {
      'القاهرة': 180, 'الجيزة': 185, 'الإسكندرية': 240, 'بورسعيد': 0,
      'السويس': 150, 'المنصورة': 120, 'المنيا': 300, 'أسيوط': 350,
      'سوهاج': 450, 'قنا': 500, 'أسوان': 650
    },
    Suez: {
      'القاهرة': 130, 'الجيزة': 135, 'الإسكندرية': 250, 'بورسعيد': 150,
      'السويس': 0, 'المنصورة': 200, 'المنيا': 280, 'أسيوط': 330,
      'سوهاج': 430, 'قنا': 480, 'أسوان': 630
    }
  };

  const calculateFreight = () => {
    const weight = machine.specs.weight ? Number(machine.specs.weight) : 1000;
    const distance = portDistances[fromPort][toGovernorate] || 300;
    const baseRate = 0.5;
    const calculatedCost = weight * distance * baseRate / 100;
    setCost(parseFloat(calculatedCost.toFixed(2)));
  };

  return (
    <div className="border border-egyptian-gold p-4 rounded-lg">
      <h3 className="font-bold text-lg mb-3">حاسبة شحن نهر النيل</h3>
      
      <div className="mb-4">
        <label className="block mb-1">ميناء الشحن</label>
        <select
          value={fromPort}
          onChange={(e) => setFromPort(e.target.value as any)}
          className="w-full border p-2 rounded"
        >
          <option value="Alexandria">الإسكندرية</option>
          <option value="PortSaid">بورسعيد</option>
          <option value="Suez">السويس</option>
        </select>
      </div>

      <div className="mb-4">
        <label className="block mb-1">المحافظة الوجهة</label>
        <select
          value={toGovernorate}
          onChange={(e) => setToGovernorate(e.target.value)}
          className="w-full border p-2 rounded"
        >
          {governorates.map((gov) => (
            <option key={gov} value={gov}>
              {gov}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label className="block mb-1">وزن الماكينة</label>
        <div className="flex items-center">
          <input 
            type="number" 
            value={machine.specs.weight || 1000}
            readOnly
            className="border p-2 rounded flex-1"
          />
          <span className="ml-2">كجم</span>
        </div>
      </div>

      <button 
        onClick={calculateFreight}
        className="w-full bg-[#ce1126] text-white py-2 rounded hover:bg-[#a00d1e] transition-colors"
      >
        احسب تكلفة الشحن
      </button>

      {cost !== null && (
        <div className="mt-4 p-4 bg-gray-100 rounded border border-gray-300">
          <h3 className="font-bold text-lg">التكلفة المتوقعة:</h3>
          <p className="text-2xl font-semibold text-[#ce1126]">
            {cost.toLocaleString('ar-EG')} جنيه مصري
          </p>
          <p className="text-sm text-gray-500 mt-1">
            من {fromPort} إلى {toGovernorate}
          </p>
        </div>
      )}
    </div>
  );
};

export default FreightCalculator;