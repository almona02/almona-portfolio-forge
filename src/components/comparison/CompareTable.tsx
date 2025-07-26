import React from "react";
import { Machine } from "@/types/index";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/ui/table";
import { Check, X } from "lucide-react";

interface CompareTableProps {
  machines: Machine[];
}

const CompareTable: React.FC<CompareTableProps> = ({ machines }) => {
  // Handle both legacy and new machine types with proper data sync
  const getMachineValue = (machine: Machine | Record<string, unknown>, key: string) => {
    const m = machine as Record<string, unknown>;
    
    switch (key) {
      case 'name':
        return m.name as string;
      case 'type':
        return m.type as string;
      case 'releaseDate':
        return m.releaseDate as string;
      case 'power':
        return m.powerSpec ? (m.powerSpec as Record<string, string>).consumption : '-';
      case 'voltage':
        return m.powerSpec ? (m.powerSpec as Record<string, string>).voltage : '-';
      case 'dimensions':
        if (m.dimensions) {
          const dims = m.dimensions as Record<string, string>;
          return `${dims.length} × ${dims.width} × ${dims.height}`;
        }
        return '-';
      case 'weight':
        return (m.dimensions as Record<string, string>)?.weight || '-';
      case 'certifications':
        return m.certifications as string[] || [];
      case 'egyptianStandard':
        return m.egyptianCompliance ? (m.egyptianCompliance as Record<string, string>).standard : '-';
      case 'specifications':
        return m.specifications as string[] || [];
      default:
        return '-';
    }
  };

  // Enhanced specification categories with proper data mapping
  const specCategories = [
    {
      name: "Basic Information",
      specs: [
        { name: "Name", key: "name", type: "text" },
        { name: "Type", key: "type", type: "text" },
        { name: "Release Date", key: "releaseDate", type: "date" },
      ]
    },
    {
      name: "Power Specifications",
      specs: [
        { name: "Power Consumption", key: "power", type: "text" },
        { name: "Voltage", key: "voltage", type: "text" },
      ]
    },
    {
      name: "Dimensions",
      specs: [
        { name: "Dimensions (L×W×H)", key: "dimensions", type: "text" },
        { name: "Weight", key: "weight", type: "text" },
      ]
    },
    {
      name: "Certifications & Compliance",
      specs: [
        { name: "Certifications", key: "certifications", type: "list" },
        { name: "Egyptian Standard", key: "egyptianStandard", type: "text" },
      ]
    },
    {
      name: "Technical Specifications",
      specs: [
        { name: "Detailed Specs", key: "specifications", type: "list" },
      ]
    }
  ];

  // Format value based on type
  const formatValue = (value: string | string[] | undefined | null, type: string) => {
    if (value === undefined || value === null || value === "-") return "-";
    
    switch (type) {
      case "date":
        return typeof value === 'string' ? new Date(value).toLocaleDateString() : String(value);
      case "list":
        return Array.isArray(value) ? (
          <ul className="list-disc pl-5 space-y-1 text-left">
            {value.map((spec, i) => (
              <li key={i}>{spec}</li>
            ))}
          </ul>
        ) : value;
      default:
        return value;
    }
  };

  return (
    <div className="space-y-8">
      {specCategories.map((category) => (
        <div key={category.name} className="border rounded-lg overflow-hidden">
          <div className="bg-muted px-4 py-2">
            <h3 className="font-semibold">{category.name}</h3>
          </div>
          <Table className="border-collapse w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Specification</TableHead>
                {machines.map((machine) => (
                  <TableHead key={machine.id} className="text-center">
                    {machine.name}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {category.specs.map((spec) => (
                <TableRow key={spec.key}>
                  <TableCell className="font-medium">{spec.name}</TableCell>
                  {machines.map((machine) => {
                    const value = getMachineValue(machine, spec.key);
                    return (
                      <TableCell 
                        key={`${machine.id}-${spec.key}`}
                        className="text-center align-top"
                      >
                        {formatValue(value, spec.type)}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ))}
    </div>
  );
};

export default CompareTable;
