import { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { AlertTriangle, Video, Mic, ScreenShare, MessageSquare, X, Share2, Download } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

type Technician = {
  id: string;
  name: string;
  specialty: string;
  available: boolean;
  rating: number;
};

type Message = {
  id: string;
  sender: 'user' | 'technician';
  text: string;
  timestamp: Date;
};

export const LiveAssistance = () => {
  const [callActive, setCallActive] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [selectedTech, setSelectedTech] = useState<string>('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [whiteboardActive, setWhiteboardActive] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mock technicians data
  const technicians: Technician[] = [
    {
      id: 't1',
      name: 'Ahmed Mahmoud',
      specialty: 'CNC Machines',
      available: true,
      rating: 4.8
    },
    {
      id: 't2',
      name: 'Mohamed Ali',
      specialty: 'Hydraulic Systems',
      available: true,
      rating: 4.6
    },
    {
      id: 't3',
      name: 'Youssef Hassan',
      specialty: 'Electrical Systems',
      available: false,
      rating: 4.9
    }
  ];

  // Mock initial messages
  const initialMessages: Message[] = [
    {
      id: '1',
      sender: 'technician',
      text: 'Hello! How can I assist you today?',
      timestamp: new Date(Date.now() - 60000)
    }
  ];

  useEffect(() => {
    if (callActive) {
      setMessages(initialMessages);
    } else {
      setMessages([]);
    }
  }, [callActive]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleStartCall = () => {
    if (selectedTech) {
      setCallActive(true);
    }
  };

  const handleEndCall = () => {
    setCallActive(false);
    setScreenSharing(false);
    setMicMuted(false);
    setVideoOff(false);
    setWhiteboardActive(false);
  };

  const handleSendMessage = () => {
    if (message.trim()) {
      const newMessage: Message = {
        id: Date.now().toString(),
        sender: 'user',
        text: message,
        timestamp: new Date()
      };
      setMessages([...messages, newMessage]);
      setMessage('');

      // Simulate technician reply
      setTimeout(() => {
        const reply: Message = {
          id: (Date.now() + 1).toString(),
          sender: 'technician',
          text: 'I understand. Let me check the manual for that issue.',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, reply]);
      }, 2000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="space-y-6">
      {!callActive ? (
        <div className="space-y-6">
          <div className="bg-almona-darker/50 p-6 rounded-xl border border-almona-light/10">
            <h3 className="text-xl font-bold mb-4 flex items-center">
              <AlertTriangle className="text-almona-orange mr-3" />
              Immediate Technical Support
            </h3>
            <p className="text-gray-400 mb-6">
              Connect directly with our certified technicians for real-time assistance with your equipment.
            </p>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="technician">Select Technician</Label>
                <Select onValueChange={setSelectedTech}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose available technician" />
                  </SelectTrigger>
                  <SelectContent>
                    {technicians.map(tech => (
                      <SelectItem 
                        key={tech.id} 
                        value={tech.id}
                        disabled={!tech.available}
                      >
                        <div className="flex items-center">
                          <span>{tech.name}</span>
                          {!tech.available && (
                            <Badge variant="outline" className="ml-2">
                              Busy
                            </Badge>
                          )}
                          {tech.available && (
                            <Badge className="ml-2">
                              {tech.rating} ★
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500">
                  Available technicians will respond immediately to your call
                </p>
              </div>

              <Button 
                onClick={handleStartCall}
                disabled={!selectedTech}
                className="w-full"
              >
                <Video className="mr-2 h-4 w-4" />
                Start Video Call
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {technicians.filter(t => t.available).map(tech => (
              <div 
                key={tech.id}
                className="border border-almona-light/10 rounded-lg p-4 hover:bg-almona-darker/30 cursor-pointer"
                onClick={() => setSelectedTech(tech.id)}
              >
                <div className="font-medium">{tech.name}</div>
                <div className="text-sm text-gray-400 mb-2">{tech.specialty}</div>
                <div className="flex items-center">
                  <Badge>
                    {tech.rating} ★
                  </Badge>
                  <Badge variant="outline" className="ml-2">
                    Available now
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Video Feed */}
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-black rounded-lg aspect-video relative overflow-hidden">

                <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                  {videoOff ? (
                    <div className="bg-almona-darker rounded-full h-32 w-32 flex items-center justify-center">
                      <Video className="h-8 w-8" />
                    </div>
                  ) : (
                    'Technician Video Feed'
                  )}
                </div>
                <div className="absolute bottom-4 left-4 right-4 flex justify-center gap-4">

                  <Button 
                    variant={micMuted ? 'destructive' : 'outline'} 
                    size="icon"
                    onClick={() => setMicMuted(!micMuted)}
                  >
                    <Mic className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant={videoOff ? 'destructive' : 'outline'} 
                    size="icon"
                    onClick={() => setVideoOff(!videoOff)}
                  >
                    <Video className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant={screenSharing ? 'default' : 'outline'} 
                    size="icon"
                    onClick={() => setScreenSharing(!screenSharing)}
                  >
                    <ScreenShare className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="icon"
                    onClick={handleEndCall}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Whiteboard */}
              {whiteboardActive && (
                <div className="bg-white rounded-lg aspect-video relative overflow-hidden border border-gray-300">

                  <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                    Collaborative Whiteboard
                  </div>
                  <div className="absolute bottom-2 right-2">

                    <Button variant="outline" size="sm" className="gap-2">
                      <Share2 className="h-3 w-3" />
                      Share
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Panel */}
            <div className="border border-almona-light/10 rounded-lg flex flex-col h-full">
              <div className="p-4 border-b border-almona-light/10 font-medium">
                Chat with Technician
              </div>
              <div className="flex-grow p-4 overflow-y-auto max-h-96">
                <div className="space-y-4">
                  {messages.map(msg => (
                    <div 
                      key={msg.id} 
                      className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div 
                        className={`max-w-xs p-3 rounded-lg ${msg.sender === 'user' 
                          ? 'bg-almona-orange/10 text-white' 
                          : 'bg-almona-darker/50 text-gray-300'}`}
                      >
                        <div className="text-sm">{msg.text}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </div>
              <div className="p-4 border-t border-almona-light/10">
                <div className="flex gap-2">
                  <Input
                    placeholder="Type your message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                  <Button onClick={handleSendMessage}>
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <Button 
              variant={whiteboardActive ? 'default' : 'outline'} 
              onClick={() => setWhiteboardActive(!whiteboardActive)}
            >
              {whiteboardActive ? 'Hide Whiteboard' : 'Show Whiteboard'}
            </Button>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Download Session Transcript
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
