import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

const moderatorIds = (process.env.MODERATOR_IDS || '').split(',')

export async function POST(req: Request) {
  const supabase = createServerClient({ cookies })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 🚫 BLOQUEIO TOTAL se não logado
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  // 🚫 BLOQUEIO se não for moderador
  if (!moderatorIds.includes(user.id)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
  }
  import { NextResponse } from 'next/server'
  import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'

export async function POST(req: Request) {
  try {
    const supabase = getSupabaseAdminClient()
    const body = await req.json()

    const { reportId, avaliacaoId, action } = body

    if (!reportId || !action) {
      return NextResponse.json(
        { success: false, message: 'Dados inválidos' },
        { status: 400 }
      )
    }

    // 🔵 APROVAR (só marca como resolvido)
    if (action === 'approve') {
      await supabase
        .from('reportes_ugc')
        .update({
          status: 'resolvido',
          resolved_at: new Date().toISOString()
        })
        .eq('id', reportId)

      return NextResponse.json({ success: true })
    }

    // 🔴 REMOVER AVALIAÇÃO
    if (action === 'remove') {
      if (!avaliacaoId) {
        return NextResponse.json(
          { success: false, message: 'Avaliação inválida' },
          { status: 400 }
        )
      }

      // deleta avaliação
      await supabase
        .from('avaliacoes')
        .delete()
        .eq('id', avaliacaoId)

      // marca denúncia como resolvida
      await supabase
        .from('reportes_ugc')
        .update({
          status: 'resolvido',
          resolved_at: new Date().toISOString()
        })
        .eq('id', reportId)

      return NextResponse.json({ success: true })
    }

    return NextResponse.json(
      { success: false, message: 'Ação inválida' },
      { status: 400 }
    )
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    )
  }
}
}
