
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button-gold-tier';
import { CardContent, CardHeader, CardTitle, GoldTierCard } from '@/components/ui/card-gold-tier';
import { cn } from '@/lib/utils';
import { ArrowLeft, Bot, Clock, Paperclip, Send, User } from 'lucide-react';
import { useState } from 'react';

interface Message {
  id: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  timestamp: string;
  attachments?: string[];
}

interface TicketDetailProps {
  ticket: {
    id: string;
    type: string;
    subject: string;
    description: string;
    status: string;
    date: string;
    rmaId?: string;
  };
  onBack: () => void;
}

// Mock initial messages for the thread
const MOCK_MESSAGES: Message[] = [
    { id: 'm1', role: 'user', content: 'The machine is vibrating excessively during the spin cycle.', timestamp: 'Nov 15, 09:30 AM' },
    { id: 'm2', role: 'system', content: 'Ticket #RMA-2023-001 created. Auto-assigned to Technical Support.', timestamp: 'Nov 15, 09:30 AM' },
    { id: 'm3', role: 'agent', content: 'Hello, I see the vibration issue. Can you confirm if the error code E-402 is displayed?', timestamp: 'Nov 15, 10:15 AM' },
];

export function TicketDetailView({ ticket, onBack }: TicketDetailProps) {
    const [reply, setReply] = useState('');
    const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);
    const [sending, setSending] = useState(false);

    const handleSend = () => {
        if (!reply.trim()) return;
        setSending(true);
        
        // Simulate sending
        setTimeout(() => {
            const newMsg: Message = {
                id: `m${Date.now()}`,
                role: 'user',
                content: reply,
                timestamp: 'Just now'
            };
            setMessages([...messages, newMsg]);
            setReply('');
            setSending(false);
        }, 600);
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
            {/* Header / Nav */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={onBack} leftIcon={<ArrowLeft className="w-4 h-4" />}>
                    Back
                </Button>
                <div>
                    <h2 className="text-2xl font-bold text-foreground flex items-center gap-3">
                        {ticket.subject}
                        <Badge variant="outline" className="border-amber-500 text-amber-500">{ticket.id}</Badge>
                    </h2>
                    <p className="text-muted-foreground text-sm flex items-center gap-2 mt-1">
                        <Clock className="w-3 h-3" /> Last updated: Today
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Conversation Thread */}
                <div className="lg:col-span-2 space-y-6">
                    <GoldTierCard className="bg-background/50 border-border min-h-[500px] flex flex-col">
                        <CardHeader className="border-b border-border/50 pb-4">
                            <CardTitle className="text-lg">Conversation History</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Original Description as first message */}
                            <div className="p-4 bg-card/50 rounded-lg border border-border/50 mb-8">
                                <h4 className="text-xs font-bold text-muted-foreground uppercase mb-2">Original Issue Description</h4>
                                <p className="text-foreground italic">"{ticket.description}"</p>
                            </div>

                            {messages.map((msg) => (
                                <div key={msg.id} className={cn("flex gap-4", msg.role === 'user' ? "flex-row-reverse" : "flex-row")}>
                                    {/* Avatar */}
                                    <div className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center shrink-0 border",
                                        msg.role === 'user' ? "bg-muted border-border" :
                                        msg.role === 'agent' ? "bg-amber-500/10 border-amber-500/30 text-amber-500" :
                                        "bg-transparent border-transparent" // system
                                    )}>
                                        {msg.role === 'user' ? <User className="w-5 h-5 text-foreground" /> :
                                         msg.role === 'agent' ? <Bot className="w-5 h-5" /> : 
                                         null}
                                    </div>

                                    {/* Bubble */}
                                    <div className={cn(
                                        "max-w-[80%]",
                                        msg.role === 'system' ? "w-full flex justify-center py-2" : ""
                                    )}>
                                        {msg.role === 'system' ? (
                                            <span className="text-xs text-muted-foreground font-mono bg-background px-2 py-1 rounded">{msg.content}</span>
                                        ) : (
                                            <div className="flex flex-col gap-1">
                                                <div className={cn(
                                                    "p-3 rounded-lg text-sm leading-relaxed",
                                                    msg.role === 'user' ? "bg-amber-600 text-white rounded-tr-none" : "bg-card text-foreground rounded-tl-none border border-border"
                                                )}>
                                                    {msg.content}
                                                </div>
                                                <span className={cn("text-[10px] text-muted-foreground", msg.role === 'user' && "text-right")}>{msg.timestamp}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                        
                        {/* Reply Area */}
                        <div className="p-4 bg-background border-t border-border">
                             <div className="flex gap-2">
                                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                                    <Paperclip className="w-5 h-5" />
                                </Button>
                                <div className="flex-1 relative">
                                    <textarea 
                                        value={reply}
                                        onChange={(e) => setReply(e.target.value)}
                                        placeholder="Type your reply here..."
                                        className="w-full bg-background border border-border rounded-lg p-3 pr-12 text-sm text-foreground focus:outline-none focus:border-amber-500 resize-none h-12 min-h-[48px] max-h-32 transition-all focus:h-24"
                                    />
                                    <Button 
                                        size="sm" 
                                        className="absolute right-2 bottom-2 rounded-md h-8 w-8 p-0" 
                                        onClick={handleSend}
                                        disabled={!reply.trim() || sending}
                                        loading={sending}
                                    >
                                        <Send className="w-4 h-4" />
                                    </Button>
                                </div>
                             </div>
                        </div>
                    </GoldTierCard>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                    {ticket.rmaId && (
                        <div className="space-y-2">
                             <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">RMA Status</h3>
                             <GoldTierCard className="p-4 bg-background/80 border-border">
                                 {/* Only showing mini view or summary here */}
                                 <div className="flex items-center justify-between mb-4">
                                     <span className="text-foreground font-bold">{ticket.rmaId}</span>
                                     <Badge className="bg-amber-500 text-foreground">Active</Badge>
                                 </div>
                                 <p className="text-sm text-muted-foreground mb-4">Tracking active repair workflow.</p>
                                 <Button variant="outline" fullWidth size="sm" onClick={() => {}}>View Full Tracker</Button>
                             </GoldTierCard>
                        </div>
                    )}
                    
                    <div className="space-y-2">
                        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Details</h3>
                        <GoldTierCard className="bg-background/80 border-border">
                            <CardContent className="p-0">
                                <div className="p-4 border-b border-border flex justify-between">
                                    <span className="text-muted-foreground text-sm">Status</span>
                                    <Badge variant="outline" className="border-green-500 text-success capitalize">{ticket.status}</Badge>
                                </div>
                                <div className="p-4 border-b border-border flex justify-between">
                                    <span className="text-muted-foreground text-sm">Type</span>
                                    <span className="text-foreground text-sm capitalize">{ticket.type}</span>
                                </div>
                                <div className="p-4 flex justify-between">
                                    <span className="text-muted-foreground text-sm">Assigned To</span>
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center text-[10px] font-bold">JD</div>
                                        <span className="text-foreground text-sm">John Doe</span>
                                    </div>
                                </div>
                            </CardContent>
                        </GoldTierCard>
                    </div>

                    <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                        <h4 className="flex items-center gap-2 text-info font-bold text-sm mb-2">
                            <Bot className="w-4 h-4" /> YDT Suggestion
                        </h4>
                        <p className="text-xs text-blue-200/80 leading-relaxed">
                            Based on the conversation, this looks like a standardized capacitor failure. I've linked the replacement part in your cart for quick approval.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
