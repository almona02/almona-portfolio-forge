import { useState } from 'react';
import AiEquipmentAdvisor from '@/components/shop/ai-advisor/AiEquipmentAdvisor';
import { EquipmentComparisonTool } from '@/components/shop/EquipmentComparisonTool';
import { IntelligentForm } from '@/components/contact/IntelligentForm';

const AIFeatures = () => {
  const [advisorOpen, setAdvisorOpen] = useState(false);
  const [emergencyMode, setEmergencyMode] = useState(false);

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
        <EquipmentComparisonTool />
      </section>

      {/* Manual Maintenance Reporting Form */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Manual Maintenance Reporting</h2>
        <IntelligentForm emergencyMode={emergencyMode} emergencyToggle={setEmergencyMode} />
      </section>
    </div>
  );
};

export default AIFeatures;
