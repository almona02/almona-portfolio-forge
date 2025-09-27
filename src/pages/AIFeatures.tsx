import { useState } from 'react';
import AiEquipmentAdvisor from '@/components/shop/ai-advisor/AiEquipmentAdvisor';
import { EquipmentComparisonTool } from '@/components/shop/EquipmentComparisonTool';
import { withErrorBoundary } from "@/hocs/withErrorBoundary";
import { IntelligentForm } from '@/components/contact/IntelligentForm';

const AIFeatures = () => {
  const [advisorOpen, setAdvisorOpen] = useState(false);
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [selectedMachines, setSelectedMachines] = useState<any[]>([]);
  const [allMachines] = useState([
    { id: '1', name: 'Machine A', description: 'Description A', imageUrl: '/image1.jpg', category: 'Category A', releaseDate: '2023-01-01', type: 'Type A', powerSpec: { voltage: '220V', frequency: '50Hz', power: 'Power A', phase: '3-phase', consumption: 'High' } },
    { id: '2', name: 'Machine B', description: 'Description B', imageUrl: '/image2.jpg', category: 'Category B', releaseDate: '2023-02-01', type: 'Type B', powerSpec: { voltage: '220V', frequency: '50Hz', power: 'Power B', phase: '3-phase', consumption: 'Medium' } },
    { id: '3', name: 'Machine C', description: 'Description C', imageUrl: '/image3.jpg', category: 'Category C', releaseDate: '2023-03-01', type: 'Type C', powerSpec: { voltage: '220V', frequency: '50Hz', power: 'Power C', phase: '3-phase', consumption: 'Low' } }
  ] as any);

  const handleToggleMachine = (machine: any) => {
    setSelectedMachines(prev => 
      prev.some((m: any) => m.id === machine.id)
        ? prev.filter((m: any) => m.id !== machine.id)
        : [...prev, machine]
    );
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold text-center">AI Features</h1>

      {/* AI Spare Parts Finder */}
      <section>
        <button
          onClick={() => setAdvisorOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Open AI Spare Parts Finder
        </button>
        <AiEquipmentAdvisor open={advisorOpen} onOpenChange={setAdvisorOpen} />
      </section>

      {/* Equipment Comparison Tool */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Equipment Comparison Tool</h2>
        <EquipmentComparisonTool 
          selectedMachines={selectedMachines}
          allMachines={allMachines}
          onToggleMachine={handleToggleMachine}
        />
      </section>

      {/* Manual Maintenance Reporting Form */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Manual Maintenance Reporting</h2>
        <IntelligentForm emergencyMode={emergencyMode} emergencyToggle={setEmergencyMode} />
      </section>
    </div>
  );
};

export default withErrorBoundary(AIFeatures);
