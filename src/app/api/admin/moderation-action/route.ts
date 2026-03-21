import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'

export async function POST(req: Request) {
  try {
    const supabase = getSupabaseAdminClient()

    if (!supabase) {
      return NextResponse.json(
        { success: false, message: 'Admin não configurado' },
        { status: 500 }
      )
    }

    const body = await req.json()

    const { reportId, avaliacaoId, action } = body

    if (!reportId || !avaliacaoId || !action) {
      return NextResponse.json(
        { success: false, message: 'Dados inválidos' },
        { status: 400 }
      )
    }

    // 👉 APROVAR (não faz nada na avaliação)
    if (action === 'approve') {
      await supabase
        .from('reportes_ugc')
        .update({
          status: 'resolvido',
          resolved_at: new Date().toISOString(),
        })
        .eq('id', reportId)

      return NextResponse.json({ success: true })
    }

    // 👉 REMOVER avaliação
    if (action === 'remove') {
      // 1. Deleta avaliação
      await supabase
        .from('avaliacoes')
        .delete()
        .eq('id', avaliacaoId)

      // 2. Marca report como resolvido
      await supabase
        .from('reportes_ugc')
        .update({
          status: 'removido',
          resolved_at: new Date().toISOString(),
        })
        .eq('id', reportId)

      return NextResponse.json({ success: true })
    }

    return NextResponse.json(
      { success: false, message: 'Ação inválida' },
      { status: 400 }
    )
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { success: false, message: 'Erro interno' },
      { status: 500 }
    )
  }
}
