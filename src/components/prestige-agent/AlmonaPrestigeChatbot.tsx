import { usePublicCopy } from '@/hooks/usePublicCopy';
/**
 * YDT Prestige Agent: Interactive Chatbot with Almona Style
 * University-grade interface with animations and professional design
 */
import { usePrestigeAgent } from '@/hooks/usePrestigeAgent';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BrainCircuit,
  Code,
  Compass,
  GraduationCap,
  Languages,
  Send,
  Shield,
  Stethoscope,
  Zap
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { PrestigeMicroInteractions } from './PrestigeMicroInteractions';
import './prestige-animations.css';
import { TutorialSlides } from './TutorialSlides';
import { readGuidedContent, type GuidedContent } from './guidedContent';
import { FaultIntake } from './FaultIntake';

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
    guide?: GuidedContent;
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
    title: 'Operation guidance',
    subtitle: 'Operating procedures and explanations',
    animation: 'gentle-pulse'
  },
  doctor: {
    icon: Stethoscope,
    color: 'bg-red-600',
    title: 'Fault guidance',
    subtitle: 'Review symptoms and possible causes',
    animation: 'heartbeat'
  },
  tourGuide: {
    icon: Compass,
    color: 'bg-green-600',
    title: 'Machine reference',
    subtitle: 'Components and applications',
    animation: 'float'
  },
  codeMaster: {
    icon: Code,
    color: 'bg-blue-600',
    title: 'G-code guidance',
    subtitle: 'Examples for operator review',
    animation: 'code-glow'
  },
  nervousSystem: {
    icon: BrainCircuit,
    color: 'bg-amber-600',
    title: 'Maintenance guidance',
    subtitle: 'Checks and maintenance questions',
    animation: 'circuit-flow'
  }
};

const quickActions = [
  { text: 'Teach me operation', icon: GraduationCap, persona: 'professor' as PersonaType },
  { text: 'Diagnose a fault', icon: Stethoscope, persona: 'doctor' as PersonaType },
  { text: 'Show G-code example', icon: Code, persona: 'codeMaster' as PersonaType },
  { text: 'Explore applications', icon: Compass, persona: 'tourGuide' as PersonaType }
];

// Render technical content (G/M-code, sample programs) in monospace.
const isCodeMessage = (text: string): boolean => /\b[GM]\d+(?:\.\d+)?\b/.test(text);

