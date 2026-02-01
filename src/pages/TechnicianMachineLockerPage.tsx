
import ProductLocker from '@/components/services/ProductLocker';
import { Button } from '@/components/ui/button-gold-tier';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function TechnicianMachineLockerPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} leftIcon={<ChevronLeft className="w-4 h-4" />}>
           Back to Fleet
        </Button>
      </div>

      {/* 
         In a real app, we'd grab the ID from useParams(). 
         For this demo, we hardcode the "Double Head Cutter" to show the Deep Maintenance Logic.
      */}
      <ProductLocker 
         machineId="machine-123" 
         machineModel="Double Head Cutting Machine DK-502" 
         serialNumber="DK502-2023-0567" 
      />
    </div>
  );
}
