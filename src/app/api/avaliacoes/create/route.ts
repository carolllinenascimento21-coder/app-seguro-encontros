import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies }
    )

    const body = await req.json()

    const {
      nome,
      cidade,
      contato,
      descricao,
      anonimo,
      ratings,
      greenFlags,
      redFlags,
    } = body

    const nomeNormalizado =
      typeof nome === 'string' ? nome.trim() : ''
    const cidadeNormalizada =
      typeof cidade === 'string' ? cidade.trim() : ''
    const contatoNormalizado =
      typeof contato === 'string' ? contato.trim() : null
    const descricaoNormalizada =
      typeof descricao === 'string' ? descricao.trim() : null

    if (!nomeNormalizado || !cidadeNormalizada) {
      return NextResponse.json(
        { message: 'Nome e cidade são obrigatórios' },
        { status: 400 }
      )
    }

    if (!ratings || Object.values(ratings).some(v => !v || v < 1)) {
      return NextResponse.json(
        { message: 'Avaliações por critério são obrigatórias' },
        { status: 400 }
      )
    }

    /** 🔍 Buscar avaliado */
    const { data: existente, error: findError } = await supabase
      .from('avaliados')
      .select('id')
      .ilike('nome', nomeNormalizado)
      .ilike('cidade', cidadeNormalizada)
      .maybeSingle()

    if (findError && findError.code !== 'PGRST116') {
      return NextResponse.json(
        { message: findError.message },
        { status: 500 }
      )
    }

    let avaliadoId = existente?.id

    /** ➕ Criar avaliado se não existir */
    if (!avaliadoId) {
      const { data: criado, error: createError } = await supabase
        .from('avaliados')
        .insert({
          nome: nomeNormalizado,
          cidade: cidadeNormalizada,
          contato: contatoNormalizado,
        })
        .select('id')
        .single()

      if (createError) {
        return NextResponse.json(
          { message: createError.message },
          { status: 500 }
        )
      }

      avaliadoId = criado.id
    }

    /** 📝 Criar avaliação */
    const { error: avaliacaoError } = await supabase
      .from('avaliacoes')
      .insert({
        avaliado_id: avaliadoId,
        descricao: descricaoNormalizada,
        anonimo: !!anonimo,
        ratings,
        green_flags: greenFlags || [],
        red_flags: redFlags || [],
      })

    if (avaliacaoError) {
      return NextResponse.json(
        { message: avaliacaoError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (err: any) {
    return NextResponse.json(
      { message: 'Erro inesperado no servidor' },
      { status: 500 }
    )
  }
}
