import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/shared/ui/ui/input';
import { Textarea } from '@/shared/ui/ui/textarea';
import { Label } from '@/shared/ui/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import { Loader2, Upload, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { UsedMachineService } from '@/lib/usedMachines/UsedMachineService';
import { usePublicCopy } from '@/hooks/usePublicCopy';

const CATEGORIES = ['Cutting Machine', 'Copy Router', 'CNC Machining Center', 'Welding Machine', 'Corner Cleaning', 'End Milling', 'Punch Press', 'Saw', 'Other'];
const CONDITIONS = ['New', 'Like New', 'Excellent', 'Good', 'Fair', 'Needs Repair'];
const GOVERNORATES = ['Cairo', 'Giza', 'Alexandria', 'Dakahlia', 'Sharqia', 'Qalyubia', 'Beheira', 'Minya', 'Gharbia', 'Sohag', 'Asyut', 'Monufia', 'Qena', 'Faiyum', 'Kafr El Sheikh', 'Beni Suef', 'Port Said'];

const SellUsedMachineForm: React.FC<{ onSuccess?: () => void }> = ({ onSuccess }) => {
  const copy = usePublicCopy();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('EGP');
  const [location, setLocation] = useState('');
  const [condition, setCondition] = useState('');
  const [year, setYear] = useState('');
  const [hours, setHours] = useState('');
  const [description, setDescription] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactWhatsapp, setContactWhatsapp] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    const images = selected.filter((f) => f.type.startsWith('image/'));
    setFiles((prev) => [...prev, ...images].slice(0, 8));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !category || !price || !location || !condition || !description || !contactName || !contactPhone) {
      toast.error(copy('Please fill the required fields.'));
      return;
    }
    if (!files.length) {
      toast.error(copy('Please add at least one photo.'));
      return;
    }
    setSubmitting(true);
    try {
      await UsedMachineService.createListing({
        title,
        price: Number(price),
        currency,
        location,
        condition: condition.toLowerCase().replace(/\s+/g, '-'),
        category,
        year: year ? Number(year) : null,
        hours: hours ? Number(hours) : null,
        description,
        contactName,
        contactPhone,
        contactWhatsapp: contactWhatsapp || undefined,
        files,
      });
      toast.success(copy('Your machine is live on the marketplace!'));
      setTitle(''); setCategory(''); setPrice(''); setLocation(''); setCondition('');
      setYear(''); setHours(''); setDescription(''); setContactName('');
      setContactPhone(''); setContactWhatsapp(''); setFiles([]);
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : copy('Could not publish. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = 'bg-almona-dark border-almona-light text-white';

  return (
    <form onSubmit={handleSubmit} className="bg-almona-darker rounded-xl p-6 space-y-6 text-left">
      <div className="text-center mb-2">
        <h2 className="typography-h2">{copy('Post your machine — free, in 2 minutes')}</h2>
        <p className="text-gray-400 text-sm mt-1">{copy('No account needed. Buyers will contact you directly by phone or WhatsApp.')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Label className="text-gray-300">{copy('Machine title *')}</Label>
          <Input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={copy('Cutting Machine')} maxLength={160} />
        </div>

        <div>
          <Label className="text-gray-300">{copy('Category *')}</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className={inputCls}><SelectValue placeholder={copy('Select category')} /></SelectTrigger>
            <SelectContent className="bg-almona-darker text-white">
              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{copy(c)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-gray-300">{copy('Condition *')}</Label>
          <Select value={condition} onValueChange={setCondition}>
            <SelectTrigger className={inputCls}><SelectValue placeholder={copy('Select condition')} /></SelectTrigger>
            <SelectContent className="bg-almona-darker text-white">
              {CONDITIONS.map((c) => <SelectItem key={c} value={c}>{copy(c)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <Label className="text-gray-300">{copy('Price *')}</Label>
            <Input className={inputCls} type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="180000" />
          </div>
          <div className="w-28">
            <Label className="text-gray-300">{copy('Currency')}</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
              <SelectContent className="bg-almona-darker text-white">
                {['EGP', 'USD', 'EUR', 'SAR', 'AED', 'TRY'].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label className="text-gray-300">{copy('Location *')}</Label>
          <Select value={location} onValueChange={setLocation}>
            <SelectTrigger className={inputCls}><SelectValue placeholder={copy('Select governorate')} /></SelectTrigger>
            <SelectContent className="bg-almona-darker text-white">
              {GOVERNORATES.map((g) => <SelectItem key={g} value={g}>{copy(g)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-gray-300">{copy('Year')}</Label>
          <Input className={inputCls} type="number" min={1970} max={2035} value={year} onChange={(e) => setYear(e.target.value)} placeholder="2020" />
        </div>

        <div>
          <Label className="text-gray-300">{copy('Operating hours (optional)')}</Label>
          <Input className={inputCls} type="number" min={0} value={hours} onChange={(e) => setHours(e.target.value)} placeholder="3200" />
        </div>

        <div className="md:col-span-2">
          <Label className="text-gray-300">{copy('Description *')}</Label>
          <Textarea className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={copy('Good')} rows={4} maxLength={2000} />
        </div>

        <div className="md:col-span-2">
          <Label className="text-gray-300">{copy('Photos * (1–8)')}</Label>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-almona-light/40 rounded-lg p-5 cursor-pointer hover:border-amber-500/60">
              <Camera className="h-7 w-7 text-amber-400" />
              <span className="text-sm text-gray-300 text-center">{copy('Take photo')}</span>
              <input type="file" accept="image/*" capture="environment" onChange={handleFiles} className="hidden" />
            </label>
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-almona-light/40 rounded-lg p-5 cursor-pointer hover:border-amber-500/60">
              <Upload className="h-7 w-7 text-amber-400" />
              <span className="text-sm text-gray-300 text-center">{copy('Upload from gallery')}</span>
              <input type="file" multiple accept="image/*" onChange={handleFiles} className="hidden" />
            </label>
          </div>
          {files.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {files.map((f, i) => (
                <div key={i} className="relative">
                  <img src={URL.createObjectURL(f)} alt="" className="w-20 h-20 object-cover rounded border border-almona-light/40" />
                  <button type="button" onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))} className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-5 h-5 text-xs leading-none flex items-center justify-center">×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <Label className="text-gray-300">{copy('Your name *')}</Label>
          <Input className={inputCls} value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder={copy('Your name *')} maxLength={120} />
        </div>

        <div>
          <Label className="text-gray-300">{copy('Phone *')}</Label>
          <Input className={inputCls} value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+20 1xx xxx xxxx" maxLength={30} />
        </div>

        <div>
          <Label className="text-gray-300">{copy('WhatsApp (optional)')}</Label>
          <Input className={inputCls} value={contactWhatsapp} onChange={(e) => setContactWhatsapp(e.target.value)} placeholder={copy('Same as phone if blank')} maxLength={30} />
        </div>
      </div>

      <Button type="submit" disabled={submitting} className="w-full bg-amber-500 hover:bg-amber-600 text-white h-12 text-base">
        {submitting ? <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> {copy('Publishing…')}</> : copy('Publish listing — free')}
      </Button>
    </form>
  );
};

export default SellUsedMachineForm;
