/**
 * Client Communication Center
 * 
 * Gold-tier component for client-company communication.
 * 
 * Features:
 * - Message list
 * - Send messages
 * - Message history
 * - Prestige dark theme styling
 */

import { cn } from '@/lib/utils';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Input } from '@/shared/ui/ui/input';
import { Textarea } from '@/shared/ui/ui/textarea';
import { format } from 'date-fns';
import {
    CheckCircle2,
    Clock,
    MessageSquare,
    Send,
    User,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface ClientCommunicationCenterProps {
  customerId: string;
}

interface Message {
  id: string;
  subject: string;
  content: string;
  from: 'customer' | 'company';
  status: 'sent' | 'read' | 'replied';
  created_at: Date;
}

export const ClientCommunicationCenter: React.FC<ClientCommunicationCenterProps> = ({ customerId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompose, setShowCompose] = useState(false);
  const [newMessage, setNewMessage] = useState({
    subject: '',
    content: '',
  });

  useEffect(() => {
    loadMessages();
  }, [customerId]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      // In a real implementation, this would fetch from a messages table
      // For now, we'll use a mock structure
      const mockMessages: Message[] = [
        {
          id: '1',
          subject: 'Quote Inquiry',
          content: 'I would like to inquire about the quote I received.',
          from: 'customer',
          status: 'sent',
          created_at: new Date(),
        },
        {
          id: '2',
          subject: 'Re: Quote Inquiry',
          content: 'Thank you for your inquiry. We will review and get back to you shortly.',
          from: 'company',
          status: 'read',
          created_at: new Date(Date.now() - 86400000),
        },
      ];
      setMessages(mockMessages);
    } catch (error) {
      console.error('Failed to load messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.subject || !newMessage.content) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      // In a real implementation, this would save to a messages table
      const message: Message = {
        id: Date.now().toString(),
        subject: newMessage.subject,
        content: newMessage.content,
        from: 'customer',
        status: 'sent',
        created_at: new Date(),
      };

      setMessages([message, ...messages]);
      setNewMessage({ subject: '', content: '' });
      setShowCompose(false);
      toast.success('Message sent');
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'read' || status === 'replied') {
      return (
        <Badge variant="outline" className="bg-green-500/20 text-green-200 border-green-500/30">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          {status === 'replied' ? 'Replied' : 'Read'}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-amber-500/20 text-amber-200 border-amber-500/30">
        <Clock className="w-3 h-3 mr-1" />
        Sent
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card className="bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark">
        <CardContent className="p-8">
          <div className="text-center text-amber-600/70">Loading messages...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Compose Message */}
      {showCompose ? (
        <Card className="bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark">
          <CardHeader>
            <CardTitle className="text-lg text-amber-200">Compose Message</CardTitle>
            <CardDescription className="text-sm text-amber-600/70">
              Send a message to our team
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-amber-300/70 mb-2 block">Subject</label>
              <Input
                value={newMessage.subject}
                onChange={(e) => setNewMessage({ ...newMessage, subject: e.target.value })}
                placeholder="Message subject"
                className="bg-[#0f0f0f]/60 border-amber-600/30 text-amber-200"
              />
            </div>
            <div>
              <label className="text-sm text-amber-300/70 mb-2 block">Message</label>
              <Textarea
                value={newMessage.content}
                onChange={(e) => setNewMessage({ ...newMessage, content: e.target.value })}
                placeholder="Your message..."
                rows={6}
                className="bg-[#0f0f0f]/60 border-amber-600/30 text-amber-200"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleSendMessage}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                <Send className="w-4 h-4 mr-2" />
                Send Message
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCompose(false);
                  setNewMessage({ subject: '', content: '' });
                }}
                className="border-amber-600/30 text-amber-300 hover:bg-amber-500/10"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark">
          <CardContent className="p-4">
            <Button
              onClick={() => setShowCompose(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white w-full"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              New Message
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Messages List */}
      <Card className="bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark">
        <CardHeader>
          <CardTitle className="text-lg text-amber-200">Messages</CardTitle>
          <CardDescription className="text-sm text-amber-600/70">
            {messages.length} message{messages.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {messages.length === 0 ? (
            <div className="text-center py-8 text-amber-600/70">No messages found</div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'p-4 rounded border',
                    message.from === 'customer'
                      ? 'bg-[#0f0f0f]/60 border-amber-600/20'
                      : 'bg-amber-500/5 border-amber-600/30'
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <User className={cn(
                        'w-4 h-4',
                        message.from === 'customer' ? 'text-amber-500/50' : 'text-amber-400'
                      )} />
                      <span className="text-amber-200 font-medium">
                        {message.from === 'customer' ? 'You' : 'Company'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(message.status)}
                      <span className="text-xs text-amber-600/50">
                        {format(message.created_at, 'MMM d, yyyy HH:mm')}
                      </span>
                    </div>
                  </div>
                  <p className="text-amber-200 font-medium mb-1">{message.subject}</p>
                  <p className="text-amber-300/70 text-sm">{message.content}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

