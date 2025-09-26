import { useAuth } from '@/context/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import TicketForm from '@/components/support/TicketForm';
import { motion } from 'framer-motion';
import { TicketContext } from '@/lib/ticketing/unifiedTicketing';

type PrefillShape = Partial<{
  title: string; description: string; type: string; priority: string; machine_id: string; maintenance_type: string; scheduled_date: string;
}>;
interface LocationStateShape { prefill?: PrefillShape; context?: TicketContext; machineId?: string }

const CreateTicketPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const ls = location.state as LocationStateShape | null;
  const priorityVals = ['low','medium','high','urgent','critical'] as const;
  const maintenanceVals = ['preventive','corrective','emergency'] as const;
  const normalizedPrefill = ls?.prefill ? {
    ...ls.prefill,
    priority: priorityVals.includes(ls.prefill.priority as typeof priorityVals[number]) ? ls.prefill.priority as typeof priorityVals[number] : undefined,
    maintenance_type: maintenanceVals.includes(ls.prefill.maintenance_type as typeof maintenanceVals[number]) ? ls.prefill.maintenance_type as typeof maintenanceVals[number] : undefined,
  } : undefined;

  const handleSuccess = () => {
    navigate('/portal', { state: { message: "Ticket created successfully! We'll get back to you soon." } });
  };

  if (!user) {
    return (
      <>
        <main className="flex-grow pt-24 pb-12">
          <div className="container mx-auto px-4">
            <Card className="max-w-2xl mx-auto bg-almona-dark/60 border-almona-light/20">
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 text-almona-orange mx-auto mb-4" />
                  <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
                  <p className="text-gray-400 mb-4">Please log in to create a support ticket</p>
                  <Link to="/login" className="text-almona-orange hover:underline">Go to Login</Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
    </>
  );
  }

  return (
    <>
      <main className="flex-grow pt-24 pb-12">
        <div className="container mx-auto px-4">
          <div className="mb-6">
            <Link to="/portal" className="inline-flex items-center text-almona-orange hover:text-almona-orange-dark mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Portal
            </Link>
          </div>
          <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.5 }}>
            <Card className="max-w-4xl mx-auto bg-almona-dark/60 border-almona-light/20">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl bg-gradient-orange bg-clip-text text-transparent">Create Support Ticket</CardTitle>
                <CardDescription className="text-gray-400">Describe your issue and we'll help you resolve it quickly</CardDescription>
              </CardHeader>
              <CardContent>
                <TicketForm mode="page" showAttachments showContactFields initialValues={normalizedPrefill} onSuccess={handleSuccess} />
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    </>
  );
};

export default CreateTicketPage;