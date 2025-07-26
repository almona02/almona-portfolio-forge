import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { CheckCircle2, Wrench, Bolt, GraduationCap, Ship } from "lucide-react";

interface ServiceCardProps {
  icon: "wrench" | "bolt" | "graduation-cap" | "ship";
  title: string;
  description: string;
  features: string[];
  actionText: string;
  egyptSpecific?: boolean;
  machineModel?: string;
  onActionClick?: () => void;
}

interface SparePart {
  id: string;
  name: string;
  compatibleMachines: string[];
  localStock: number;
  price: number;
}

const iconMap = {
  "wrench": <Wrench className="h-6 w-6" />,
  "bolt": <Bolt className="h-6 w-6" />,
  "graduation-cap": <GraduationCap className="h-6 w-6" />,
  "ship": <Ship className="h-6 w-6" />,
};

const SparePartsWidget = ({ machineModel }: { machineModel: string }) => {
  const [parts, setParts] = useState<SparePart[]>([]);

  useEffect(() => {
    // Simulate fetching spare parts for the machine model
    const fetchSpareParts = async (model: string) => {
      // Placeholder data
      const allParts: SparePart[] = [
        { id: "1", name: "Blade Set", compatibleMachines: ["YILMAZ PRO-5000"], localStock: 5, price: 1200 },
        { id: "2", name: "Hydraulic Pump", compatibleMachines: ["YILMAZ PRO-5000", "ALFAPEN X200"], localStock: 0, price: 3500 },
        { id: "3", name: "Motor Belt", compatibleMachines: ["ALFAPEN X200"], localStock: 3, price: 800 },
      ];
      return allParts.filter(part => part.compatibleMachines.includes(model));
    };

    fetchSpareParts(machineModel).then(setParts);
  }, [machineModel]);

  return (
    <div className="mt-4 border-t pt-4">
      <h4 className="font-medium mb-2">Common Spare Parts</h4>
      <div className="space-y-2">
        {parts.map(part => (
          <div key={part.id} className="flex justify-between">
            <span>{part.name}</span>
            <span>{part.localStock > 0 ? `${part.localStock} in Cairo` : '2-3 day lead time'}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const ServiceCard = ({
  icon,
  title,
  description,
  features,
  actionText,
  egyptSpecific = false,
  machineModel = "",
  onActionClick
}: ServiceCardProps) => {
  return (
    <div className="bg-almona-darker/50 border border-almona-light/20 rounded-lg p-6 flex flex-col h-full">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-almona-dark/50 p-3 rounded-full">
          {iconMap[icon]}
        </div>
        <div>
          <h3 className="text-xl font-bold">{title}</h3>
          {egyptSpecific && (
            <Badge className="mt-1 bg-egyptian-blue">Egypt</Badge>
          )}
        </div>
      </div>
      
      <p className="text-gray-400 mb-6">{description}</p>
      
      <div className="space-y-3 mb-6">
        {features.map((feature, index) => (
          <div key={index} className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500" />
            <span className="text-sm">{feature}</span>
          </div>
        ))}
      </div>
      
      {/* Spare Parts Widget */}
      {machineModel && <SparePartsWidget machineModel={machineModel} />}

      <div className="mt-auto">
        <Button className="w-full" onClick={onActionClick}>
          {actionText}
        </Button>
      </div>
    </div>
  );
};
