import { reportMarketplaceEvent } from '@/lib/marketplace/monitoring';
import { clearSellerDraft, emptySellerDraft, readSellerDraft, saveSellerDraft, type SellerDraft } from '@/lib/marketplace/sellerDraft';
import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  const [initial] = useState(readSellerDraft);
  const [restored, setRestored] = useState(initial.restored);
  const [draft, setDraft] = useState(initial.draft);
  const [rememberContact, setRememberContact] = useState(initial.rememberContact);
  const [draftSaved, setDraftSaved] = useState(true);
  const submittingRef = useRef(false);
  const { title, category, price, currency, location, condition, year, hours, description, contactName, contactPhone, contactWhatsapp } = draft;
  const setField = (key: keyof SellerDraft) => (value: string) => setDraft(previous => ({ ...previous, [key]: value }));
  const setTitle = setField('title'), setCategory = setField('category'), setPrice = setField('price');
  const setCurrency = setField('currency'), setLocation = setField('location'), setCondition = setField('condition');
  const setYear = setField('year'), setHours = setField('hours'), setDescription = setField('description');
  const setContactName = setField('contactName'), setContactPhone = setField('contactPhone'), setContactWhatsapp = setField('contactWhatsapp');
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { setDraftSaved(saveSellerDraft(draft, rememberContact)); }, [draft, rememberContact]);
  const previewUrls = useMemo(() => files.map(file => URL.createObjectURL(file)), [files]);
  useEffect(() => () => previewUrls.forEach(url => URL.revokeObjectURL(url)), [previewUrls]);
  useEffect(() => {
    // Photos cannot be restored from localStorage; warn before losing selected files.
    if (!files.length && !submitting) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [files.length, submitting]);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    const images = selected.filter((f) => f.type.startsWith('image/'));
    setFiles((prev) => [...prev, ...images].slice(0, 8));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    if (!title || !category || !price || !location || !condition || !description || !contactName || !contactPhone) {
      toast.error(copy('Please fill the required fields.'));
      return;
    }
    if (!files.length) {
      toast.error(copy('Please add at least one photo.'));
      return;
    }
    submittingRef.current = true;
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
      reportMarketplaceEvent('submission_success');
      toast.success(copy('Your machine is live on the marketplace!'));
      clearSellerDraft(); setRestored(false);
      setDraft({ ...emptySellerDraft });
      setFiles([]);
      onSuccess?.();
    } catch (err) {
      reportMarketplaceEvent('submission_failure', 'request');
      toast.error(err instanceof Error ? err.message : copy('Could not publish. Please try again.'));
    } finally {
      submittingRef.current = false;
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

      <div className="text-sm text-gray-300 space-y-2" role="status">
        <p>{copy(draftSaved ? (restored ? 'Your saved machine details have been restored. Please add the photos again.' : 'Machine details are saved on this device for 7 days. Photos must be added again after reopening.') : 'Draft saving is unavailable on this browser. Keep this page open until publishing finishes.')}</p>
        <label htmlFor="seller-remember-contact" className="flex gap-2 items-center">
          <input id="seller-remember-contact" type="checkbox" checked={rememberContact} onChange={event => setRememberContact(event.target.checked)} />
          {copy('Also remember my contact details on this device for 7 days')}
        </label>
        <Button type="button" variant="outline" disabled={submitting} onClick={() => { clearSellerDraft(); setRestored(false); setDraft({ ...emptySellerDraft }); setRememberContact(false); setFiles([]); }}>{copy('Discard saved draft')}</Button>
      </div>
      <fieldset disabled={submitting} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Label htmlFor="seller-title" className="text-gray-300">{copy('Machine title *')}</Label>
          <Input id="seller-title" className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={copy('Cutting Machine')} maxLength={160} />
        </div>

        <div>
          <Label htmlFor="seller-category" className="text-gray-300">{copy('Category *')}</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger id="seller-category" className={inputCls}><SelectValue placeholder={copy('Select category')} /></SelectTrigger>
            <SelectContent className="bg-almona-darker text-white">
              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{copy(c)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="seller-condition" className="text-gray-300">{copy('Condition *')}</Label>
          <Select value={condition} onValueChange={setCondition}>
            <SelectTrigger id="seller-condition" className={inputCls}><SelectValue placeholder={copy('Select condition')} /></SelectTrigger>
            <SelectContent className="bg-almona-darker text-white">
              {CONDITIONS.map((c) => <SelectItem key={c} value={c}>{copy(c)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="seller-price" className="text-gray-300">{copy('Price *')}</Label>
            <Input id="seller-price" className={inputCls} type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="180000" />
          </div>
          <div className="w-28">
            <Label htmlFor="seller-currency" className="text-gray-300">{copy('Currency')}</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger id="seller-currency" className={inputCls}><SelectValue /></SelectTrigger>
              <SelectContent className="bg-almona-darker text-white">
                {['EGP', 'USD', 'EUR', 'SAR', 'AED', 'TRY'].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="seller-location" className="text-gray-300">{copy('Location *')}</Label>
          <Select value={location} onValueChange={setLocation}>
            <SelectTrigger id="seller-location" className={inputCls}><SelectValue placeholder={copy('Select governorate')} /></SelectTrigger>
            <SelectContent className="bg-almona-darker text-white">
              {GOVERNORATES.map((g) => <SelectItem key={g} value={g}>{copy(g)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="seller-year" className="text-gray-300">{copy('Year')}</Label>
          <Input id="seller-year" className={inputCls} type="number" min={1970} max={2035} value={year} onChange={(e) => setYear(e.target.value)} placeholder="2020" />
        </div>

        <div>
          <Label htmlFor="seller-hours" className="text-gray-300">{copy('Operating hours (optional)')}</Label>
          <Input id="seller-hours" className={inputCls} type="number" min={0} value={hours} onChange={(e) => setHours(e.target.value)} placeholder="3200" />
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="seller-description" className="text-gray-300">{copy('Description *')}</Label>
          <Textarea id="seller-description" className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={copy('Good')} rows={4} maxLength={2000} />
        </div>

        <div className="md:col-span-2">
          <Label className="text-gray-300">{copy('Photos * (1–8)')}</Label>
          <p className="text-xs text-gray-500 mb-2">{copy('The first photo is the main cover photo.')}</p>
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
              {files.map((_, i) => (
                <div key={i} className="relative">
                  <img src={previewUrls[i]} alt="" className="w-20 h-20 object-cover rounded border border-almona-light/40" />
                  <button type="button" onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))} className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-5 h-5 text-xs leading-none flex items-center justify-center">×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <Label htmlFor="seller-contactName" className="text-gray-300">{copy('Your name *')}</Label>
          <Input id="seller-contactName" className={inputCls} value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder={copy('Your name *')} maxLength={120} />
        </div>

        <div>
          <Label htmlFor="seller-contactPhone" className="text-gray-300">{copy('Phone *')}</Label>
          <Input id="seller-contactPhone" className={inputCls} value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+20 1xx xxx xxxx" maxLength={30} />
        </div>

        <div>
          <Label htmlFor="seller-contactWhatsapp" className="text-gray-300">{copy('WhatsApp (optional)')}</Label>
          <Input id="seller-contactWhatsapp" className={inputCls} value={contactWhatsapp} onChange={(e) => setContactWhatsapp(e.target.value)} placeholder={copy('Same as phone if blank')} maxLength={30} />
        </div>
      </fieldset>

      <Button type="submit" disabled={submitting} className="w-full bg-amber-500 hover:bg-amber-600 text-white h-12 text-base">
        {submitting ? <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> {copy('Publishing…')}</> : copy('Publish listing — free')}
      </Button>
    </form>
  );
};

export default SellUsedMachineForm;
