import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'

const moderatorIds = (process.env.MODERATOR_IDS || '').split(',')

export async function POST(req: Request) {
  try {
    // 🔐 autenticação do usuário
    const supabaseAuth = createServerClient({ cookies })

    const {
      data: { user },
    } = await supabaseAuth.auth.getUser()

    // 🚫 não logado
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 🚫 não é moderador
    if (!moderatorIds.includes(user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 🔥 client admin (apenas depois da validação)
    const supabase = getSupabaseAdminClient()

    const body = await req.json()
    const { reportId, avaliacaoId, action } = body

    if (!reportId || !action) {
      return NextResponse.json(
        { success: false, message: 'Dados inválidos' },
        { status: 400 }
      )
    }

    // ✅ APROVAR
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

    // 🗑️ REMOVER
    if (action === 'remove') {
      if (!avaliacaoId) {
        return NextResponse.json(
          { success: false, message: 'Avaliação inválida' },
          { status: 400 }
        )
      }

      await supabase.from('avaliacoes').delete().eq('id', avaliacaoId)

      await supabase
        .from('reportes_ugc')
        .update({
          status: 'resolvido',
          resolved_at: new Date().toISOString(),
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
