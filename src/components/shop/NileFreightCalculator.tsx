import React, { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const NileFreightCalculator = () => {
  const [fromPort, setFromPort] = useState<'Alexandria' | 'PortSaid' | 'Suez'>('Alexandria');
  const [toGovernorate, setToGovernorate] = useState('Cairo');

  const governorates = [
    'القاهرة',
    'الجيزة',
    'الإسكندرية',
    'بورسعيد',
    'السويس',
    'المنصورة',
  ];

  return (
    <div className="border border-egyptian-gold p-4 rounded-lg">
      <h3 className="font-bold text-lg mb-3">حاسبة شحن نهر النيل</h3>
      <Select onValueChange={(value) => setFromPort(value as 'Alexandria' | 'PortSaid' | 'Suez')} value={fromPort}>
        <SelectTrigger>
          <SelectValue placeholder="ميناء الشحن" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Alexandria">الإسكندرية</SelectItem>
          <SelectItem value="PortSaid">بورسعيد</SelectItem>
          <SelectItem value="Suez">السويس</SelectItem>
        </SelectContent>
      </Select>

      <div style={{ marginTop: '1rem' }}>
        <Select onValueChange={setToGovernorate} value={toGovernorate}>
          <SelectTrigger>
            <SelectValue placeholder="المحافظة الوجهة" />
          </SelectTrigger>
          <SelectContent>
            {governorates.map((gov) => (
              <SelectItem key={gov} value={gov}>
                {gov}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* TODO: Add calculation logic and display results */}
    </div>
  );
};

export default NileFreightCalculator;
