
import MachineTwinDisplay from '@/components/fabricator/MachineTwinDisplay';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button-gold-tier';
import { CardContent, CardHeader, CardTitle, GoldTierCard } from '@/components/ui/card-gold-tier';
import { useYDT } from '@/context/YDT_Context';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs'; // Using shared UI tabs for consistency? Or standard? Checking imports.
import { Activity, CheckCircle2, FileText, HardHat, MessageSquare, Wrench } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DigitalSpareParts } from './DigitalSpareParts';
import { ServiceHistory } from './ServiceHistory';
import { MachineType, SmartMaintenanceTab } from './SmartMaintenanceTab';
import TicketWizardWithYDT from './TicketWizardWithYDT'; // Assuming relative import or fixed path

// Machine Model Mapping to Type (Mock Logic for now)
const guessMachineType = (model: string): MachineType => {
  const m = model.toLowerCase();
  if (m.includes('dk') || m.includes('cutting') || m.includes('double')) return 'cutting_double';
  if (m.includes('single') && m.includes('cutting')) return 'cutting_single';
  if (m.includes('welding') && m.includes('double')) return 'welding_double';
  if (m.includes('welding')) return 'welding_single';
  if (m.includes('router') || m.includes('copy')) return 'router';
  if (m.includes('crimp')) return 'crimping';
  return 'generic';
};

interface ProductLockerProps {
  machineId: string;
  machineModel?: string; // Optional, can be fetched
  serialNumber?: string;
}

