"use client";

import { createBrowserSupabaseClient } from "@supabase/auth-helpers-nextjs";

export function createSupabaseBrowserClient() {
  return createBrowserSupabaseClient({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  });
}

export const supabase = createSupabaseBrowserClient();
