import { Button } from '@/components/ui/button-gold-tier';
import { GoldTierCard as Card, CardContent } from '@/components/ui/card-gold-tier';
import { cn } from '@/lib/utils';
import { CheckCircle2, ChevronDown, ChevronRight, Circle, Gauge, HelpCircle, Thermometer } from 'lucide-react';
import { useState } from 'react';

export type MachineType = 'cutting_double' | 'cutting_single' | 'welding_double' | 'welding_single' | 'router' | 'crimping' | 'generic';

interface MaintenanceTask {
  id: string;
  label: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  requiredValue?: string; // e.g., "6-7 Bar"
  isCritical?: boolean;
}

const MAINTENANCE_PROTOCOLS: Record<MachineType, MaintenanceTask[]> = {
  cutting_double: [
    { id: 'cd_1', label: 'Clean chips from bed & moving heads', frequency: 'daily', isCritical: true },
    { id: 'cd_2', label: 'Check oil mist level (> 50%)', frequency: 'daily' },
    { id: 'cd_3', label: 'Verify air pressure', frequency: 'daily', requiredValue: '6-7 Bar' },
    { id: 'cd_4', label: 'Inspect saw blade sharpness', frequency: 'weekly', isCritical: true },
    { id: 'cd_5', label: 'Check belt tension', frequency: 'weekly' },
  ],
  cutting_single: [
    { id: 'cs_1', label: 'Clean chips from work area', frequency: 'daily' },
    { id: 'cs_2', label: 'Check cooling spray nozzles', frequency: 'daily' },
    { id: 'cs_3', label: 'Check blade guard safety mechanism', frequency: 'weekly', isCritical: true },
  ],
  welding_double: [
    { id: 'wd_1', label: 'Clean Teflon film (No residue!)', frequency: 'daily', isCritical: true },
    { id: 'wd_2', label: 'Check heating plate temperature', frequency: 'daily', requiredValue: '240°C ±5' },
    { id: 'wd_3', label: 'Inspect welding bead limitation knives', frequency: 'weekly' },
    { id: 'wd_4', label: 'Calibrate temperature sensors', frequency: 'monthly' },
  ],
  welding_single: [
    { id: 'ws_1', label: 'Clean Teflon film', frequency: 'daily', isCritical: true },
    { id: 'ws_2', label: 'Check heating plate temperature', frequency: 'daily', requiredValue: '240°C' },
  ],
  router: [
    { id: 'rt_1', label: 'Clean collet & nut', frequency: 'daily' },
    { id: 'rt_2', label: 'Check cooling spray line', frequency: 'daily' },
    { id: 'rt_3', label: 'Lubricate guide rails', frequency: 'weekly', isCritical: true },
    { id: 'rt_4', label: 'Check high-speed bearing sound', frequency: 'weekly' },
  ],
  crimping: [
    { id: 'cr_1', label: 'Check hydraulic oil level', frequency: 'daily' },
    { id: 'cr_2', label: 'Inspect crimping knives for damage', frequency: 'daily', isCritical: true },
    { id: 'cr_3', label: 'Verify hydraulic pressure', frequency: 'weekly', requiredValue: '120 Bar' },
  ],
  generic: [
    { id: 'g_1', label: 'General cleaning', frequency: 'daily' },
    { id: 'g_2', label: 'Check emergency stop', frequency: 'daily', isCritical: true },
  ]
};

interface SmartMaintenanceTabProps {
  machineType: MachineType;
  modelName: string;
}

