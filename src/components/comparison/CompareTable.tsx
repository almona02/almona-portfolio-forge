import React from "react";
import { Machine } from "@/types/index";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/ui/table";

interface CompareTableProps {
  machines: Machine[];
}

const CompareTable: React.FC<CompareTableProps> = ({ machines }) => {
  // Handle both legacy and new machine types with proper data sync
  const getMachineValue = (machine: Machine | Record<string, unknown>, key: string) => {
    const m = machine as Machine & Record<string, unknown>;
    
    switch (key) {
      case 'name':
        return m.name as string;
      case 'type':
        return m.type as string;
      case 'releaseDate':
        return m.releaseDate as string;
      case 'power':
        return m.powerSpec?.consumption ?? '-';
      case 'voltage':
        return m.powerSpec?.voltage ?? '-';
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
      case 'airConsumption':
        return m.airSpec?.consumption || '-';
      case 'airPressure':
        return m.airSpec?.pressure || '-';
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
      name: "Air Requirements",
      specs: [
        { name: "Air Consumption", key: "airConsumption", type: "text" },
        { name: "Air Pressure", key: "airPressure", type: "text" },
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

  // Determine differences per spec row to emphasize variances
  const rowDiffers = (specKey: string) => {
    const values = machines.map(m => getMachineValue(m, specKey));
    const first = JSON.stringify(values[0]);
    return values.some(v => JSON.stringify(v) !== first);
  };

  return (
    <div className="space-y-8 text-xs sm:text-sm">
      {specCategories.map((category) => (
        <div key={category.name} className="border rounded-lg overflow-hidden shadow-sm bg-background/50">
          <div className="bg-muted/60 backdrop-blur-sm px-4 py-2 flex items-center justify-between">
            <h3 className="font-semibold tracking-wide text-sm uppercase text-muted-foreground/90">{category.name}</h3>
          </div>
          <div className="overflow-x-auto supports-[backdrop-filter]:backdrop-blur-xs">
            <Table className="border-collapse w-full min-w-[640px]">
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-muted/70 to-muted/40">
                  <TableHead className="w-[200px] sticky left-0 z-20 bg-muted/70 backdrop-blur-sm shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)]">Specification</TableHead>
                  {machines.map((machine) => (
                    <TableHead key={machine.id} className="text-center whitespace-nowrap">
                      {machine.name}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {category.specs.map((spec, rowIdx) => {
                  const differs = rowDiffers(spec.key);
                  return (
                    <TableRow key={spec.key} className={differs ? 'bg-amber-50/40 dark:bg-amber-950/10' : rowIdx % 2 === 0 ? 'bg-background/40' : 'bg-background/20'}>
                      <TableCell className="font-medium sticky left-0 z-10 bg-background/80 backdrop-blur-sm border-r border-border/40">
                        <span className="inline-flex items-center gap-1">
                          {spec.name}
                          {differs && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" aria-label="Values differ across machines" />}
                        </span>
                      </TableCell>
                      {machines.map((machine) => {
                        const raw = getMachineValue(machine, spec.key);
                        const valueNode = formatValue(raw, spec.type);
                        return (
                          <TableCell
                            key={`${machine.id}-${spec.key}`}
                            className={
                              'text-center align-top transition-colors px-3 py-2 ' +
                              (differs ? 'font-medium text-foreground' : 'text-muted-foreground')
                            }
                          >
                            {valueNode}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CompareTable;
