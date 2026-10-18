import React, { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MoreHorizontal, Trash2, CheckCircle2, RefreshCw, Loader2 } from 'lucide-react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/shared/ui/ui/alert-dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { UsedMachineService, type UsedMachineListing } from '@/lib/usedMachines/UsedMachineService'
import { useToast } from '@/hooks/use-toast'

const statusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status) {
    case 'active': return 'default'
    case 'sold': return 'secondary'
    case 'flagged': return 'destructive'
    default: return 'outline'
  }
}

/**
 * Admin panel to manage the Used Machines marketplace:
 * mark a machine sold, or delete a reported/flagged or sold listing.
 */
export const UsedMachinesAdminPanel: React.FC = () => {
  const [listings, setListings] = useState<UsedMachineListing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<{ id: string; title: string; action: 'sold' | 'delete' } | null>(null)
  const { toast } = useToast()

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setListings(await UsedMachineService.listAllListings())
    } catch (e) {
      setError('Unable to load listings. Confirm the admin read policy (20261018180000_used_machine_admin_controls) is applied.')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  const apply = async () => {
    if (!confirm) return
    setBusy(confirm.id)
    try {
      if (confirm.action === 'sold') {
        await UsedMachineService.markSold(confirm.id)
        toast({ title: 'Marked as sold', description: confirm.title })
      } else {
        await UsedMachineService.deleteListing(confirm.id)
        toast({ title: 'Listing deleted', description: confirm.title })
      }
      setConfirm(null)
      await refresh()
    } catch (e) {
      toast({ title: 'Action failed', description: (e as Error)?.message ?? 'Unknown error', variant: 'destructive' })
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
        <CardTitle>Used Machines</CardTitle>
        <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">Mark machines as sold, or delete reported and sold listings.</p>
        {error ? <p className="text-sm text-red-500" role="alert">{error}</p> : null}
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : listings.length === 0 ? (
          <p className="text-sm text-muted-foreground">No listings found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-2">Title</th>
                  <th className="p-2">Price</th>
                  <th className="p-2">Location</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((l) => (
                  <tr key={l.id} className="border-b align-top">
                    <td className="p-2 font-medium">{l.title}</td>
                    <td className="p-2">{new Intl.NumberFormat('en-EG', { style: 'currency', currency: l.currency || 'EGP' }).format(Number(l.price ?? 0))}</td>
                    <td className="p-2">{l.location}</td>
                    <td className="p-2"><Badge variant={statusVariant(l.status)}>{l.status}</Badge></td>
                    <td className="p-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={busy === l.id} aria-label={`Actions for ${l.title}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {l.status !== 'sold' && (
                            <DropdownMenuItem onClick={() => setConfirm({ id: l.id, title: l.title, action: 'sold' })}>
                              <CheckCircle2 className="mr-2 h-4 w-4" /> Mark sold
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem className="text-red-500" onClick={() => setConfirm({ id: l.id, title: l.title, action: 'delete' })}>
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
      <AlertDialog open={confirm !== null} onOpenChange={(open) => { if (!open && busy === null) setConfirm(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.action === 'sold' ? 'Mark listing as sold?' : 'Delete listing?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.action === 'sold'
                ? `"${confirm?.title}" will be hidden from the public marketplace.`
                : `"${confirm?.title}" will be permanently removed. This cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={busy !== null} onClick={(event) => { event.preventDefault(); void apply() }}>
              {busy !== null ? 'Working…' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

export default UsedMachinesAdminPanel
