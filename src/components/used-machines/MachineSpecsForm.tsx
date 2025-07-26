import React, { useState } from 'react';
import { Button } from '../../shared/ui/ui/button';
import { Input } from '../../shared/ui/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../shared/ui/ui/select';

const machineTypes = [
  { value: 'all', label: 'اختر نوع الماكينة' },
  { value: 'cutting', label: 'ماكينات قطع' },
  { value: 'copy-routing', label: 'ماكينات نسخ' },
  { value: 'cnc', label: 'مراكز CNC' },
  { value: 'welding', label: 'ماكينات لحام' },
  { value: 'corner-cleaning', label: 'تنظيف الزوايا' },
];

const conditions = [
  { value: 'all', label: 'اختر حالة الماكينة' },
  { value: 'excellent', label: 'ممتازة' },
  { value: 'good', label: 'جيدة' },
  { value: 'fair', label: 'متوسطة' },
  { value: 'poor', label: 'سيئة' },
];

const governorates = [
  'Cairo', 'Giza', 'Alexandria', 'Dakahlia', 'Sharqia', 'Qalyubia',
  'Beheira', 'Minya', 'Gharbia', 'Sohag', 'Asyut', 'Monufia',
  'Qena', 'Faiyum', 'Kafr El Sheikh', 'Beni Suef', 'Port Said'
];

const MachineSpecsForm = ({ onNext }: { onNext: () => void }) => {
  const [machineType, setMachineType] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [condition, setCondition] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!machineType) newErrors.machineType = 'يرجى اختيار نوع الماكينة';
    if (!brand) newErrors.brand = 'يرجى إدخال العلامة التجارية';
    if (!model) newErrors.model = 'يرجى إدخال الموديل';
    if (!year || isNaN(Number(year)) || Number(year) < 1900 || Number(year) > new Date().getFullYear()) {
      newErrors.year = 'يرجى إدخال سنة صحيحة';
    }
    if (!condition) newErrors.condition = 'يرجى اختيار حالة الماكينة';
    if (!price || isNaN(Number(price)) || Number(price) <= 0) {
      newErrors.price = 'يرجى إدخال سعر صحيح';
    }
    if (!description) newErrors.description = 'يرجى إدخال وصف الماكينة';
    if (!location) newErrors.location = 'يرجى اختيار المحافظة';
    if (!phone) newErrors.phone = 'يرجى إدخال رقم الهاتف';
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'يرجى إدخال بريد إلكتروني صحيح';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onNext();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-right">
      <div>
        <label className="block mb-1 font-semibold">نوع الماكينة</label>
        <Select value={machineType} onValueChange={setMachineType}>
          <SelectTrigger>
            <SelectValue placeholder="اختر نوع الماكينة" />
          </SelectTrigger>
          <SelectContent>
            {machineTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.machineType && <p className="text-red-500 text-sm mt-1">{errors.machineType}</p>}
      </div>

      <div>
        <label className="block mb-1 font-semibold">العلامة التجارية</label>
        <Input value={brand} onChange={(e) => setBrand(e.target.value)} />
        {errors.brand && <p className="text-red-500 text-sm mt-1">{errors.brand}</p>}
      </div>

      <div>
        <label className="block mb-1 font-semibold">الموديل</label>
        <Input value={model} onChange={(e) => setModel(e.target.value)} />
        {errors.model && <p className="text-red-500 text-sm mt-1">{errors.model}</p>}
      </div>

      <div>
        <label className="block mb-1 font-semibold">سنة الصنع</label>
        <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} />
        {errors.year && <p className="text-red-500 text-sm mt-1">{errors.year}</p>}
      </div>

      <div>
        <label className="block mb-1 font-semibold">حالة الماكينة</label>
        <Select value={condition} onValueChange={setCondition}>
          <SelectTrigger>
            <SelectValue placeholder="اختر حالة الماكينة" />
          </SelectTrigger>
          <SelectContent>
            {conditions.map((cond) => (
              <SelectItem key={cond.value} value={cond.value}>{cond.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.condition && <p className="text-red-500 text-sm mt-1">{errors.condition}</p>}
      </div>

      <div>
        <label className="block mb-1 font-semibold">السعر (جنيه مصري)</label>
        <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
        {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price}</p>}
      </div>

      <div>
        <label className="block mb-1 font-semibold">الوصف</label>
        <textarea
          className="w-full p-2 rounded border border-gray-300 text-black"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
        />
        {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
      </div>

      <div>
        <label className="block mb-1 font-semibold">المحافظة</label>
        <Select value={location} onValueChange={setLocation}>
          <SelectTrigger>
            <SelectValue placeholder="اختر المحافظة" />
          </SelectTrigger>
          <SelectContent>
            {governorates.map((gov) => (
              <SelectItem key={gov} value={gov}>{gov}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.location && <p className="text-red-500 text-sm mt-1">{errors.location}</p>}
      </div>

      <div>
        <label className="block mb-1 font-semibold">رقم الهاتف</label>
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
      </div>

      <div>
        <label className="block mb-1 font-semibold">البريد الإلكتروني</label>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
      </div>

      <div className="flex justify-end">
        <Button type="submit">التالي</Button>
      </div>
    </form>
  );
};

export default MachineSpecsForm;
