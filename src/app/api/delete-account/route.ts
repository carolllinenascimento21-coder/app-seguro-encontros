import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'
import { isMissingColumnError } from '@/lib/profile-utils'
import { getMissingSupabaseEnvDetails, getSupabasePublicEnv } from '@/lib/env'

// 🔴 DELETE genérico por user_id (não quebra se tabela não tiver coluna)
const safeDeleteByUserId = async (
  supabaseAdmin: ReturnType<typeof getSupabaseAdminClient>,
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

    let supabaseAdmin: ReturnType<typeof getSupabaseAdminClient>
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

    const userId = session.user.id
    console.log('DELETE ACCOUNT USER ID:', userId)

    // 🔴 Buscar profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('selfie_url')
      .eq('id', userId)
      .maybeSingle()

    if (profileError) {
      console.error('PROFILE LOAD ERROR:', profileError)
      return NextResponse.json(
        { error: 'Failed to load profile.' },
        { status: 500 }
      )
    }

    // 🔴 Remover imagem
    if (profile?.selfie_url) {
      try {
        await supabaseAdmin.storage
          .from('selfie-verifications')
          .remove([profile.selfie_url])
      } catch (err) {
        console.warn('STORAGE DELETE WARNING:', err)
      }
    }

    // 🔴 DELETE RELACIONAMENTOS (robusto)
    await Promise.all([
      safeDeleteByUserId(supabaseAdmin, 'emergency_contacts', userId),
      safeDeleteByUserId(supabaseAdmin, 'contatos_emergencia', userId),
      safeDeleteByUserId(supabaseAdmin, 'reportes_ugc', userId),

      // 🔴 Avaliações (múltiplos formatos possíveis)
      supabaseAdmin.from('avaliacoes').delete().eq('user_id', userId),
      supabaseAdmin.from('avaliacoes').delete().eq('author_id', userId),
      supabaseAdmin.from('avaliacoes').delete().eq('user_id_autora', userId),
    ])

    // 🔴 TENTATIVA DE DELETE DO PROFILE
    console.log('DELETANDO PROFILE ID:', userId)

    const { error: deleteProfileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId)

    if (deleteProfileError) {
      console.warn('PROFILE DELETE FAILED → fallback para anonimização')

      // 🔴 FALLBACK SE DER ERRO (foreign key etc)
      const basePayload = {
        nome: null,
        email: null,
        selfie_url: null,
        deleted_at: new Date().toISOString(),
        selfie_verified: false,
        onboarding_completed: false,
      }

      const optionalFields = new Set(['telefone', 'is_active'])

      const buildPayload = () => ({
        ...basePayload,
        ...(optionalFields.has('telefone') ? { telefone: null } : {}),
        ...(optionalFields.has('is_active') ? { is_active: false } : {}),
      })

      let { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update(buildPayload())
        .eq('id', userId)

      while (updateError) {
        if (isMissingColumnError(updateError, 'telefone')) {
          optionalFields.delete('telefone')
        } else if (isMissingColumnError(updateError, 'is_active')) {
          optionalFields.delete('is_active')
        } else {
          break
        }

        const { error: retryError } = await supabaseAdmin
          .from('profiles')
          .update(buildPayload())
          .eq('id', userId)

        updateError = retryError ?? null
      }

      if (updateError) {
        console.error('PROFILE UPDATE ERROR:', updateError)
        return NextResponse.json(
          {
            error: 'Falha ao remover perfil',
            details: updateError.message,
          },
          { status: 500 }
        )
      }
    } else {
      console.log('PROFILE DELETE OK')
    }

    // 🔴 DELETE AUTH (FINAL)
    const { error: deleteAuthError } =
      await supabaseAdmin.auth.admin.deleteUser(userId)

    if (deleteAuthError) {
      console.error('DELETE USER ERROR:', deleteAuthError)

      return NextResponse.json(
        {
          error: 'Falha ao excluir conta completamente',
          details: deleteAuthError.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('DELETE ACCOUNT ERROR FULL:', error)

    return NextResponse.json(
      {
        success: false,
        message: error?.message ?? 'Erro interno ao excluir conta',
      },
      { status: 500 }
    )
  }
}
