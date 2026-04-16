import { NextResponse } from 'next/server'
import { cookies, headers } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { getMissingSupabaseEnvDetails, getSupabasePublicEnv } from '@/lib/env'

type SessionPayload = {
  access_token?: string
  refresh_token?: string
}

export async function POST(req: Request) {
  let supabaseEnv

  try {
    supabaseEnv = getSupabasePublicEnv('api/auth/login')
  } catch (error) {
    const envError = getMissingSupabaseEnvDetails(error)
    if (envError) {
      console.error(envError.message)
      return NextResponse.json(
        { error: envError.message },
        { status: envError.status }
      )
    }
    throw error
  }

  if (!supabaseEnv) {
    return NextResponse.json(
      { error: 'Supabase público não configurado' },
      { status: 503 }
    )
  }

  // 🔐 VALIDA ORIGIN (NÃO QUEBRA PRODUÇÃO)
  try {
    const origin = headers().get('origin')
    const allowed = process.env.NEXT_PUBLIC_SITE_URL

    if (origin && allowed && !origin.includes(allowed)) {
      console.warn('Origin inválido no login:', origin)
      return NextResponse.json({ error: 'Origin inválido' }, { status: 403 })
    }
  } catch {
    // não quebra fluxo se headers falhar
  }

  const body = (await req.json().catch(() => null)) as SessionPayload | null

  const accessToken = body?.access_token?.trim()
  const refreshToken = body?.refresh_token?.trim()

  if (!accessToken || !refreshToken) {
    return NextResponse.json(
      {
        error: 'Payload inválido. access_token e refresh_token são obrigatórios.',
      },
      { status: 400 }
    )
  }

  const cookieStore = await cookies()

  let cookiesPersisted = true

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
            cookiesPersisted = false
            console.error('Erro ao salvar cookies de sessão:', error)
          }
        },
      },
    }
  )

  // 🔥 SET SESSION (CRÍTICO)
  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  })

  const persistedCookieNames = cookieStore.getAll().map((cookie) => cookie.name)
  const hasSupabaseSessionCookie = persistedCookieNames.some(
    (name) => name.startsWith('sb-') && name.includes('-auth-token')
  )

  // 🔥 VALIDAÇÃO MAIS RÍGIDA
  if (
    error ||
    !data?.session ||
    !data?.user ||
    !cookiesPersisted ||
    !hasSupabaseSessionCookie
  ) {
    console.error('Falha ao sincronizar sessão no servidor:', {
      message: error?.message,
      status: error?.status,
      code: error?.code,
      hasSession: Boolean(data?.session),
      hasUser: Boolean(data?.user),
      cookiesPersisted,
      hasSupabaseSessionCookie,
    })

    return NextResponse.json(
      { error: 'Não foi possível persistir a sessão de autenticação.' },
      { status: 401 }
    )
  }

  return NextResponse.json({
    success: true,
    userId: data.user.id,
    expiresAt: data.session.expires_at,
  })
}