// Read a spec value safely for the technical-data readout.
const specValue = (value: unknown): string => (typeof value === 'string' && value ? value : 'â€”');

  const getWelcomeMessage = (lang: LanguageType): string => {
    const welcomes = {
      en: "Welcome! I'm your YDT Agent. I can help you learn, diagnose, explore, and program AIM 7510. How can I assist you today?",
      tr: "HoÅŸ geldiniz! YDT Agent'Ä±nÄ±zÄ±m. AIM 7510'u Ã¶ÄŸrenmenize, teÅŸhis etmenize, keÅŸfetmenize ve programlamanÄ±za yardÄ±mcÄ± olabilirim. BugÃ¼n size nasÄ±l yardÄ±mcÄ± olabilirim?",
      ru: "Ð”Ð¾Ð±Ñ€Ð¾ Ð¿Ð¾Ð¶Ð°Ð»Ð¾Ð²Ð°Ñ‚ÑŒ! Ð¯ Ð²Ð°Ñˆ YDT Agent. Ð¯ Ð¼Ð¾Ð³Ñƒ Ð¿Ð¾Ð¼Ð¾Ñ‡ÑŒ Ð²Ð°Ð¼ Ð¸Ð·ÑƒÑ‡Ð°Ñ‚ÑŒ, Ð´Ð¸Ð°Ð³Ð½Ð¾ÑÑ‚Ð¸Ñ€Ð¾Ð²Ð°Ñ‚ÑŒ, Ð¸ÑÑÐ»ÐµÐ´Ð¾Ð²Ð°Ñ‚ÑŒ Ð¸ Ð¿Ñ€Ð¾Ð³Ñ€Ð°Ð¼Ð¼Ð¸Ñ€Ð¾Ð²Ð°Ñ‚ÑŒ AIM 7510. Ð§ÐµÐ¼ Ñ Ð¼Ð¾Ð³Ñƒ Ð¿Ð¾Ð¼Ð¾Ñ‡ÑŒ Ð²Ð°Ð¼ ÑÐµÐ³Ð¾Ð´Ð½Ñ?",
      ar: "Ø£Ù‡Ù„Ø§Ù‹ ÙˆØ³Ù‡Ù„Ø§Ù‹! Ø£Ù†Ø§ YDT Ø§Ù„Ù…Ø³Ø§Ø¹Ø¯. ÙŠÙ…ÙƒÙ†Ù†ÙŠ Ù…Ø³Ø§Ø¹Ø¯ØªÙƒ ÙÙŠ ØªØ¹Ù„Ù… ÙˆØªØ´Ø®ÙŠØµ ÙˆØ§Ø³ØªÙƒØ´Ø§Ù ÙˆØ¨Ø±Ù…Ø¬Ø© AIM 7510. ÙƒÙŠÙ ÙŠÙ…ÙƒÙ†Ù†ÙŠ Ù…Ø³Ø§Ø¹Ø¯ØªÙƒ Ø§Ù„ÙŠÙˆÙ…ØŸ"
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
  const [machineSpecs, setMachineSpecs] = useState<Record<string, unknown> | null>(null);

  const [typing, setTyping] = useState(false);
  const [activeGuide, setActiveGuide] = useState<{ id: string; guide: GuidedContent; persona: PersonaType } | null>(null);
  const [showFaultIntake, setShowFaultIntake] = useState(false);
  const guideRegion = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (activeGuide || showFaultIntake) {
      guideRegion.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
      guideRegion.current?.focus({ preventScroll: true });
    }
  }, [activeGuide, showFaultIntake]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const microInteractions = useRef(new PrestigeMicroInteractions());

  // Backend integration
  const {
    sendMessage: sendMessageToBackend,
    getKnowledgeStats: fetchKnowledgeStats,
    getMachineCapabilities: fetchMachineCapabilities,
    connectionStatus,
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
        const [, caps] = await Promise.allSettled([
          fetchKnowledgeStats(),
          fetchMachineCapabilities()
        ]);
        if (caps.status === 'fulfilled' && caps.value?.success) {
          const specs = caps.value?.data?.specifications;
          if (specs) setMachineSpecs(specs as Record<string, unknown>);
        }
        // Silently handle failures - backend may not be available in dev
      } catch {
        // Silently fail - expected in development when backend is not running
      }
    };

    void loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Removed auto-scroll - user controls scrolling manually

  const handleRecheck = async () => {
    await fetchKnowledgeStats();
    const caps = await fetchMachineCapabilities();
    if (caps?.success) {
      const specs = caps?.data?.specifications;
      if (specs) setMachineSpecs(specs as Record<string, unknown>);
    }
  };

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
            responseTime: response.data.response_time,
            guide: readGuidedContent(response.data.visual_elements?.guided_content)
          }
        };

        setMessages(prev => [...prev, assistantMessage]);
        if (assistantMessage.extras?.guide) {
          setShowFaultIntake(false);
          setActiveGuide({ id: assistantMessage.id, guide: assistantMessage.extras.guide, persona });
        } else {
          setActiveGuide(null);
        }

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
    if (action.persona === 'doctor') {
      setShowFaultIntake(true);
      return;
    }
    setShowFaultIntake(false);
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
    <div className="min-h-screen industry-canvas p-4 md:p-8 text-slate-100">
      <div className="max-w-6xl mx-auto" style={{ marginTop: '2.5cm' }}>
        {/* Prestige Header */}
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <motion.div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-slate-800 border border-cyan-400/30 flex items-center justify-center industry-accent">
                <BrainCircuit className="w-8 h-8 text-cyan-300" />
              </div>
            </motion.div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-300/90 border border-cyan-400/30 rounded px-1.5 py-0.5">Industry 4.0</span>
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400">Digital Twin</span>
              </div>
              <h1 className="typography-h1 text-white">{copy("YDT")} <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-amber-400">{copy("Technical support")}</span></h1>
              <p className="text-slate-300 flex items-center gap-2">
                <Shield className="w-4 h-4 text-cyan-300" />
                <span>{copy("Operation, maintenance and fault guidance for AIM 7510")}</span>
              </p>
            </div>
          </div>

          {/* Language Selector */}
          <div className="flex items-center space-x-2">
            <Languages className="w-5 h-5 text-slate-400" />
            {(['TR', 'EN', 'RU', 'AR'] as const).map((lang) => (
              <motion.button
                key={lang}
                onClick={() => handleLanguageChange(lang.toLowerCase() as LanguageType)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-all duration-200 ${
                  language === lang.toLowerCase()
                    ? 'bg-cyan-500 text-slate-950 shadow-md'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
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
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.95 }}
                aria-pressed={isActive}
                onClick={() => handlePersonaChange(key as PersonaType)}
                className={`p-4 rounded-2xl transition-all border ${
                  isActive
                    ? `${persona.color} text-white border-transparent industry-accent`
                    : 'bg-slate-900/70 text-slate-200 border-slate-700/70 hover:border-slate-500 hover:bg-slate-800/70'
                }`}
              >
                <div className="flex flex-wrap gap-4 items-center justify-between">
                  <Icon className={`w-6 h-6 ${
                    isActive ? 'text-white' : 'text-slate-400'
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

        <div ref={guideRegion} tabIndex={-1} className="scroll-mt-24 outline-none mb-6">
          {showFaultIntake ? (
            <FaultIntake onCancel={() => setShowFaultIntake(false)} onSubmit={symptom => { setShowFaultIntake(false); void handleSend(symptom, 'doctor'); }} />
          ) : activeGuide && (
            <TutorialSlides key={activeGuide.id} modules={activeGuide.guide.modules} personaTitle={activeGuide.guide.title}
              notice={activeGuide.guide.notice} language={activeGuide.guide.language} symptom={activeGuide.guide.symptom}
              onClose={() => setActiveGuide(null)}
              onAsk={topic => { setAgentPersona(activeGuide.persona); setInput(`${copy('Explain')}: ${topic}`); composer.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' }); composer.current?.focus({ preventScroll: true }); }} />
          )}
        </div>

        {/* Main Chat Container */}
        <div className="industry-panel rounded-3xl overflow-hidden industry-scan">
          {/* Chat Header */}
          <div className="bg-slate-900/80 border-b border-slate-700/60 p-6">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-xl ${currentPersona.color} flex items-center justify-center`}>
                  <PersonaIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="typography-h2 text-xl text-white">{copy(currentPersona.title)}</h2>
                  <p className="text-slate-300 text-sm">{copy(currentPersona.subtitle)}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="inline-flex items-center px-4 py-2 bg-slate-800 border border-slate-700 rounded-md">
                  <div className={`w-2 h-2 rounded-full mr-2 ${connectionStatus === 'connected' ? 'bg-cyan-400' : connectionStatus === 'unavailable' ? 'bg-red-400' : 'bg-slate-500'}`}></div>
                  <span role="status" className="text-sm text-slate-300 industry-mono">{copy(connectionStatus === 'connected' ? 'YDT service responded' : connectionStatus === 'checking' ? 'Checking YDT service' : connectionStatus === 'unavailable' ? 'YDT service unavailable' : 'Connection not checked')}</span>
                  <button type="button" onClick={() => void handleRecheck()} disabled={connectionStatus === 'checking' || typing || backendLoading} className="ml-3 text-sm text-cyan-300 underline disabled:opacity-50">{copy('Recheck')}</button>
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
                      ? 'bg-cyan-600 text-white rounded-br-none'
                      : 'bg-slate-800 text-slate-100 rounded-bl-none border border-slate-700/60'
                  }`}>
                    {message.type === 'assistant' && message.persona && (
                      <div className="flex items-center mb-2">
                        <div className={`w-6 h-6 rounded-full ${personas[message.persona].color} flex items-center justify-center mr-2`}>
                          {React.createElement(personas[message.persona].icon, { className: 'w-3 h-3 text-white' })}
                        </div>
                        <span className="text-sm font-medium">{copy(personas[message.persona].title)}</span>
                      </div>
                    )}
                    {message.type === 'assistant' && message.extras?.guide ? (
                      <div>
                        <p className="text-sm">{message.extras.guide.title}</p>
                        <button type="button" onClick={() => { setShowFaultIntake(false); setActiveGuide({ id: message.id, guide: message.extras!.guide!, persona: message.persona || 'professor' }); }} className="mt-2 text-sm text-cyan-300 underline">{copy('Open guide')}</button>
                      </div>
                    ) : (
                      <p className={`text-sm leading-relaxed whitespace-pre-wrap ${isCodeMessage(message.text) ? 'font-mono text-[13px]' : ''}`} dir="auto">{message.text}</p>
                    )}
                    {message.type === 'assistant' && message.extras?.references && message.extras.references.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-700 flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] uppercase tracking-wider text-slate-500">{copy('Sources')}</span>
                        {message.extras.references.filter((ref) => Boolean(ref)).map((ref, i) => (
                          <span key={i} className="text-[11px] font-mono text-cyan-300/80 bg-slate-700/60 rounded px-1.5 py-0.5">{ref}</span>
                        ))}
                      </div>
                    )}

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
          <div className="border-t border-slate-700/60 p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 min-w-0">
                <div className="relative">
                  <textarea
                    ref={composer}
                    rows={2}
                    aria-label={copy('Message to the assistant')}
                    dir="auto"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={copy('Ask about AIM 7510...')}
                    className="w-full px-6 py-4 bg-slate-800 rounded-xl border border-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-400 text-slate-100 placeholder:text-slate-500 text-base font-medium"
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void handleSend(); } }}
                  />

                </div>
                <div className="flex flex-wrap gap-2 justify-between items-center mt-2 px-2">
                  <span className="text-xs text-slate-400">{copy("Press Enter to send â€¢ Shift+Enter for new line")}</span>
                  <div className="flex items-center space-x-1">
                    <Shield className="w-3 h-3 text-slate-400" />
                    <span className="text-xs text-slate-400">{copy("YDT assistance â€” verify guidance before use")}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => void handleSend()}
                disabled={!input.trim() || typing || backendLoading}
                className="px-6 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
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
                    onClick={() => void handleQuickAction(action)}
                    disabled={typing || backendLoading}
                    className="flex items-center justify-center space-x-2 px-4 py-3 bg-slate-800/70 hover:bg-slate-700 rounded-xl transition text-sm font-medium text-slate-200 border border-slate-700/60"
                  >
                    <ActionIcon className="w-4 h-4" />
                    <span>{copy(action.text)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Technical data readout (advisory, from manual sec. 4) */}
        <div className="mt-8">
          <div className="flex flex-wrap items-baseline gap-2 mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-cyan-300/90">{copy('AIM 7510 â€” Technical data')}</h3>
            <span className="text-[11px] text-slate-500">{copy('from manual sec. 4 Â· advisory')}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {machineSpecs ? ([
              ['Spindle', specValue(machineSpecs.spindle_speed), specValue(machineSpecs.spindle_power)],
              ['Working (X/Y/Z)', `${specValue(machineSpecs.working_x1)} / ${specValue(machineSpecs.working_y1)} / ${specValue(machineSpecs.working_z1)}`, ''],
              ['Feed (X/Y/Z)', `${specValue(machineSpecs.feed_x)} / ${specValue(machineSpecs.feed_y)} / ${specValue(machineSpecs.feed_z)}`, ''],
              ['Axes', specValue(machineSpecs.cnc_axes), specValue(machineSpecs.tool_magazine_capacity)],
              ['Power', `${specValue(machineSpecs.power_voltage)} ${specValue(machineSpecs.power_phase)}`, specValue(machineSpecs.power_consumption)],
              ['Air', specValue(machineSpecs.air_pressure), specValue(machineSpecs.air_consumption)],
              ['Tool (Ã˜ / length)', specValue(machineSpecs.max_tool_diameter), specValue(machineSpecs.max_tool_length)],
              ['Weight (net/gross)', specValue(machineSpecs.weight_net), specValue(machineSpecs.weight_gross)],
            ] as [string, string, string][]).map(([label, value, sub]) => (
              <div key={label} className="bg-slate-900/80 rounded-xl p-3 border border-slate-700/60">
                <div className="text-[11px] uppercase tracking-wide text-slate-500">{copy(label)}</div>
                <div className="text-sm font-semibold text-cyan-300 font-mono mt-0.5">{value}</div>
                {sub ? <div className="text-[11px] text-slate-400 font-mono">{sub}</div> : null}
              </div>
            )) : (
              <div className="col-span-2 md:col-span-4 text-sm text-gray-400">{copy('Technical data unavailable â€” backend not reachable.')}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

