'use client'

import type { SupabaseClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'
import { getSupabasePublicEnv } from '@/lib/env'

export function createSupabaseClient(): SupabaseClient | null {
  const env = getSupabasePublicEnv('client-component', { throwOnMissing: false })

  if (!env) {
    return null
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export const supabase = createSupabaseClient()
