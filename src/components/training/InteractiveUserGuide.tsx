import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play,
  Pause,
  SkipForward,
  SkipBack,
  CheckCircle,
  Circle,
  HelpCircle,
  BookOpen,
  Video,
  MousePointer,
  Smartphone,
  Monitor,
  Zap,
  Target,
  Award,
  ArrowRight,
  ArrowLeft,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { performanceMonitor } from '@/lib/performance-monitoring';

// Training modules configuration
interface TrainingModule {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  category: 'basics' | 'advanced' | 'mobile' | 'iot' | 'ai';
  duration: number; // minutes
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  steps: TrainingStep[];
  prerequisites?: string[];
  completionReward: string;
}

interface TrainingStep {
  id: string;
  title: string;
  description: string;
  type: 'tutorial' | 'interactive' | 'quiz' | 'practice';
  content: string;
  targetElement?: string; // CSS selector for highlighting
  action?: 'click' | 'type' | 'scroll' | 'wait';
  expectedResult?: string;
  hints?: string[];
  media?: {
    type: 'image' | 'video' | 'gif';
    url: string;
    caption?: string;
  };
}

interface UserProgress {
  userId: string;
  moduleId: string;
  completedSteps: string[];
  currentStep: number;
  completionPercentage: number;
  startedAt: Date;
  lastAccessedAt: Date;
  completedAt?: Date;
  score?: number;
}

