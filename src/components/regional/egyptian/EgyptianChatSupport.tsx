import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageCircle, Send, Phone, Mail, Clock } from 'lucide-react';

/**
 * Egyptian Chat Support Component
 * Provides chat support functionality for Egyptian customers
 */
export const EgyptianChatSupport: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: 'مرحباً! أنا هنا لمساعدتك في آلات YILMAZ للألمنيوم و UPVC. كيف يمكنني مساعدتك اليوم؟',
      sender: 'support',
      timestamp: new Date()
    }
  ]);

  const handleSendMessage = () => {
    if (message.trim()) {
      const newMessage = {
        id: messages.length + 1,
        text: message,
        sender: 'user',
        timestamp: new Date()
      };
      setMessages([...messages, newMessage]);
      setMessage('');
      
      // Enhanced response simulation for aluminum/UPVC machinery
      setTimeout(() => {
        const responses = [
          'شكراً لرسالتك. سأقوم بالرد عليك في أقرب وقت ممكن.',
          'أفهم استفسارك. هل تبحث عن آلة YILMAZ للألمنيوم أم UPVC؟',
          'سأقوم بتوجيهك للخبير المناسب. ما نوع الإنتاج الذي تخطط له؟',
          'ممتاز! سأقوم بإرسال معلومات مفصلة عن آلات YILMAZ المناسبة لاحتياجاتك.',
          'هل تحتاج إلى معلومات عن الأسعار أم المواصفات التقنية؟'
        ];
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        
        const response = {
          id: messages.length + 2,
          text: randomResponse,
          sender: 'support',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, response]);
      }, 1000);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 left-4 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="bg-green-500 hover:bg-green-600 text-white rounded-full p-3 shadow-lg"
          size="lg"
        >
          <MessageCircle className="w-6 h-6" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 w-80">
      <Card className="shadow-xl border border-gray-200 dark:border-gray-700">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-green-500" />
              دعم العملاء - مصر
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-6 w-6 p-0"
            >
              ×
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Contact Info */}
          <div className="mb-3 p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs">
            <div className="flex items-center gap-2 mb-1">
              <Phone className="w-3 h-3 text-green-500" />
              <span>+20 2 1234 5678</span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <Mail className="w-3 h-3 text-green-500" />
              <span>support@almona-eg.com</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-3 h-3 text-green-500" />
              <span>9:00 AM - 6:00 PM (GMT+2)</span>
            </div>
          </div>

          {/* Messages */}
          <div className="h-48 overflow-y-auto mb-3 space-y-2">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-2 rounded-lg text-xs ${
                    msg.sender === 'user'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          {/* Message Input */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="اكتب رسالتك..."
                className="text-xs h-8"
                dir="rtl"
              />
              <Button
                onClick={handleSendMessage}
                size="sm"
                className="h-8 px-3 bg-green-500 hover:bg-green-600"
              >
                <Send className="w-3 h-3" />
              </Button>
            </div>
            
            {/* Quick Actions for Aluminum/UPVC Machinery */}
            <div className="flex flex-wrap gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMessage('أريد معلومات عن أسعار آلات YILMAZ')}
                className="text-xs h-6 px-2"
              >
                أسعار
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMessage('أريد معلومات عن آلات الألمنيوم')}
                className="text-xs h-6 px-2"
              >
                ألمنيوم
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMessage('أريد معلومات عن آلات UPVC')}
                className="text-xs h-6 px-2"
              >
                UPVC
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMessage('أريد دعم فني وتركيب')}
                className="text-xs h-6 px-2"
              >
                دعم فني
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EgyptianChatSupport;
