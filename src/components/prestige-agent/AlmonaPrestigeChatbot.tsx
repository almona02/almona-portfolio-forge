import { usePublicCopy } from '@/hooks/usePublicCopy';
/**
 * YDT Prestige Agent: Interactive Chatbot with Almona Style
 * University-grade interface with animations and professional design
 */
import { usePrestigeAgent } from '@/hooks/usePrestigeAgent';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BookOpen,
  BrainCircuit,
  Code,
  Compass,
  GraduationCap,
  Languages,
  Send,
  Shield,
  Sparkles,
  Stethoscope,
  Zap
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { PrestigeMicroInteractions } from './PrestigeMicroInteractions';
import './prestige-animations.css';

type PersonaType = 'professor' | 'doctor' | 'tourGuide' | 'codeMaster' | 'nervousSystem';
type LanguageType = 'tr' | 'en' | 'ru' | 'ar';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  persona?: PersonaType;
  extras?: {
    confidence?: number;
    references?: string[];
    teachingPoints?: string[];
    hasExamples?: boolean;
    hasDiagrams?: boolean;
    responseTime?: number;
  };
}

interface PersonaConfig {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  title: string;
  subtitle: string;
  animation: string;
}

const personas: Record<PersonaType, PersonaConfig> = {
  professor: {
    icon: GraduationCap,
    color: 'bg-amber-600',
    title: 'Professor Mode',
    subtitle: 'University-grade instruction',
    animation: 'gentle-pulse'
  },
  doctor: {
    icon: Stethoscope,
    color: 'bg-red-600',
    title: 'Doctor Mode',
    subtitle: 'Diagnostic precision',
    animation: 'heartbeat'
  },
  tourGuide: {
    icon: Compass,
    color: 'bg-green-600',
    title: 'Tour Guide Mode',
    subtitle: 'Interactive exploration',
    animation: 'float'
  },
  codeMaster: {
    icon: Code,
    color: 'bg-blue-600',
    title: 'G-Code Master',
    subtitle: 'Programming expert',
    animation: 'code-glow'
  },
  nervousSystem: {
    icon: BrainCircuit,
    color: 'bg-amber-600',
    title: 'Nervous System',
    subtitle: 'Real-time monitoring',
    animation: 'circuit-flow'
  }
};

const quickActions = [
  { text: 'Teach me operation', icon: GraduationCap, persona: 'professor' as PersonaType },
  { text: 'Diagnose a fault', icon: Stethoscope, persona: 'doctor' as PersonaType },
  { text: 'Show G-code example', icon: Code, persona: 'codeMaster' as PersonaType },
  { text: 'Explore applications', icon: Compass, persona: 'tourGuide' as PersonaType }
];

  const getWelcomeMessage = (lang: LanguageType): string => {
    const welcomes = {
      en: "Welcome! I'm your YDT Agent. I can help you learn, diagnose, explore, and program AIM 7510. How can I assist you today?",
      tr: "Hoş geldiniz! YDT Agent'ınızım. AIM 7510'u öğrenmenize, teşhis etmenize, keşfetmenize ve programlamanıza yardımcı olabilirim. Bugün size nasıl yardımcı olabilirim?",
      ru: "Добро пожаловать! Я ваш YDT Agent. Я могу помочь вам изучать, диагностировать, исследовать и программировать AIM 7510. Чем я могу помочь вам сегодня?",
      ar: "أهلاً وسهلاً! أنا YDT المساعد. يمكنني مساعدتك في تعلم وتشخيص واستكشاف وبرمجة AIM 7510. كيف يمكنني مساعدتك اليوم؟"
    };
    return welcomes[lang];
  };


