import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface MachineSpecsFormProps {
  onNext: (data: Record<string, string>) => void;
  onBack?: () => void;
}

const MachineSpecsForm: React.FC<MachineSpecsFormProps> = ({ onNext }) => {
  const [formData, setFormData] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleNextClick = () => {
    onNext(formData);
  };

  return (
    <div>
      <h3 className="typography-h3 mb-4">Machine Specifications</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input name="title" placeholder="Machine Title" onChange={handleChange} />
        <Input name="price" placeholder="Price" onChange={handleChange} />
        <Select value={formData.condition || ''} onValueChange={(value) => handleSelectChange('condition', value)}>
          <SelectTrigger><SelectValue placeholder="Condition" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="excellent">Excellent</SelectItem>
            <SelectItem value="good">Good</SelectItem>
            <SelectItem value="fair">Fair</SelectItem>
          </SelectContent>
        </Select>
        <Input name="year" placeholder="Year of Manufacture" onChange={handleChange} />
        <Input name="hours" placeholder="Operating Hours" onChange={handleChange} />
        <Input name="location" placeholder="Location" onChange={handleChange} />
      </div>
      <div className="flex justify-end mt-8">
        <Button onClick={handleNextClick}>Next</Button>
      </div>
    </div>
  );
};

export default MachineSpecsForm;