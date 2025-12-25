"use client"

import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs'

export function createSupabaseClient() {
  return createPagesBrowserClient()
}

export const supabase = createSupabaseClient()
