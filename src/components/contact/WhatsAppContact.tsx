import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, X, Send, Phone, Clock, MapPin, Star, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface WhatsAppContactProps {
  className?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  phoneNumber?: string;
  businessHours?: string;
  autoOpen?: boolean;
}

interface QuickMessage {
  id: string;
  text: string;
  category: 'general' | 'technical' | 'emergency' | 'quote';
  icon: React.ReactNode;
}

export const WhatsAppContact: React.FC<WhatsAppContactProps> = ({
  className = '',
  position = 'bottom-right',
  phoneNumber = '+201234567890', // Default Egyptian number
  businessHours = '8AM - 6PM (GMT+2)',
  autoOpen = false
}) => {
  const { t: _t } = useTranslation('services');
  const [isOpen, setIsOpen] = useState(autoOpen);
  const [selectedMessage, setSelectedMessage] = useState<string>('');
  const [customMessage, setCustomMessage] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState(false);

  // Quick message templates
  const quickMessages: QuickMessage[] = [
    {
      id: 'general',
      text: 'Hello! I need help with my aluminum fabrication machine.',
      category: 'general',
      icon: <MessageSquare className="h-4 w-4" />
    },
    {
      id: 'technical',
      text: 'I have a technical issue with my machine. Can you help?',
      category: 'technical',
      icon: <Phone className="h-4 w-4" />
    },
    {
      id: 'emergency',
      text: 'URGENT: My machine has stopped working. Need immediate assistance!',
      category: 'emergency',
      icon: <Clock className="h-4 w-4" />
    },
    {
      id: 'quote',
      text: 'I\'m interested in getting a quote for your service packages.',
      category: 'quote',
      icon: <Star className="h-4 w-4" />
    }
  ];

  const getPositionClasses = () => {
    switch (position) {
      case 'bottom-left':
        return 'bottom-6 left-6';
      case 'top-right':
        return 'top-6 right-6';
      case 'top-left':
        return 'top-6 left-6';
      default:
        return 'bottom-6 right-6';
    }
  };

  const handleQuickMessage = (message: QuickMessage) => {
    setSelectedMessage(message.text);
    setCustomMessage(message.text);
  };

  const handleSendMessage = () => {
    const message = customMessage || selectedMessage;
    if (!message.trim()) return;

    // Encode message for WhatsApp URL
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${phoneNumber.replace(/\D/g, '')}?text=${encodedMessage}`;
    
    // Open WhatsApp
    window.open(whatsappUrl, '_blank');
    
    // Track the interaction
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'whatsapp_contact', {
        event_category: 'engagement',
        event_label: 'whatsapp_message_sent',
        value: 1
      });
    }
  };

  const handleCall = () => {
    const telUrl = `tel:${phoneNumber}`;
    window.open(telUrl, '_self');
  };

  // Auto-close after 30 seconds if no interaction
  useEffect(() => {
    if (isOpen && !autoOpen) {
      const timer = setTimeout(() => {
        setIsOpen(false);
      }, 30000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoOpen]);

  return (
    <div className={`fixed ${getPositionClasses()} z-50 ${className}`}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="mb-4"
          >
            <Card className="w-80 bg-white shadow-2xl border border-gray-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                      <MessageSquare className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg text-gray-900">ALMONA Support</CardTitle>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>Online now</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsOpen(false)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Business Info */}
                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="h-4 w-4" />
                    <span>{businessHours}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4" />
                    <span>Cairo, Egypt</span>
                  </div>
                </div>

                {/* Quick Messages */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Quick Messages</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="h-6 w-6 p-0"
                    >
                      {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </Button>
                  </div>
                  
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="space-y-2"
                      >
                        {quickMessages.map((message) => (
                          <Button
                            key={message.id}
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuickMessage(message)}
                            className="w-full justify-start text-left h-auto p-3 text-xs"
                          >
                            <div className="flex items-center gap-2">
                              {message.icon}
                              <span className="truncate">{message.text}</span>
                            </div>
                          </Button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Custom Message */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Your Message</label>
                  <textarea
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="Type your message here..."
                    className="w-full p-3 border border-gray-300 rounded-lg resize-none text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    rows={3}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    onClick={handleSendMessage}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                    disabled={!customMessage.trim() && !selectedMessage}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send Message
                  </Button>
                  <Button
                    onClick={handleCall}
                    variant="outline"
                    className="px-3"
                  >
                    <Phone className="h-4 w-4" />
                  </Button>
                </div>

                {/* Response Time */}
                <div className="text-center">
                  <Badge variant="secondary" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    Usually responds in minutes
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Button */}
      <motion.div
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className="w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
      </motion.div>

      {/* Removed green pulse overlay */}
    </div>
  );
};

export default WhatsAppContact;
