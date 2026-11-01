import { supabase } from '@/lib/supabase'

export const ADMIN_USER_ROLES = ['customer', 'sales_rep', 'technician', 'support', 'fabricator_admin', 'admin'] as const
export type AdminUserRole = typeof ADMIN_USER_ROLES[number]
export interface AdminUserRow {
  id: string
  full_name: string | null
  username: string | null
  company_name: string | null
  role: AdminUserRole
}
export interface AdminUserPage { users: AdminUserRow[]; total: number }

async function invokeAdminUsers<T>(body: Record<string, unknown>): Promise<T> {
  const result = await supabase.functions.invoke<T>('admin-users', { body })
  const data = result.data
  const failure: unknown = result.error
  if (failure) {
    let message = 'Admin users service unavailable. Confirm the function and migration are deployed.'
    // FunctionsHttpError exposes the response; do not replace a useful server rejection.
    if (typeof failure === 'object' && 'context' in failure && failure.context instanceof Response) {
      try {
        const payload: unknown = await failure.context.json()
        if (typeof payload === 'object' && payload !== null && 'error' in payload && typeof payload.error === 'string' && payload.error) {
          message = payload.error
        }
      } catch { /* Keep the safe fallback for non-JSON gateway responses. */ }
    }
    throw new Error(message)
  }
  if (data === null) throw new Error('Admin users service returned an empty response')
  return data
}

export const listAdminUsers = (page: number, search: string) =>
  invokeAdminUsers<AdminUserPage>({ operation: 'list', page, search })

export const changeAdminUserRole = (userId: string, role: AdminUserRole) =>
  invokeAdminUsers<{ id: string; role: AdminUserRole }>({ operation: 'change-role', userId, role })