// Training modules data
const TRAINING_MODULES: TrainingModule[] = [
  {
    id: 'customer-portal-basics',
    title: 'Customer Portal Essentials',
    description: 'Learn to navigate and use the enhanced customer portal with machine health monitoring',
    icon: <Monitor className="h-5 w-5" />,
    category: 'basics',
    duration: 15,
    difficulty: 'beginner',
    completionReward: 'Portal Expert Badge',
    steps: [
      {
        id: 'portal-login',
        title: 'Accessing Your Portal',
        description: 'Learn how to log in and navigate to the customer portal',
        type: 'tutorial',
        content: 'The customer portal is your central hub for monitoring machines, managing tickets, and accessing support. Click the login button and enter your credentials.',
        targetElement: '[data-testid="login-button"]',
        action: 'click',
        hints: ['Look for the orange "Login" button in the navigation bar']
      },
      {
        id: 'health-dashboard',
        title: 'Machine Health Dashboard',
        description: 'Explore the new real-time machine health monitoring features',
        type: 'interactive',
        content: 'Navigate to the Health Dashboard tab to see real-time machine metrics including temperature, pressure, and efficiency ratings.',
        targetElement: '[data-value="health"]',
        action: 'click',
        media: {
          type: 'gif',
          url: '/training/health-dashboard-demo.gif',
          caption: 'Real-time machine health monitoring'
        }
      },
      {
        id: 'machine-selection',
        title: 'Selecting and Monitoring Machines',
        description: 'Learn to select different machines and view their detailed metrics',
        type: 'practice',
        content: 'Click on different machines in the left panel to view their individual health metrics, alerts, and maintenance schedules.',
        hints: ['Each machine shows its current status with color-coded indicators']
      }
    ]
  },
  {
    id: 'ai-chatbot-training',
    title: 'AI Technical Support Assistant',
    description: 'Master the AI-powered chatbot for instant technical support and emergency assistance',
    icon: <Zap className="h-5 w-5" />,
    category: 'ai',
    duration: 20,
    difficulty: 'intermediate',
    completionReward: 'AI Support Expert Badge',
    steps: [
      {
        id: 'chatbot-activation',
        title: 'Opening the AI Assistant',
        description: 'Learn to access and initialize the AI technical support chatbot',
        type: 'tutorial',
        content: 'Click the floating AI bot button in the bottom-right corner to open the 24/7 technical support assistant.',
        targetElement: '[data-testid="ai-chatbot-button"]',
        action: 'click'
      },
      {
        id: 'emergency-support',
        title: 'Emergency Issue Reporting',
        description: 'Practice reporting critical machine issues for immediate assistance',
        type: 'interactive',
        content: 'Click on "🚨 Emergency shutdown" to learn the emergency escalation process for critical machine issues.',
        targetElement: '[data-testid="emergency-response"]',
        action: 'click',
        expectedResult: 'Emergency protocol activated with technician contact information'
      },
      {
        id: 'part-identification',
        title: 'AI-Powered Part Recognition',
        description: 'Use camera integration to identify spare parts with AI assistance',
        type: 'practice',
        content: 'Take a photo of a machine part using the camera button to get instant AI-powered identification and ordering information.',
        hints: ['Ensure good lighting and clear view of the part for best results']
      }
    ]
  },
  {
    id: 'mobile-pwa-mastery',
    title: 'Mobile PWA & Offline Features',
    description: 'Master mobile Progressive Web App features including offline ticket creation',
    icon: <Smartphone className="h-5 w-5" />,
    category: 'mobile',
    duration: 25,
    difficulty: 'intermediate',
    completionReward: 'Mobile Expert Badge',
    steps: [
      {
        id: 'pwa-installation',
        title: 'Installing the Mobile App',
        description: 'Learn to install the Almona PWA on your mobile device',
        type: 'tutorial',
        content: 'When prompted, tap "Add to Home Screen" to install the Almona app for offline access and push notifications.',
        media: {
          type: 'image',
          url: '/training/pwa-install-steps.png',
          caption: 'PWA installation process'
        }
      },
      {
        id: 'offline-ticket-creation',
        title: 'Creating Tickets Offline',
        description: 'Practice creating service tickets without internet connection',
        type: 'interactive',
        content: 'Use the mobile ticket creator to submit service requests even when offline. Your tickets will sync automatically when connection is restored.',
        targetElement: '[data-testid="mobile-ticket-fab"]',
        action: 'click'
      },
      {
        id: 'camera-integration',
        title: 'Camera & Audio Features',
        description: 'Learn to capture photos and voice notes for comprehensive ticket documentation',
        type: 'practice',
        content: 'Practice using the camera to capture machine issues and voice recording for detailed problem descriptions.',
        hints: ['Voice notes in Arabic are fully supported for local technicians']
      }
    ]
  },
  {
    id: 'iot-monitoring-advanced',
    title: 'IoT Sensor Monitoring',
    description: 'Advanced training on Industry 4.0 IoT sensor integration and predictive maintenance',
    icon: <Target className="h-5 w-5" />,
    category: 'iot',
    duration: 30,
    difficulty: 'advanced',
    completionReward: 'Industry 4.0 Expert Badge',
    prerequisites: ['customer-portal-basics'],
    steps: [
      {
        id: 'sensor-dashboard',
        title: 'Real-Time Sensor Data',
        description: 'Learn to interpret live sensor readings and trend analysis',
        type: 'tutorial',
        content: 'Navigate to the IoT Sensors tab to view real-time temperature, pressure, vibration, and electrical data from your machines.',
        targetElement: '[data-value="iot"]',
        action: 'click'
      },
      {
        id: 'predictive-maintenance',
        title: 'Predictive Maintenance Insights',
        description: 'Understand ML-powered failure predictions and maintenance scheduling',
        type: 'interactive',
        content: 'Review the predictive maintenance panel to see AI-generated forecasts for potential component failures and recommended actions.',
        expectedResult: 'Maintenance predictions displayed with confidence levels and timelines'
      },
      {
        id: 'alert-management',
        title: 'Managing IoT Alerts',
        description: 'Learn to respond to and acknowledge sensor threshold alerts',
        type: 'practice',
        content: 'Practice acknowledging sensor alerts and understanding when to escalate to emergency technician support.',
        hints: ['Critical alerts require immediate attention and may trigger automatic emergency protocols']
      }
    ]
  }
];

