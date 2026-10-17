import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { logAdminAction } from '@/lib/adminAudit';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';
import { toast } from 'sonner';

type Role = 'customer' | 'admin' | 'sales_rep' | 'technician' | 'support';
const ROLES: Role[] = ['customer', 'sales_rep', 'technician', 'support', 'admin'];

interface UserRow {
  id: string;
  full_name: string | null;
  email: string | null;
  company_name: string | null;
  role: Role;
}

export const UserRolePanel: React.FC<{ currentUserId: string }> = ({ currentUserId }) => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { void load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id,full_name,email,company_name,role')
        .order('full_name');
      setUsers((data ?? []) as UserRow[]);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const changeRole = async (userId: string, newRole: Role) => {
    const prev = users.find((u) => u.id === userId);
    const { error } = await (supabase as any).from('profiles').update({ role: newRole }).eq('id', userId);
    if (error) {
      toast.error('Failed to update role: ' + error.message);
      return;
    }
    setUsers((prevUsers) => prevUsers.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
    await logAdminAction({
      action: 'role_changed',
      entityType: 'profile',
      entityId: userId,
      details: { previous_role: prev?.role ?? null, new_role: newRole },
      actorId: currentUserId,
    });
    toast.success('Role updated');
  };

  const filtered = users.filter((u) => {
    const query = q.trim().toLowerCase();
    if (!query) return true;
    return (u.full_name || '').toLowerCase().includes(query) || (u.email || '').toLowerCase().includes(query) || (u.company_name || '').toLowerCase().includes(query);
  });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Users & Roles</CardTitle>
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search users…" className="pl-8" />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Loading users…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="p-2">Name</th>
                  <th className="p-2">Email</th>
                  <th className="p-2">Company</th>
                  <th className="p-2">Role</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className="border-b">
                    <td className="p-2 font-medium">{u.full_name || '—'}</td>
                    <td className="p-2 text-muted-foreground">{u.email || '—'}</td>
                    <td className="p-2 text-muted-foreground">{u.company_name || '—'}</td>
                    <td className="p-2">
                      <Select value={u.role} onValueChange={(v) => { void changeRole(u.id, v as Role); }}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map((r) => (
                            <SelectItem key={r} value={r}>
                              <span className="capitalize">{r.replace(/_/g, ' ')}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {u.id === currentUserId && <Badge variant="outline" className="ml-2">You</Badge>}
                    </td>
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

export default UserRolePanel;
