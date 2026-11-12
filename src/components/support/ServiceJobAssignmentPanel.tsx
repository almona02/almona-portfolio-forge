import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Plus, RefreshCw, UserMinus, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/ui/select'
import { getAvailableAssignees } from '@/lib/adminTicketApi'
import {
  assignServiceJob,
  createServiceJob,
  declineServiceJob,
  listServiceJobsForTicket,
  type ServiceJobRow,
} from '@/lib/ticketGovernanceApi'
import { ServiceVisitPanel } from '@/components/support/ServiceVisitPanel'
import { toast } from 'sonner'

export type ServiceJobViewerRole = 'admin' | 'support' | 'technician' | 'customer' | string

interface ServiceJobAssignmentPanelProps {
  ticketId: string
  currentUserId: string
  viewerRole: ServiceJobViewerRole
  /** Case-contact name shown for independence from job assignees. */
  ticketAssigneeName?: string | null
}

const TERMINAL = new Set(['completed', 'waived', 'cancelled'])

function canStaffManage(role: ServiceJobViewerRole): boolean {
  return role === 'admin' || role === 'support'
}

export const ServiceJobAssignmentPanel: React.FC<ServiceJobAssignmentPanelProps> = ({
  ticketId,
  currentUserId,
  viewerRole,
  ticketAssigneeName,
}) => {
  const queryClient = useQueryClient()
  const staff = canStaffManage(viewerRole)
  const [newTitle, setNewTitle] = useState('')
  const [assignTarget, setAssignTarget] = useState<Record<string, string>>({})
  const [declineReason, setDeclineReason] = useState<Record<string, string>>({})
  const [actionError, setActionError] = useState<string | null>(null)

  const jobsQuery = useQuery({
    queryKey: ['service-jobs', ticketId],
    queryFn: () => listServiceJobsForTicket(ticketId),
  })

  const assigneesQuery = useQuery({
    queryKey: ['assignees'],
    queryFn: getAvailableAssignees,
    enabled: staff,
  })

  const refreshJobs = async () => {
    await queryClient.invalidateQueries({ queryKey: ['service-jobs', ticketId] })
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      const title = newTitle.trim() || `Job ${(jobsQuery.data?.length ?? 0) + 1}`
      return createServiceJob({
        ticketId,
        title,
        rationale: 'Additional job from assignment panel',
      })
    },
    onSuccess: async () => {
      setActionError(null)
      setNewTitle('')
      toast.success('Additional job created')
      await refreshJobs()
    },
    onError: (err: Error) => {
      setActionError(err.message)
      toast.error(err.message)
    },
  })

  const assignMutation = useMutation({
    mutationFn: async ({ jobId, technicianId }: { jobId: string; technicianId: string }) => {
      return assignServiceJob({
        jobId,
        technicianId,
        rationale: 'Assigned from job panel',
      })
    },
    onSuccess: async (_data, vars) => {
      setActionError(null)
      setAssignTarget((prev) => ({ ...prev, [vars.jobId]: '' }))
      toast.success('Job technician updated')
      await refreshJobs()
    },
    onError: (err: Error) => {
      setActionError(err.message)
      toast.error(err.message)
    },
  })

  const declineMutation = useMutation({
    mutationFn: async ({ jobId, reason }: { jobId: string; reason: string }) => {
      return declineServiceJob({ jobId, reason })
    },
    onSuccess: async (_data, vars) => {
      setActionError(null)
      setDeclineReason((prev) => ({ ...prev, [vars.jobId]: '' }))
      toast.success('Job declined')
      await refreshJobs()
    },
    onError: (err: Error) => {
      setActionError(err.message)
      toast.error(err.message)
    },
  })

  const busy =
    createMutation.isPending || assignMutation.isPending || declineMutation.isPending

  const renderJob = (job: ServiceJobRow) => {
    const isOwn = job.assigned_technician_id === currentUserId
    const canDecline =
      viewerRole === 'technician' &&
      isOwn &&
      !TERMINAL.has(job.state) &&
      job.state !== 'unassigned'
    const canAssign = staff && !TERMINAL.has(job.state)
    const selected = assignTarget[job.id] || ''
    const reason = declineReason[job.id] || ''

    return (
      <li
        key={job.id}
        className="rounded-md border border-border p-3 space-y-2"
        data-testid={`service-job-${job.job_sequence}`}
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <div className="font-medium text-sm">
              Job {job.job_sequence}: {job.title}
              {job.required ? '' : ' (optional)'}
            </div>
            <div className="text-xs text-muted-foreground capitalize">State: {job.state}</div>
          </div>
          <div className="text-sm text-right">
            <div className="text-muted-foreground text-xs">Job technician</div>
            <div>{job.technician_name || (job.assigned_technician_id ? 'Assigned' : 'Unassigned')}</div>
          </div>
        </div>

        {canAssign && (
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[180px] flex-1 space-y-1">
              <Label htmlFor={`assign-${job.id}`} className="text-xs">
                Assign / reassign
              </Label>
              <Select
                value={selected}
                onValueChange={(v) => setAssignTarget((prev) => ({ ...prev, [job.id]: v }))}
                disabled={busy || assigneesQuery.isLoading}
              >
                <SelectTrigger id={`assign-${job.id}`}>
                  <SelectValue placeholder="Select technician…" />
                </SelectTrigger>
                <SelectContent>
                  {(assigneesQuery.data ?? []).map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.full_name} ({a.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              size="sm"
              disabled={busy || !selected}
              onClick={() => assignMutation.mutate({ jobId: job.id, technicianId: selected })}
            >
              {assignMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4 mr-1" />
              )}
              Save
            </Button>
          </div>
        )}

        {canDecline && (
          <div className="space-y-2">
            <Label htmlFor={`decline-${job.id}`} className="text-xs">
              Decline reason (required)
            </Label>
            <Textarea
              id={`decline-${job.id}`}
              value={reason}
              onChange={(e) => setDeclineReason((prev) => ({ ...prev, [job.id]: e.target.value }))}
              placeholder="Why are you declining this job?"
              rows={2}
              disabled={busy}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy || !reason.trim()}
              onClick={() =>
                declineMutation.mutate({ jobId: job.id, reason: reason.trim() })
              }
            >
              {declineMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserMinus className="h-4 w-4 mr-1" />
              )}
              Decline job
            </Button>
          </div>
        )}

        <ServiceVisitPanel
          jobId={job.id}
          viewerRole={viewerRole}
          canExecute={
            staff ||
            (viewerRole === 'technician' && job.assigned_technician_id === currentUserId)
          }
        />
      </li>
    )
  }

  return (
    <section className="mt-4 space-y-3 border-t pt-4" aria-label="Service jobs">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Service jobs</h3>
          <p className="text-xs text-muted-foreground">
            Job technicians are independent of ticket case contact
            {ticketAssigneeName ? ` (${ticketAssigneeName})` : ''}.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => void refreshJobs()}
          disabled={jobsQuery.isFetching}
          aria-label="Refresh jobs"
        >
          <RefreshCw className={`h-4 w-4 ${jobsQuery.isFetching ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {actionError && (
        <p role="alert" className="text-sm text-destructive">
          {actionError}
        </p>
      )}

      {jobsQuery.isLoading ? (
        <p role="status" className="text-sm text-muted-foreground">
          Loading jobs…
        </p>
      ) : jobsQuery.isError ? (
        <p role="alert" className="text-sm text-destructive">
          {(jobsQuery.error as Error).message}
        </p>
      ) : (jobsQuery.data?.length ?? 0) === 0 ? (
        <p className="text-sm text-muted-foreground">No service jobs on this ticket yet.</p>
      ) : (
        <ul className="space-y-2">{jobsQuery.data!.map(renderJob)}</ul>
      )}

      {staff && (
        <div className="flex flex-wrap items-end gap-2 rounded-md border border-dashed border-border p-3">
          <div className="flex-1 min-w-[160px] space-y-1">
            <Label htmlFor="new-job-title" className="text-xs">
              Additional job title
            </Label>
            <input
              id="new-job-title"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Job 2"
              disabled={busy}
            />
          </div>
          <Button
            type="button"
            size="sm"
            disabled={busy}
            onClick={() => createMutation.mutate()}
          >
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-1" />
            )}
            Create job
          </Button>
        </div>
      )}
    </section>
  )
}

export default ServiceJobAssignmentPanel