export const AlmonaPrestigeChatbot: React.FC = () => {
  const copy = usePublicCopy();
  const { i18n } = useTranslation();
  const selectedLanguage = (i18n.resolvedLanguage || i18n.language).split('-')[0];
  const language: LanguageType = ['ar', 'en', 'tr', 'ru'].includes(selectedLanguage) ? selectedLanguage as LanguageType : 'en';
  const location = useLocation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [agentPersona, setAgentPersona] = useState<PersonaType>('professor');

  const [typing, setTyping] = useState(false);
  const [_confidence, setConfidence] = useState(95);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const microInteractions = useRef(new PrestigeMicroInteractions());

  // Backend integration
  const {
    sendMessage: sendMessageToBackend,
    getKnowledgeStats: fetchKnowledgeStats,
    getMachineCapabilities: fetchMachineCapabilities,
    isLoading: backendLoading
  } = usePrestigeAgent();

  // Scroll to top on route change or component mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  useEffect(() => {
    // Welcome message
    const welcomeMessage: Message = {
      id: 'welcome',
      type: 'assistant',
      text: getWelcomeMessage(language),
      timestamp: new Date(),
      // Don't show persona label on welcome message
      persona: undefined,
      extras: {
        confidence: 95,
        references: ['YDT Knowledge Base'],
        teachingPoints: []
      }
    };
    setMessages(previous => previous.length ? previous.map(message => message.id === 'welcome' ? welcomeMessage : message) : [welcomeMessage]);
  }, [language]);

  useEffect(() => {

    // Load initial data (silently fail if backend unavailable)
    const loadInitialData = async () => {
      try {
        await Promise.allSettled([
          fetchKnowledgeStats(),
          fetchMachineCapabilities()
        ]);
        // Silently handle failures - backend may not be available in dev
      } catch {
        // Silently fail - expected in development when backend is not running
      }
    };

    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Removed auto-scroll - user controls scrolling manually

  const handleSend = async (messageText = input, persona = agentPersona) => {
    if (!messageText.trim() || typing || backendLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      text: messageText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const userInput = messageText;
    setInput('');
    setTyping(true);

    // Show knowledge recall
    microInteractions.current.showKnowledgeRecall(copy);

    try {
      // Send to backend
      const response = await sendMessageToBackend(userInput, persona, language);

      if (response.success && response.data) {
        // Response received successfully

        // Add assistant message
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          text: response.data.response,
          timestamp: new Date(),
          persona,
          extras: {
            confidence: response.data.confidence,
            references: response.data.knowledge_sources || [],
            teachingPoints: [],
            responseTime: response.data.response_time
          }
        };

        setMessages(prev => [...prev, assistantMessage]);
        setConfidence(response.data.confidence);
      } else {
        // Handle error
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          text: copy('The assistant could not respond. Please try again or contact ALMONA.'),
          timestamp: new Date(),
          persona,
          extras: { confidence: 70 }
        };
        setMessages(prev => [...prev, errorMessage]);
        toast.error(copy('Failed to get response. Please try again.'));
      }
    } catch (error: any) {
      console.error('Send message error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        text: copy('Sorry, I encountered a connection issue. Please check your internet connection and try again.'),
        timestamp: new Date(),
        persona,
        extras: { confidence: 60 }
      };
      setMessages(prev => [...prev, errorMessage]);
      toast.error(copy('Connection error. Please try again.'));
    } finally {
      setTyping(false);
      // No auto-scroll - user controls scrolling manually
    }
  };

  const handleQuickAction = async (action: typeof quickActions[0]) => {
    setAgentPersona(action.persona);
    microInteractions.current.showPersonaTransition(personas[action.persona], copy);
    await handleSend(copy(action.text), action.persona);
  };

  const handlePersonaChange = (persona: PersonaType) => {
    setAgentPersona(persona);
    microInteractions.current.showPersonaTransition(personas[persona], copy);
  };

  const handleLanguageChange = (lang: LanguageType) => {
    // Smooth language transition
    void i18n.changeLanguage(lang);

    // Update welcome message in current language
    const welcomeMessage: Message = {
      id: 'welcome',
      type: 'assistant',
      text: getWelcomeMessage(lang),
      timestamp: new Date(),
      persona: agentPersona,
      extras: {
        confidence: 95,
        references: ['YDT Knowledge Base'],
        teachingPoints: []
      }
    };

    // Update first message if it's the welcome message
    setMessages(prev => {
      if (prev.length > 0 && prev[0].id === 'welcome') {
        return [welcomeMessage, ...prev.slice(1)];
      }
      return prev;
    });

    // Subtle notification

  };

  const currentPersona = personas[agentPersona];
  const PersonaIcon = currentPersona.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto" style={{ marginTop: '2.5cm' }}>
        {/* Prestige Header */}
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="relative"
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 flex items-center justify-center shadow-xl">
                <BrainCircuit className="w-8 h-8 text-white" />
              </div>
              <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-yellow-400" />
            </motion.div>

            <div>
              <h1 className="typography-h1 text-gray-900">{copy("YDT")} <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-amber-600">{copy("Agent")}</span>
              </h1>
              <p className="text-gray-600 flex items-center gap-2">
                <Shield className="w-4 h-4  status-valid" />
                <span className="font-semibold text-green-600">{copy("Assistant interface")}</span>{copy("• Nervous System + Professor + Doctor + Tour Guide")}</p>
            </div>
          </div>

          {/* Language Selector */}
          <div className="flex items-center space-x-2">
            <Languages className="w-5 h-5 text-gray-500" />
            {(['TR', 'EN', 'RU', 'AR'] as const).map((lang) => (
              <motion.button
                key={lang}
                onClick={() => handleLanguageChange(lang.toLowerCase() as LanguageType)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 ${
                  language === lang.toLowerCase()
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {lang}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Persona Selector */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {Object.entries(personas).map(([key, persona]) => {
            const Icon = persona.icon;
            const isActive = agentPersona === key;
            return (
              <motion.button
                key={key}
                whileHover={{ y: -5, scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handlePersonaChange(key as PersonaType)}
                className={`p-4 rounded-2xl shadow-lg transition-all ${
                  isActive
                    ? `${persona.color} text-white ring-2 ring-white ring-opacity-50`
                    : 'bg-white text-gray-800 hover:shadow-xl'
                }`}
              >
                <div className="flex flex-wrap gap-4 items-center justify-between">
                  <Icon className={`w-6 h-6 ${
                    isActive ? 'text-white' : 'text-gray-600'
                  }`} />
                  {isActive && (
                    <Zap className="w-4 h-4 animate-pulse" />
                  )}
                </div>
                <h3 className="typography-h3 mt-2 text-sm">{copy(persona.title)}</h3>
                <p className="text-xs opacity-80 mt-1">{copy(persona.subtitle)}</p>
              </motion.button>
            );
          })}
        </div>

        {/* Main Chat Container */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Chat Header */}
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-6">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-full ${currentPersona.color} flex items-center justify-center`}>
                  <PersonaIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="typography-h2 text-xl text-white">{copy(currentPersona.title)}</h2>
                  <p className="text-gray-300 text-sm">{copy(currentPersona.subtitle)}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="inline-flex items-center px-4 py-2 bg-white bg-opacity-10 rounded-full">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse mr-2"></div>
                  <span className="text-sm text-gray-300">{copy("Connection checked when you send")}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="h-[500px] overflow-y-auto p-6 space-y-6">
            <AnimatePresence>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] rounded-2xl p-4 ${
                    message.type === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-gray-100 text-gray-800 rounded-bl-none'
                  }`}>
                    {message.type === 'assistant' && message.persona && (
                      <div className="flex items-center mb-2">
                        <div className={`w-6 h-6 rounded-full ${personas[message.persona].color} flex items-center justify-center mr-2`}>
                          {React.createElement(personas[message.persona].icon, { className: 'w-3 h-3 text-white' })}
                        </div>
                        <span className="text-sm font-medium">{copy(personas[message.persona].title)}</span>
                      </div>
                    )}
                    <p
                      className="text-sm leading-relaxed whitespace-pre-wrap"
                      dir="auto"

                    >
                      {message.text}
                    </p>

                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Typing Indicator */}
            {typing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center space-x-2"
              >
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <PersonaIcon className="w-4 h-4 text-gray-600" />
                </div>
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-200 p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 min-w-0">
                <div className="relative">
                  <textarea
                    rows={2}
                    aria-label={copy('Message to the assistant')}
                    dir="auto"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={copy('Ask about AIM 7510...')}
                    className="w-full px-6 py-4 bg-white rounded-2xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-400 text-gray-900 placeholder:text-gray-400 text-base font-medium"
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void handleSend(); } }}
                  />

                </div>
                <div className="flex flex-wrap gap-2 justify-between items-center mt-2 px-2">
                  <span className="text-xs text-gray-500">{copy("Press Enter to send • Shift+Enter for new line")}</span>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-xs text-gray-500">{copy("YDT assistance — verify guidance before use")}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => void handleSend()}
                disabled={!input.trim() || typing || backendLoading}
                className="px-6 py-4 bg-gradient-to-r from-blue-600 to-amber-600 text-white rounded-2xl font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
              >
                <div className="flex items-center space-x-2">
                  <Send className="w-5 h-5" />
                  <span>{copy("Send")}</span>
                </div>
              </button>
            </div>

            {/* Quick Actions */}
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
              {quickActions.map((action, index) => {
                const ActionIcon = action.icon;
                return (
                  <button
                    key={index}
                    onClick={() => handleQuickAction(action)}
                    disabled={typing || backendLoading}
                    className="flex items-center justify-center space-x-2 px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition text-sm font-medium text-gray-700"
                  >
                    <ActionIcon className="w-4 h-4" />
                    <span>{copy(action.text)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Knowledge Status Footer */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl shadow">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <span className="text-sm font-medium text-gray-600">{copy("Knowledge Base")}</span>
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-green-600" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold">{copy("On request")}</div>
              <div className="text-sm text-gray-500">{copy("Components & Parts")}</div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <span className="text-sm font-medium text-gray-600">{copy("Guidance")}</span>
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Shield className="w-4 h-4 text-blue-600" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold">{copy("Verify")}</div>
              <div className="text-sm text-gray-500">{copy("Knowledge Base")}</div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <span className="text-sm font-medium text-gray-600">{copy("Languages")}</span>
              <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                <Languages className="w-4 h-4 text-amber-600" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold">4</div>
              <div className="text-sm text-gray-500">{copy("TR/EN/RU/AR")}</div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <span className="text-sm font-medium text-gray-600">{copy("Response Time")}</span>
              <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                <Zap className="w-4 h-4 text-amber-600" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold">{copy("Variable")}</div>
              <div className="text-sm text-gray-500">{copy("Depends on service availability")}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

