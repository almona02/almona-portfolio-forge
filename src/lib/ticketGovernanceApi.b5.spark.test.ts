// Spark sanitized API binding probe — B5 freeze f8fb9358
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
    storage: {
      from: vi.fn(() => ({
        createSignedUrl: vi.fn(),
      })),
    },
  },
}))

import { supabase } from '@/lib/supabase'
import {
  createReportEvidenceSignedUrl,
  reviewServiceReportRevision,
} from './ticketGovernanceApi'

const rpcMock = supabase.rpc as unknown as ReturnType<typeof vi.fn>
const fromMock = supabase.storage.from as unknown as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ticketGovernanceApi B5 Spark bindings', () => {
  it('reviewServiceReportRevision binds exact revision + decision + comments', async () => {
    rpcMock.mockResolvedValue({
      data: {
        id: 'rw-1',
        revision_id: 'rev-9',
        reviewer_id: 'mgr-1',
        decision: 'returned',
        comments: 'need photos',
        decided_at: '2026-11-15T12:00:00.000Z',
      },
      error: null,
    })
    await reviewServiceReportRevision({
      revisionId: 'rev-9',
      decision: 'returned',
      comments: 'need photos',
    })
    expect(rpcMock).toHaveBeenCalledWith('review_service_report_revision', {
      p_revision_id: 'rev-9',
      p_decision: 'returned',
      p_comments: 'need photos',
    })
  })

  it('createReportEvidenceSignedUrl uses ticket-attachments bucket', async () => {
    const createSignedUrl = vi.fn(async () => ({
      data: { signedUrl: 'https://example.test/s' },
      error: null,
    }))
    fromMock.mockReturnValue({ createSignedUrl })
    const url = await createReportEvidenceSignedUrl('ticket/b4/e.jpg', 90)
    expect(fromMock).toHaveBeenCalledWith('ticket-attachments')
    expect(createSignedUrl).toHaveBeenCalledWith('ticket/b4/e.jpg', 90)
    expect(url).toBe('https://example.test/s')
  })
})
