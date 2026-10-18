import { createClient } from 'npm:@supabase/supabase-js@2.52.1'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
}
const reply = (status: number, body: unknown) => Response.json(body, { status, headers: cors })
const roles = ['customer', 'sales_rep', 'technician', 'support', 'admin']
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (request.method !== 'POST') return reply(405, { error: 'Use POST' })
  const authorization = request.headers.get('Authorization')
  if (!authorization?.startsWith('Bearer ')) return reply(401, { error: 'Authentication required' })
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return reply(503, { error: 'Admin users service is not configured' })
  // Never forward the user Authorization header to this privileged client.
  // getUser verifies the supplied JWT with Auth; role authority comes from profiles.
  const server = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  try {
    const { data: identity, error: authError } = await server.auth.getUser(authorization.slice(7))
    if (authError || !identity.user) return reply(401, { error: 'Invalid or expired session' })
    const actorId = identity.user.id
    const { data: actor, error: actorError } = await server.from('profiles').select('role').eq('id', actorId).single()
    if (actorError || actor?.role !== 'admin') return reply(403, { error: 'Administrator access required' })
    const text = await request.text()
    if (text.length > 4096) return reply(413, { error: 'Request is too large' })
    let body: Record<string, unknown>
    try {
      const parsed = JSON.parse(text)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return reply(400, { error: 'Invalid request' })
      body = parsed
    } catch { return reply(400, { error: 'Invalid JSON' }) }

    if (body.operation === 'list') {
      const page = body.page ?? 0
      if (!Number.isInteger(page) || Number(page) < 0 || Number(page) > 100000) return reply(400, { error: 'Invalid page' })
      if (body.search !== undefined && typeof body.search !== 'string') return reply(400, { error: 'Invalid search' })
      // Restrict filter grammar while preserving Arabic and other Unicode names.
      const search = String(body.search ?? '').slice(0, 100).replace(/[^\p{L}\p{N}\s@._-]/gu, '').trim()
      let query = server.from('profiles').select('id,full_name,username,company_name,role', { count: 'exact' })
      if (search) query = query.or(`full_name.ilike.%${search}%,username.ilike.%${search}%,company_name.ilike.%${search}%`)
      const { data, count, error } = await query.order('full_name').order('id').range(Number(page) * 50, Number(page) * 50 + 49)
      if (error) return reply(503, { error: 'Unable to load users' })
      return reply(200, { users: data, total: count ?? 0 })
    }
    if (body.operation === 'change-role') {
      if (typeof body.userId !== 'string' || !uuid.test(body.userId) || typeof body.role !== 'string' || !roles.includes(body.role)) {
        return reply(400, { error: 'Invalid user or role' })
      }
      // RPC is service-role-only. It rechecks authority and writes the audit row
      // in the same transaction, without weakening the browser privilege trigger.
      const { data, error } = await server.rpc('admin_change_user_role', {
        p_actor_id: actorId, p_user_id: body.userId, p_role: body.role,
      })
      if (error) {
        if (error.code === '42501') return reply(403, { error: 'Role change is not permitted' })
        if (error.code === 'P0002') return reply(404, { error: 'User not found' })
        return reply(503, { error: 'Role change failed; confirm the admin migration is deployed' })
      }
      return reply(200, data)
    }
    return reply(400, { error: 'Unknown operation' })
  } catch {
    return reply(503, { error: 'Admin users service unavailable' })
  }
})
