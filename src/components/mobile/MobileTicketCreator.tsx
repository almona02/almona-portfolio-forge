import React, { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  Mic,
  MapPin,
  AlertTriangle,
  Wrench,
  Package,
  ChevronRight,
  ChevronLeft,
  Check,
  X,
  MessageSquare,
  Wifi,
  WifiOff
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { offlineSyncService } from '@/lib/offline-sync';

// Mobile-optimized ticket creation with offline support
interface MobileTicketData {
  title: string;
  description: string;
  category: 'emergency' | 'maintenance' | 'parts' | 'support';
  priority: 'low' | 'medium' | 'high' | 'critical';
  machine_id?: string;
  location?: string;
  images?: File[];
  audio_notes?: File[];
  offline_timestamp?: string;
}

interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
}

export const MobileTicketCreator: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onTicketCreated?: (ticketId: string) => void;
}> = ({ isOpen, onClose, onTicketCreated }) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [ticketData, setTicketData] = useState<MobileTicketData>({
    title: '',
    description: '',
    category: 'support',
    priority: 'medium',
    images: [],
    audio_notes: []
  });
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Monitor online/offline status
  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Multi-step form configuration
  const steps = [
    {
      id: 'category',
      title: 'نوع المشكلة',
      subtitle: 'اختر نوع المشكلة التي تواجهها'
    },
    {
      id: 'details',
      title: 'تفاصيل المشكلة',
      subtitle: 'صف المشكلة بالتفصيل'
    },
    {
      id: 'media',
      title: 'إضافة ملفات',
      subtitle: 'أضف صور أو تسجيلات صوتية'
    },
    {
      id: 'location',
      title: 'الموقع والأولوية',
      subtitle: 'حدد الموقع ومستوى الأولوية'
    },
    {
      id: 'review',
      title: 'مراجعة وإرسال',
      subtitle: 'راجع البيانات قبل الإرسال'
    }
  ];

  // Category options with Arabic labels
  const categories = [
    {
      id: 'emergency' as const,
      label: 'طوارئ',
      icon: AlertTriangle,
      color: 'bg-red-500/20 text-red-300 border-red-500/50',
      description: 'مشكلة طارئة تحتاج تدخل فوري'
    },
    {
      id: 'maintenance' as const,
      label: 'صيانة',
      icon: Wrench,
      color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50',
      description: 'صيانة دورية أو إصلاح'
    },
    {
      id: 'parts' as const,
      label: 'قطع غيار',
      icon: Package,
      color: 'bg-blue-500/20 text-blue-300 border-blue-500/50',
      description: 'طلب قطع غيار أو استفسار'
    },
    {
      id: 'support' as const,
      label: 'دعم فني',
      icon: MessageSquare,
      color: 'bg-green-500/20 text-green-300 border-green-500/50',
      description: 'استفسار أو دعم عام'
    }
  ];

  const priorities = [
    { id: 'low' as const, label: 'منخفضة', color: 'bg-green-500/20 text-green-300' },
    { id: 'medium' as const, label: 'متوسطة', color: 'bg-yellow-500/20 text-yellow-300' },
    { id: 'high' as const, label: 'عالية', color: 'bg-orange-500/20 text-orange-300' },
    { id: 'critical' as const, label: 'حرجة', color: 'bg-red-500/20 text-red-300' }
  ];

  // Get current location
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          toast.success('تم تحديد الموقع بنجاح');
        },
        (error) => {
          console.error('Geolocation error:', error);
          toast.error('لا يمكن تحديد الموقع');
        }
      );
    }
  };

  // Handle image capture/upload
  const handleImageCapture = () => {
    imageInputRef.current?.click();
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setTicketData(prev => ({
        ...prev,
        images: [...(prev.images || []), ...files]
      }));
      toast.success(`تم إضافة ${files.length} صورة`);
    }
  };

  // Audio recording functionality
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const audioChunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        const audioFile = new File([audioBlob], `audio-${Date.now()}.wav`, { type: 'audio/wav' });
        
        setTicketData(prev => ({
          ...prev,
          audio_notes: [...(prev.audio_notes || []), audioFile]
        }));
        toast.success('تم حفظ التسجيل الصوتي');
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.info('بدء التسجيل الصوتي...');
    } catch (error) {
      console.error('Recording error:', error);
      toast.error('فشل في بدء التسجيل');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Submit ticket (with enhanced offline support)
  const submitTicket = async () => {
    if (!user) {
      toast.error('يجب تسجيل الدخول أولاً');
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare ticket data
      const submission = {
        title: ticketData.title,
        description: ticketData.description,
        category: ticketData.category,
        priority: ticketData.priority,
        user_id: user.id,
        location: location,
        images: ticketData.images,
        audio_notes: ticketData.audio_notes,
        status: 'open' as const,
        source: 'mobile' as const
      };

      if (isOnline) {
        // Online submission
        const { data, error } = await supabase
          .from('service_tickets')
          .insert({
            title: submission.title,
            description: submission.description,
            category: submission.category,
            priority: submission.priority,
            user_id: submission.user_id,
            status: submission.status,
            source: submission.source,
            location: submission.location
          })
          .select()
          .single();

        if (error) throw error;

        // TODO: Upload images and audio files to Supabase Storage
        
        toast.success('تم إرسال الطلب بنجاح ✅');
        onTicketCreated?.(data.id);
      } else {
        // Offline - use enhanced offline sync service
        const offlineId = await offlineSyncService.storeOfflineTicket(submission);
        onTicketCreated?.(offlineId);
      }

      onClose();
    } catch (error) {
      console.error('Submission error:', error);
      toast.error('فشل في إرسال الطلب');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Navigation functions
  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const progress = ((currentStep + 1) / steps.length) * 100;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center p-4"
      >
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-md bg-almona-dark rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="sticky top-0 bg-almona-dark/95 backdrop-blur-sm border-b border-almona-light/20 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-almona-orange">إنشاء طلب خدمة</h2>
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <Wifi className="h-4 w-4 text-green-400" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-400" />
                )}
                <Button variant="ghost" size="sm" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <Progress value={progress} className="h-2 mb-2" />
            <div className="text-sm">
              <div className="font-medium">{steps[currentStep].title}</div>
              <div className="text-gray-400 text-xs">{steps[currentStep].subtitle}</div>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 overflow-y-auto max-h-[60vh]">
            <AnimatePresence mode="wait">
              {/* Step 1: Category Selection */}
              {currentStep === 0 && (
                <motion.div
                  key="category"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  className="space-y-3"
                >
                  {categories.map((category) => {
                    const IconComponent = category.icon;
                    const isSelected = ticketData.category === category.id;
                    
                    return (
                      <motion.button
                        key={category.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setTicketData(prev => ({ ...prev, category: category.id }))}
                        className={`w-full p-4 rounded-lg border-2 text-right transition-all ${
                          isSelected 
                            ? category.color + ' border-opacity-100' 
                            : 'bg-almona-dark/40 border-almona-light/20 hover:border-almona-orange/30'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <IconComponent className="h-6 w-6" />
                          <div className="flex-1">
                            <div className="font-medium">{category.label}</div>
                            <div className="text-sm text-gray-400">{category.description}</div>
                          </div>
                          {isSelected && <Check className="h-5 w-5 text-almona-orange" />}
                        </div>
                      </motion.button>
                    );
                  })}
                </motion.div>
              )}

              {/* Step 2: Details */}
              {currentStep === 1 && (
                <motion.div
                  key="details"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm font-medium mb-2">عنوان المشكلة</label>
                    <Input
                      value={ticketData.title}
                      onChange={(e) => setTicketData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="اكتب عنوان مختصر للمشكلة"
                      className="bg-almona-dark/60 border-almona-light/30"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">وصف تفصيلي</label>
                    <Textarea
                      value={ticketData.description}
                      onChange={(e) => setTicketData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="صف المشكلة بالتفصيل..."
                      rows={4}
                      className="bg-almona-dark/60 border-almona-light/30 resize-none"
                    />
                  </div>
                </motion.div>
              )}

              {/* Step 3: Media */}
              {currentStep === 2 && (
                <motion.div
                  key="media"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      variant="outline"
                      onClick={handleImageCapture}
                      className="h-20 border-almona-light/30 hover:bg-almona-orange/20"
                    >
                      <div className="text-center">
                        <Camera className="h-6 w-6 mx-auto mb-1" />
                        <div className="text-xs">إضافة صور</div>
                      </div>
                    </Button>

                    <Button
                      variant="outline"
                      onClick={isRecording ? stopRecording : startRecording}
                      className={`h-20 border-almona-light/30 ${
                        isRecording ? 'bg-red-500/20 hover:bg-red-500/30' : 'hover:bg-almona-orange/20'
                      }`}
                    >
                      <div className="text-center">
                        <Mic className={`h-6 w-6 mx-auto mb-1 ${isRecording ? 'animate-pulse' : ''}`} />
                        <div className="text-xs">
                          {isRecording ? 'إيقاف التسجيل' : 'تسجيل صوتي'}
                        </div>
                      </div>
                    </Button>
                  </div>

                  {/* Show selected files */}
                  {(ticketData.images?.length || 0) > 0 && (
                    <div>
                      <div className="text-sm font-medium mb-2">الصور المحددة:</div>
                      <div className="space-y-1">
                        {ticketData.images?.map((file, index) => (
                          <div key={index} className="text-xs p-2 bg-almona-dark/40 rounded border border-almona-light/20">
                            📷 {file.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(ticketData.audio_notes?.length || 0) > 0 && (
                    <div>
                      <div className="text-sm font-medium mb-2">التسجيلات الصوتية:</div>
                      <div className="space-y-1">
                        {ticketData.audio_notes?.map((file, index) => (
                          <div key={index} className="text-xs p-2 bg-almona-dark/40 rounded border border-almona-light/20">
                            🎵 {file.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </motion.div>
              )}

              {/* Step 4: Location & Priority */}
              {currentStep === 3 && (
                <motion.div
                  key="location"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  className="space-y-4"
                >
                  <Button
                    variant="outline"
                    onClick={getCurrentLocation}
                    className="w-full border-almona-light/30 hover:bg-almona-orange/20"
                  >
                    <MapPin className="h-4 w-4 mr-2" />
                    {location ? 'تم تحديد الموقع ✓' : 'تحديد الموقع الحالي'}
                  </Button>

                  <div>
                    <label className="block text-sm font-medium mb-2">مستوى الأولوية</label>
                    <div className="grid grid-cols-2 gap-2">
                      {priorities.map((priority) => (
                        <button
                          key={priority.id}
                          onClick={() => setTicketData(prev => ({ ...prev, priority: priority.id }))}
                          className={`p-3 rounded-lg border text-center transition-all ${
                            ticketData.priority === priority.id
                              ? priority.color + ' border-opacity-100'
                              : 'bg-almona-dark/40 border-almona-light/20 hover:border-almona-orange/30'
                          }`}
                        >
                          <div className="text-sm font-medium">{priority.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 5: Review */}
              {currentStep === 4 && (
                <motion.div
                  key="review"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  className="space-y-4"
                >
                  <Card className="bg-almona-dark/40 border-almona-light/20">
                    <CardContent className="p-4 space-y-3">
                      <div>
                        <div className="text-sm text-gray-400">النوع</div>
                        <div className="font-medium">
                          {categories.find(c => c.id === ticketData.category)?.label}
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-sm text-gray-400">العنوان</div>
                        <div className="font-medium">{ticketData.title}</div>
                      </div>
                      
                      <div>
                        <div className="text-sm text-gray-400">الوصف</div>
                        <div className="text-sm">{ticketData.description}</div>
                      </div>
                      
                      <div className="flex justify-between">
                        <div>
                          <div className="text-sm text-gray-400">الأولوية</div>
                          <Badge className={priorities.find(p => p.id === ticketData.priority)?.color}>
                            {priorities.find(p => p.id === ticketData.priority)?.label}
                          </Badge>
                        </div>
                        
                        {location && (
                          <div>
                            <div className="text-sm text-gray-400">الموقع</div>
                            <div className="text-xs text-green-400">تم تحديده ✓</div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {!isOnline && (
                    <div className="p-3 bg-yellow-500/20 rounded-lg border border-yellow-500/50">
                      <div className="flex items-center gap-2 text-yellow-300">
                        <WifiOff className="h-4 w-4" />
                        <div className="text-sm">
                          لا يوجد اتصال بالإنترنت - سيتم حفظ الطلب محلياً
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer Navigation */}
          <div className="sticky bottom-0 bg-almona-dark/95 backdrop-blur-sm border-t border-almona-light/20 p-4">
            <div className="flex gap-3">
              {currentStep > 0 && (
                <Button
                  variant="outline"
                  onClick={prevStep}
                  className="border-almona-light/30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              )}
              
              <Button
                onClick={currentStep === steps.length - 1 ? submitTicket : nextStep}
                disabled={isSubmitting || (currentStep === 1 && (!ticketData.title || !ticketData.description))}
                className="flex-1 bg-gradient-orange hover:bg-almona-orange-dark"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    جاري الإرسال...
                  </>
                ) : currentStep === steps.length - 1 ? (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    إرسال الطلب
                  </>
                ) : (
                  <>
                    التالي
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MobileTicketCreator;
