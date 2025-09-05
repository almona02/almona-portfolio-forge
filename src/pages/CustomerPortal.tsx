import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { getUserTickets } from '@/lib/ticketApi'; // retained for potential future advanced ticket view (not used in query now)
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { motion, Variants } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Package, 
  Wrench, 
  FileText, 
  Download, 
  Calendar, 
  Clock, 
  Search,
  Plus,
  AlertTriangle,
  CheckCircle,
  Clock4,
  User,
  LucideIcon
} from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { withErrorBoundary } from '@/hocs/withErrorBoundary';

// Define local types that match the API response
interface Machine {
  id: string;
  name: string;
  model: string;
  serial_number: string;
  status?: string;
  installation_date?: string;
  purchase_date?: string;
  warranty_expiry?: string;
}

interface Ticket {
  id: string;
  ticket_number?: string | null;
  title: string;
  description: string | null;
  status: string;
  type?: string | null;
  priority?: string | null;
  maintenance_type?: string | null;
  source?: string | null;
  created_at: string;
  updated_at: string;
  message_count?: number;
}

interface Document {
  id: string;
  title: string;
  type: string;
  upload_date: string;
  size: string;
  url: string;
}

const CustomerPortal = () => {
  const { user, loading: authLoading, stableDisplayEmail } = useAuth();
  // Tracks only the very first full data bootstrap; once true we never show the big skeleton again
  const [bootstrapped, setBootstrapped] = useState(false);
  const navigate = useNavigate();

  // ProtectedRoute already guards access; avoid duplicate redirects to reduce flicker

  const { data: machines = [], isLoading: isLoadingMachines, isFetching: isFetchingMachines, error: machinesError } = useQuery({
    queryKey: ['machines', user?.id],
    queryFn: () => api.fetchUserMachines(user!.id) as Promise<Machine[]>,
    enabled: !!user,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const { data: tickets = [], isLoading: isLoadingTickets, isFetching: isFetchingTickets, error: ticketsError } = useQuery({
    queryKey: ['tickets', user?.id],
    queryFn: () => user ? api.fetchUserTickets(user.id) as Promise<Ticket[]> : Promise.resolve([]),
    enabled: !!user,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const { 
    data: documents = [], 
    isLoading: isLoadingDocuments, 
    isFetching: isFetchingDocuments,
    error: documentsError 
  } = useQuery({
    queryKey: ['documents', user?.id],
    queryFn: async () => {
      const apiDocs = await api.fetchUserDocuments(user!.id);
      return apiDocs as unknown as Document[];
    },
    enabled: !!user,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Mark bootstrap complete once first load of all queries finishes (success or error)
  useEffect(() => {
    if (bootstrapped) return;
    if (!authLoading && !isLoadingMachines && !isLoadingTickets && !isLoadingDocuments) {
      setBootstrapped(true);
    }
  }, [authLoading, isLoadingMachines, isLoadingTickets, isLoadingDocuments, bootstrapped]);

  useEffect(() => {
    if (machinesError) {
      toast.error('Failed to fetch machines: ' + (machinesError as Error).message);
    }
  }, [machinesError]);

  useEffect(() => {
    if (ticketsError) {
      toast.error('Failed to fetch tickets: ' + (ticketsError as Error).message);
    }
  }, [ticketsError]);

  useEffect(() => {
    if (documentsError) {
      toast.error('Failed to fetch documents: ' + (documentsError as Error).message);
    }
  }, [documentsError]);

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, {icon: LucideIcon, color: string, label: string}> = {
      open: { icon: Clock4, color: 'blue', label: 'Open' },
      in_progress: { icon: Clock, color: 'amber', label: 'In Progress' },
      resolved: { icon: CheckCircle, color: 'green', label: 'Resolved' },
      closed: { icon: CheckCircle, color: 'gray', label: 'Closed' },
      urgent: { icon: AlertTriangle, color: 'red', label: 'Urgent' }
    };

    const config = statusConfig[status] || { icon: Clock4, color: 'gray', label: status };
    const Icon = config.icon;

    // Use static classes instead of dynamic template strings
    const colorClasses: Record<string, string> = {
      blue: 'bg-blue-500/20 text-blue-300 border-blue-500/50',
      amber: 'bg-amber-500/20 text-amber-300 border-amber-500/50',
      green: 'bg-green-500/20 text-green-300 border-green-500/50',
      gray: 'bg-gray-500/20 text-gray-300 border-gray-500/50',
      red: 'bg-red-500/20 text-red-300 border-red-500/50',
    };

    return (
      <Badge 
        variant="outline" 
        className={`${colorClasses[config.color]} capitalize`}
      >
        <Icon className="h-3 w-3 mr-1" /> {config.label}
      </Badge>
    );
  };

  const getMachineStatusBadge = (status: string = 'active') => {
    const statusConfig: Record<string, {color: string, label: string}> = {
      active: { color: 'green', label: 'Active' },
      maintenance: { color: 'amber', label: 'Maintenance' },
      inactive: { color: 'gray', label: 'Inactive' }
    };

    const config = statusConfig[status] || { color: 'gray', label: status };

    // Use static classes instead of dynamic template strings
    const colorClasses: Record<string, string> = {
      green: 'bg-green-500/20 text-green-300 border-green-500/50',
      amber: 'bg-amber-500/20 text-amber-300 border-amber-500/50',
      gray: 'bg-gray-500/20 text-gray-300 border-gray-500/50',
    };

    return (
      <Badge 
        variant="secondary" 
        className={colorClasses[config.color]}
      >
        {config.label}
      </Badge>
    );
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: "spring", stiffness: 100 }
    }
  };

  const LoadingSkeleton = () => (
    <div className="flex flex-col min-h-screen bg-almona-dark">
      <Navbar />
      <div className="flex-grow pt-24 pb-12">
        <div className="container mx-auto px-4 space-y-6">
          <Skeleton className="h-12 w-64 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-lg mt-8" />
        </div>
      </div>
    </div>
  );

  const initialLoading = !bootstrapped;
  if (initialLoading) return <LoadingSkeleton />;

  return (
    <div className="flex flex-col min-h-screen bg-almona-dark text-white">
      <Navbar />
      <main className="flex-grow pt-24 pb-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="container mx-auto px-4"
        >
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-almona-orange/20 rounded-full flex items-center justify-center">
                <User className="h-8 w-8 text-almona-orange" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Welcome back, {stableDisplayEmail || user?.email}</h1>
                <p className="text-gray-400">Manage your machines, support tickets, and account details</p>
              </div>
            </div>
          </div>

          <Tabs defaultValue="machines" className="mb-8">
            <TabsList className="grid w-full grid-cols-3 bg-almona-dark/80 rounded-lg p-1 mb-6">
              <TabsTrigger value="machines" className="data-[state=active]:bg-almona-orange data-[state=active]:text-white rounded-md py-3">
                <Package className="h-4 w-4 mr-2" /> My Machines
              </TabsTrigger>
              <TabsTrigger value="support" className="data-[state=active]:bg-almona-orange data-[state=active]:text-white rounded-md py-3">
                <FileText className="h-4 w-4 mr-2" /> Support Tickets
              </TabsTrigger>
              <TabsTrigger value="documents" className="data-[state=active]:bg-almona-orange data-[state=active]:text-white rounded-md py-3">
                <Download className="h-4 w-4 mr-2" /> Documents
              </TabsTrigger>
            </TabsList>

            <TabsContent value="machines">
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-6"
              >
                <motion.div variants={itemVariants} className="flex justify-between items-center flex-wrap gap-4">
                  <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input 
                      placeholder="Search machines..." 
                      className="pl-10 bg-almona-dark/60 border-almona-light/30 focus:border-almona-orange/50"
                    />
                  </div>
                  <Button 
                    className="bg-gradient-orange hover:bg-almona-orange-dark text-white"
                    onClick={() => navigate('/portal/register-machine')}
                  >
                    <Plus className="h-4 w-4 mr-2" /> Register New Machine
                  </Button>
                </motion.div>

                {machines && machines.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {machines.map((machine, index) => (
                      <motion.div 
                        key={machine.id}
                        variants={itemVariants}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <Card className="bg-almona-dark/60 border-almona-light/20 backdrop-blur-sm hover:border-almona-orange/50 transition-colors h-full group">
                          <CardHeader className="pb-3">
                            <div className="flex justify-between items-start">
                              <CardTitle className="text-xl group-hover:text-almona-orange transition-colors">
                                {machine.name}
                              </CardTitle>
                              {getMachineStatusBadge(machine.status)}
                            </div>
                            <CardDescription className="text-gray-400">{machine.model}</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-400">Serial Number:</span>
                                <span className="font-mono text-almona-light">{machine.serial_number}</span>
                              </div>
                              {machine.installation_date && (
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Installation:</span>
                                  <span>{new Date(machine.installation_date).toLocaleDateString()}</span>
                                </div>
                              )}
                              <div className="flex justify-between">
                                <span className="text-gray-400">Status:</span>
                                <span className="capitalize">{machine.status || 'active'}</span>
                              </div>
                            </div>
                            <div className="flex gap-2 mt-4 pt-4 border-t border-almona-light/10">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="flex-1 border-almona-light/30 text-almona-light hover:bg-almona-light/10"
                                onClick={() => navigate(`/machines/${machine.id}`)}
                              >
                                <Wrench className="h-4 w-4 mr-2" /> Details
                              </Button>
                              <Button 
                                size="sm" 
                                className="flex-1 bg-almona-orange/20 text-almona-orange hover:bg-almona-orange/30 border-almona-orange/30"
                                onClick={() => navigate('/support/tickets/new', { state: { machineId: machine.id } })}
                              >
                                <FileText className="h-4 w-4 mr-2" /> Support
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <motion.div 
                    variants={itemVariants}
                    className="text-center py-16 border-2 border-dashed border-almona-light/20 rounded-lg bg-almona-dark/40"
                  >
                    <Package className="h-16 w-16 text-gray-500 mx-auto mb-4 opacity-60" />
                    <h3 className="text-lg font-medium text-gray-400 mb-2">No machines registered yet</h3>
                    <p className="text-gray-500 mb-6">Register your first machine to get started with support and services</p>
                    <Button 
                      className="bg-gradient-orange hover:bg-almona-orange-dark text-white"
                      onClick={() => navigate('/portal/register-machine')}
                    >
                      <Plus className="h-4 w-4 mr-2" /> Register Machine
                    </Button>
                  </motion.div>
                )}
              </motion.div>
            </TabsContent>

            <TabsContent value="support">
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-6"
              >
                <motion.div variants={itemVariants} className="flex justify-between items-center flex-wrap gap-4">
                  <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input 
                      placeholder="Search tickets..." 
                      className="pl-10 bg-almona-dark/60 border-almona-light/30 focus:border-almona-orange/50"
                    />
                  </div>
                  <Button 
                    className="bg-gradient-orange hover:bg-almona-orange-dark text-white"
                    onClick={() => navigate('/support/tickets/new')}
                  >
                    <Plus className="h-4 w-4 mr-2" /> Create New Ticket
                  </Button>
                </motion.div>

                {tickets && tickets.length > 0 ? (
                  <div className="space-y-4">
                    {tickets.map((ticket, index) => (
                      <motion.div 
                        key={ticket.id}
                        variants={itemVariants}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <Card className="bg-almona-dark/60 border-almona-light/20 backdrop-blur-sm hover:border-almona-orange/50 transition-colors group cursor-pointer"
                          onClick={() => navigate(`/support/tickets/${ticket.id}`)}
                        >
                          <CardContent className="p-6">
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <h3 className="font-semibold text-lg group-hover:text-almona-orange transition-colors">
                                  {ticket.title}
                                </h3>
                                <p className="text-gray-400 text-sm">#{ticket.ticket_number || ticket.id.slice(-8).toUpperCase()}</p>
                              </div>
                              {getStatusBadge(ticket.status || 'open')}
                            </div>
                            <p className="text-gray-300 mb-4 line-clamp-2">{ticket.description}</p>
                            <div className="flex justify-between items-center text-sm text-gray-400">
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-1" />
                                Created: {new Date(ticket.created_at).toLocaleDateString()}
                              </div>
                              <div className="flex items-center">
                                <Clock className="h-4 w-4 mr-1" />
                                Updated: {new Date(ticket.updated_at).toLocaleDateString()}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <motion.div 
                    variants={itemVariants}
                    className="text-center py-16 border-2 border-dashed border-almona-light/20 rounded-lg bg-almona-dark/40"
                  >
                    <FileText className="h-16 w-16 text-gray-500 mx-auto mb-4 opacity-60" />
                    <h3 className="text-lg font-medium text-gray-400 mb-2">No support tickets yet</h3>
                    <p className="text-gray-500 mb-6">Create your first support ticket to get help with your machines</p>
                    <Button 
                      className="bg-gradient-orange hover:bg-almona-orange-dark text-white"
                      onClick={() => navigate('/support/tickets/new')}
                    >
                      <Plus className="h-4 w-4 mr-2" /> Create Ticket
                    </Button>
                  </motion.div>
                )}
              </motion.div>
            </TabsContent>

            <TabsContent value="documents">
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-6"
              >
                <motion.div variants={itemVariants} className="relative w-full md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input 
                    placeholder="Search documents..." 
                    className="pl-10 bg-almona-dark/60 border-almona-light/30 focus:border-almona-orange/50"
                  />
                </motion.div>

                {documents && documents.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {documents.map((document, index) => (
                      <motion.div 
                        key={document.id}
                        variants={itemVariants}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <Card className="bg-almona-dark/60 border-almona-light/20 backdrop-blur-sm hover:border-almona-orange/50 transition-colors h-full group">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg group-hover:text-almona-orange transition-colors">
                              {document.title}
                            </CardTitle>
                            <CardDescription className="text-gray-400 capitalize">{document.type}</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="flex justify-between items-center text-sm text-gray-400 mb-4">
                              <span>Uploaded: {new Date(document.upload_date).toLocaleDateString()}</span>
                              <span>{document.size}</span>
                            </div>
                            <Button 
                              variant="outline" 
                              className="w-full border-almona-light/30 text-almona-light hover:bg-almona-light/10 group-hover:border-almona-orange/50"
                              onClick={() => window.open(document.url, '_blank')}
                            >
                              <Download className="h-4 w-4 mr-2" /> Download
                            </Button>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <motion.div 
                    variants={itemVariants}
                    className="text-center py-16 border-2 border-dashed border-almona-light/20 rounded-lg bg-almona-dark/40"
                  >
                    <FileText className="h-16 w-16 text-gray-500 mx-auto mb-4 opacity-60" />
                    <h3 className="text-lg font-medium text-gray-400 mb-2">No documents available</h3>
                    <p className="text-gray-500">Your manuals, warranties, and other documents will appear here</p>
                  </motion.div>
                )}
              </motion.div>
            </TabsContent>
          </Tabs>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12"
          >
            <Card className="bg-almona-dark/60 border-almona-light/20 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  <Package className="h-5 w-5 mr-2 text-almona-orange" /> Registered Machines
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{machines?.length || 0}</p>
                <p className="text-sm text-gray-400 mt-1">Total machines in your account</p>
              </CardContent>
            </Card>

            <Card className="bg-almona-dark/60 border-almona-light/20 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-almona-orange" /> Active Tickets
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{tickets?.filter(t => t.status !== 'resolved' && t.status !== 'closed').length || 0}</p>
                <p className="text-sm text-gray-400 mt-1">Open support requests</p>
              </CardContent>
            </Card>

            <Card className="bg-almona-dark/60 border-almona-light/20 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  <Download className="h-5 w-5 mr-2 text-almona-orange" /> Documents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{documents?.length || 0}</p>
                <p className="text-sm text-gray-400 mt-1">Available manuals & resources</p>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
};

const CustomerPortalWithErrorBoundary = withErrorBoundary(CustomerPortal);
export default CustomerPortalWithErrorBoundary;
