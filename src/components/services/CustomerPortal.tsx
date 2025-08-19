import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Clock4
} from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

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

  const { data: documents, isLoading: isLoadingDocuments, error: documentsError } = useQuery({
    queryKey: ['documents', user?.id],
    queryFn: () => api.fetchUserDocuments(user!.id),
    enabled: !!user,
  });

  if (isLoadingMachines || isLoadingTickets || isLoadingDocuments) {
    return (
      <div className="flex flex-col min-h-screen bg-almona-dark">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-almona-orange"></div>
        </div>
      </div>
    );
  }

  if (machinesError) {
    toast.error(machinesError.message || 'Failed to fetch machines.');
  }

  if (ticketsError) {
    toast.error(ticketsError.message || 'Failed to fetch tickets.');
  }

  if (documentsError) {
    toast.error(documentsError.message || 'Failed to fetch documents.');
  }

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open':
        return <Badge variant="outline" className="bg-blue-500/20 text-blue-300 border-blue-500/50"><Clock4 className="h-3 w-3 mr-1" /> Open</Badge>;
      case 'in progress':
        return <Badge variant="outline" className="bg-amber-500/20 text-amber-300 border-amber-500/50"><Clock className="h-3 w-3 mr-1" /> In Progress</Badge>;
      case 'resolved':
        return <Badge variant="outline" className="bg-green-500/20 text-green-300 border-green-500/50"><CheckCircle className="h-3 w-3 mr-1" /> Resolved</Badge>;
      case 'urgent':
        return <Badge variant="outline" className="bg-red-500/20 text-red-300 border-red-500/50"><AlertTriangle className="h-3 w-3 mr-1" /> Urgent</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: 'spring', stiffness: 100 }
    }
  };

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
            <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.name || user?.email}</h1>
            <p className="text-gray-400">Manage your machines, support tickets, and account details</p>
          </div>

          <Tabs defaultValue="machines" className="mb-8">
            <TabsList className="grid w-full grid-cols-3 bg-almona-dark/80 rounded-lg p-1">
              <TabsTrigger value="machines" className="data-[state=active]:bg-almona-orange data-[state=active]:text-white rounded-md py-3">My Machines</TabsTrigger>
              <TabsTrigger value="support" className="data-[state=active]:bg-almona-orange data-[state=active]:text-white rounded-md py-3">Support Tickets</TabsTrigger>
              <TabsTrigger value="documents" className="data-[state=active]:bg-almona-orange data-[state=active]:text-white rounded-md py-3">Documents</TabsTrigger>
            </TabsList>

            <TabsContent value="machines">
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-6"
              >
                <motion.div variants={itemVariants} className="flex justify-between items-center">
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input placeholder="Search machines..." className="pl-10 bg-almona-dark/60 border-almona-light/30" />
                  </div>
                  <Button className="bg-gradient-orange hover:bg-almona-orange-dark text-white">
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
                        <Card className="bg-almona-dark/60 border-almona-light/20 backdrop-blur-sm hover:border-almona-orange/50 transition-colors h-full">
                          <CardHeader className="pb-3">
                            <div className="flex justify-between items-start">
                              <CardTitle className="text-xl">{machine.name}</CardTitle>
                              <Badge variant="secondary" className="bg-green-500/20 text-green-300 border-green-500/50">Active</Badge>
                            </div>
                            <CardDescription className="text-gray-400">{machine.model}</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-400">Serial Number:</span>
                                <span className="font-mono">{machine.serialNumber || 'N/A'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Installation Date:</span>
                                <span>{machine.installationDate || 'N/A'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Warranty:</span>
                                <span className="text-green-400">Active until 2025</span>
                              </div>
                            </div>
                            <div className="flex gap-2 mt-4 pt-4 border-t border-almona-light/10">
                              <Button variant="outline" size="sm" className="flex-1 border-almona-light/30 text-almona-light hover:bg-almona-light/10">
                                <Wrench className="h-4 w-4 mr-2" /> Service History
                              </Button>
                              <Button size="sm" className="flex-1 bg-almona-orange/20 text-almona-orange hover:bg-almona-orange/30 border-almona-orange/30">
                                <FileText className="h-4 w-4 mr-2" /> Manuals
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
                    className="text-center py-12 border border-dashed border-almona-light/30 rounded-lg"
                  >
                    <Package className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-400 mb-2">No machines registered yet</h3>
                    <p className="text-gray-500 mb-4">Register your first machine to get started with support and services</p>
                    <Button className="bg-gradient-orange hover:bg-almona-orange-dark text-white">
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
                <motion.div variants={itemVariants} className="flex justify-between items-center">
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input placeholder="Search tickets..." className="pl-10 bg-almona-dark/60 border-almona-light/30" />
                  </div>
                  <Button className="bg-gradient-orange hover:bg-almona-orange-dark text-white">
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
                        <Card className="bg-almona-dark/60 border-almona-light/20 backdrop-blur-sm hover:border-almona-orange/50 transition-colors">
                          <CardContent className="p-6">
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <h3 className="font-semibold text-lg">{ticket.subject}</h3>
                                <p className="text-gray-400 text-sm">Ticket #{ticket.id.slice(0, 8)}</p>
                              </div>
                              {getStatusBadge(ticket.status)}
                            </div>
                            <p className="text-gray-300 mb-4">{ticket.description}</p>
                            <div className="flex justify-between items-center text-sm text-gray-400">
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-1" />
                                Created: {new Date(ticket.createdAt).toLocaleDateString()}
                              </div>
                              <div className="flex items-center">
                                <Clock className="h-4 w-4 mr-1" />
                                Last updated: {new Date(ticket.updatedAt).toLocaleDateString()}
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
                    className="text-center py-12 border border-dashed border-almona-light/30 rounded-lg"
                  >
                    <FileText className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-400 mb-2">No support tickets yet</h3>
                    <p className="text-gray-500 mb-4">Create your first support ticket to get help with your machines</p>
                    <Button className="bg-gradient-orange hover:bg-almona-orange-dark text-white">
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
                <motion.div variants={itemVariants} className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input placeholder="Search documents..." className="pl-10 bg-almona-dark/60 border-almona-light/30" />
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
                        <Card className="bg-almona-dark/60 border-almona-light/20 backdrop-blur-sm hover:border-almona-orange/50 transition-colors h-full">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg">{document.title}</CardTitle>
                            <CardDescription className="text-gray-400">{document.type}</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="flex justify-between items-center text-sm text-gray-400 mb-4">
                              <span>Uploaded: {new Date(document.uploadDate).toLocaleDateString()}</span>
                              <span>{document.size}</span>
                            </div>
                            <Button variant="outline" className="w-full border-almona-light/30 text-almona-light hover:bg-almona-light/10">
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
                    className="text-center py-12 border border-dashed border-almona-light/30 rounded-lg"
                  >
                    <FileText className="h-12 w-12 text-gray-500 mx-auto mb-4" />
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
                <p className="text-3xl font-bold">{tickets?.filter(t => t.status !== 'resolved').length || 0}</p>
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

export default CustomerPortal;