import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'

const STATUS_VALIDOS = new Set([
  'public',
  'pending_moderation',
  'hidden',
  'removed',
])

const getModeratorIds = () => {
  const envValue = process.env.UGC_MODERATOR_IDS ?? ''

  return new Set(
    envValue
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)
  )
}

export async function PATCH(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
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

    const moderators = getModeratorIds()

    if (!moderators.has(user.id)) {
      return NextResponse.json(
        { success: false, message: 'Acesso restrito à moderação.' },
        { status: 403 }
      )
    }

    const body = (await req.json().catch(() => null)) as
      | { avaliacaoId?: string; status?: string }
      | null

    const avaliacaoId = body?.avaliacaoId?.trim()
    const nextStatus = body?.status?.trim()

    if (!avaliacaoId || !nextStatus) {
      return NextResponse.json(
        { success: false, message: 'Dados obrigatórios ausentes.' },
        { status: 400 }
      )
    }

    if (!STATUS_VALIDOS.has(nextStatus)) {
      return NextResponse.json(
        { success: false, message: 'Status de moderação inválido.' },
        { status: 400 }
      )
    }

    const supabaseAdmin = getSupabaseAdminClient()

    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, message: 'Supabase admin não configurado.' },
        { status: 503 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('avaliacoes')
      .update({ status: nextStatus })
      .eq('id', avaliacaoId)
      .select('id, status')
      .single()

    if (error || !data) {
      console.error('[api/ugc/moderation] erro ao moderar avaliação', error)
      return NextResponse.json(
        { success: false, message: 'Não foi possível atualizar o status.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, avaliacao: data })
  } catch (error) {
    console.error('[api/ugc/moderation] erro inesperado', error)
    return NextResponse.json(
      { success: false, message: 'Erro inesperado na moderação.' },
      { status: 500 }
    )
  }
}
