import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  changeMachineCoverageCadence,
  createMachineCoverage,
  endMachineCoverage,
  generateMachineCoverageOccurrences,
  listMachineCoverageSchedule,
  pauseMachineCoverage,
  resumeMachineCoverage,
  adoptMachineCoverageRoutineVersion,
  type CoverageScheduleItem,
  type MachineCoverage,
  type CoverageRpcError,
} from '@/lib/serviceMachineCoverageApi'

/**
 * Admin/Support machine coverage & recurrence controls.
 * No billing, squads, stock, or FR-1. Generated work is immutable from this panel.
 */
export const ServiceMachineCoveragePanel: React.FC = () => {
  const [machineId, setMachineId] = useState('')
  const [versionId, setVersionId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [firstDue, setFirstDue] = useState('')
  const [endDate, setEndDate] = useState('')
  const [interval, setInterval] = useState('30')
  const [unit, setUnit] = useState<'days' | 'weeks' | 'months'>('days')
  const [coverageId, setCoverageId] = useState('')
  const [adoptVersionId, setAdoptVersionId] = useState('')
  const [cadenceInterval, setCadenceInterval] = useState('14')
  const [coverage, setCoverage] = useState<MachineCoverage | null>(null)
  const [schedule, setSchedule] = useState<CoverageScheduleItem[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      await fn()
    } catch (e) {
      const err = e as CoverageRpcError
      setError(err.detailCode ? `${err.message} (${err.detailCode})` : err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-8 p-6" data-testid="service-machine-coverage-panel">
      <header className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">Machine coverage</h2>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Pin one published routine version, set calendar cadence, and generate preventive
          ticket + Job 1 occurrences. Pause/end stop generation only; generated work stays unchanged.
        </p>
      </header>

      <section className="space-y-3 max-w-xl" aria-labelledby="coverage-create-heading">
        <h3 id="coverage-create-heading" className="text-sm font-medium">Create coverage</h3>
        <div className="grid gap-3">
          <div>
            <Label htmlFor="cr-machine">Machine id</Label>
            <Input id="cr-machine" value={machineId} onChange={(e) => setMachineId(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="cr-version">Published routine version id</Label>
            <Input id="cr-version" value={versionId} onChange={(e) => setVersionId(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="cr-start">Start date</Label>
              <Input id="cr-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="cr-first">First due</Label>
              <Input id="cr-first" type="date" value={firstDue} onChange={(e) => setFirstDue(e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="cr-end">End date (optional, inclusive)</Label>
            <Input id="cr-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="cr-interval">Cadence interval</Label>
              <Input id="cr-interval" value={interval} onChange={(e) => setInterval(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="cr-unit">Unit</Label>
              <select
                id="cr-unit"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={unit}
                onChange={(e) => setUnit(e.target.value as 'days' | 'weeks' | 'months')}
              >
                <option value="days">days</option>
                <option value="weeks">weeks</option>
                <option value="months">months</option>
              </select>
            </div>
          </div>
          <Button
            disabled={busy}
            data-testid="coverage-create"
            onClick={() => run(async () => {
              const row = await createMachineCoverage({
                machineId,
                routineVersionId: versionId,
                startDate,
                firstPlannedDueDate: firstDue,
                cadenceInterval: Number(interval),
                cadenceUnit: unit,
                endDate: endDate || null,
              })
              setCoverage(row)
              setCoverageId(row.coverage_id)
              setMessage(`Created coverage ${row.coverage_id}`)
            })}
          >
            Create active coverage
          </Button>
        </div>
      </section>

      <section className="space-y-3 max-w-xl" aria-labelledby="coverage-manage-heading">
        <h3 id="coverage-manage-heading" className="text-sm font-medium">Manage / generate</h3>
        <div>
          <Label htmlFor="cr-cov">Coverage id</Label>
          <Input id="cr-cov" value={coverageId} onChange={(e) => setCoverageId(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" disabled={busy} data-testid="coverage-pause"
            onClick={() => run(async () => { await pauseMachineCoverage(coverageId); setMessage('Paused') })}>
            Pause
          </Button>
          <Button variant="secondary" disabled={busy} data-testid="coverage-resume"
            onClick={() => run(async () => { await resumeMachineCoverage(coverageId); setMessage('Resumed') })}>
            Resume
          </Button>
          <Button variant="destructive" disabled={busy} data-testid="coverage-end"
            onClick={() => run(async () => { await endMachineCoverage(coverageId); setMessage('Ended') })}>
            End
          </Button>
          <Button disabled={busy} data-testid="coverage-generate"
            onClick={() => run(async () => {
              const out = await generateMachineCoverageOccurrences({ coverageId: coverageId || null })
              setMessage(`Generated ${out.created} (skipped ${out.skipped}, failed ${out.failed})`)
            })}>
            Generate occurrences
          </Button>
          <Button variant="outline" disabled={busy} data-testid="coverage-schedule"
            onClick={() => run(async () => {
              const out = await listMachineCoverageSchedule({
                machineId: machineId || null,
                coverageId: coverageId || null,
              })
              setSchedule(out.items ?? [])
              setMessage(`Schedule as_of ${out.as_of}: ${out.items?.length ?? 0} rows`)
            })}>
            List schedule
          </Button>
        </div>
        <div className="grid gap-3">
          <div>
            <Label htmlFor="cr-adopt">Adopt published version id</Label>
            <div className="flex gap-2">
              <Input id="cr-adopt" value={adoptVersionId} onChange={(e) => setAdoptVersionId(e.target.value)} />
              <Button variant="secondary" disabled={busy} data-testid="coverage-adopt"
                onClick={() => run(async () => {
                  await adoptMachineCoverageRoutineVersion(coverageId, adoptVersionId)
                  setMessage('Adopted version for future ungenerated only')
                })}>
                Adopt
              </Button>
            </div>
          </div>
          <div>
            <Label htmlFor="cr-cadence">Change cadence interval (days/weeks/months via unit above)</Label>
            <div className="flex gap-2">
              <Input id="cr-cadence" value={cadenceInterval} onChange={(e) => setCadenceInterval(e.target.value)} />
              <Button variant="secondary" disabled={busy} data-testid="coverage-cadence"
                onClick={() => run(async () => {
                  await changeMachineCoverageCadence({
                    coverageId,
                    cadenceInterval: Number(cadenceInterval),
                    cadenceUnit: unit,
                  })
                  setMessage('Cadence updated for future ungenerated only')
                })}>
                Change cadence
              </Button>
            </div>
          </div>
        </div>
      </section>

      {message && <p className="text-sm text-foreground" data-testid="coverage-message">{message}</p>}
      {error && <p className="text-sm text-destructive" role="alert" data-testid="coverage-error">{error}</p>}

      {coverage && (
        <pre className="text-xs overflow-auto rounded border p-3 bg-muted/30" data-testid="coverage-json">
          {JSON.stringify(coverage, null, 2)}
        </pre>
      )}

      {schedule.length > 0 && (
        <div className="overflow-auto" data-testid="coverage-schedule-table">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-3">Seq</th>
                <th className="py-2 pr-3">Due</th>
                <th className="py-2 pr-3">Bucket</th>
                <th className="py-2 pr-3">Generated</th>
              </tr>
            </thead>
            <tbody>
              {schedule.map((row) => (
                <tr key={`${row.coverage_id}-${row.sequence}`} className="border-b border-border/50">
                  <td className="py-1.5 pr-3">{row.sequence}</td>
                  <td className="py-1.5 pr-3">{row.planned_due_date}</td>
                  <td className="py-1.5 pr-3">{row.bucket}</td>
                  <td className="py-1.5 pr-3">{row.generated ? 'yes' : 'no'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default ServiceMachineCoveragePanel
