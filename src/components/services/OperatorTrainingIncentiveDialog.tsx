import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/shared/ui/ui/dialog";
import { Button } from "@/shared/ui/ui/button";
import { GraduationCap } from "lucide-react";
// Update the import path below to the correct relative path if the file exists elsewhere
// Example: If OperatorTrainingSection.tsx is in the same folder:
import { OperatorTrainingSection } from "./OperatorTrainingSection";
// Or, if it's in a different folder, adjust the path accordingly:
// import { OperatorTrainingSection } from "../someOtherFolder/OperatorTrainingSection";

interface OperatorTrainingIncentiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const OperatorTrainingIncentiveDialog = ({
  open,
  onOpenChange
}: OperatorTrainingIncentiveDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-almona-dark border-almona-light/20 text-white">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-orange-500" />
            <span className="bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
              Operator Training & Certification Programs
            </span>
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Comprehensive training programs for aluminium and UPVC window fabrication with Egyptian market incentives
          </DialogDescription>
        </DialogHeader>

        <OperatorTrainingSection />

        <DialogFooter className="sm:justify-between">
          <div className="text-sm text-gray-400">
            * Special government subsidies available for Egyptian manufacturers
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="border-almona-light/20"
            >
              Close
            </Button>
            <Button className="bg-gradient-to-r from-green-500 to-blue-500">
              Request Custom Training Plan
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};