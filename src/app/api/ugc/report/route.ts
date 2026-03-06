import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'

const MOTIVOS_VALIDOS = new Set([
  'Conteúdo ofensivo',
  'Informação falsa',
  'Difamação',
  'Outro',
])

export async function POST(req: Request) {
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

    const body = (await req.json().catch(() => null)) as
      | { avaliacaoId?: string; motivo?: string }
      | null

    const avaliacaoId = body?.avaliacaoId?.trim()
    const motivo = body?.motivo?.trim()

    if (!avaliacaoId || !motivo) {
      return NextResponse.json(
        { success: false, message: 'Dados obrigatórios ausentes.' },
        { status: 400 }
      )
    }

    if (!MOTIVOS_VALIDOS.has(motivo)) {
      return NextResponse.json(
        { success: false, message: 'Motivo inválido.' },
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

    const { data: avaliacao, error: avaliacaoError } = await supabaseAdmin
      .from('avaliacoes')
      .select('id')
      .eq('id', avaliacaoId)
      .single()

    if (avaliacaoError || !avaliacao) {
      return NextResponse.json(
        { success: false, message: 'Avaliação não encontrada.' },
        { status: 404 }
      )
    }

    const { error: insertError } = await supabaseAdmin
      .from('reportes_ugc')
      .insert({
        avaliacao_id: avaliacaoId,
        user_id: user.id,
        motivo,
      })

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json(
          {
            success: false,
            message: 'Você já denunciou esta avaliação.',
          },
          { status: 409 }
        )
      }

      console.error('[api/ugc/report] erro ao salvar denúncia', insertError)
      return NextResponse.json(
        {
          success: false,
          message: 'Não foi possível registrar a denúncia.',
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Denúncia registrada com sucesso.',
    })
  } catch (error) {
    console.error('[api/ugc/report] erro inesperado', error)
    return NextResponse.json(
      { success: false, message: 'Erro inesperado ao denunciar conteúdo.' },
      { status: 500 }
    )
  }
}
