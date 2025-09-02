import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { withErrorBoundary } from '@/hocs/withErrorBoundary';
import { Navigate, Link } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const CustomerPortal = () => {
  const { user, loading } = useAuth();

  // Always call hooks at the top level
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

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-almona-dark text-white">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-almona-orange mx-auto mb-4"></div>
            <p className="text-xl">Loading...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (isLoadingMachines || isLoadingTickets) {
    return (
      <div className="flex flex-col min-h-screen bg-almona-dark text-white">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-almona-orange mx-auto mb-4"></div>
            <p className="text-xl">Loading your data...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (machinesError) {
    toast.error(machinesError.message || 'Failed to fetch machines.');
  }

  if (ticketsError) {
    toast.error(ticketsError.message || 'Failed to fetch tickets.');
  }

  return (
    <div className="flex flex-col min-h-screen bg-almona-dark text-white">
      <Navbar />
      <main className="flex-grow pt-24 pb-12">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold mb-4 text-gradient-orange">
              Welcome, {user?.name || user?.email}
            </h1>
            <p className="text-gray-400">Manage your machines, support tickets, and account settings</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="bg-almona-dark/60 border-almona-light/20 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-almona-orange">My Machines</CardTitle>
              </CardHeader>
              <CardContent>
                {machines && machines.length > 0 ? (
                  <ul className="space-y-2">
                    {machines.map((machine) => (
                      <li key={machine.id} className="p-3 bg-almona-light/10 rounded-lg">
                        <span className="font-medium">{machine.name}</span> - {machine.model}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-400 mb-4">No machines registered yet.</p>
                )}
                <Button className="mt-4 bg-gradient-orange hover:bg-almona-orange-dark text-white">
                  Register New Machine
                </Button>
              </CardContent>
            </Card>
            
            <Card className="bg-almona-dark/60 border-almona-light/20 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-almona-orange">My Support Tickets</CardTitle>
              </CardHeader>
              <CardContent>
                {tickets && tickets.length > 0 ? (
                  <ul className="space-y-2">
                    {tickets.map((ticket) => (
                      <li key={ticket.id} className="p-3 bg-almona-light/10 rounded-lg">
                        <div className="font-medium">{ticket.subject}</div>
                        <div className="text-sm text-gray-400">Status: {ticket.status}</div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-400 mb-4">No support tickets found.</p>
                )}
                <Button className="mt-4 bg-gradient-orange hover:bg-almona-orange-dark text-white">
                  Create New Ticket
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="mt-12 text-center">
            <h2 className="text-2xl font-bold mb-6 text-white">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button asChild className="bg-almona-light/20 hover:bg-almona-light/30 text-white border border-almona-light/30">
                <Link to="/services">Browse Services</Link>
              </Button>
              <Button asChild className="bg-almona-light/20 hover:bg-almona-light/30 text-white border border-almona-light/30">
                <Link to="/products">View Products</Link>
              </Button>
              <Button asChild className="bg-almona-light/20 hover:bg-almona-light/30 text-white border border-almona-light/30">
                <Link to="/quote">Request Quote</Link>
              </Button>
              <Button asChild className="bg-almona-light/20 hover:bg-almona-light/30 text-white border border-almona-light/30">
                <Link to="/contact">Contact Support</Link>
              </Button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default withErrorBoundary(CustomerPortal);
