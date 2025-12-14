import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/context/AuthContext';
import { getTechnicalSupport, identifyPartFromImage } from '@/lib/ai/gemini';
import { supabase } from '@/lib/supabase';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Bot,
    Loader2,
    MinusCircle,
    Send,
    Sparkles,
    User
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

// Enhanced message types for technical support
interface ChatMessage {
  id: string;
  type: 'user' | 'bot' | 'system';
  content: string;
  timestamp: Date;
  category?: 'general' | 'technical' | 'parts' | 'maintenance' | 'emergency';
  severity?: 'low' | 'medium' | 'high' | 'critical';
  machineModel?: string;
  suggested_actions?: string[];
  attachments?: File[];
}

// Quick response templates for common technical issues
const QUICK_RESPONSES = [
  {
    id: 'machine_not_starting',
    label: 'Machine won\'t start',
    category: 'technical',
    severity: 'high' as const,
    prompt: 'My YILMAZ machine is not starting. What should I check first?'
  },
  {
    id: 'unusual_noise',
    label: 'Unusual noise/vibration', 
    category: 'technical',
    severity: 'medium' as const,
    prompt: 'My machine is making unusual noise and vibrating more than normal. What could be the cause?'
  },
  {
    id: 'part_identification',
    label: 'Identify spare part',
    category: 'parts',
    severity: 'low' as const,
    prompt: 'I need help identifying a spare part. Can you help me find the right replacement?'
  },
  {
    id: 'maintenance_schedule',
    label: 'Maintenance guidance',
    category: 'maintenance', 
    severity: 'low' as const,
    prompt: 'When should I schedule the next maintenance for my machine?'
  },
  {
    id: 'emergency_shutdown',
    label: '🚨 Emergency shutdown',
    category: 'emergency',
    severity: 'critical' as const,
    prompt: 'EMERGENCY: My machine needs immediate shutdown. Please provide emergency procedures.'
  }
];

// Enhanced context for Egyptian industrial market
const EGYPTIAN_TECHNICAL_CONTEXT = `
You are an expert YILMAZ technical support AI assistant for Egyptian aluminum and UPVC fabricators.

EXPERTISE AREAS:
- YILMAZ machine models: AIM series, CDC series, CNC routers, Profile processing
- Egyptian workshop conditions: dust, heat, power variations (220V)
- Local parts availability and suppliers in Egypt
- Arabic technical terminology with English equivalents
- Emergency safety procedures
- Preventive maintenance for Egyptian climate

RESPONSE FORMAT:
1. Immediate safety check (if applicable)
2. Problem diagnosis with technical explanation
3. Step-by-step troubleshooting
4. Parts identification with Egyptian supplier info
5. When to call emergency technician
6. Follow-up maintenance recommendations

ALWAYS:
- Prioritize safety first
- Use both Arabic and English technical terms
- Include Egyptian supplier contacts when relevant
- Suggest emergency contact if critical issue
- Provide maintenance schedule recommendations
- Consider Egyptian workshop conditions (dust, heat, power)
`;

