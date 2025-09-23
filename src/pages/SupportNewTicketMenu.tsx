import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Wrench, AlertTriangle, GraduationCap, Settings, Clock, FilePlus2 } from 'lucide-react';
import { buildNavigationState } from '@/lib/ticketing/unifiedTicketing';
import { useAuth } from '@/context/AuthContext';

const SupportNewTicketMenu = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const create = (prefill: { source: 'services' | 'quote' | 'spare_parts' | 'training' | 'emergency' | 'maintenance' | 'machine'; type?: string; priority?: string; maintenanceType?: 'preventive' | 'corrective' | 'emergency' }) => {
    if (!user) {
      navigate('/login');
      return;
    }
    // Translate to TicketContext fields expected by buildNavigationState
    const ctx = {
      source: prefill.source,
      maintenanceType: prefill.maintenanceType,
      notes: undefined
    } as const;
    navigate('/portal/create-ticket', { state: buildNavigationState(ctx) });
  };

  const cards = [
    {
      icon: <Wrench className="h-6 w-6 text-amber-400" />,
      title: 'Technical Issue',
      desc: 'Errors, malfunctions, software bugs or hardware faults',
  action: () => create({ source: 'machine', type: 'technical', priority: 'medium' })
    },
    {
      icon: <AlertTriangle className="h-6 w-6 text-red-400" />,
      title: 'Emergency / Critical',
      desc: 'Production stopping failure requiring urgent response',
  action: () => create({ source: 'emergency', type: 'maintenance', maintenanceType: 'emergency', priority: 'urgent' })
    },
    {
      icon: <Clock className="h-6 w-6 text-orange-400" />,
      title: 'Maintenance Request',
      desc: 'Preventive, corrective or emergency maintenance work',
  action: () => create({ source: 'maintenance', type: 'maintenance', maintenanceType: 'corrective', priority: 'high' })
    },
    {
      icon: <Settings className="h-6 w-6 text-blue-400" />,
      title: 'Installation / Setup',
      desc: 'Help with new machine installation or configuration',
  action: () => create({ source: 'services', type: 'installation', priority: 'medium' })
    },
    {
      icon: <GraduationCap className="h-6 w-6 text-green-400" />,
      title: 'Training / Consulting',
      desc: 'Operator training, optimization & process consulting',
  action: () => create({ source: 'training', type: 'other', priority: 'low' })
    },
    {
      icon: <FilePlus2 className="h-6 w-6 text-purple-400" />,
      title: 'Other / General',
      desc: 'Anything else not covered by the categories above',
  action: () => create({ source: 'services', type: 'general', priority: 'medium' })
    }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-almona-dark text-white">
      <Navbar />
      <main className="flex-grow pt-24 pb-12">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.5 }}>
            <h1 className="text-3xl font-bold mb-2 text-gradient-orange">Create Support Ticket</h1>
            <p className="text-gray-400 mb-8 max-w-2xl">Choose the option that best matches your issue. We&apos;ll pre-fill ticket details to speed up submission.</p>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {cards.map((c, i) => (
                <motion.div key={c.title} initial={{ opacity:0, y:15 }} animate={{ opacity:1, y:0 }} transition={{ delay: 0.05 * i }}>
                  <Card className="bg-almona-dark/60 border-almona-light/20 hover:border-almona-orange/40 transition group h-full flex flex-col">
                    <CardHeader className="pb-3 flex flex-row items-start gap-3">
                      <div className="p-2 rounded-lg bg-almona-light/10 group-hover:bg-almona-orange/20 transition">{c.icon}</div>
                      <div>
                        <CardTitle className="text-lg group-hover:text-almona-orange transition-colors">{c.title}</CardTitle>
                        <CardDescription className="text-gray-400 mt-1">{c.desc}</CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent className="mt-auto pt-2">
                      <Button onClick={c.action} className="w-full bg-gradient-orange hover:bg-almona-orange-dark">Start</Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
            <div className="mt-10 text-sm text-gray-500">Need to go back? <button onClick={() => navigate(-1)} className="text-almona-orange hover:underline">Return</button></div>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SupportNewTicketMenu;
