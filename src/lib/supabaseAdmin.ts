import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseServiceEnv } from '@/lib/env'

let supabaseAdminClient: SupabaseClient | null = null

export const getSupabaseAdminClient = () => {
  const env = getSupabaseServiceEnv('supabase-admin')

  if (!env) {
    return null
  }

  if (!supabaseAdminClient) {
    supabaseAdminClient = createClient(env.url, env.serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }

  return supabaseAdminClient
}
