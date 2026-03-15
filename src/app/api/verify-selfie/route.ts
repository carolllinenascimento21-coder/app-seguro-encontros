import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { getMissingSupabaseEnvDetails, getSupabasePublicEnv } from '@/lib/env'

export async function POST(req: Request) {
  let supabaseEnv
  try {
    supabaseEnv = getSupabasePublicEnv('api/verify-selfie')
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
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {}
        },
      },
    }
  )

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticada' }, { status: 401 })
  }

  const { image } = await req.json()

  if (!image || typeof image !== 'string') {
    return NextResponse.json({ error: 'Imagem inválida' }, { status: 400 })
  }

  const base64 = image.split(',')[1]
  const buffer = Buffer.from(base64, 'base64')

  const filePath = `${session.user.id}/selfie.jpg`

  const { error: uploadError } = await supabase.storage
    .from('selfie-verifications')
    .upload(filePath, buffer, {
      contentType: 'image/jpeg',
      upsert: true,
    })

  if (uploadError) {
    return NextResponse.json({ error: 'Erro ao salvar selfie' }, { status: 500 })
  }

  // ✅ Marca perfil como verificado
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      selfie_verified: true,
      selfie_checked_at: new Date().toISOString(),
      selfie_url: filePath,
    })
    .eq('id', session.user.id)

  if (updateError) {
    return NextResponse.json({ error: 'Erro ao atualizar perfil' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