export default function ProductLocker({ machineId, machineModel = 'Unknown Model', serialNumber }: ProductLockerProps) {
  const { getMachineKnowledge } = useYDT();
  const [activeTab, setActiveTab] = useState('overview');
  const [showSupportWizard, setShowSupportWizard] = useState(false);
  const [knowledge, setKnowledge] = useState<any>(null);

  // Derived Type
  const machineType = guessMachineType(machineModel);

  useEffect(() => {
    // Fetch enriched knowledge (manuals, parts) from YDT Brain
    getMachineKnowledge(machineModel).then(setKnowledge);
  }, [machineModel, getMachineKnowledge]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-white tracking-tight">{machineModel}</h1>
              <Badge variant="outline" className="border-amber-500 text-amber-500 bg-amber-500/10">Connected</Badge>
           </div>
           <p className="text-slate-400 font-mono text-sm mt-1">SN: {serialNumber || 'N/A'} • {machineType.replace('_', ' ').toUpperCase()}</p>
        </div>
        
        <div className="flex gap-3">
             <Button variant="outline" leftIcon={<FileText className="w-4 h-4" />}>
                View Contract
             </Button>
             <Button variant="primary" leftIcon={<MessageSquare className="w-4 h-4" />} onClick={() => setShowSupportWizard(true)}>
                Get Support
             </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-slate-900/80 border border-slate-800 p-1 w-full flex justify-start overflow-x-auto">
           <TabsTrigger value="overview" className="flex items-center gap-2 data-[state=active]:bg-amber-500 data-[state=active]:text-slate-900">
               <Activity className="w-4 h-4" /> Overview
           </TabsTrigger>
           <TabsTrigger value="maintenance" className="flex items-center gap-2 data-[state=active]:bg-amber-500 data-[state=active]:text-slate-900">
               <CheckCircle2 className="w-4 h-4" /> Smart Maintenance
           </TabsTrigger>
           <TabsTrigger value="parts" className="flex items-center gap-2 data-[state=active]:bg-amber-500 data-[state=active]:text-slate-900">
               <Wrench className="w-4 h-4" /> Parts & Manuals
           </TabsTrigger>
           <TabsTrigger value="history" className="flex items-center gap-2 data-[state=active]:bg-amber-500 data-[state=active]:text-slate-900">
               <HardHat className="w-4 h-4" /> History
           </TabsTrigger>
        </TabsList>

        {/* Content: Overview */}
        <TabsContent value="overview" className="mt-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Real-time Twin */}
                <div className="lg:col-span-2">
                    <MachineTwinDisplay machineId={machineId} />
                </div>

                {/* Quick Status / Upsell */}
                <div className="space-y-6">
                    <GoldTierCard variant="elevated" className="bg-gradient-to-br from-slate-900 to-slate-950 border-slate-800">
                        <CardHeader>
                            <CardTitle className="text-white">Health Score</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col items-center py-4">
                                <div className="relative w-32 h-32 flex items-center justify-center">
                                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                        <path className="text-slate-800" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                                        <path className="text-green-500" strokeDasharray="92, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                                    </svg>
                                    <span className="absolute text-3xl font-bold text-white">92%</span>
                                </div>
                                <p className="text-slate-400 text-sm mt-4 text-center">Your machine is running optimally. Next service due in 14 days.</p>
                            </div>
                        </CardContent>
                    </GoldTierCard>

                    <GoldTierCard className="bg-amber-500/10 border-amber-500/20">
                        <CardHeader>
                           <CardTitle className="text-amber-500 text-base">Warranty Status</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-slate-400 text-sm">Valid Until</span>
                                <span className="text-white font-medium">Dec 2026</span>
                            </div>
                            <div className="w-full bg-slate-800 rounded-full h-1.5 mb-4">
                                <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: '65%' }}></div>
                            </div>
                            <Button size="sm" variant="outline" className="w-full border-amber-500/50 text-amber-500 hover:bg-amber-500 hover:text-slate-900">
                                Extend Warranty
                            </Button>
                        </CardContent>
                    </GoldTierCard>
                </div>
            </div>
        </TabsContent>

        {/* Content: Maintenance */}
        <TabsContent value="maintenance" className="mt-6">
            <SmartMaintenanceTab machineType={machineType} modelName={machineModel} />
        </TabsContent>

        {/* Content: Parts */}
        <TabsContent value="parts" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-1 md:col-span-2">
                     <DigitalSpareParts modelName={machineModel} />
                </div>

                <div className="space-y-4">
                     <h3 className="text-lg font-bold text-white">Recommended Spares</h3>
                     {knowledge?.parts ? (
                         <div className="space-y-3">
                             {knowledge.parts.map((part: any) => (
                                 <GoldTierCard key={part.id} variant="outlined" className="bg-slate-900/50 border-slate-700 flex flex-row items-center p-3">
                                     <div className="bg-slate-800 w-12 h-12 rounded flex items-center justify-center mr-4">
                                        <Wrench className="w-6 h-6 text-amber-500" />
                                     </div>
                                     <div className="flex-1">
                                         <h4 className="text-white font-medium">{part.name}</h4>
                                         <p className="text-slate-500 text-xs">#{part.partNumber}</p>
                                     </div>
                                     <div className="text-right">
                                         <p className="text-white font-bold">{part.price} EGP</p>
                                         <Badge variant="outline" className={cn("text-[10px]", part.inStock ? "text-green-500 border-green-500/30" : "text-red-500 border-red-500/30")}>
                                            {part.inStock ? 'In Stock' : 'Order'}
                                         </Badge>
                                     </div>
                                 </GoldTierCard>
                             ))}
                         </div>
                     ) : (
                         <p className="text-slate-500 text-sm">Loading parts data...</p>
                     )}
                </div>
            </div>
        </TabsContent>
        
        {/* Content: History */}
        <TabsContent value="history" className="mt-6">
             <ServiceHistory />
        </TabsContent>

      </Tabs>

      {/* Support Wizard Modal */}
      <TicketWizardWithYDT 
         open={showSupportWizard} 
         onOpenChange={setShowSupportWizard} 
         initialValues={{ 
             machine_serial_number: serialNumber,
             machine_model: machineModel,
             type: 'technical'
         }}
      />
    </div>
  );
}
