import { useState } from 'react';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui/ui/card';
import { Machine } from '@/types';
import { MachineRegistrationEnhanced } from './MachineRegistration';

interface MyMachinesProps {
  machines: Machine[];
}

const MachineCard = ({ machine }: { machine: Machine }) => (
  <Card>
    <CardHeader>
      <CardTitle>{machine.name}</CardTitle>
    </CardHeader>
    <CardContent>
      <p><strong>Model:</strong> {machine.type}</p>
      <p><strong>Category:</strong> {machine.category}</p>
    </CardContent>
  </Card>
);

export const MyMachines = ({ machines: initialMachines }: MyMachinesProps) => {
  const [showRegistration, setShowRegistration] = useState(false);

  if (showRegistration) {
    return (
      <div>
        <Button variant="outline" onClick={() => setShowRegistration(false)} className="mb-4">
          Back to My Machines
        </Button>
        <MachineRegistrationEnhanced />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button onClick={() => setShowRegistration(true)}>
        Register New Machine
      </Button>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {initialMachines.map(machine => (
          <MachineCard key={machine.id} machine={machine} />
        ))}
      </div>
    </div>
  );
};
