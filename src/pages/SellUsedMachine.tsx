import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/shared/ui/ui/textarea';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { withErrorBoundary } from '@/hocs/withErrorBoundary';

const sellMachineSchema = z.object({
  name: z.string().min(2, 'Machine name must be at least 2 characters'),
  model: z.string().min(2, 'Model name must be at least 2 characters'),
  year: z.number().min(1980, 'Year must be after 1980'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  price: z.number().min(0, 'Price must be a positive number'),
});

type SellMachineFormValues = z.infer<typeof sellMachineSchema>;

const SellUsedMachine = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<SellMachineFormValues>({
    resolver: zodResolver(sellMachineSchema),
  });

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-almona-dark text-white">
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-almona-orange mx-auto mb-4"></div>
            <p className="text-xl">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const onSubmit = async (data: SellMachineFormValues) => {
    try {
      await api.registerMachine({ 
        name: data.name,
        model: data.model,
        serial_number: `USED-${Date.now()}`,
        owner_id: user.id
      });
      toast.success('Your machine has been listed for sale!');
      navigate('/usedmachines');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to list your machine.';
      toast.error(errorMessage);
    }
  };

  return (
    <>
      <main className="flex-grow pt-24 pb-12">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold mb-4 text-gradient-orange">
              Sell Your Used Machine
            </h1>
            <p className="text-gray-400 max-w-2xl mx-auto">
              List your used industrial machinery on our marketplace and connect with potential buyers across the region.
            </p>
          </div>

          <div className="max-w-2xl mx-auto">
            <Card className="bg-almona-dark/60 border-almona-light/20 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-almona-orange">Machine Details</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Machine Name</label>
                    <Input 
                      {...register('name')} 
                      placeholder="e.g., YILMAZ DC 421 PBS"
                      className="bg-almona-dark/80 border-almona-light/30 focus:ring-2 focus:ring-almona-light focus:border-almona-light"
                    />
                    {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name.message}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Model</label>
                    <Input 
                      {...register('model')} 
                      placeholder="Model number or name"
                      className="bg-almona-dark/80 border-almona-light/30 focus:ring-2 focus:ring-almona-light focus:border-almona-light"
                    />
                    {errors.model && <p className="text-red-400 text-sm mt-1">{errors.model.message}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Year of Manufacture</label>
                    <Input 
                      {...register('year', { valueAsNumber: true })} 
                      type="number" 
                      placeholder="e.g., 2020"
                      className="bg-almona-dark/80 border-almona-light/30 focus:ring-2 focus:ring-almona-light focus:border-almona-light"
                    />
                    {errors.year && <p className="text-red-400 text-sm mt-1">{errors.year.message}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Description</label>
                    <Textarea 
                      {...register('description')} 
                      placeholder="Detailed description of the machine's condition, features, usage history, and any included accessories..."
                      rows={4}
                      className="bg-almona-dark/80 border-almona-light/30 focus:ring-2 focus:ring-almona-light focus:border-almona-light"
                    />
                    {errors.description && <p className="text-red-400 text-sm mt-1">{errors.description.message}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Price (EGP)</label>
                    <Input 
                      {...register('price', { valueAsNumber: true })} 
                      type="number" 
                      placeholder="e.g., 150000"
                      className="bg-almona-dark/80 border-almona-light/30 focus:ring-2 focus:ring-almona-light focus:border-almona-light"
                    />
                    {errors.price && <p className="text-red-400 text-sm mt-1">{errors.price.message}</p>}
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-4 pt-4">
                    <Button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="bg-gradient-orange hover:bg-almona-orange-dark text-white flex-1"
                    >
                      {isSubmitting ? 'Listing Machine...' : 'List My Machine'}
                    </Button>
                    <Button 
                      type="button" 
                      onClick={() => navigate('/usedmachines')}
                      className="bg-almona-light/20 hover:bg-almona-light/30 text-white border border-almona-light/30"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <div className="mt-8 text-center">
              <p className="text-gray-400 mb-4">
                Need help with pricing or have questions about selling?
              </p>
              <Button asChild className="bg-almona-light/20 hover:bg-almona-light/30 text-white border border-almona-light/30">
                <Link to="/contact">Contact Our Team</Link>
              </Button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

export default withErrorBoundary(SellUsedMachine);
