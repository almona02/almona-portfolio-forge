import React from 'react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';

const EgyptPowerFilter: React.FC<{ onChange: (value: string) => void; value: string }> = ({ onChange, value }) => (
  <Select onValueChange={onChange} value={value}>
    <SelectTrigger className="w-[180px]">
      <SelectValue placeholder="تصفية حسب الطاقة" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">الكل</SelectItem>
      <SelectItem value="220v">220V (مصر)</SelectItem>
      <SelectItem value="380v">380V (مصر)</SelectItem>
      <SelectItem value="400v">400V (صناعي)</SelectItem>
    </SelectContent>
  </Select>
);

export default EgyptPowerFilter;
