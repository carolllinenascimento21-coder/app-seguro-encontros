import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getMissingSupabaseEnvDetails, getSupabasePublicEnv } from '@/lib/env'

function buildErrorRedirect(
  origin: string,
  error: string,
  errorDescription?: string | null,
  errorCode?: string | null
) {
  const url = new URL('/update-password', origin)
  url.searchParams.set('error', error)

  if (errorDescription) {
    url.searchParams.set('error_description', errorDescription)
  }

  if (errorCode) {
    url.searchParams.set('error_code', errorCode)
  }

  return NextResponse.redirect(url)
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)

  const providerError = searchParams.get('error')
  const providerErrorDescription = searchParams.get('error_description')
  const providerErrorCode = searchParams.get('error_code')

  if (providerError) {
    console.error('[AUTH RECOVERY] Provider error:', {
      error: providerError,
      errorCode: providerErrorCode,
      errorDescription: providerErrorDescription,
    })
    return buildErrorRedirect(origin, providerError, providerErrorDescription, providerErrorCode)
  }

  let supabaseEnv

  try {
    supabaseEnv = getSupabasePublicEnv('auth/recovery')
  } catch (error) {
    const envError = getMissingSupabaseEnvDetails(error)
    if (envError) {
      console.error('[AUTH RECOVERY] ENV ERROR:', envError.message)
      return new NextResponse(envError.message, { status: envError.status })
    }
    throw error
  }

  if (!supabaseEnv) {
    console.error('[AUTH RECOVERY] Supabase não configurado')
    return new NextResponse('Supabase não configurado', { status: 503 })
  }

  const cookieStore = await cookies()

  const supabase = createServerClient(supabaseEnv.url, supabaseEnv.anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options)
        })
      },
    },
  })

  const code = searchParams.get('code')

  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error('[AUTH RECOVERY] exchangeCodeForSession falhou:', {
        message: exchangeError.message,
        status: exchangeError.status,
        code: exchangeError.code,
      })
      return buildErrorRedirect(origin, 'auth_recovery_exchange_failed')
    }

    return NextResponse.redirect(new URL('/update-password', origin))
  }

  const tokenHash = searchParams.get('token_hash') ?? searchParams.get('token')
  const type = searchParams.get('type')

  if (tokenHash && type === 'recovery') {
    const { error: verifyOtpError } = await supabase.auth.verifyOtp({
      type: 'recovery',
      token_hash: tokenHash,
    })

    if (verifyOtpError) {
      console.error('[AUTH RECOVERY] verifyOtp falhou:', {
        message: verifyOtpError.message,
        status: verifyOtpError.status,
        code: verifyOtpError.code,
      })
      return buildErrorRedirect(origin, 'auth_recovery_verify_failed')
    }

    return NextResponse.redirect(new URL('/update-password', origin))
  }

  return buildErrorRedirect(origin, 'auth_recovery_invalid_link')
}
