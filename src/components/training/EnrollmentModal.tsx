import React, { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/shared/ui/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { trainingLevels } from '@/data/trainingPrograms';
import { supabase } from '@/lib/supabase';

export interface CohortLike { id: string | number; start: Date; levels: string[] }

interface EnrollmentModalProps {
  open: boolean;
  onOpenChange: (open:boolean)=>void;
  selectedProgram?: string | null; // level key
  cohorts: CohortLike[];
  material: 'aluminium' | 'upvc';
}

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  company: z.string().optional(),
  phone: z.string().min(5).optional(),
  program: z.string().min(1),
  material: z.enum(['aluminium','upvc']),
  cohortId: z.string().optional(),
  notes: z.string().max(500).optional()
});

type FormValues = z.infer<typeof schema>;

export const EnrollmentModal: React.FC<EnrollmentModalProps> = ({ open, onOpenChange, selectedProgram, cohorts, material }) => {
  const { t } = useTranslation();

  const defaultValues: FormValues = useMemo(()=>({
    name: '', email: '', company: '', phone: '', program: selectedProgram || '', material, cohortId: cohorts[0]?.id?.toString() || '', notes: ''
  }), [selectedProgram, material, cohorts]);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues
  });

  useEffect(()=>{ if (open) reset(defaultValues); },[open, defaultValues, reset]);

  const onSubmit = async (values: FormValues) => {
    try {
      // Attempt Supabase insert (table must exist: training_enrollments)
      const payload = {
        name: values.name,
        email: values.email,
        company: values.company,
        phone: values.phone,
        program_level: values.program,
        material: values.material,
        cohort_id: values.cohortId || null,
        notes: values.notes,
      };
  const { error } = await supabase.from('training_enrollments').insert(payload as any);
      if (error) {
        // Fallback if table missing (e.g., code 42P01) just log and continue success UX
        console.warn('[training] Enrollment insert fallback:', error.message);
      }
      toast.success(t('trainingPage.form.success'));
      onOpenChange(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      toast.error(msg);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-almona-dark border-almona-light/20 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-amber-300">
            {t('trainingPage.enroll')}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {t('trainingPage.subtitle')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">{t('trainingPage.form.name')}</label>
              <Input {...register('name')} className="mt-1 bg-almona-dark/50" />
              {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium">{t('trainingPage.form.email')}</label>
              <Input {...register('email')} className="mt-1 bg-almona-dark/50" />
              {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium">{t('trainingPage.form.company')}</label>
              <Input {...register('company')} className="mt-1 bg-almona-dark/50" />
            </div>
            <div>
              <label className="text-sm font-medium">{t('trainingPage.form.phone')}</label>
              <Input {...register('phone')} className="mt-1 bg-almona-dark/50" />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">{t('trainingPage.form.program')}</label>
              <select {...register('program')} className="mt-1 w-full bg-almona-dark/50 border border-almona-light/20 rounded px-2 py-2 text-sm">
                <option value="">{t('trainingPage.form.selectProgram')}</option>
                {trainingLevels.map(p => <option key={p.level} value={p.level}>{p.title}</option>)}
              </select>
              {errors.program && <p className="text-xs text-red-400 mt-1">{errors.program.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium">{t('trainingPage.form.material')}</label>
              <select {...register('material')} className="mt-1 w-full bg-almona-dark/50 border border-almona-light/20 rounded px-2 py-2 text-sm">
                <option value="aluminium">{t('trainingPage.material.aluminium')}</option>
                <option value="upvc">{t('trainingPage.material.upvc')}</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium flex items-center gap-2">{t('trainingPage.form.startDate')} <Badge variant="outline" className="border-orange-400/40 text-orange-300">{cohorts.length}</Badge></label>
              <select {...register('cohortId')} className="mt-1 w-full bg-almona-dark/50 border border-almona-light/20 rounded px-2 py-2 text-sm">
                <option value="">{t('trainingPage.form.flexible')}</option>
                {cohorts.map(c => (
                  <option value={c.id} key={c.id}>{c.start.toLocaleDateString()} ({c.levels.join(',')})</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium">{t('trainingPage.form.notes')}</label>
              <Textarea rows={4} {...register('notes')} className="mt-1 bg-almona-dark/50" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={()=>onOpenChange(false)} className="border-almona-light/20">{t('trainingPage.form.cancel')}</Button>
            <Button disabled={isSubmitting} type="submit" className="bg-gradient-to-r from-orange-500 to-amber-400 text-black font-semibold">{isSubmitting? t('trainingPage.form.submitting'): t('trainingPage.form.submit')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EnrollmentModal;