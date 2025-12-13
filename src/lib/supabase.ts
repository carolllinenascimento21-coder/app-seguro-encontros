import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs';

export function createSupabaseBrowserClient() {
  return createBrowserSupabaseClient();
}
