import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: Request) {
  const body = await req.json()
  const cookieStore = cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  const {
    avaliadoId,
    nome,
    cidade,
    contato,
    anonimo,
    descricao,
    ratings,
    greenFlags,
    redFlags,
  } = body

  if (!ratings) {
    return NextResponse.json(
      { message: 'Ratings obrigatórios' },
      { status: 400 }
    )
  }

  let finalAvaliadoId = avaliadoId

  /**
   * 🔹 CASO 1: Perfil ainda não existe → criar
   */
  if (!finalAvaliadoId) {
    const { data: novoPerfil, error: perfilError } = await supabase
      .from('avaliados')
      .insert({
        nome: anonimo ? null : nome,
        cidade: cidade ?? null,
        contato: contato ?? null,
      })
      .select('id')
      .single()

    if (perfilError) {
      console.error(perfilError)
      return NextResponse.json(
        { message: 'Erro ao criar perfil avaliado' },
        { status: 500 }
      )
    }

    finalAvaliadoId = novoPerfil.id
  }

  /**
   * 🔹 CASO 2: Perfil existe → só insere avaliação
   */
  const { error: avaliacaoError } = await supabase
    .from('avaliacoes')
    .insert({
      avaliado_id: finalAvaliadoId,
      descricao: descricao ?? null,
      anonimo,
      ratings,
      green_flags: greenFlags ?? [],
      red_flags: redFlags ?? [],
    })

  if (avaliacaoError) {
    console.error(avaliacaoError)
    return NextResponse.json(
      { message: 'Erro ao publicar avaliação' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    avaliadoId: finalAvaliadoId,
  })
}
