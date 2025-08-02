import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

const CustomerPortal = () => {
  const { user } = useAuth();

  const { data: machines, isLoading: isLoadingMachines, error: machinesError } = useQuery({
    queryKey: ['machines', user?.id],
    queryFn: () => api.fetchUserMachines(user!.id),
    enabled: !!user,
  });

  const { data: tickets, isLoading: isLoadingTickets, error: ticketsError } = useQuery({
    queryKey: ['tickets', user?.id],
    queryFn: () => api.fetchUserTickets(user!.id),
    enabled: !!user,
  });

  if (isLoadingMachines || isLoadingTickets) {
    return <div>Loading...</div>;
  }

  if (machinesError) {
    toast.error(machinesError.message || 'Failed to fetch machines.');
  }

  if (ticketsError) {
    toast.error(ticketsError.message || 'Failed to fetch tickets.');
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Welcome, {user?.name || user?.email}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>My Machines</CardTitle>
          </CardHeader>
          <CardContent>
            {machines && machines.length > 0 ? (
              <ul>
                {machines.map((machine) => (
                  <li key={machine.id}>{machine.name} - {machine.model}</li>
                ))}
              </ul>
            ) : (
              <p>No machines registered.</p>
            )}
            <Button className="mt-4">Register New Machine</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>My Support Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            {tickets && tickets.length > 0 ? (
              <ul>
                {tickets.map((ticket) => (
                  <li key={ticket.id}>{ticket.subject} - {ticket.status}</li>
                ))}
              </ul>
            ) : (
              <p>No support tickets found.</p>
            )}
            <Button className="mt-4">Create New Ticket</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CustomerPortal;
