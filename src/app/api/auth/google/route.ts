import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { getMissingSupabaseEnvDetails, getSupabasePublicEnv } from '@/lib/env'

const DEFAULT_NEXT_PATH = '/login'
const MOBILE_CALLBACK_PATH = '/auth/callback'
const ALLOWED_MOBILE_SCHEMES = new Set(['confiamais'])

function getSafeRedirectPath(next: string | null) {
  if (!next) return DEFAULT_NEXT_PATH
  if (!next.startsWith('/')) return DEFAULT_NEXT_PATH
  if (next.startsWith('//')) return DEFAULT_NEXT_PATH
  if (next.startsWith('/auth/callback')) return DEFAULT_NEXT_PATH
  return next
}

function getMobileRedirectTarget(redirectTo: string | null) {
  if (!redirectTo) return null

  try {
    const parsed = new URL(redirectTo)
    if (!ALLOWED_MOBILE_SCHEMES.has(parsed.protocol.replace(':', ''))) {
      return null
    }

    if (parsed.pathname !== MOBILE_CALLBACK_PATH) {
      return null
    }

    return parsed.toString()
  } catch {
    return null
  }
}

export async function GET(req: Request) {
  let supabaseEnv

  try {
    supabaseEnv = getSupabasePublicEnv('api/auth/google')
  } catch (error) {
    const envError = getMissingSupabaseEnvDetails(error)
    if (envError) {
      console.error(envError.message)
      return NextResponse.json({ error: envError.message }, { status: envError.status })
    }
    throw error
  }

  if (!supabaseEnv) {
    return NextResponse.json(
      { error: 'Supabase público não configurado' },
      { status: 503 }
    )
  }

  const requestUrl = new URL(req.url)
  const mobileRedirectTo = getMobileRedirectTarget(requestUrl.searchParams.get('redirect_to'))

  const nextPath = getSafeRedirectPath(requestUrl.searchParams.get('next'))
  const callbackUrl = new URL('/auth/callback', requestUrl.origin)
  callbackUrl.searchParams.set('next', nextPath)

  const redirectTo = mobileRedirectTo ?? callbackUrl.toString()

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  })

  if (error || !data?.url) {
    console.error('Erro ao iniciar OAuth Google:', {
      message: error?.message,
      status: error?.status,
      code: error?.code,
      hasUrl: Boolean(data?.url),
      redirectTo,
    })

    return NextResponse.redirect(new URL('/login?error=google_oauth_start', requestUrl.origin))
  }

  return NextResponse.redirect(data.url)
}
