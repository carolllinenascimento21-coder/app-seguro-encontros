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

export async function GET(request: NextRequest) {
  let supabaseEnv

  try {
    supabaseEnv = getSupabasePublicEnv('api/auth/google')
  } catch (error) {
    const envError = getMissingSupabaseEnvDetails(error)
    if (envError) {
      console.error(envError.message)
      return new NextResponse(envError.message, { status: envError.status })
    }
    throw error
  }

  if (!supabaseEnv) {
    return new NextResponse('Supabase público não configurado', { status: 503 })
  }

  const { searchParams, origin } = new URL(request.url)
  const next = getSafeRedirectPath(searchParams.get('next'))
  const callbackUrl = new URL('/auth/callback', origin)
  callbackUrl.searchParams.set('next', next)

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
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch (error) {
            console.error('Erro ao salvar cookies antes do OAuth Google:', error)
          }
        },
      },
    }
  )

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: callbackUrl.toString(),
      skipBrowserRedirect: true,
    },
  })

  if (error || !data?.url) {
    console.error('Falha ao iniciar OAuth Google:', {
      message: error?.message,
      status: error?.status,
      code: error?.code,
      hasUrl: Boolean(data?.url),
    })

    const loginUrl = new URL('/login', origin)
    loginUrl.searchParams.set('error', 'google_oauth_init_failed')
    loginUrl.searchParams.set('next', next)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.redirect(data.url)
}
