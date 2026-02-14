import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'

function normalizeTerm(value: string | null) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const termo = normalizeTerm(searchParams.get('termo'))

    if (!termo) {
      return NextResponse.json(
        { success: false, message: 'Informe termo para busca' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdminClient()
    if (!supabase) {
      return NextResponse.json(
        { success: false, message: 'Supabase admin não configurado' },
        { status: 503 }
      )
    }

    // 🔥 Busca unaccent manual (sem função SQL)
    const { data: maleProfiles, error } = await supabase
      .from('male_profiles')
      .select('id, display_name, city')
      .eq('is_active', true)

    if (error) throw error

    const filtrados =
      maleProfiles?.filter((p: any) => {
        const nome = normalizeTerm(p.display_name)
        const cidade = normalizeTerm(p.city)
        return nome.includes(termo) || cidade.includes(termo)
      }) ?? []

    const profileIds = filtrados.map((p) => p.id)

    if (!profileIds.length)
      return NextResponse.json({ success: true, results: [] })

    const { data: avaliacoes, error: avaliacoesError } = await supabase
      .from('avaliacoes')
      .select(
        `
        male_profile_id,
        comportamento,
        seguranca_emocional,
        respeito,
        carater,
        confianca,
        flags_positive,
        flags_negative,
        publica
      `
      )
      .eq('publica', true)
      .in('male_profile_id', profileIds)

    if (avaliacoesError) throw avaliacoesError

    const grouped: Record<string, any[]> = {}

    for (const a of avaliacoes ?? []) {
      if (!grouped[a.male_profile_id])
        grouped[a.male_profile_id] = []
      grouped[a.male_profile_id].push(a)
    }

    const GLOBAL_MEAN = 3.5
    const MIN_VOTES = 5

    const results = filtrados.map((profile: any) => {
      const related = grouped[profile.id] ?? []
      const total = related.length

      if (!total)
        return {
          id: profile.id,
          nome: profile.display_name,
          cidade: profile.city,
          total_avaliacoes: 0,
          media_geral: 0,
          confiabilidade_percentual: 0,
          flags_positive: [],
          flags_negative: [],
        }

      const medias = related.map((a: any) =>
        (
          a.comportamento +
          a.seguranca_emocional +
          a.respeito +
          a.carater +
          a.confianca
        ) / 5
      )

      const mediaSimples =
        medias.reduce((acc: number, m: number) => acc + m, 0) / total

      // 🔥 SCORE BAYESIANO
      const score =
        (total / (total + MIN_VOTES)) * mediaSimples +
        (MIN_VOTES / (total + MIN_VOTES)) * GLOBAL_MEAN

      // 🔥 Confiabilidade real
      const confiabilidade = Math.min(
        100,
        Math.round((total / 10) * 100)
      )

      const flagsPositive = new Set<string>()
      const flagsNegative = new Set<string>()

      related.forEach((a: any) => {
        a.flags_positive?.forEach((f: string) =>
          flagsPositive.add(f)
        )
        a.flags_negative?.forEach((f: string) =>
          flagsNegative.add(f)
        )
      })

      return {
        id: profile.id,
        nome: profile.display_name,
        cidade: profile.city,
        total_avaliacoes: total,
        media_geral: Number(score.toFixed(2)),
        confiabilidade_percentual: confiabilidade,
        flags_positive: Array.from(flagsPositive),
        flags_negative: Array.from(flagsNegative),
      }
    })

    // 🔥 Ordenação final enterprise
    results.sort((a, b) => b.media_geral - a.media_geral)

    return NextResponse.json({ success: true, results })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    )
  }
}