export function SmartMaintenanceTab({ machineType, modelName }: SmartMaintenanceTabProps) {
  const [tasks, _setTasks] = useState<MaintenanceTask[]>(MAINTENANCE_PROTOCOLS[machineType] || MAINTENANCE_PROTOCOLS.generic);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [expandedFreq, setExpandedFreq] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  const toggleTask = (id: string) => {
    const newCompleted = new Set(completed);
    if (newCompleted.has(id)) {
      newCompleted.delete(id);
    } else {
      newCompleted.add(id);
    }
    setCompleted(newCompleted);
  };

  const getProgress = (freq: string) => {
    const freqTasks = tasks.filter(t => t.frequency === freq);
    if (freqTasks.length === 0) return 0;
    const done = freqTasks.filter(t => completed.has(t.id)).length;
    return Math.round((done / freqTasks.length) * 100);
  };

  const DailyProgress = getProgress('daily');

  return (
    <div className="space-y-6">
      {/* Maalem Tip / Status Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 rounded-lg border border-slate-700 items-start flex gap-4">
        <div className="p-3 bg-amber-500/10 rounded-full border border-amber-500/20">
          <HelpCircle className="w-6 h-6 text-amber-500" />
        </div>
        <div>
          <h3 className="text-white font-bold text-lg mb-1">Maalem's Advice for {modelName}</h3>
          <p className="text-slate-400 text-sm">
            {machineType.includes('welding')
              ? "Keep that Teflon clean! Residue is the #1 cause of weak welds. Change it if you see any tears."
              : machineType.includes('cutting')
                ? "Listen to the blade. A dull blade makes a louder 'thud' sound. Sharpen it early to save the motor."
                : "Regular maintenance extends the life of your machine by 3-5 years."}
          </p>
        </div>
      </div>

      {/* Task Groups */}
      <div className="grid grid-cols-1 gap-4">
        {['daily', 'weekly', 'monthly'].map((freq) => {
          const freqTasks = tasks.filter(t => t.frequency === freq);
          if (freqTasks.length === 0) return null;

          const isExpanded = expandedFreq === freq;
          const progress = getProgress(freq);

          return (
            <Card key={freq} className="border-slate-800 bg-slate-900/50">
              <div
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-800/50 transition-colors"
                onClick={() => setExpandedFreq(isExpanded ? 'daily' : freq as any)}
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? <ChevronDown className="w-5 h-5 text-slate-500" /> : <ChevronRight className="w-5 h-5 text-slate-500" />}
                  <div>
                    <h4 className="font-semibold text-white capitalize">{freq} Routine</h4>
                    <p className="text-xs text-slate-500">{freqTasks.length} tasks</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm font-bold text-slate-200">{progress}%</div>
                  </div>
                  {/* Progress Bar Mini */}
                  <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${progress === 100 ? 'bg-green-500' : 'bg-amber-500'}`} style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </div>

              {isExpanded && (
                <CardContent className="pt-0 pb-4 px-4 space-y-2 border-t border-slate-800/50 mt-2">
                  {freqTasks.map(task => (
                    <div
                      key={task.id}
                      onClick={() => toggleTask(task.id)}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-md transition-all cursor-pointer border",
                        completed.has(task.id)
                          ? "bg-green-500/5 border-green-500/20"
                          : "bg-slate-800/30 border-transparent hover:border-slate-700"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {completed.has(task.id)
                          ? <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                          : <Circle className="w-5 h-5 text-slate-500 flex-shrink-0" />
                        }
                        <div className={cn(completed.has(task.id) && "line-through text-slate-500")}>
                          <span className="text-sm font-medium text-slate-200">{task.label}</span>
                          {task.isCritical && (
                            <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-red-500/20 text-red-400 rounded border border-red-500/30 uppercase font-bold">Critical</span>
                          )}
                        </div>
                      </div>
                      {task.requiredValue && (
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-800 rounded text-xs text-amber-400 border border-slate-700">
                          {task.label.includes('Temp') ? <Thermometer className="w-3 h-3" /> : <Gauge className="w-3 h-3" />}
                          {task.requiredValue}
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {DailyProgress === 100 && (
        <div className="flex justify-center pt-4 animate-in fade-in slide-in-from-bottom-2">
          <Button variant="success" size="lg" className="w-full md:w-auto shadow-lg shadow-green-900/20">
            <CheckCircle2 className="w-5 h-5 mr-2" />
            Mark Routine Complete
          </Button>
        </div>
      )}
    </div>
  );
}
