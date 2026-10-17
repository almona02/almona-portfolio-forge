import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface TechnicianWorkload {
  id: string;
  full_name: string | null;
  phone: string | null;
  openTickets: number;
  inProgress: number;
  total: number;
}

export const TechnicianWorkloadPanel: React.FC = () => {
  const [technicians, setTechnicians] = useState<TechnicianWorkload[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const { data: techs } = await supabase
        .from('profiles')
        .select('id,full_name,phone')
        .eq('role', 'technician');
      const list = (techs ?? []) as Array<{ id: string; full_name: string | null; phone: string | null }>;

      const { data: tickets } = await supabase
        .from('service_tickets')
        .select('assigned_to,status')
        .not('assigned_to', 'is', null);
      const rows = (tickets ?? []) as Array<{ assigned_to: string; status: string }>;

      const map = new Map<string, { open: number; inProgress: number; total: number }>();
      for (const t of rows) {
        const entry = map.get(t.assigned_to) ?? { open: 0, inProgress: 0, total: 0 };
        entry.total += 1;
        if (t.status === 'in_progress') entry.inProgress += 1;
        if (['open', 'assigned'].includes(t.status)) entry.open += 1;
        map.set(t.assigned_to, entry);
      }

      setTechnicians(
        list.map((tech) => ({
          ...tech,
          openTickets: map.get(tech.id)?.open ?? 0,
          inProgress: map.get(tech.id)?.inProgress ?? 0,
          total: map.get(tech.id)?.total ?? 0,
        })),
      );
    } catch {
      setTechnicians([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Technician Workload</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Loading technicians…</div>
        ) : technicians.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">No technicians found.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {technicians.map((t) => (
              <div key={t.id} className="flex items-center gap-3 border rounded-lg p-3">
                <Avatar>
                  <AvatarFallback>{(t.full_name || 'T').charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{t.full_name || 'Unknown'}</div>
                  <div className="text-xs text-muted-foreground">{t.phone || '—'}</div>
                </div>
                <div className="text-right">
                  <Badge variant={t.openTickets > 3 ? 'destructive' : 'secondary'}>{t.openTickets} open</Badge>
                  <div className="text-xs text-muted-foreground mt-1">{t.total} total</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TechnicianWorkloadPanel;
