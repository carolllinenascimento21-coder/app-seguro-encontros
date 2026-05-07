import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'

const ADMIN_EMAILS = ['privacidade@confiamais.net']
const MODERATOR_IDS = (process.env.MODERATOR_IDS || '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean)

type ModerationAction = 'approve' | 'remove'

type ModerationActionPayload = {
  reportId?: string
  avaliacaoId?: string
  action?: ModerationAction
}

function normalizeEmail(email?: string | null) {
  return (email || '').trim().toLowerCase()
}

function isAllowedModerator(userId?: string | null, email?: string | null) {
  if (userId && MODERATOR_IDS.includes(userId)) return true
  return ADMIN_EMAILS.includes(normalizeEmail(email))
}

function isModerationAction(value: unknown): value is ModerationAction {
  return value === 'approve' || value === 'remove'
}

export async function POST(req: Request) {
  try {
    const supabaseAuth = await createServerClient()

    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ success: false, message: 'Não autenticado.' }, { status: 401 })
    }

    if (!isAllowedModerator(user.id, user.email)) {
      return NextResponse.json({ success: false, message: 'Acesso negado.' }, { status: 403 })
    }

    const supabase = getSupabaseAdminClient()

    if (!supabase) {
      return NextResponse.json(
        { success: false, message: 'Serviço administrativo indisponível.' },
        { status: 500 }
      )
    }

    const body = (await req.json().catch(() => null)) as ModerationActionPayload | null
    const reportId = body?.reportId?.trim()
    const avaliacaoId = body?.avaliacaoId?.trim()
    const action = body?.action

    if (!reportId || !isModerationAction(action)) {
      return NextResponse.json({ success: false, message: 'Dados inválidos.' }, { status: 400 })
    }

    const now = new Date().toISOString()

    if (action === 'approve') {
      if (avaliacaoId) {
        const { error: reviewError } = await supabase
          .from('avaliacoes')
          .update({ status: 'public' })
          .eq('id', avaliacaoId)

        if (reviewError) {
          return NextResponse.json(
            { success: false, message: `Erro ao manter avaliação aprovada: ${reviewError.message}` },
            { status: 500 }
          )
        }
      }

      const { error: reportError } = await supabase
        .from('reportes_ugc')
        .update({
          status: 'resolvido',
          resolved_at: now,
          resolved_by: user.id,
          admin_note: 'Conteúdo aprovado pela moderação.',
        })
        .eq('id', reportId)

      if (reportError) {
        return NextResponse.json(
          { success: false, message: `Erro ao aprovar denúncia: ${reportError.message}` },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true })
    }

    if (!avaliacaoId) {
      return NextResponse.json({ success: false, message: 'Avaliação inválida.' }, { status: 400 })
    }

    const { error: reviewError } = await supabase
      .from('avaliacoes')
      .update({
        status: 'removed',
        relato: '[REMOVIDO PELA MODERAÇÃO]',
      })
      .eq('id', avaliacaoId)

    if (reviewError) {
      return NextResponse.json(
        { success: false, message: `Erro ao remover avaliação: ${reviewError.message}` },
        { status: 500 }
      )
    }

    const { error: reportError } = await supabase
      .from('reportes_ugc')
      .update({
        status: 'removido',
        resolved_at: now,
        resolved_by: user.id,
        admin_note: 'Avaliação removida pela moderação.',
      })
      .eq('id', reportId)

    if (reportError) {
      return NextResponse.json(
        { success: false, message: `Erro ao atualizar denúncia: ${reportError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro inesperado ao executar moderação.'
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
