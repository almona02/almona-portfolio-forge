import React, { useEffect, useRef, useState } from 'react'
import { ADMIN_USER_ROLES, changeAdminUserRole, listAdminUsers, type AdminUserRole, type AdminUserRow } from '@/lib/adminUsersApi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/shared/ui/ui/alert-dialog'
import { toast } from 'sonner'

const ROLE_COLORS: Record<AdminUserRole, string> = {
  admin: 'border-red-500/40 bg-red-500/15 text-red-300',
  customer: 'border-sky-500/40 bg-sky-500/15 text-sky-300',
  sales_rep: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
  technician: 'border-amber-500/40 bg-amber-500/15 text-amber-300',
  support: 'border-violet-500/40 bg-violet-500/15 text-violet-300',
}

export const UserRolePanel: React.FC<{ currentUserId: string }> = ({ currentUserId }) => {
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [q, setQ] = useState('')
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [revision, setRevision] = useState(0)
  const [pending, setPending] = useState<{ user: AdminUserRow; role: AdminUserRole } | null>(null)
  const savingRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    const timeout = setTimeout(() => {
      void listAdminUsers(page, q).then(result => {
        if (!cancelled) { setUsers(result.users); setTotal(result.total) }
      }).catch((failure: unknown) => {
        if (!cancelled) { setUsers([]); setError(failure instanceof Error ? failure.message : 'Unable to load users') }
      }).finally(() => { if (!cancelled) setLoading(false) })
    }, 250)
    return () => { cancelled = true; clearTimeout(timeout) }
  }, [page, q, revision])

  const confirmRole = async () => {
    if (!pending || savingRef.current) return
    savingRef.current = true
    setSaving(true)
    try {
      const result = await changeAdminUserRole(pending.user.id, pending.role)
      setUsers(previous => previous.map(user => user.id === result.id ? { ...user, role: result.role } : user))
      setPending(null)
      toast.success('Role updated and recorded in the audit log')
    } catch (failure) {
      toast.error(failure instanceof Error ? failure.message : 'Unable to update role')
    } finally { savingRef.current = false; setSaving(false) }
  }

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
        <CardTitle>Users & Roles</CardTitle>
        <div className="w-64 max-w-full">
          <label htmlFor="admin-users-search" className="sr-only">Search users by name, username or company</label>
          <Input id="admin-users-search" value={q} disabled={saving} maxLength={100} onChange={event => { setQ(event.target.value); setPage(0) }} placeholder="Search users…" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">Role changes require confirmation. You cannot change your own role.</p>
        {loading ? <div role="status">Loading users…</div> : error ? (
          <div role="alert" className="space-y-2">
            <p>{error}</p><Button variant="outline" onClick={() => setRevision(value => value + 1)}>Retry</Button>
          </div>
        ) : users.length === 0 ? <p role="status">No users found.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-muted-foreground">
                <th scope="col" className="p-2">Name</th><th scope="col" className="p-2">Username</th>
                <th scope="col" className="p-2">Company</th><th scope="col" className="p-2">Role</th>
              </tr></thead>
              <tbody>{users.map(user => (
                <tr key={user.id} className="border-b">
                  <td className="p-2 font-medium">{user.full_name || '—'}</td>
                  <td className="p-2">{user.username || '—'}</td><td className="p-2">{user.company_name || '—'}</td>
                  <td className="p-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={`capitalize ${ROLE_COLORS[user.role]}`}>{user.role.replace(/_/g, ' ')}</Badge>
                      <Select value={user.role} disabled={saving || user.id === currentUserId} onValueChange={value => {
                        if (value !== user.role) setPending({ user, role: value as AdminUserRole })
                      }}>
                        <SelectTrigger aria-label={`Role for ${user.full_name || user.username || user.id}`} className="w-36"><SelectValue /></SelectTrigger>
                        <SelectContent>{ADMIN_USER_ROLES.map(role => <SelectItem key={role} value={role}>{role.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    {user.id === currentUserId && <Badge variant="outline" className="mt-1">You</Badge>}
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm text-muted-foreground">Page {page + 1} · {total} users</span>
          <div className="flex gap-2">
            <Button variant="outline" disabled={loading || saving || page === 0} onClick={() => setPage(value => value - 1)}>Previous</Button>
            <Button variant="outline" disabled={loading || saving || !!error || (page + 1) * 50 >= total} onClick={() => setPage(value => value + 1)}>Next</Button>
          </div>
        </div>
        <AlertDialog open={pending !== null} onOpenChange={open => { if (!open && !savingRef.current) setPending(null) }}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Change user role?</AlertDialogTitle>
              <AlertDialogDescription>Change {pending?.user.full_name || pending?.user.username || pending?.user.id} from {pending?.user.role} to {pending?.role}? This changes their access to the platform.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
              <AlertDialogAction disabled={saving} onClick={event => { event.preventDefault(); void confirmRole() }}>{saving ? 'Saving…' : 'Confirm role change'}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}
export default UserRolePanel
