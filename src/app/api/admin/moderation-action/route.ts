import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'
import { isAdminEmail } from '@/lib/admin'

export async function POST(req: Request) {
  try {
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
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {}
          },
        },
      }
    )

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { success: false, message: 'Usuária não autenticada.' },
        { status: 401 }
      )
    }

    if (!isAdminEmail(user.email)) {
      return NextResponse.json(
        { success: false, message: 'Acesso negado.' },
        { status: 403 }
      )
    }

    const body = (await req.json().catch(() => null)) as
      | {
          reportId?: string
          avaliacaoId?: string
          action?: 'approve' | 'remove'
        }
      | null

    const reportId = body?.reportId?.trim()
    const avaliacaoId = body?.avaliacaoId?.trim()
    const action = body?.action

    if (!reportId || !avaliacaoId || !action) {
      return NextResponse.json(
        { success: false, message: 'Dados inválidos.' },
        { status: 400 }
      )
    }

    const supabaseAdmin = getSupabaseAdminClient()

    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, message: 'Admin não configurado.' },
        { status: 500 }
      )
    }

    if (action === 'approve') {
      const { error: updateError } = await supabaseAdmin
        .from('reportes_ugc')
        .update({
          status: 'resolvido',
          resolved_by: user.id,
          resolved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', reportId)

      if (updateError) {
        console.error('[moderation-action] erro ao aprovar', updateError)
        return NextResponse.json(
          { success: false, message: 'Não foi possível aprovar a denúncia.' },
          { status: 500 }
        )
      }

      await supabaseAdmin.from('moderation_actions').insert({
        report_id: reportId,
        avaliacao_id: avaliacaoId,
        action: 'approve',
        admin_user_id: user.id,
      })

      return NextResponse.json({
        success: true,
        message: 'Denúncia aprovada e registrada.',
      })
    }

    if (action === 'remove') {
      const { error: deleteError } = await supabaseAdmin
        .from('avaliacoes')
        .delete()
        .eq('id', avaliacaoId)

      if (deleteError) {
        console.error('[moderation-action] erro ao remover avaliação', deleteError)
        return NextResponse.json(
          { success: false, message: 'Não foi possível remover a avaliação.' },
          { status: 500 }
        )
      }

      const { error: updateError } = await supabaseAdmin
        .from('reportes_ugc')
        .update({
          status: 'removido',
          resolved_by: user.id,
          resolved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', reportId)

      if (updateError) {
        console.error('[moderation-action] erro ao atualizar denúncia', updateError)
        return NextResponse.json(
          {
            success: false,
            message: 'Avaliação removida, mas a denúncia não foi atualizada.',
          },
          { status: 500 }
        )
      }

      await supabaseAdmin.from('moderation_actions').insert({
        report_id: reportId,
        avaliacao_id: avaliacaoId,
        action: 'remove',
        admin_user_id: user.id,
      })

      return NextResponse.json({
        success: true,
        message: 'Avaliação removida com sucesso.',
      })
    }

    return NextResponse.json(
      { success: false, message: 'Ação inválida.' },
      { status: 400 }
    )
  } catch (error) {
    console.error('[moderation-action] erro inesperado', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor.' },
      { status: 500 }
    )
  }
}
