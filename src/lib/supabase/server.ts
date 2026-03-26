import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'

const getSupabaseServerEnv = () => {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.SUPABASE_URL ??
    process.env.SUPABASE_PROJECT_URL

  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error(
      'Supabase environment variables are missing. Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_URL and SUPABASE_ANON_KEY).'
    )
  }

  return { url, anonKey }
}

export async function createServerClient() {
  const cookieStore = await cookies()
  const headerStore = headers()
  const { url, anonKey } = getSupabaseServerEnv()

  const authHeader = headerStore.get('authorization')

  // 🔴 MOBILE (Bearer token)
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '')

    return createSupabaseServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return []
        },
        setAll() {},
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    })
  }

  // 🟢 WEB (cookies - mantém tudo igual)
  return createSupabaseServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // Ignore cookie writes in Server Components.
        }
      },
    },
  })
}
