import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/shared/ui/ui/textarea';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useNavigate } from 'react-router-dom';

const sellMachineSchema = z.object({
  name: z.string().min(2, 'Machine name must be at least 2 characters'),
  model: z.string().min(2, 'Model name must be at least 2 characters'),
  year: z.number().min(1980, 'Year must be after 1980'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  price: z.number().min(0, 'Price must be a positive number'),
});

type SellMachineFormValues = z.infer<typeof sellMachineSchema>;

const SellUsedMachine = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<SellMachineFormValues>({
    resolver: zodResolver(sellMachineSchema),
  });

  const onSubmit = async (data: SellMachineFormValues) => {
    if (!user) {
      toast.error('You must be logged in to sell a machine.');
      return;
    }

    try {
      await api.registerMachine({ ...data, customer_id: user.id, is_used: true });
      toast.success('Your machine has been listed for sale!');
      navigate('/usedmachines');
    } catch (err: any) {
      toast.error(err.message || 'Failed to list your machine.');
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Sell Your Used Machine</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Input {...register('name')} placeholder="Machine Name (e.g., YILMAZ DC 421 PBS)" />
          {errors.name && <p className="text-red-500">{errors.name.message}</p>}
        </div>
        <div>
          <Input {...register('model')} placeholder="Model" />
          {errors.model && <p className="text-red-500">{errors.model.message}</p>}
        </div>
        <div>
          <Input {...register('year', { valueAsNumber: true })} type="number" placeholder="Year of Manufacture" />
          {errors.year && <p className="text-red-500">{errors.year.message}</p>}
        </div>
        <div>
          <Textarea {...register('description')} placeholder="Detailed description of the machine's condition, features, and history." />
          {errors.description && <p className="text-red-500">{errors.description.message}</p>}
        </div>
        <div>
          <Input {...register('price', { valueAsNumber: true })} type="number" placeholder="Price (EGP)" />
          {errors.price && <p className="text-red-500">{errors.price.message}</p>}
        </div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Listing...' : 'List My Machine'}
        </Button>
      </form>
    </div>
  );
};

export default SellUsedMachine;
