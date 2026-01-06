import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies })
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError) {
    console.error('Erro ao obter sessão:', sessionError)
    return NextResponse.json({ error: 'SESSION_ERROR' }, { status: 500 })
  }

  if (!session?.user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const userId = typeof body?.userId === 'string' ? body.userId : session.user.id

  try {
    const { data, error } = await supabaseAdmin.rpc('consume_query', {
      p_user_id: userId,
    })

    if (error) {
      console.error('Erro no RPC consume_query:', error)
      return NextResponse.json({ error: 'CONSUME_ERROR' }, { status: 500 })
    }

    const payload = data ?? {}
    return NextResponse.json(payload)
  } catch (error) {
    console.error('Erro inesperado em /api/consume-query:', error)
    return NextResponse.json({ error: 'UNEXPECTED' }, { status: 500 })
  }
}
