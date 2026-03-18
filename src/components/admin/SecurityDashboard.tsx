import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';

interface SecurityEvent {
  id: string;
  event_type: string;
  timestamp: string;
  user_id: string | null;
  ip_address: string | null;
  severity: string;
  details: Record<string, unknown>;
}

export function SecurityDashboard() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [stats, setStats] = useState({
    totalEvents: 0,
    failedAuths: 0,
    rateLimits: 0,
    suspiciousRequests: 0,
  });

  useEffect(() => {
    // Subscribe to security events
    const channel = supabase
      .channel('security-events')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'security_events',
        },
        (payload) => {
          setEvents(prev => [payload.new as SecurityEvent, ...prev.slice(0, 99)]);
        }
      );
    channel.subscribe();
    void loadEvents();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const loadEvents = async () => {
    const { data } = await supabase
      .from('security_events')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(100);
    
    if (data) {
      const typedData = data as SecurityEvent[];
      setEvents(typedData);
      
      // Calculate stats
      setStats({
        totalEvents: typedData.length,
        failedAuths: typedData.filter(e => e.event_type === 'auth_failure').length,
        rateLimits: typedData.filter(e => e.event_type === 'rate_limit_exceeded').length,
        suspiciousRequests: typedData.filter(e => e.event_type === 'suspicious_request').length,
      });
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-500';
      case 'ERROR': return 'bg-amber-500';
      case 'WARNING': return 'bg-yellow-500';
      default: return 'bg-blue-500';
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEvents}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Failed Auth</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.failedAuths}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Rate Limits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.rateLimits}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Suspicious</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.suspiciousRequests}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Security Events</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="critical">Critical</TabsTrigger>
              <TabsTrigger value="auth">Authentication</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all">
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {events.map(event => (
                  <div key={event.id} className="flex items-center justify-between p-3 border rounded">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge className={getSeverityColor(event.severity)}>
                          {event.severity}
                        </Badge>
                        <span className="font-medium">{event.event_type.replace('_', ' ')}</span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(event.timestamp).toLocaleString()} • {event.ip_address}
                      </div>
                    </div>
                    <div className="text-sm">
                      {event.user_id?.substring(0, 8) || 'Anonymous'}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

