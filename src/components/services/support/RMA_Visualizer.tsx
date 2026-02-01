
import { Badge } from '@/components/ui/badge';
import { CardContent, GoldTierCard } from '@/components/ui/card-gold-tier';
import { cn } from '@/lib/utils';
import { Box, Check, CheckCircle2, Microscope, Truck, Wrench } from 'lucide-react';
import React from 'react';

type RMAStage = 'received' | 'diagnosis' | 'repair' | 'qa' | 'shipping' | 'delivered';

interface RMAEvent {
  stage: RMAStage;
  timestamp?: string;
  notes?: string;
  status: 'pending' | 'active' | 'completed';
}

interface RMAVisualizerProps {
  rmaId: string;
  currentStage: RMAStage;
  estimatedCompletion: string;
  events: RMAEvent[];
}

const STAGE_CONFIG: Record<RMAStage, { label: string; icon: React.ElementType; description: string }> = {
  received: { label: 'Received', icon: Box, description: 'Unit received at service center' },
  diagnosis: { label: 'Bench Test', icon: Microscope, description: 'Technician analyzing fault' },
  repair: { label: 'Repair', icon: Wrench, description: 'Fixing issues & replacing parts' },
  qa: { label: 'QA & Calibration', icon: CheckCircle2, description: 'Final stress test & calibration' },
  shipping: { label: 'Return Ship', icon: Truck, description: 'Out for delivery to customer' },
  delivered: { label: 'Delivered', icon: Check, description: 'RMA Case Closed' }
};

const STAGES: RMAStage[] = ['received', 'diagnosis', 'repair', 'qa', 'shipping', 'delivered'];

export function RMAVisualizer({ rmaId, currentStage, estimatedCompletion, events }: RMAVisualizerProps) {
  const currentStageIndex = STAGES.indexOf(currentStage);

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
         <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
               RMA Tracker <Badge variant="outline" className="border-amber-500 text-amber-500">#{rmaId}</Badge>
            </h3>
            <p className="text-slate-400 text-sm">Estimated Completion: <span className="text-slate-200 font-medium">{estimatedCompletion}</span></p>
         </div>
      </div>

      {/* The Pizza Tracker */}
      <div className="relative pt-8 pb-12 px-4">
          
          {/* Progress Bar Background */}
          <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-800 -translate-y-1/2 rounded-full overflow-hidden">
             {/* Active Progress */}
             <div 
                className="h-full bg-amber-500 transition-all duration-1000 ease-in-out" 
                style={{ width: `${(currentStageIndex / (STAGES.length - 1)) * 100}%` }}
             />
          </div>

          <div className="relative flex justify-between w-full">
              {STAGES.map((stage, index) => {
                  const config = STAGE_CONFIG[stage];
                  const isActive = index === currentStageIndex;
                  const isCompleted = index < currentStageIndex;
                  const event = events.find(e => e.stage === stage);

                  return (
                      <div key={stage} className="flex flex-col items-center group relative">
                          {/* Node */}
                          <div className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center border-4 z-10 transition-all duration-500",
                              isActive ? "bg-slate-900 border-amber-500 scale-125 shadow-[0_0_15px_rgba(245,158,11,0.5)]" :
                              isCompleted ? "bg-amber-500 border-amber-500 text-slate-900" :
                              "bg-slate-900 border-slate-700 text-slate-600"
                          )}>
                              <config.icon className={cn("w-4 h-4", isActive && "text-amber-500", isCompleted && "text-white fill-slate-900")} />
                          </div>

                          {/* Label */}
                          <div className={cn(
                              "absolute top-14 text-center w-32 transition-all",
                              isActive ? "opacity-100 transform translate-y-0" : "opacity-70"
                          )}>
                              <p className={cn("text-xs font-bold uppercase tracking-wider mb-1", isActive ? "text-amber-500" : isCompleted ? "text-slate-300" : "text-slate-600")}>
                                  {config.label}
                              </p>
                              {event?.timestamp && (
                                  <p className="text-[10px] text-slate-500 font-mono">{event.timestamp}</p>
                              )}
                          </div>
                      </div>
                  );
              })}
          </div>
      </div>

      {/* Current Stage Detail Card */}
      <GoldTierCard className="bg-gradient-to-br from-slate-900 via-slate-900/50 to-slate-950 border-amber-500/20">
          <CardContent className="p-6">
              <div className="flex items-start gap-4">
                 <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20 animate-pulse">
                     <Microscope className="w-8 h-8 text-amber-500" />
                 </div>
                 <div>
                     <h4 className="text-white font-bold text-lg">Current Status: {STAGE_CONFIG[currentStage].label}</h4>
                     <p className="text-slate-400 text-sm mt-1">{STAGE_CONFIG[currentStage].description}</p>
                     
                     <div className="mt-4 p-3 bg-slate-900 rounded border border-slate-800 text-sm font-mono text-green-400">
                        &gt; {events.find(e => e.stage === currentStage)?.notes || "Processing..."} <span className="animate-blink">_</span>
                     </div>
                 </div>
              </div>
          </CardContent>
      </GoldTierCard>
    </div>
  );
}
