import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/shared/ui/ui/dialog";
import { Badge } from "@/shared/ui/ui/badge";

interface DurabilityInfo {
  score: number; // e.g., 1-5 or 1-100
  maintenanceInterval: string; // e.g., "Every 6 months", "1000 operating hours"
  keyDurabilityFeatures: string[];
}

interface DurabilityDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  durabilityInfo: DurabilityInfo;
  productName: string;
}

export const DurabilityDetailsModal: React.FC<DurabilityDetailsModalProps> = ({
  isOpen,
  onClose,
  durabilityInfo,
  productName,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-almona-darker text-white border-almona-light/20">
        <DialogHeader>
          <DialogTitle className="text-gradient-orange">Durability & Maintenance Details for {productName}</DialogTitle>
          <DialogDescription className="text-gray-400">
            Understand the long-term performance and recommended care for this machine.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="mb-4">
            <h4 className="font-semibold text-lg mb-2">Durability Score:</h4>
            <Badge className="bg-orange-600 text-white text-xl px-4 py-2">
              {durabilityInfo.score}/5
            </Badge>
            <p className="text-gray-300 mt-2">This score reflects the machine's expected resilience and lifespan under typical operating conditions.</p>
          </div>

          <div className="mb-4">
            <h4 className="font-semibold text-lg mb-2">Recommended Maintenance Interval:</h4>
            <p className="text-gray-300">{durabilityInfo.maintenanceInterval}</p>
            <p className="text-sm text-gray-400 mt-1">Adhering to this schedule is crucial for maximizing the machine's lifespan and ensuring optimal performance.</p>
          </div>

          <div className="mb-4">
            <h4 className="font-semibold text-lg mb-2">Key Durability Features:</h4>
            <ul className="list-disc list-inside space-y-1 text-gray-300">
              {durabilityInfo.keyDurabilityFeatures.map((feature, index) => (
                <li key={index}>{feature}</li>
              ))}
            </ul>
            <p className="text-sm text-gray-400 mt-2">These features contribute significantly to the machine's robust construction and ability to withstand demanding industrial environments.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