export const AITechnicalChatbot: React.FC = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize chat with welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        type: 'bot',
        content: `مرحباً ${user?.full_name || 'بك'}! أنا مساعد الدعم الفني الذكي لآلات يلماز.\n\nيمكنني مساعدتك في:\n• تشخيص المشاكل الفنية\n• تحديد قطع الغيار\n• جدولة الصيانة\n• إجراءات الطوارئ\n• توصيات الأداء\n\nما هي المشكلة التي تواجهها اليوم؟`,
        timestamp: new Date(),
        category: 'general'
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, user, messages.length]);

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle quick response selection
  const handleQuickResponse = async (response: typeof QUICK_RESPONSES[0]) => {
    await sendMessage(response.prompt, response.category, response.severity);
  };

  // Enhanced AI response generation
  const generateAIResponse = async (
    userMessage: string, 
    category?: string, 
    severity?: string,
    imageBase64?: string
  ): Promise<string> => {
    try {
      // Build context for AI (prompt variable removed as it's not used directly)
      const _context = `${EGYPTIAN_TECHNICAL_CONTEXT}\n\n${
        severity === 'critical' || severity === 'high' 
          ? `URGENT ${severity.toUpperCase()} ISSUE - Priority response needed!\n\n` 
          : ''
      }${
        category === 'emergency' 
          ? `EMERGENCY SITUATION - Provide immediate safety procedures first!\n\n` 
          : ''
      }${
        chatHistory.length > 0 
          ? `Previous conversation context:\n${chatHistory.slice(-4).join('\n')}\n\n` 
          : ''
      }Customer inquiry: ${userMessage}`;
      
      // Handle image-based part identification
      if (imageBase64) {
        return await identifyPartFromImage(imageBase64);
      }
      
      // Use technical support engine for queries
      const response = await getTechnicalSupport(
        userMessage,
        undefined, // machineModel - could be extracted from context
        severity as 'low' | 'medium' | 'high' | 'critical',
        chatHistory.slice(-6)
      );
      
      // Update chat history
      setChatHistory(prev => [...prev, `User: ${userMessage}`, `AI: ${response}`]);
      
      return response;
    } catch (error) {
      console.error('AI Response Error:', error);
      return 'عذراً، حدث خطأ في النظام. يرجى المحاولة مرة أخرى أو التواصل مع الدعم الفني مباشرة على: +20 xxx xxx xxxx';
    }
  };

  // Send message function
  const sendMessage = async (
    messageContent?: string, 
    category?: string, 
    severity?: string,
    attachments?: File[]
  ) => {
    const content = messageContent || inputMessage.trim();
    if (!content && !attachments?.length) return;

    setIsLoading(true);

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content,
      timestamp: new Date(),
      category: category as any,
      severity: severity as any,
      attachments
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');

    try {
      // Handle image attachments for part identification
      let imageBase64: string | undefined;
      if (attachments?.length) {
        const file = attachments[0];
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = async (e) => {
            imageBase64 = (e.target?.result as string)?.split(',')[1];
            const aiResponse = await generateAIResponse(content, category, severity, imageBase64);
            
            const botMessage: ChatMessage = {
              id: (Date.now() + 1).toString(),
              type: 'bot',
              content: aiResponse,
              timestamp: new Date(),
              category: 'technical'
            };
            
            setMessages(prev => [...prev, botMessage]);
            setIsLoading(false);
          };
          reader.readAsDataURL(file);
          return;
        }
      }

      // Generate AI response
      const aiResponse = await generateAIResponse(content, category, severity);
      
      // Add bot response
      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: aiResponse,
        timestamp: new Date(),
        category: 'technical',
        suggested_actions: extractSuggestedActions(aiResponse)
      };

      setMessages(prev => [...prev, botMessage]);
      
      // Log interaction for improvement
      if (user) {
        await logChatInteraction(userMessage, botMessage);
      }

    } catch (error) {
      console.error('Chat Error:', error);
      toast.error('Failed to get AI response');
    } finally {
      setIsLoading(false);
    }
  };

  // Extract suggested actions from AI response
  const extractSuggestedActions = (response: string): string[] => {
    const actions: string[] = [];
    
    if (response.includes('technician') || response.includes('فني')) {
      actions.push('Contact Technician');
    }
    if (response.includes('maintenance') || response.includes('صيانة')) {
      actions.push('Schedule Maintenance');
    }
    if (response.includes('part') || response.includes('قطعة')) {
      actions.push('Order Parts');
    }
    if (response.includes('emergency') || response.includes('طوارئ')) {
      actions.push('Emergency Support');
    }
    
    return actions;
  };

  // Log chat interaction for analytics and improvement
  const logChatInteraction = async (userMsg: ChatMessage, botMsg: ChatMessage) => {
    try {
      await (supabase as any).from('chat_interactions').insert({
        user_id: user?.id,
        user_message: userMsg.content,
        bot_response: botMsg.content,
        category: userMsg.category,
        severity: userMsg.severity,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to log chat interaction:', error);
    }
  };

  // Handle file attachment
  const handleFileAttach = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      sendMessage('تحديد قطعة الغيار من الصورة', 'parts', 'low', files);
    }
  };

  // Get message badge color based on severity
  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/20 text-red-300 border-red-500/50';
      case 'high': return 'bg-orange-500/20 text-orange-300 border-orange-500/50';
      case 'medium': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50';
      case 'low': return 'bg-blue-500/20 text-blue-300 border-blue-500/50';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/50';
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      <motion.div
        className="fixed bottom-6 right-6 z-50"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        <Button
          onClick={() => setIsOpen(true)}
          className="rounded-full w-14 h-14 bg-gradient-orange hover:bg-almona-orange-dark shadow-lg"
          size="lg"
        >
          <Bot className="h-6 w-6" />
        </Button>
      </motion.div>

      {/* Chat Interface */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="fixed bottom-24 right-6 z-50 w-96 h-[600px]"
          >
            <Card className="bg-almona-dark/95 border-almona-light/30 backdrop-blur-sm shadow-2xl h-full flex flex-col">
              {/* Header */}
              <CardHeader className="pb-3 border-b border-almona-light/20">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-almona-orange">
                    <Sparkles className="h-5 w-5" />
                    AI Technical Support
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsOpen(false)}
                  >
                    <MinusCircle className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-1 text-xs text-green-400">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  مساعد ذكي متاح 24/7
                </div>
              </CardHeader>

              {/* Quick Response Buttons */}
              {messages.length <= 1 && (
                <div className="p-3 border-b border-almona-light/10">
                  <div className="flex flex-wrap gap-2">
                    {QUICK_RESPONSES.map((response) => (
                      <Button
                        key={response.id}
                        variant="outline"
                        size="sm"
                        className={`text-xs border-almona-light/30 hover:bg-almona-orange/20 ${
                          response.severity === 'critical' ? 'border-red-500/50 text-red-400' : ''
                        }`}
                        onClick={() => handleQuickResponse(response)}
                      >
                        {response.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages Area */}
              <CardContent className="flex-1 p-0 overflow-hidden">
                <ScrollArea className="h-full p-4">
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[85%] ${
                          message.type === 'user' 
                            ? 'bg-almona-orange/20 border-almona-orange/50' 
                            : 'bg-almona-dark/40 border-almona-light/20'
                        } border rounded-lg p-3`}>
                          <div className="flex items-center gap-2 mb-1">
                            {message.type === 'user' ? (
                              <User className="h-4 w-4 text-almona-orange" />
                            ) : (
                              <Bot className="h-4 w-4 text-blue-400" />
                            )}
                            <span className="text-xs text-gray-400">
                              {message.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                            {message.severity && (
                              <Badge className={getSeverityColor(message.severity)} variant="secondary">
                                {message.severity}
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm whitespace-pre-line">{message.content}</div>
                          
                          {/* Suggested Actions */}
                          {message.suggested_actions && message.suggested_actions.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {message.suggested_actions.map((action, index) => (
                                <Button
                                  key={index}
                                  variant="outline"
                                  size="sm"
                                  className="text-xs border-almona-orange/30 text-almona-orange hover:bg-almona-orange/20"
                                >
                                  {action}
                                </Button>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                    
                    {/* Loading indicator */}
                    {isLoading && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex justify-start"
                      >
                        <div className="bg-almona-dark/40 border border-almona-light/20 rounded-lg p-3">
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />
                            <span className="text-sm text-gray-400">AI يقوم بالتحليل...</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
              </CardContent>

              {/* Input Area */}
              <div className="p-3 border-t border-almona-light/20">
                <div className="flex gap-2">
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="اكتب مشكلتك التقنية..."
                    className="flex-1 bg-almona-dark/60 border-almona-light/30"
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    disabled={isLoading}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleFileAttach}
                    className="border-almona-light/30 hover:bg-almona-light/10"
                    disabled={isLoading}
                  >
                    📷
                  </Button>
                  <Button
                    onClick={() => sendMessage()}
                    disabled={!inputMessage.trim() || isLoading}
                    className="bg-almona-orange/20 text-almona-orange hover:bg-almona-orange/30 border-almona-orange/30"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AITechnicalChatbot;
