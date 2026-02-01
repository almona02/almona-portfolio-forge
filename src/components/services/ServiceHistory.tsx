
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button-gold-tier';
import { GoldTierCard } from '@/components/ui/card-gold-tier';
import { cn } from '@/lib/utils';
import { AlertTriangle, ArrowRight, Calendar, CheckCircle2, FileText } from 'lucide-react';
import React from 'react';
import { RMAVisualizer } from './support/RMA_Visualizer';
import { TicketDetailView } from './support/TicketDetailView';

// Mock Data
const MOCK_HISTORY = [
    { id: 'RMA-2023-001', type: 'repair', date: '2023-11-15', description: 'Replaced Spindle Motor', status: 'completed' },
    { id: 'MNT-2023-088', type: 'maintenance', date: '2023-10-01', description: 'Quarterly Deep Clean', status: 'completed' },
    { id: 'RMA-2024-042', type: 'repair', date: '2024-01-15', description: 'Controller Board Diagnosis', status: 'active' },
];

const MOCK_ACTIVE_RMA_EVENTS = [
    { stage: 'received', timestamp: 'Jan 15, 09:30 AM', status: 'completed', notes: 'Unit checked in at Cairo Service Center' },
    { stage: 'diagnosis', timestamp: 'Jan 16, 02:15 PM', status: 'completed', notes: 'Fault identified: Voltage spike localized to I/O board.' },
    { stage: 'repair', timestamp: 'Jan 17, 10:00 AM', status: 'active', notes: 'Replacing I/O Capacitor Bank...' },
];

export function ServiceHistory() {
  const activeRMA = MOCK_HISTORY.find(h => h.status === 'active');

    const [selectedTicket, setSelectedTicket] = React.useState<any>(null);

    if (selectedTicket) {
        return <TicketDetailView ticket={selectedTicket} onBack={() => setSelectedTicket(null)} />;
    }

    return (
    <div className="space-y-8 animate-in fade-in duration-500">
        
        {/* Active RMA Tracker */}
        {activeRMA && (
            <div className="space-y-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    Active Service Request
                </h3>
                <RMAVisualizer 
                    rmaId={activeRMA.id} 
                    currentStage="repair" 
                    estimatedCompletion="Jan 19, 2024"
                    events={MOCK_ACTIVE_RMA_EVENTS as any}
                />
            </div>
        )}

        {/* History List */}
        <div className="space-y-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-slate-400" />
                Service Log
            </h3>
            
            <div className="grid gap-3">
                {MOCK_HISTORY.map((item) => (
                    <GoldTierCard 
                        key={item.id} 
                        className="bg-slate-900/50 border-slate-800 hover:border-amber-500/50 hover:bg-slate-800/50 transition-all cursor-pointer group"
                        onClick={() => setSelectedTicket(item)}
                    >
                        <div className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center border transition-colors group-hover:scale-110",
                                    item.type === 'repair' ? "bg-red-500/10 border-red-500/20 text-red-500" : "bg-blue-500/10 border-blue-500/20 text-blue-500"
                                )}>
                                    {item.type === 'repair' ? <WrenchIcon className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                                </div>
                                <div>
                                    <h4 className="font-medium text-slate-200 group-hover:text-amber-500 transition-colors">{item.description}</h4>
                                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                        <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-400 capitalize">{item.type}</Badge>
                                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {item.date}</span>
                                        <span>• ID: {item.id}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                {item.status === 'active' ? (
                                    <Badge className="bg-amber-500 text-slate-900 hover:bg-amber-600">Active</Badge>
                                ) : (
                                    <Badge variant="outline" className="border-green-500/30 text-green-500 bg-green-500/5">Completed</Badge>
                                )}
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity -mr-2">
                                    <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                                        <ArrowRight className="w-5 h-5" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </GoldTierCard>
                ))}
            </div>
        </div>
    </div>
  );
}

function WrenchIcon(props: any) {
    return (
        <svg
			{...props}
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
		</svg>
    )
}
