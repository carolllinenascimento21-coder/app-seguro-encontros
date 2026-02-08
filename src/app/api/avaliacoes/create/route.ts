import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies }
  )

  let body: any
  try {
    body = await req.json()
  } catch {
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
  } = body

  // 🔒 Validações mínimas
  if (!nome || !cidade) {
    return NextResponse.json(
      { message: 'Nome e cidade são obrigatórios' },
      { status: 400 }
    )
  }

  if (!ratings) {
    return NextResponse.json(
      { message: 'Avaliações por critério são obrigatórias' },
      { status: 400 }
    )
  }

  /** 1️⃣ Buscar avaliado existente (nome + cidade) */
  const { data: existente, error: findError } = await supabase
    .from('avaliados')
    .select('id')
    .ilike('nome', nome.trim())
    .ilike('cidade', cidade.trim())
    .maybeSingle()

  if (findError && findError.code !== 'PGRST116') {
    return NextResponse.json(
      { message: findError.message },
      { status: 500 }
    )
  }

  let avaliadoId = existente?.id

  /** 2️⃣ Criar avaliado se não existir */
  if (!avaliadoId) {
    const { data: criado, error: createError } = await supabase
      .from('avaliados')
      .insert({
        nome: nome.trim(),
        cidade: cidade.trim(),
        contato: contato?.trim() || null,
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

  return NextResponse.json({
    success: true,
    avaliadoId,
  })
}
