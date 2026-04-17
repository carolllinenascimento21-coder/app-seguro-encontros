import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getMissingSupabaseEnvDetails, getSupabasePublicEnv } from '@/lib/env'

const DEFAULT_NEXT_PATH = '/login'

function getSafeRedirectPath(next: string | null) {
  if (!next) return DEFAULT_NEXT_PATH
  if (!next.startsWith('/')) return DEFAULT_NEXT_PATH
  if (next.startsWith('//')) return DEFAULT_NEXT_PATH
  if (next.startsWith('/auth/callback')) return DEFAULT_NEXT_PATH
  return next
}

function buildError(origin: string, next: string, error: string) {
  const url = new URL('/login', origin)
  url.searchParams.set('error', error)
  url.searchParams.set('next', next)
  return NextResponse.redirect(url)
}

export async function GET(request: NextRequest) {
  let supabaseEnv

  try {
    supabaseEnv = getSupabasePublicEnv('auth/callback')
  } catch (error) {
    const envError = getMissingSupabaseEnvDetails(error)
    if (envError) {
      return new NextResponse(envError.message, { status: envError.status })
    }
    throw error
  }

  if (!supabaseEnv) {
    return new NextResponse('Supabase não configurado', { status: 503 })
  }

  const { searchParams, origin } = new URL(request.url)

  const code = searchParams.get('code')
  const providerError = searchParams.get('error')
  const next = getSafeRedirectPath(searchParams.get('next'))

  if (providerError) {
    return buildError(origin, next, providerError)
  }

  if (!code) {
    return NextResponse.redirect(new URL(next, origin))
  }

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return buildError(origin, next, 'auth_exchange_failed')
    }
  }

  return NextResponse.redirect(new URL(next, origin))
}
