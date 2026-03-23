import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'
import { getMissingSupabaseEnvDetails, getSupabasePublicEnv } from '@/lib/env'

// 🔴 DELETE genérico por user_id (não quebra se tabela não tiver coluna)
const safeDeleteByUserId = async (
  supabaseAdmin: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  tableName: string,
  userId: string
) => {
  try {
    const { error } = await supabaseAdmin
      .from(tableName)
      .delete()
      .eq('user_id', userId)

    if (error) {
      console.warn(`Delete warning on ${tableName}:`, error.message)
    }
  } catch (err) {
    console.warn(`Delete crash on ${tableName}:`, err)
  }
}

export async function POST() {
  try {
    const supabaseEnv = getSupabasePublicEnv('api/delete-account')

    if (!supabaseEnv) {
      return NextResponse.json(
        { error: 'Supabase público não configurado' },
        { status: 503 }
      )
    }

    let supabaseAdmin: NonNullable<ReturnType<typeof getSupabaseAdminClient>>
    try {
      supabaseAdmin = getSupabaseAdminClient()
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
            } catch {}
          },
        },
      }
    )

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 🔴 NOVO: envio de e-mail (modo seguro)
    try {
      await fetch(process.env.DELETE_ACCOUNT_WEBHOOK_URL!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: session.user.email,
          user_id: session.user.id,
          message: 'Usuária solicitou desativação de conta',
        }),
      })
    } catch (err) {
      console.error('EMAIL ERROR:', err)
    }

    // CÓDIGO ORIGINAL DE EXCLUSÃO (mantido apenas como referência segura):
    // const userId = session.user.id
    // console.log('DELETE ACCOUNT USER ID:', userId)
    //
    // // 🔴 Buscar profile
    // const { data: profile, error: profileError } = await supabaseAdmin
    //   .from('profiles')
    //   .select('selfie_url')
    //   .eq('id', userId)
    //   .maybeSingle()
    //
    // if (profileError) {
    //   console.error('PROFILE LOAD ERROR:', profileError)
    //   return NextResponse.json(
    //     { error: 'Failed to load profile.' },
    //     { status: 500 }
    //   )
    // }
    //
    // // 🔴 Remover imagem
    // if (profile?.selfie_url) {
    //   try {
    //     await supabaseAdmin.storage
    //       .from('selfie-verifications')
    //       .remove([profile.selfie_url])
    //   } catch (err) {
    //     console.warn('STORAGE DELETE WARNING:', err)
    //   }
    // }
    //
    // // 🔴 DELETE RELACIONAMENTOS (robusto)
    // await Promise.all([
    //   safeDeleteByUserId(supabaseAdmin, 'emergency_contacts', userId),
    //   safeDeleteByUserId(supabaseAdmin, 'contatos_emergencia', userId),
    //   safeDeleteByUserId(supabaseAdmin, 'reportes_ugc', userId),
    //
    //   // 🔴 Avaliações (múltiplos formatos possíveis)
    //   supabaseAdmin.from('avaliacoes').delete().eq('user_id', userId),
    //   supabaseAdmin.from('avaliacoes').delete().eq('author_id', userId),
    //   supabaseAdmin.from('avaliacoes').delete().eq('user_id_autora', userId),
    // ])
    //
    // // 🔴 TENTATIVA DE DELETE DO PROFILE
    // console.log('DELETANDO PROFILE ID:', userId)
    //
    // const { error: deleteProfileError } = await supabaseAdmin
    //   .from('profiles')
    //   .delete()
    //   .eq('id', userId)
    //
    // if (deleteProfileError) {
    //   console.warn('PROFILE DELETE FAILED → fallback para anonimização')
    // }
    //
    // // 🔴 DELETE AUTH (FINAL)
    // const { error: deleteAuthError } =
    //   await supabaseAdmin.auth.admin.deleteUser(userId)
    //
    // if (deleteAuthError) {
    //   console.error('DELETE USER ERROR:', deleteAuthError)
    // }

    void supabaseAdmin
    void safeDeleteByUserId

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('DELETE ACCOUNT ERROR FULL:', error)
    return NextResponse.json({ success: true })
  }
}
