/**
 * Slice 0: issue short-lived signed URLs for ticket attachments when a valid
 * share token is presented. No anonymous public-bucket fallback.
 */
import { createClient } from 'npm:@supabase/supabase-js@2.52.1'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
}
const reply = (status: number, body: unknown) => Response.json(body, { status, headers: cors })

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (request.method !== 'POST') return reply(405, { error: 'Use POST' })

  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return reply(503, { error: 'Attachment service is not configured' })

  const server = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  try {
    const text = await request.text()
    if (text.length > 4096) return reply(413, { error: 'Request is too large' })
    let body: { token?: unknown; path?: unknown }
    try {
      body = JSON.parse(text) as { token?: unknown; path?: unknown }
    } catch {
      return reply(400, { error: 'Invalid JSON' })
    }
    const token = typeof body.token === 'string' ? body.token.trim() : ''
    const path = typeof body.path === 'string' ? body.path.trim().replace(/^\/+/, '') : ''
    if (token.length < 16 || !path || path.includes('..')) {
      return reply(400, { error: 'Invalid token or path' })
    }

    const { data: share, error: shareErr } = await server
      .from('ticket_shares')
      .select('ticket_id, expires_at, revoked_at')
      .eq('token', token)
      .maybeSingle()
    if (shareErr || !share) return reply(404, { error: 'Invalid or expired share link' })
    if (share.revoked_at) return reply(404, { error: 'Invalid or expired share link' })
    if (share.expires_at && new Date(share.expires_at).getTime() <= Date.now()) {
      return reply(404, { error: 'Invalid or expired share link' })
    }

    // Path must be under the shared ticket folder (or legacy flat object recorded on that ticket).
    const ticketPrefix = `${share.ticket_id}/`
    const { data: messages, error: msgErr } = await server
      .from('ticket_messages')
      .select('attachments, is_internal_note, message_type')
      .eq('ticket_id', share.ticket_id)
    if (msgErr) return reply(503, { error: 'Unable to verify attachment' })

    const allowed = (messages ?? []).some((row) => {
      if (row.is_internal_note || row.message_type === 'internal_note') return false
      const atts = Array.isArray(row.attachments) ? row.attachments : []
      return atts.some((att: { storage_path?: string; url?: string }) => {
        const stored = att.storage_path
          || (typeof att.url === 'string'
            ? (att.url.split('/ticket-attachments/')[1] || att.url.split('ticket-attachments/')[1] || '')
            : '')
        return stored === path
      })
    })
    if (!allowed && !path.startsWith(ticketPrefix)) {
      return reply(403, { error: 'Attachment not part of shared ticket' })
    }

    const { data: signed, error: signErr } = await server.storage
      .from('ticket-attachments')
      .createSignedUrl(path, 60)
    if (signErr || !signed?.signedUrl) return reply(503, { error: 'Unable to sign attachment URL' })
    return reply(200, { url: signed.signedUrl, expires_in: 60 })
  } catch {
    return reply(500, { error: 'Unexpected error' })
  }
})
