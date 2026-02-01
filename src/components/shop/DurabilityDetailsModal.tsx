import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/shared/ui/ui/dialog";
import { Badge } from "@/shared/ui/ui/badge";

/**
 * Information about a product's durability characteristics
 */
interface DurabilityInfo {
  /** Durability score (e.g., 1-5 or 1-100) */
  score: number;
  /** Recommended maintenance interval (e.g., "Every 6 months", "1000 operating hours") */
  maintenanceInterval: string;
  /** List of key durability features */
  keyDurabilityFeatures: string[];
}

/**
 * Props for the DurabilityDetailsModal component
 */
interface DurabilityDetailsModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Durability information to display */
  durabilityInfo: DurabilityInfo;
  /** Name of the product */
  productName: string;
}

/**
 * DurabilityDetailsModal Component
 * 
 * Displays detailed information about a product's durability and maintenance requirements.
 * Shows:
 * - Durability score with visual badge
 * - Recommended maintenance intervals
 * - Key durability features that contribute to longevity
 * 
 * Used in product detail views to help customers understand long-term value and care requirements.
 */
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
            <h4 className="typography-h4 mb-2">Durability Score:</h4>
            <Badge className="btn-primary">
              {durabilityInfo.score}/5
            </Badge>
            <p className="text-gray-300 mt-2">This score reflects the machine&apos;s expected resilience and lifespan under typical operating conditions.</p>
          </div>

          <div className="mb-4">
            <h4 className="typography-h4 mb-2">Recommended Maintenance Interval:</h4>
            <p className="text-gray-300">{durabilityInfo.maintenanceInterval}</p>
            <p className="text-sm text-gray-400 mt-1">Adhering to this schedule is crucial for maximizing the machine&apos;s lifespan and ensuring optimal performance.</p>
          </div>

          <div className="mb-4">
            <h4 className="typography-h4 mb-2">Key Durability Features:</h4>
            <ul className="list-disc list-inside space-y-1 text-gray-300">
              {durabilityInfo.keyDurabilityFeatures.map((feature, index) => (
                <li key={index}>{feature}</li>
              ))}
            </ul>
            <p className="text-sm text-gray-400 mt-2">These features contribute significantly to the machine&apos;s robust construction and ability to withstand demanding industrial environments.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
