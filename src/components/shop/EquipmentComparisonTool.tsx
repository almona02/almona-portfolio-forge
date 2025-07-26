import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/ui/dialog';
import { Button } from '@/shared/ui/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/ui/table';
import { Machine } from '@/types';
import { MachineSpec } from '@/types/shop';

interface EquipmentComparisonToolProps {
  selectedMachines: (Machine & MachineSpec)[];
  allMachines: (Machine & MachineSpec)[];
  onToggleMachine: (machine: Machine & MachineSpec) => void;
}

export const EquipmentComparisonTool = ({ selectedMachines, allMachines, onToggleMachine }: EquipmentComparisonToolProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const allSpecKeys = selectedMachines.reduce((keys: string[], machine) => {
    Object.keys(machine.specs).forEach(key => {
      if (!keys.includes(key)) {
        keys.push(key);
      }
    });
    return keys;
  }, []);

  return (
    <>
      <Button 
        variant="outline" 
        onClick={() => setIsOpen(true)}
        disabled={allMachines.length === 0}
      >
        Compare Machines ({selectedMachines.length})
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl text-white bg-almona-dark">
          <DialogHeader>
            <DialogTitle>Machine Comparison</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p>Select up to 4 machines to compare:</p>
            <div className="flex flex-wrap gap-2">
              {allMachines.map(machine => (
                <Button
                  key={machine.id}
                  variant={selectedMachines.some(m => m.id === machine.id) ? 'default' : 'outline'}
                  onClick={() => onToggleMachine(machine)}
                  disabled={!selectedMachines.some(m => m.id === machine.id) && selectedMachines.length >= 4}
                >
                  {machine.name}
                </Button>
              ))}
            </div>

            {selectedMachines.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Specification</TableHead>
                      {selectedMachines.map(machine => (
                        <TableHead key={machine.id}>{machine.name}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allSpecKeys.map(specKey => (
                      <TableRow key={specKey}>
                        <TableCell className="font-medium">{specKey}</TableCell>
                        {selectedMachines.map(machine => (
                          <TableCell key={`${machine.id}-${specKey}`}>
                            {machine.specs[specKey] || "N/A"}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
