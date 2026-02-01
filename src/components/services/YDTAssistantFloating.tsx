
import { Button } from '@/components/ui/button-gold-tier';
import { CardContent, CardHeader, GoldTierCard } from '@/components/ui/card-gold-tier';
import { useYDT } from '@/context/YDT_Context';
import { cn } from '@/lib/utils';
import { Bot, MessageSquare, Send, Sparkles, User, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export function YDTAssistantFloating() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; text: string }[]>([
    { role: 'assistant', text: "Hello! I'm YDT, your technical assistant. How can I help you with your machinery today?" }
  ]);
  const [inputValue, setInputValue] = useState('');
  const { askAssistant, isThinking } = useYDT();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const toggleOpen = () => setIsOpen(!isOpen);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMsg = inputValue;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInputValue('');

    const response = await askAssistant(userMsg);
    setMessages(prev => [...prev, { role: 'assistant', text: response }]);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4 font-sans">
      {/* Chat Window */}
      {isOpen && (
        <GoldTierCard className="w-80 md:w-96 shadow-2xl border-amber-500/20 bg-slate-900/95 backdrop-blur-md animate-in slide-in-from-bottom-10 fade-in duration-300 flex flex-col h-[500px]">
          <CardHeader className="bg-gradient-to-r from-amber-600 to-amber-500 p-4 shrink-0 rounded-t-lg">
             <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-slate-900">
                    <div className="bg-white/20 p-1.5 rounded-full">
                        <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-sm">YDT Assistant</h3>
                        <p className="text-[10px] text-amber-100 font-medium opacity-90">Powered by Gemini</p>
                    </div>
                </div>
                <button onClick={toggleOpen} className="text-white/70 hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                </button>
             </div>
          </CardHeader>
          
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/30">
              {messages.map((msg, idx) => (
                  <div key={idx} className={cn("flex gap-3 text-sm", msg.role === 'user' ? "flex-row-reverse" : "flex-row")}>
                      <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border",
                          msg.role === 'user' ? "bg-slate-700 border-slate-600" : "bg-amber-500/10 border-amber-500/30 text-amber-500"
                      )}>
                          {msg.role === 'user' ? <User className="w-4 h-4 text-slate-300" /> : <Sparkles className="w-4 h-4" />}
                      </div>
                      <div className={cn(
                          "p-3 rounded-lg max-w-[80%] leading-relaxed",
                          msg.role === 'user' ? "bg-slate-800 text-slate-200 rounded-tr-none" : "bg-slate-900 border border-slate-800 text-slate-300 rounded-tl-none"
                      )}>
                          {msg.text}
                      </div>
                  </div>
              ))}
              
              {isThinking && (
                  <div className="flex gap-3 text-sm">
                       <div className="w-8 h-8 rounded-full bg-amber-500/10 border-amber-500/30 text-amber-500 flex items-center justify-center border">
                           <Bot className="w-4 h-4 animate-pulse" />
                       </div>
                       <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg rounded-tl-none">
                           <div className="flex gap-1">
                               <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                               <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                               <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce"></span>
                           </div>
                       </div>
                  </div>
              )}
              <div ref={messagesEndRef} />
          </CardContent>

          <div className="p-3 bg-slate-900 border-t border-slate-800 shrink-0">
             <div className="relative">
                 <input 
                    type="text" 
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Ask about error codes, maintenance..." 
                    className="w-full bg-slate-950 border border-slate-700 rounded-full py-2.5 pl-4 pr-10 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all placeholder:text-slate-600 text-slate-200"
                 />
                 <button 
                    onClick={handleSend}
                    disabled={!inputValue.trim() || isThinking}
                    className="absolute right-1 top-1 p-1.5 bg-amber-500 text-slate-900 rounded-full disabled:opacity-50 hover:bg-amber-400 transition-colors"
                 >
                    <Send className="w-3 h-3" />
                 </button>
             </div>
          </div>
        </GoldTierCard>
      )}

      {/* Floating Toggle Button */}
      {!isOpen && (
        <Button 
            onClick={toggleOpen} 
            size="lg" 
            className="rounded-full w-14 h-14 shadow-[0_0_20px_rgba(245,158,11,0.3)] bg-gradient-to-br from-amber-500 to-amber-600 hover:scale-110 transition-transform duration-300 flex items-center justify-center p-0 border-2 border-white/10"
        >
            <MessageSquare className="w-6 h-6 text-white ml-0.5 mt-0.5" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
        </Button>
      )}
    </div>
  );
}
