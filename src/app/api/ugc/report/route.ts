import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'

const MOTIVOS_VALIDOS = new Set([
  'Conteúdo ofensivo',
  'Informação falsa',
  'Difamação',
  'Outro',
])

export async function POST(req: Request) {
  try {
    // 🔐 autenticação via cookie
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

    // 📦 body
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
      console.error('[report] supabaseAdmin não configurado')
      return NextResponse.json(
        { success: false, message: 'Erro interno do servidor.' },
        { status: 500 }
      )
    }

    // 🔍 valida se avaliação existe
    const { data: avaliacao, error: avaliacaoError } = await supabaseAdmin
      .from('avaliacoes')
      .select('id')
      .eq('id', avaliacaoId)
      .maybeSingle()

    if (avaliacaoError) {
      console.error('[report] erro ao buscar avaliação', avaliacaoError)
      return NextResponse.json(
        { success: false, message: 'Erro ao validar avaliação.' },
        { status: 500 }
      )
    }

    if (!avaliacao) {
      return NextResponse.json(
        { success: false, message: 'Avaliação não encontrada.' },
        { status: 404 }
      )
    }

    // 🔥 INSERT
    const { error: insertError } = await supabaseAdmin
      .from('reportes_ugc') // ⚠️ CONFIRA se essa tabela existe mesmo
      .insert({
        avaliacao_id: avaliacaoId,
        user_id: user.id,
        motivo,
      })

    if (insertError) {
      console.error('[report] erro ao inserir denúncia', insertError)

      // duplicidade
      if (insertError.code === '23505') {
        return NextResponse.json(
          {
            success: false,
            message: 'Você já denunciou esta avaliação.',
          },
          { status: 409 }
        )
      }

      return NextResponse.json(
        {
          success: false,
          message: 'Erro ao registrar denúncia.',
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Denúncia registrada com sucesso.',
    })
  } catch (error) {
    console.error('[report] erro inesperado', error)

    return NextResponse.json(
      {
        success: false,
        message: 'Erro interno ao denunciar conteúdo.',
      },
      { status: 500 }
    )
  }
}
