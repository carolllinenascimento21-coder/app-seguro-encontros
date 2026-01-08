"use client"

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export function createSupabaseClient() {
  return createClientComponentClient()
}

export const supabase = createSupabaseClient()
