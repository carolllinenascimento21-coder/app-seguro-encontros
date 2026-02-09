import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
  let body: unknown
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies }
    )

    try {
      body = await req.json()
    } catch {
      return NextResponse.json(
        { message: 'Payload inválido' },
        { status: 400 }
      )
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { message: 'Payload inválido' },
        { status: 400 }
      )
    }

    const {
      nome,
      cidade,
      contato,
      descricao,
      anonimo,
      ratings,
      greenFlags,
      redFlags,
    } = body as Record<string, unknown>

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

    if (!ratings || typeof ratings !== 'object' || Array.isArray(ratings)) {
      return NextResponse.json(
        { message: 'Avaliações por critério são obrigatórias' },
        { status: 400 }
      )
    }

    const ratingValues = Object.values(ratings)

    if (
      ratingValues.length === 0 ||
      ratingValues.some(
        (value) => typeof value !== 'number' || Number.isNaN(value) || value < 1
      )
    ) {
      return NextResponse.json(
        { message: 'Avaliações por critério são obrigatórias' },
        { status: 400 }
      )
    }

    if (!Array.isArray(greenFlags) || !Array.isArray(redFlags)) {
      return NextResponse.json(
        { message: 'Flags inválidas' },
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

    return NextResponse.json(
      { message: 'Avaliação publicada com sucesso', success: true },
      { status: 201 }
    )
  } catch (err: any) {
    return NextResponse.json(
      { message: 'Erro inesperado no servidor' },
      { status: 500 }
    )
  }
}