// Main Interactive User Guide Component
export const InteractiveUserGuide: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  initialModule?: string;
}> = ({ isOpen, onClose, initialModule }) => {
  const [selectedModule, setSelectedModule] = useState<TrainingModule | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [isPlaying, setIsPlaying] = useState(false);
  const [userProgress, setUserProgress] = useState<Map<string, UserProgress>>(new Map());
  
  const highlightRef = useRef<HTMLElement | null>(null);
  const spotlightRef = useRef<HTMLDivElement | null>(null);

  // Initialize with module if provided
  useEffect(() => {
    if (initialModule && isOpen) {
      const module = TRAINING_MODULES.find(m => m.id === initialModule);
      if (module) {
        setSelectedModule(module);
      }
    }
  }, [initialModule, isOpen]);

  // Track training usage
  useEffect(() => {
    if (selectedModule) {
      performanceMonitor.recordFeatureUsage(
        'user_training',
        'module_started',
        true,
        { module_id: selectedModule.id }
      );
    }
  }, [selectedModule]);

  // Spotlight effect for guided tutorials
  const createSpotlight = (element: HTMLElement) => {
    if (spotlightRef.current) {
      const rect = element.getBoundingClientRect();
      const spotlight = spotlightRef.current;
      
      spotlight.style.display = 'block';
      spotlight.style.left = `${rect.left - 10}px`;
      spotlight.style.top = `${rect.top - 10}px`;
      spotlight.style.width = `${rect.width + 20}px`;
      spotlight.style.height = `${rect.height + 20}px`;
    }
  };

  // Clear spotlight
  const clearSpotlight = () => {
    if (spotlightRef.current) {
      spotlightRef.current.style.display = 'none';
    }
  };

  // Handle step completion
  const completeStep = (stepId: string) => {
    setCompletedSteps(prev => new Set([...prev, stepId]));
    
    // Track step completion
    performanceMonitor.recordFeatureUsage(
      'user_training',
      'step_completed',
      true,
      { 
        module_id: selectedModule?.id,
        step_id: stepId,
        step_number: currentStep + 1
      }
    );

    toast.success('Step completed! 🎉');
    
    // Auto-advance to next step
    setTimeout(() => {
      if (selectedModule && currentStep < selectedModule.steps.length - 1) {
        setCurrentStep(prev => prev + 1);
      } else {
        // Module completed
        completeModule();
      }
    }, 1000);
  };

  // Complete entire module
  const completeModule = () => {
    if (!selectedModule) return;

    performanceMonitor.recordFeatureUsage(
      'user_training',
      'module_completed',
      true,
      { 
        module_id: selectedModule.id,
        completion_time: Date.now(),
        total_steps: selectedModule.steps.length
      }
    );

    toast.success(`🏆 Congratulations! You earned the "${selectedModule.completionReward}"!`, {
      duration: 5000
    });

    // Reset for next module
    setSelectedModule(null);
    setCurrentStep(0);
    setCompletedSteps(new Set());
    clearSpotlight();
  };

  // Navigation functions
  const nextStep = () => {
    if (selectedModule && currentStep < selectedModule.steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // Get difficulty color
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-500/20 text-green-300 border-green-500/50';
      case 'intermediate': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50';
      case 'advanced': return 'bg-red-500/20 text-red-300 border-red-500/50';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/50';
    }
  };

  // Get category icon
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'basics': return <BookOpen className="h-4 w-4" />;
      case 'mobile': return <Smartphone className="h-4 w-4" />;
      case 'iot': return <Target className="h-4 w-4" />;
      case 'ai': return <Zap className="h-4 w-4" />;
      default: return <HelpCircle className="h-4 w-4" />;
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
      >
        {/* Spotlight overlay */}
        <div
          ref={spotlightRef}
          className="fixed pointer-events-none border-2 border-almona-orange rounded-lg shadow-lg shadow-almona-orange/50"
          style={{ display: 'none', zIndex: 60 }}
        />

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-full max-w-4xl max-h-[90vh] bg-almona-dark rounded-2xl shadow-2xl overflow-hidden"
        >
          {!selectedModule ? (
            // Module Selection Screen
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-almona-orange">Interactive Training Center</h2>
                  <p className="text-gray-400 mt-1">Master the new features with hands-on tutorials</p>
                </div>
                <Button variant="ghost" onClick={onClose}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {TRAINING_MODULES.map((module) => (
                  <motion.div
                    key={module.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Card 
                      className="bg-almona-dark/60 border-almona-light/20 cursor-pointer hover:border-almona-orange/50 transition-colors h-full"
                      onClick={() => setSelectedModule(module)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {module.icon}
                            <CardTitle className="text-lg">{module.title}</CardTitle>
                          </div>
                          <Badge className={getDifficultyColor(module.difficulty)}>
                            {module.difficulty}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-sm text-gray-400">{module.description}</p>
                        
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            {getCategoryIcon(module.category)}
                            <span className="capitalize">{module.category}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3" />
                            <span>{module.duration} min</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            {module.steps.length} steps
                          </span>
                          <div className="flex items-center gap-1 text-almona-orange">
                            <Award className="h-3 w-3" />
                            <span className="text-xs">{module.completionReward}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          ) : (
            // Training Module Screen
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="p-6 border-b border-almona-light/20">
                <div className="flex items-center justify-between mb-4">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setSelectedModule(null);
                      setCurrentStep(0);
                      clearSpotlight();
                    }}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Modules
                  </Button>
                  <Button variant="ghost" onClick={onClose}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                <div className="flex items-center gap-4">
                  {selectedModule.icon}
                  <div>
                    <h3 className="text-xl font-bold">{selectedModule.title}</h3>
                    <p className="text-sm text-gray-400">{selectedModule.description}</p>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span>Progress: {currentStep + 1} / {selectedModule.steps.length}</span>
                    <span>{Math.round(((currentStep + 1) / selectedModule.steps.length) * 100)}%</span>
                  </div>
                  <Progress value={((currentStep + 1) / selectedModule.steps.length) * 100} />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 p-6 overflow-y-auto">
                <AnimatePresence mode="wait">
                  {selectedModule.steps[currentStep] && (
                    <motion.div
                      key={currentStep}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      {/* Step Header */}
                      <div>
                        <h4 className="text-lg font-semibold mb-2">
                          {selectedModule.steps[currentStep].title}
                        </h4>
                        <p className="text-gray-400">
                          {selectedModule.steps[currentStep].description}
                        </p>
                      </div>

                      {/* Step Content */}
                      <Card className="bg-almona-dark/40 border-almona-light/20">
                        <CardContent className="p-6">
                          <p className="text-sm leading-relaxed">
                            {selectedModule.steps[currentStep].content}
                          </p>

                          {/* Media */}
                          {selectedModule.steps[currentStep].media && (
                            <div className="mt-4">
                              <img
                                src={selectedModule.steps[currentStep].media!.url}
                                alt={selectedModule.steps[currentStep].media!.caption}
                                className="rounded-lg border border-almona-light/20"
                              />
                              {selectedModule.steps[currentStep].media!.caption && (
                                <p className="text-xs text-gray-500 mt-2 text-center">
                                  {selectedModule.steps[currentStep].media!.caption}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Hints */}
                          {selectedModule.steps[currentStep].hints && (
                            <div className="mt-4 p-3 bg-blue-500/20 rounded-lg border border-blue-500/30">
                              <div className="flex items-center gap-2 mb-2">
                                <HelpCircle className="h-4 w-4 text-blue-400" />
                                <span className="text-sm font-medium text-blue-300">Hints</span>
                              </div>
                              <ul className="text-xs text-blue-200 space-y-1">
                                {selectedModule.steps[currentStep].hints!.map((hint, index) => (
                                  <li key={index}>• {hint}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Action Button */}
                      <div className="flex justify-center">
                        <Button
                          onClick={() => completeStep(selectedModule.steps[currentStep].id)}
                          className="bg-gradient-orange hover:bg-almona-orange-dark"
                        >
                          {completedSteps.has(selectedModule.steps[currentStep].id) ? (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Completed
                            </>
                          ) : (
                            <>
                              <Circle className="h-4 w-4 mr-2" />
                              Mark Complete
                            </>
                          )}
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer Navigation */}
              <div className="p-6 border-t border-almona-light/20">
                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={previousStep}
                    disabled={currentStep === 0}
                    className="border-almona-light/30"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>

                  <div className="flex gap-2">
                    {selectedModule.steps.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentStep(index)}
                        className={`w-8 h-8 rounded-full text-xs transition-colors ${
                          index === currentStep
                            ? 'bg-almona-orange text-white'
                            : index < currentStep
                            ? 'bg-green-500 text-white'
                            : 'bg-almona-light/20 text-gray-400'
                        }`}
                      >
                        {index + 1}
                      </button>
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    onClick={nextStep}
                    disabled={currentStep === selectedModule.steps.length - 1}
                    className="border-almona-light/30"
                  >
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default InteractiveUserGuide;