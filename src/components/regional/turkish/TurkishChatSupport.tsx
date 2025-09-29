/**
 * Turkish Language Support Chat Integration
 * Provides Turkish-language customer support with regional context
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useRegionDetection, useRegionUtils } from '@/hooks/useRegionDetection';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface ChatMessage {
  id: string;
  type: 'user' | 'support';
  message: string;
  timestamp: Date;
  isTyping?: boolean;
}

interface TurkishChatSupportProps {
  className?: string;
  onChatStarted?: () => void;
  onChatEnded?: () => void;
}

export const TurkishChatSupport: React.FC<TurkishChatSupportProps> = ({
  className = '',
  onChatStarted,
  onChatEnded
}) => {
  const { t } = useTranslation();
  const { regionState } = useRegionDetection();
  const utils = useRegionUtils();
  
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [userInfo, setUserInfo] = useState({
    name: '',
    email: '',
    phone: ''
  });

  // Enhanced Turkish support responses for aluminum/UPVC machinery
  const turkishResponses = {
    greeting: [
      "Merhaba! Almona müşteri hizmetlerine hoş geldiniz. YILMAZ alüminyum ve UPVC işleme makineleri konusunda size nasıl yardımcı olabilirim?",
      "İyi günler! Almona teknik destek ekibindeyim. Alüminyum pencere, kapı veya UPVC profil üretimi için hangi makineye ihtiyacınız var?",
      "Merhaba! YILMAZ makineleri uzmanıyım. Projeniz için en uygun çözümü bulmanıza yardımcı olayım."
    ],
    pricing: [
      "Fiyat bilgileri için size özel teklif hazırlayabilirim. Hangi YILMAZ makine modeli ile ilgileniyorsunuz? (örn: CNC, Köşe Kaynak, Kesim)",
      "KDV %20 dahil fiyatlarımızı görmek için üretim kapasitenizi ve makine özelliklerini belirtir misiniz?",
      "Türkiye'de ücretsiz kargo ve kurulum hizmetimiz bulunmaktadır. Detaylı fiyat için teknik özelliklerinizi paylaşabilir misiniz?"
    ],
    technical: [
      "Teknik destek için YILMAZ makine seri numaranızı paylaşabilir misiniz? Hangi alüminyum/UPVC işleme sorunu yaşıyorsunuz?",
      "Makine kurulumu, kalibrasyon ve bakım konularında size yardımcı olabilirim. Hangi model YILMAZ makineniz var?",
      "Teknik dokümantasyon ve kullanım kılavuzları için hangi YILMAZ modeli arıyorsunuz? (CNC, Köşe Kaynak, Kesim, Delme vb.)"
    ],
    shipping: [
      "Türkiye genelinde ücretsiz kargo ve kurulum hizmetimiz bulunmaktadır.",
      "Kargo süresi genellikle 2-3 iş günüdür. Kurulum için teknik ekibimiz sizinle iletişime geçecek.",
      "Kargo takibi için takip numaranızı size ileteceğiz. Kurulum sonrası eğitim de dahildir."
    ],
    aluminum: [
      "Alüminyum işleme için YILMAZ CNC makinelerimiz var. Hangi kalınlıkta alüminyum profiller işleyeceksiniz?",
      "Alüminyum pencere ve kapı üretimi için köşe kaynak makinelerimiz mevcut. Günlük üretim kapasiteniz nedir?",
      "Alüminyum kesim, delme ve işleme için tam otomatik YILMAZ makinelerimiz bulunmaktadır."
    ],
    upvc: [
      "UPVC profil işleme için özel YILMAZ makinelerimiz var. Hangi UPVC profil türlerini işleyeceksiniz?",
      "UPVC pencere ve kapı üretimi için köşe kaynak ve kesim makinelerimiz mevcut. Profil kalınlığınız nedir?",
      "UPVC işleme için tam otomatik YILMAZ makinelerimiz bulunmaktadır. Üretim hattınızın kapasitesi nedir?"
    ],
    default: [
      "Anladım. Alüminyum veya UPVC işleme konusunda size daha detaylı bilgi verebilmek için hangi alanla ilgili sorunuz var?",
      "Size yardımcı olabilmem için üretim türünüzü (alüminyum/UPVC) ve makine ihtiyacınızı belirtebilir misiniz?",
      "Bu konuda teknik ekibimizden destek almanızı öneririm. YILMAZ makine uzmanımızla görüşmek ister misiniz?"
    ]
  };

  const getResponseCategory = (message: string): keyof typeof turkishResponses => {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('fiyat') || lowerMessage.includes('maliyet') || lowerMessage.includes('ücret')) {
      return 'pricing';
    }
    if (lowerMessage.includes('teknik') || lowerMessage.includes('kurulum') || lowerMessage.includes('bakım') || lowerMessage.includes('makine')) {
      return 'technical';
    }
    if (lowerMessage.includes('kargo') || lowerMessage.includes('teslimat') || lowerMessage.includes('gönderim')) {
      return 'shipping';
    }
    if (lowerMessage.includes('alüminyum') || lowerMessage.includes('aluminum') || lowerMessage.includes('alüminyum pencere') || lowerMessage.includes('alüminyum kapı')) {
      return 'aluminum';
    }
    if (lowerMessage.includes('upvc') || lowerMessage.includes('pvc') || lowerMessage.includes('upvc profil') || lowerMessage.includes('upvc pencere') || lowerMessage.includes('upvc kapı')) {
      return 'upvc';
    }
    
    return 'default';
  };

  const getRandomResponse = (category: keyof typeof turkishResponses): string => {
    const responses = turkishResponses[category];
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const simulateTyping = useCallback((response: string) => {
    setIsTyping(true);
    
    setTimeout(() => {
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'support',
        message: response,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, newMessage]);
      setIsTyping(false);
    }, 1000 + Math.random() * 2000); // 1-3 second delay
  }, []);

  const handleSendMessage = useCallback(() => {
    if (!inputMessage.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      message: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');

    // Generate response
    const category = getResponseCategory(inputMessage);
    const response = getRandomResponse(category);
    simulateTyping(response);
  }, [inputMessage, simulateTyping]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  const startChat = useCallback(() => {
    setIsOpen(true);
    onChatStarted?.();
    
    // Add initial greeting
    const greeting: ChatMessage = {
      id: 'greeting',
      type: 'support',
      message: turkishResponses.greeting[0],
      timestamp: new Date()
    };
    setMessages([greeting]);
  }, [onChatStarted]);

  const endChat = useCallback(() => {
    setIsOpen(false);
    setMessages([]);
    setInputMessage('');
    onChatEnded?.();
  }, [onChatEnded]);

  // Auto-open chat for Turkish users
  useEffect(() => {
    if (regionState.region === 'TR' && !isOpen) {
      const timer = setTimeout(() => {
        startChat();
      }, 3000); // Auto-open after 3 seconds for Turkish users
      
      return () => clearTimeout(timer);
    }
  }, [regionState.region, isOpen, startChat]);

  if (!isOpen) {
    return (
      <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
        <Button
          onClick={startChat}
          className="bg-green-500 hover:bg-green-600 text-white rounded-full p-4 shadow-lg"
        >
          <div className="flex items-center space-x-2">
            <span>🇹🇷</span>
            <span className="hidden sm:inline">{t('turkish.chat.startChat', 'Türkçe Destek')}</span>
          </div>
        </Button>
      </div>
    );
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 w-80 max-h-96 ${className}`}>
      <Card className="bg-white dark:bg-gray-800 shadow-xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center space-x-2">
              <span>🇹🇷</span>
              <span>{t('turkish.chat.title', 'Türkçe Destek')}</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-green-600 border-green-600 text-xs">
                {t('turkish.chat.online', 'Çevrimiçi')}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={endChat}
                className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700"
              >
                ×
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {/* Chat Messages */}
          <div className="h-64 overflow-y-auto p-3 space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs p-2 rounded-lg text-sm ${
                    message.type === 'user'
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                  }`}
                >
                  {message.message}
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-lg">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <Separator />
          
          {/* Chat Input */}
          <div className="p-3">
            <div className="flex space-x-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={t('turkish.chat.placeholder', 'Mesajınızı yazın...')}
                className="flex-1 text-sm"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim()}
                size="sm"
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                {t('turkish.chat.send', 'Gönder')}
              </Button>
            </div>
            
            {/* Enhanced Quick Actions for Aluminum/UPVC Machinery */}
            <div className="mt-2 flex flex-wrap gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInputMessage('YILMAZ makine fiyat bilgisi almak istiyorum')}
                className="text-xs h-6"
              >
                {t('turkish.chat.quickPricing', 'Fiyat')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInputMessage('Alüminyum işleme makinesi hakkında bilgi istiyorum')}
                className="text-xs h-6"
              >
                Alüminyum
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInputMessage('UPVC profil işleme makinesi hakkında bilgi istiyorum')}
                className="text-xs h-6"
              >
                UPVC
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInputMessage('Teknik destek ve kurulum hizmeti istiyorum')}
                className="text-xs h-6"
              >
                {t('turkish.chat.quickSupport', 'Destek')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInputMessage('Kargo ve kurulum bilgisi almak istiyorum')}
                className="text-xs h-6"
              >
                {t('turkish.chat.quickShipping', 'Kargo')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TurkishChatSupport;
