import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
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

  if (!nome || !cidade) {
    return NextResponse.json(
      { message: 'Nome e cidade são obrigatórios' },
      { status: 400 }
    )
  }

  /** 1️⃣ Buscar avaliado existente */
  const { data: existente, error: findError } = await supabase
    .from('avaliados')
    .select('id')
    .ilike('nome', nome)
    .ilike('cidade', cidade)
    .maybeSingle()

  if (findError && findError.code !== 'PGRST116') {
    return NextResponse.json({ message: findError.message }, { status: 500 })
  }

  let avaliadoId = existente?.id

  /** 2️⃣ Criar avaliado se não existir */
  if (!avaliadoId) {
    const { data: criado, error: createError } = await supabase
      .from('avaliados')
      .insert({
        nome,
        cidade,
        contato: contato || null,
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

  /** 3️⃣ Criar avaliação */
  const { error: avaliacaoError } = await supabase
    .from('avaliacoes')
    .insert({
      avaliado_id: avaliadoId,
      descricao: descricao || null,
      anonimo,
      ratings,
      green_flags: greenFlags,
      red_flags: redFlags,
    })

  if (avaliacaoError) {
    return NextResponse.json(
      { message: avaliacaoError.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
