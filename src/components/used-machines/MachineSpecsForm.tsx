import React, { useState } from 'react';
import { Button } from '@/shared/ui/ui/button';
import { Input } from '@/shared/ui/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';

const MachineSpecsForm = ({ onNext }) => {
  const [formData, setFormData] = useState({});

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSelectChange = (name, value) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleNextClick = () => {
    onNext(formData);
  };

  return (
    <div>
      <h3 className="text-xl font-semibold mb-4">Machine Specifications</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input name="title" placeholder="Machine Title" onChange={handleChange} />
        <Input name="price" placeholder="Price" onChange={handleChange} />
        <Select onValueChange={(value) => handleSelectChange('condition', value)}>
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