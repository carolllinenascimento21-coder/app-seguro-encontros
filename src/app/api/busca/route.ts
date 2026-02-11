import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)

  const nome = searchParams.get('nome')
  const cidade = searchParams.get('cidade')

  let query = supabase
    .from('profiles')
    .select(`
      id,
      display_name,
      city,
      reviews (
        id,
        nota_geral,
        confiavel,
        flags_positive,
        flags_negative
      )
    `)

  if (nome) {
    query = query.ilike('display_name', `%${nome}%`)
  }

  if (cidade) {
    query = query.ilike('city', `%${cidade}%`)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: 'Erro na busca' }, { status: 500 })
  }

  const results = data.map((p) => {
    const reviews = p.reviews ?? []

    const total = reviews.length

    const media =
      total > 0
        ? reviews.reduce((acc, r) => acc + (r.nota_geral ?? 0), 0) / total
        : 0

    const positivos = reviews.filter((r) => r.confiavel === true).length

    const confiabilidade =
      total > 0 ? Math.round((positivos / total) * 100) : 0

    const flags_negative = reviews.flatMap((r) => r.flags_negative ?? [])
    const flags_positive = reviews.flatMap((r) => r.flags_positive ?? [])

    // 🔥 SCORE ENTERPRISE
    const score_final =
      total > 0
        ? Number((media * Math.log(total + 1)).toFixed(2))
        : 0

    return {
      id: p.id,
      display_name: p.display_name,
      city: p.city,
      total_avaliacoes: total,
      media_geral: Number(media.toFixed(1)),
      confiabilidade_percentual: confiabilidade,
      flags_positive,
      flags_negative,
      score_final,
    }
  })

  // 🔥 Ordenação inteligente
  results.sort((a, b) => b.score_final - a.score_final)

  return NextResponse.json({ results })
}
