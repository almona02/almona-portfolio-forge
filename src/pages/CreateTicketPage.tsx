import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { useNavigate, useLocation } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { ArrowLeft, AlertCircle, HelpCircle, Upload, FileText, Clock, Calendar, Wrench, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from '@tanstack/react-query';
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/shared/ui/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { TicketContext, TicketPrefill } from '@/lib/ticketing/unifiedTicketing';

const ticketSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters long").max(200, "Title too long"),
  description: z.string().min(10, "Description must be at least 10 characters long").max(2000, "Description too long"),
  type: z.enum(['general', 'technical', 'installation', 'maintenance', 'spare_parts', 'warranty', 'billing', 'other']),
  priority: z.enum(['low', 'medium', 'high', 'urgent', 'critical']),
  machine_id: z.string().optional(),
  maintenance_type: z.enum(['preventive', 'corrective', 'emergency']).optional(),
  scheduled_date: z.string().optional(),
});

type TicketFormData = z.infer<typeof ticketSchema>;

const CreateTicketPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  interface LocationStateShape { prefill?: Partial<TicketFormData>; context?: TicketContext; machineId?: string }
  const ls = location.state as LocationStateShape | null;
  const preselectedMachineId = ls?.machineId;
  const ticketContext = ls?.context;
  const [activeTab, setActiveTab] = useState("details");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const { data: machines, isLoading: isLoadingMachines } = useQuery({
    queryKey: ['machines', user?.id],
    queryFn: () => api.fetchUserMachines(user!.id),
    enabled: !!user,
  });

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
    reset
  } = useForm<TicketFormData>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      type: ls?.prefill?.type || 'technical',
      priority: ls?.prefill?.priority || 'medium',
      machine_id: preselectedMachineId || ls?.prefill?.machine_id || '',
      maintenance_type: ls?.prefill?.maintenance_type || 'corrective',
    },
  });

  const selectedPriority = watch('priority');
  const selectedType = watch('type');
  const selectedMachineId = watch('machine_id');
  const selectedMaintenanceType = watch('maintenance_type');
  // Apply pre-filled data passed via navigation state (e.g., from Services page)
  useEffect(() => {
    type Prefill = Partial<TicketFormData>;
  const stateObj = ls;
  const prefill = stateObj?.prefill as Prefill | undefined;
    if (prefill) {
      reset(prev => ({ ...prev, ...prefill }));
    }
  }, [ls, reset]);

  // Optionally display context meta (non-editable) near header for transparency
  // (Minimal UI note, can be expanded later)

  const selectedMachine = machines?.find(m => m.id === selectedMachineId);

  const priorityColors = {
    low: 'bg-blue-500/20 text-blue-300 border-blue-500/50',
    medium: 'bg-green-500/20 text-green-300 border-green-500/50',
    high: 'bg-amber-500/20 text-amber-300 border-amber-500/50',
    urgent: 'bg-orange-500/20 text-orange-300 border-orange-500/50',
    critical: 'bg-red-500/20 text-red-300 border-red-500/50'
  };

  const priorityIcons = {
    low: <Clock className="h-4 w-4" />,
    medium: <Calendar className="h-4 w-4" />,
    high: <AlertTriangle className="h-4 w-4" />,
    urgent: <AlertTriangle className="h-4 w-4" />,
    critical: <AlertTriangle className="h-4 w-4" />
  };

  const typeDescriptions = {
    general: "General inquiries and information requests",
    technical: "Technical issues with equipment or software",
    installation: "Equipment installation and setup assistance",
    maintenance: "Scheduled or emergency maintenance requests",
    spare_parts: "Replacement parts and component requests",
    warranty: "Warranty claims and coverage questions",
    billing: "Invoice and payment-related questions",
    other: "Other types of support requests"
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      setIsUploading(true);
      // Simulate upload process
      setTimeout(() => {
        setUploadedFiles(prev => [...prev, ...files]);
        setIsUploading(false);
      }, 1000);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: TicketFormData) => {
    if (!user) {
      toast.error("You must be logged in to create a ticket.");
      return;
    }

    try {
      await api.createTicket({
        user_id: user.id,
        title: data.title,
        description: data.description,
        type: data.type,
        priority: data.priority,
        machine_id: data.machine_id || undefined,
        maintenance_type: data.maintenance_type,
        scheduled_date: data.scheduled_date,
        status: 'open',
        attachments: uploadedFiles,
        source: ticketContext?.source || 'portal',
        context: ticketContext ? { ...ticketContext } : undefined
      });

      toast.success("Support ticket created successfully!");
      navigate("/portal", { 
        state: { 
          message: "Ticket created successfully! We'll get back to you soon." 
        } 
      });
    } catch (error: unknown) {
      console.error('Ticket creation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to create ticket: ${errorMessage || 'Please try again later.'}`);
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col min-h-screen bg-almona-dark text-white">
        <Navbar />
        <main className="flex-grow pt-24 pb-12">
          <div className="container mx-auto px-4">
            <Card className="max-w-2xl mx-auto bg-almona-dark/60 border-almona-light/20">
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 text-almona-orange mx-auto mb-4" />
                  <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
                  <p className="text-gray-400 mb-4">Please log in to create a support ticket</p>
                  <Link to="/login" className="text-almona-orange hover:underline">
                    Go to Login
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-almona-dark text-white">
      <Navbar />
      <main className="flex-grow pt-24 pb-12">
        <div className="container mx-auto px-4">
          <div className="mb-6">
            <Link 
              to="/portal" 
              className="inline-flex items-center text-almona-orange hover:text-almona-orange-dark mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Portal
            </Link>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="max-w-4xl mx-auto bg-almona-dark/60 border-almona-light/20">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl bg-gradient-orange bg-clip-text text-transparent">
                  Create Support Ticket
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Describe your issue and we'll help you resolve it as quickly as possible
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
                  <TabsList className="grid w-full grid-cols-3 bg-almona-darker/60 border border-almona-light/20">
                    <TabsTrigger value="details">Ticket Details</TabsTrigger>
                    <TabsTrigger value="attachments">Attachments</TabsTrigger>
                    <TabsTrigger value="preview">Preview</TabsTrigger>
                  </TabsList>
                </Tabs>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <AnimatePresence mode="wait">
                    {activeTab === "details" && (
                      <motion.div
                        key="details"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-6"
                      >
                        {/* Machine Selection */}
                        {machines && machines.length > 0 && (
                          <div className="space-y-2">
                            <Label htmlFor="machine_id">Related Machine (Optional)</Label>
                            <Controller
                              name="machine_id"
                              control={control}
                              render={({ field }) => (
                                <Select 
                                  value={field.value} 
                                  onValueChange={field.onChange}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a machine" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="">Not related to a specific machine</SelectItem>
                                    {machines.map((machine) => (
                                      <SelectItem key={machine.id} value={machine.id}>
                                        {machine.name} - {machine.model}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            />
                          </div>
                        )}

                        {/* Ticket Type */}
                        <div className="space-y-2">
                          <Label htmlFor="type">Ticket Type</Label>
                          <Controller
                            name="type"
                            control={control}
                            render={({ field }) => (
                              <Select 
                                value={field.value} 
                                onValueChange={field.onChange}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select ticket type" />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(typeDescriptions).map(([value, description]) => (
                                    <SelectItem key={value} value={value}>
                                      <>
                                        <div className="font-medium capitalize">{value.replace('_', ' ')}</div>
                                        <div className="text-sm text-gray-400">{description}</div>
                                      </>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                          {errors.type && <p className="text-red-400 text-sm">{errors.type.message}</p>}
                        </div>

                        {/* Maintenance Type (only show if type is maintenance) */}
                        {selectedType === 'maintenance' && (
                          <div className="space-y-2">
                            <Label htmlFor="maintenance_type">Maintenance Type</Label>
                            <Controller
                              name="maintenance_type"
                              control={control}
                              render={({ field }) => (
                                <Select 
                                  value={field.value} 
                                  onValueChange={field.onChange}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select maintenance type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="preventive">
                                      <div className="flex items-center">
                                        <Wrench className="h-4 w-4 mr-2 text-green-400" />
                                        <span>Preventive Maintenance</span>
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="corrective">
                                      <div className="flex items-center">
                                        <Wrench className="h-4 w-4 mr-2 text-amber-400" />
                                        <span>Corrective Maintenance</span>
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="emergency">
                                      <div className="flex items-center">
                                        <AlertTriangle className="h-4 w-4 mr-2 text-red-400" />
                                        <span>Emergency Maintenance</span>
                                      </div>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                            />
                          </div>
                        )}

                        {/* Priority */}
                        <div className="space-y-2">
                          <Label htmlFor="priority">Priority</Label>
                          <Controller
                            name="priority"
                            control={control}
                            render={({ field }) => (
                              <Select 
                                value={field.value} 
                                onValueChange={field.onChange}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select priority" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="low">
                                    <div className="flex items-center">
                                      <Badge variant="outline" className="bg-blue-500/20 text-blue-300 border-blue-500/50 mr-2">Low</Badge>
                                      <span>Non-urgent issues</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="medium">
                                    <div className="flex items-center">
                                      <Badge variant="outline" className="bg-green-500/20 text-green-300 border-green-500/50 mr-2">Medium</Badge>
                                      <span>Normal priority issues</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="high">
                                    <div className="flex items-center">
                                      <Badge variant="outline" className="bg-amber-500/20 text-amber-300 border-amber-500/50 mr-2">High</Badge>
                                      <span>Important issues</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="urgent">
                                    <div className="flex items-center">
                                      <Badge variant="outline" className="bg-orange-500/20 text-orange-300 border-orange-500/50 mr-2">Urgent</Badge>
                                      <span>Time-sensitive issues</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="critical">
                                    <div className="flex items-center">
                                      <Badge variant="outline" className="bg-red-500/20 text-red-300 border-red-500/50 mr-2">Critical</Badge>
                                      <span>Production-stopping emergencies</span>
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          />
                          {errors.priority && <p className="text-red-400 text-sm">{errors.priority.message}</p>}
                        </div>

                        {/* Title */}
                        <div className="space-y-2">
                          <Label htmlFor="title">
                            Title <span className="text-almona-orange">*</span>
                          </Label>
                          <Controller
                            name="title"
                            control={control}
                            render={({ field }) => (
                              <Input
                                id="title"
                                placeholder="Brief description of your issue"
                                {...field}
                                className="bg-almona-darker border-almona-light/30 focus:border-almona-orange/50"
                              />
                            )}
                          />
                          {errors.title && <p className="text-red-400 text-sm">{errors.title.message}</p>}
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                          <Label htmlFor="description">
                            Description <span className="text-almona-orange">*</span>
                          </Label>
                          <Controller
                            name="description"
                            control={control}
                            render={({ field }) => (
                              <Textarea
                                id="description"
                                placeholder="Please provide detailed information about your issue, including any error messages, steps to reproduce, and what you've already tried..."
                                {...field}
                                className="bg-almona-darker border-almona-light/30 focus:border-almona-orange/50 min-h-32"
                                rows={6}
                              />
                            )}
                          />
                          {errors.description && <p className="text-red-400 text-sm">{errors.description.message}</p>}
                          <p className="text-sm text-gray-400">
                            Include details like: error messages, when the issue started, what you were doing when it occurred, etc.
                          </p>
                        </div>

                        {/* Priority Indicator */}
                        {selectedPriority && (
                          <div className={`p-4 rounded-lg border ${priorityColors[selectedPriority]}`}>
                            <div className="flex items-center">
                              {priorityIcons[selectedPriority]}
                              <span className="font-medium ml-2">
                                {selectedPriority === 'critical' || selectedPriority === 'urgent' 
                                  ? 'Emergency Support Alerted' 
                                  : 'Normal Processing'
                                }
                              </span>
                            </div>
                            <p className="text-sm mt-1">
                              {selectedPriority === 'critical' 
                                ? 'Our emergency support team has been notified and will contact you immediately.'
                                : selectedPriority === 'urgent'
                                ? 'Our support team will prioritize your ticket and respond within 2 hours.'
                                : 'Your ticket will be processed during normal business hours.'
                              }
                            </p>
                          </div>
                        )}

                        <div className="flex justify-between">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setActiveTab("attachments")}
                            className="border-almona-orange text-almona-orange hover:bg-almona-orange/10"
                          >
                            Next: Add Attachments
                          </Button>
                        </div>
                      </motion.div>
                    )}

                    {activeTab === "attachments" && (
                      <motion.div
                        key="attachments"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-6"
                      >
                        <div className="space-y-4">
                          <Label>Attachments (Optional)</Label>
                          <div className="border-2 border-dashed border-almona-light/30 rounded-lg p-8 text-center">
                            <Upload className="h-12 w-12 text-almona-orange mx-auto mb-4" />
                            <p className="text-gray-400 mb-4">Drag and drop files here, or click to browse</p>
                            <Input
                              type="file"
                              multiple
                              onChange={handleFileUpload}
                              className="hidden"
                              id="file-upload"
                            />
                            <Label
                              htmlFor="file-upload"
                              className="cursor-pointer bg-almona-orange text-white px-6 py-2 rounded-lg hover:bg-almona-orange-dark transition-colors"
                            >
                              Browse Files
                            </Label>
                          </div>

                          {isUploading && (
                            <div className="space-y-2">
                              <Progress value={50} className="w-full" />
                              <p className="text-sm text-gray-400">Uploading files...</p>
                            </div>
                          )}

                          {uploadedFiles.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="font-medium">Uploaded Files:</h4>
                              {uploadedFiles.map((file, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-almona-darker rounded-lg">
                                  <div className="flex items-center">
                                    <FileText className="h-4 w-4 mr-2" />
                                    <span className="text-sm">{file.name}</span>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeFile(index)}
                                    className="text-red-400 hover:text-red-300"
                                  >
                                    Remove
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex justify-between">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setActiveTab("details")}
                          >
                            Back to Details
                          </Button>
                          <Button
                            type="button"
                            onClick={() => setActiveTab("preview")}
                            className="bg-almona-orange hover:bg-almona-orange-dark"
                          >
                            Preview Ticket
                          </Button>
                        </div>
                      </motion.div>
                    )}

                    {activeTab === "preview" && (
                      <motion.div
                        key="preview"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-6"
                      >
                        <div className="bg-almona-darker/50 p-6 rounded-lg">
                          <h3 className="text-lg font-semibold mb-4">Ticket Preview</h3>
                          
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                              <Label className="text-gray-400">Type</Label>
                              <p className="capitalize">{watch('type')?.replace('_', ' ')}</p>
                            </div>
                            <div>
                              <Label className="text-gray-400">Priority</Label>
                              <Badge className={priorityColors[watch('priority')]}>
                                {watch('priority')}
                              </Badge>
                            </div>
                            {watch('machine_id') && (
                              <div className="col-span-2">
                                <Label className="text-gray-400">Machine</Label>
                                <p>{selectedMachine?.name} - {selectedMachine?.model}</p>
                              </div>
                            )}
                          </div>

                          <div className="mb-4">
                            <Label className="text-gray-400">Title</Label>
                            <p className="font-medium">{watch('title')}</p>
                          </div>

                          <div className="mb-4">
                            <Label className="text-gray-400">Description</Label>
                            <p className="text-sm whitespace-pre-wrap">{watch('description')}</p>
                          </div>

                          {uploadedFiles.length > 0 && (
                            <div>
                              <Label className="text-gray-400">Attachments</Label>
                              <div className="space-y-1">
                                {uploadedFiles.map((file, index) => (
                                  <div key={index} className="flex items-center text-sm">
                                    <FileText className="h-3 w-3 mr-1" />
                                    {file.name}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex justify-between">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setActiveTab("attachments")}
                          >
                            Back to Attachments
                          </Button>
                          <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-gradient-orange hover:bg-almona-orange-dark text-white py-3 px-6"
                          >
                            {isSubmitting ? (
                              <div className="flex items-center">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Creating Ticket...
                              </div>
                            ) : (
                              "Create Support Ticket"
                            )}
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CreateTicketPage;