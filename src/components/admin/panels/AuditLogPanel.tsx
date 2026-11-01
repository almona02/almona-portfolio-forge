import React, { useEffect, useState } from 'react';
import { listAuditLog, AdminAuditEntry } from '@/lib/adminAudit';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

function formatDetails(details: Record<string, unknown>): string {
  return Object.entries(details)
    .filter(([, v]) => v !== null && v !== undefined)
    .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${typeof v === 'object' ? JSON.stringify(v) : (v as string)}`)
    .join(' · ');
}

export const AuditLogPanel: React.FC = () => {
  const [entries, setEntries] = useState<AdminAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setEntries(await listAuditLog(300));
    } catch {
      setError('Unable to load audit history. Confirm the admin migration is deployed and retry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Admin Audit Log</CardTitle>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {error ? <p role="alert">{error}</p> : loading ? (
          <div role="status" className="py-8 text-center text-muted-foreground">Loading audit log…</div>
        ) : entries.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">No audit entries yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th scope="col" className="p-2">When</th>
                  <th scope="col" className="p-2">Actor</th>
                  <th scope="col" className="p-2">Action</th>
                  <th scope="col" className="p-2">Entity</th>
                  <th scope="col" className="p-2">Details</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b align-top">
                    <td className="p-2 whitespace-nowrap text-muted-foreground">{new Date(e.created_at).toLocaleString()}</td>
                    <td className="p-2" title={e.actor_id || undefined}>{e.actor_name || e.actor_id || 'Unattributed (legacy)'}</td>
                    <td className="p-2"><Badge variant="secondary">{e.action.replace(/_/g, ' ')}</Badge></td>
                    <td className="p-2 text-muted-foreground">{e.entity_type} {e.entity_id || ''}</td>
                    <td className="p-2 text-xs text-muted-foreground max-w-md">{formatDetails(e.details)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AuditLogPanel;
