import React from 'react';
import { Input } from '../../shared/ui/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../shared/ui/ui/select';

interface UsedMachineFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  locationFilter: string;
  onLocationChange: (value: string) => void;
  machineTypeFilter: string;
  onMachineTypeChange: (value: string) => void;
}

const machineTypes = [
  { value: 'all', label: 'جميع الأنواع' },
  { value: 'copy-router', label: 'ماكينات نسخ' },
  { value: 'cutting', label: 'ماكينات قطع' },
  { value: 'cnc', label: 'مراكز CNC' },
  { value: 'welding', label: 'ماكينات لحام' },
  { value: 'corner-cleaning', label: 'تنظيف الزوايا' },
];

const governorates = [
  'all', 'Cairo', 'Giza', 'Alexandria', 'Dakahlia', 'Sharqia', 'Qalyubia',
  'Beheira', 'Minya', 'Gharbia', 'Sohag', 'Asyut', 'Monufia',
  'Qena', 'Faiyum', 'Kafr El Sheikh', 'Beni Suef', 'Port Said'
];

const UsedMachineFilters: React.FC<UsedMachineFiltersProps> = ({
  searchQuery,
  onSearchChange,
  locationFilter,
  onLocationChange,
  machineTypeFilter,
  onMachineTypeChange,
}) => {
  return (
    <div className="mb-8 bg-almona-darker p-6 rounded-lg text-right">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2">
          <Input
            placeholder="ابحث عن ماكينة (نسخ، قطع، CNC...)"
            className="bg-almona-dark border-almona-light text-right"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <div>
          <Select onValueChange={onLocationChange} value={locationFilter}>
            <SelectTrigger className="bg-almona-dark border-almona-light text-right">
              <SelectValue placeholder="جميع المحافظات" />
            </SelectTrigger>
            <SelectContent className="bg-almona-darker text-white">
              {governorates.map((gov) => (
                <SelectItem key={gov} value={gov}>{gov === 'all' ? 'جميع المحافظات' : gov}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Select onValueChange={onMachineTypeChange} value={machineTypeFilter}>
            <SelectTrigger className="bg-almona-dark border-almona-light text-right">
              <SelectValue placeholder="جميع الأنواع" />
            </SelectTrigger>
            <SelectContent className="bg-almona-darker text-white">
              {machineTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export default UsedMachineFilters;
