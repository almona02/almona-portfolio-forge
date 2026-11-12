// B3 RPC error mapping (visit + assignment attendance blocks).
import { describe, expect, it } from 'vitest'
import { mapJobRpcError } from './ticketGovernanceApi'

describe('mapJobRpcError B3', () => {
  it('maps active-visit concurrency', () => {
    expect(mapJobRpcError('one active visit per job').message).toMatch(/already in progress/i)
  })

  it('maps assignee-only start', () => {
    expect(
      mapJobRpcError('Only the currently assigned technician may start this visit').message,
    ).toMatch(/currently assigned/i)
  })

  it('maps invalid window', () => {
    expect(mapJobRpcError('scheduled_end must be after scheduled_start').message).toMatch(
      /end must be after start/i,
    )
  })

  it('maps terminal reschedule', () => {
    expect(mapJobRpcError('Only scheduled visits may be rescheduled').message).toMatch(
      /cannot be rescheduled/i,
    )
  })

  it('maps mandatory outcome reason', () => {
    expect(mapJobRpcError('Abort reason mandatory').message).toMatch(/reason is required/i)
  })

  it('maps reassignment blocked by in-progress visit', () => {
    expect(mapJobRpcError('Cannot reassign job with an in-progress visit').message).toMatch(
      /while a visit is in progress/i,
    )
  })
})
