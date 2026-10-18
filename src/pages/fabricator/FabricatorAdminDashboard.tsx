import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { listAdminUsers, type AdminUserRow } from '@/lib/adminUsersApi'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Loader2, RefreshCw, UserPlus, Trash2, Package, SlidersHorizontal, Layers, Wrench } from 'lucide-react'

const FACTORY_ROLES = ['technical_office', 'operator', 'technician', 'supervisor', 'manager'] as const

interface Workshop { id: string; name: string | null }
interface Member { id: string; user_id: string; factory_role: string; full_name: string | null; username: string | null }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

const FabricatorAdminDashboard: React.FC = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [workshop, setWorkshop] = useState<Workshop | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)

  const refresh = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const { data: ws } = await supabase.from('workshops').select('id,name').eq('owner_id', user.id).maybeSingle()
      setWorkshop((ws as Workshop | null) ?? null)
      if (ws) {
        const { data: rows } = await supabase
          .from('workshop_members')
          .select('id,user_id,factory_role,profiles(full_name,username)')
          .eq('workshop_id', (ws as Workshop).id)
          .order('created_at', { ascending: true })
        setMembers(((rows ?? []) as Array<{ id: string; user_id: string; factory_role: string; profiles: { full_name: string | null; username: string | null } | null }>).map((r) => ({
          id: r.id, user_id: r.user_id, factory_role: r.factory_role,
          full_name: r.profiles?.full_name ?? null, username: r.profiles?.username ?? null,
        })))
      }
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }, [user?.id])

  useEffect(() => { void refresh() }, [refresh])

  const setRole = async (m: Member, role: string) => {
    try {
      await db.from('workshop_members').update({ factory_role: role, updated_at: new Date().toISOString() }).eq('id', m.id)
      toast({ title: 'Role updated' })
      await refresh()
    } catch (e) { toast({ title: 'Update failed', description: (e as Error)?.message ?? 'Unknown error', variant: 'destructive' }) }
  }

  const remove = async (m: Member) => {
    try {
      await db.from('workshop_members').delete().eq('id', m.id)
      toast({ title: 'Member removed' })
      await refresh()
    } catch (e) { toast({ title: 'Remove failed', description: (e as Error)?.message ?? 'Unknown error', variant: 'destructive' }) }
  }

  const config = [
    { title: 'System Packs', desc: 'Configure window/door system packs.', icon: Package, path: '/fabricator/studio/profiles' },
    { title: 'Profiles', desc: 'Manage profile library and roles.', icon: Layers, path: '/fabricator/studio/profiles' },
    { title: 'Tuning', desc: 'Optimization and cut-list parameters.', icon: SlidersHorizontal, path: '/fabricator/studio' },
    { title: 'Manufacturing Rules', desc: 'Machining and assembly rules.', icon: Wrench, path: '/fabricator/studio' },
  ]

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Factory Admin</h1>
          <p className="text-muted-foreground text-sm">{workshop?.name || 'Your workshop'} — team & configuration.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}><RefreshCw className="mr-2 h-4 w-4" /> Refresh</Button>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle>Team & Roles</CardTitle>
            <CardDescription>Set factory roles for your workshop users.</CardDescription>
          </div>
          <Button size="sm" onClick={() => setAddOpen(true)}><UserPlus className="mr-2 h-4 w-4" /> Add member</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No team members yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-muted-foreground"><th className="p-2">Member</th><th className="p-2">Factory role</th><th className="p-2">Actions</th></tr></thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.id} className="border-b">
                      <td className="p-2 font-medium">{m.full_name || m.username || m.user_id}</td>
                      <td className="p-2">
                        <Select value={m.factory_role} onValueChange={(v) => void setRole(m, v)}>
                          <SelectTrigger className="w-44 capitalize"><SelectValue /></SelectTrigger>
                          <SelectContent>{FACTORY_ROLES.map((r) => <SelectItem key={r} value={r} className="capitalize">{r.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                        </Select>
                      </td>
                      <td className="p-2"><Button size="sm" variant="ghost" onClick={() => void remove(m)}><Trash2 className="h-4 w-4 text-red-500" /></Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold mb-3">Configuration</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {config.map((c) => (
            <Card key={c.title} className="cursor-pointer hover:border-amber-500/40 transition-colors" onClick={() => navigate(c.path)}>
              <CardContent className="pt-6">
                <c.icon className="h-6 w-6 text-amber-500" />
                <CardTitle className="text-base mt-3">{c.title}</CardTitle>
                <CardDescription className="mt-1">{c.desc}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <AddMemberDialog open={addOpen} onClose={() => setAddOpen(false)} workshopId={workshop?.id ?? ''} onAdded={() => void refresh()} />
    </div>
  )
}

const AddMemberDialog: React.FC<{ open: boolean; onClose: () => void; workshopId: string; onAdded: () => void }> = ({ open, onClose, workshopId, onAdded }) => {
  const { toast } = useToast()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<AdminUserRow[]>([])
  const [selected, setSelected] = useState<AdminUserRow | null>(null)
  const [role, setRole] = useState('operator')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const t = setTimeout(() => { void listAdminUsers(0, query).then((p) => setResults(p.users)).catch(() => setResults([])) }, 250)
    return () => clearTimeout(t)
  }, [query])

  const add = async () => {
    if (!selected || !workshopId) return
    setSaving(true)
    try {
      await db.from('workshop_members').upsert({ workshop_id: workshopId, user_id: selected.id, factory_role: role }, { onConflict: 'workshop_id,user_id' })
      toast({ title: 'Member added' })
      setSelected(null); setQuery(''); setRole('operator'); setResults([])
      onAdded(); onClose()
    } catch (e) { toast({ title: 'Add failed', description: (e as Error)?.message ?? 'Unknown error', variant: 'destructive' }) }
    finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader><DialogTitle>Add team member</DialogTitle><DialogDescription>Search a user and assign a factory role.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Label>User</Label>
            <Input value={selected ? (selected.full_name || selected.username || selected.id) : query} onChange={(e) => { setQuery(e.target.value); setSelected(null) }} placeholder="Search by name or company…" />
            {!selected && results.length > 0 && (
              <div className="absolute z-10 mt-1 w-full border rounded-md bg-popover text-popover-foreground max-h-48 overflow-y-auto shadow-md">
                {results.map((u) => (
                  <button key={u.id} type="button" onClick={() => { setSelected(u); setQuery(''); setResults([]) }} className="w-full text-left px-3 py-2 text-sm hover:bg-muted">
                    {u.full_name || u.username || u.id} {u.company_name ? `· ${u.company_name}` : ''}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <Label>Factory role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="capitalize"><SelectValue /></SelectTrigger>
              <SelectContent>{FACTORY_ROLES.map((r) => <SelectItem key={r} value={r} className="capitalize">{r.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button disabled={!selected || saving} onClick={() => void add()}>{saving ? 'Adding…' : 'Add member'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default FabricatorAdminDashboard
