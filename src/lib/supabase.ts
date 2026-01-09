'use client'

import type { SupabaseClient } from '@supabase/supabase-js'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { getSupabasePublicEnv } from '@/lib/env'

export function createSupabaseClient(): SupabaseClient | null {
  const env = getSupabasePublicEnv('client-component', { throwOnMissing: false })

  if (!env) {
    return null
  }

  return createClientComponentClient()
}

export const supabase = createSupabaseClient()
