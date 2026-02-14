import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'

function normalize(value: string | null) {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const termoRaw = searchParams.get('termo')
    const termo = normalize(termoRaw)

    if (!termo) {
      return NextResponse.json(
        { success: false, message: 'Informe um termo para busca' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdminClient()

    const { data: profiles, error } = await supabase
      .from('male_profiles')
      .select('id, display_name, city')
      .eq('is_active', true)
      .or(
        `normalized_name.ilike.%${termo}%,normalized_city.ilike.%${termo}%`
      )
      .limit(30)

    if (error) throw error

    const ids = profiles?.map((p) => p.id) ?? []

    const { data: avaliacoes } = await supabase
      .from('avaliacoes')
      .select('*')
      .eq('publica', true)
      .in('male_profile_id', ids.length ? ids : ['00000000-0000'])

    const grouped: Record<string, any[]> = {}

    avaliacoes?.forEach((a) => {
      if (!grouped[a.male_profile_id]) {
        grouped[a.male_profile_id] = []
      }
      grouped[a.male_profile_id].push(a)
    })

    const results = profiles?.map((profile) => {
      const list = grouped[profile.id] ?? []
      const total = list.length

      let somaMedia = 0
      let somaComportamento = 0
      let somaSeguranca = 0
      let somaRespeito = 0
      let somaCarater = 0
      let somaConfianca = 0

      let redFlags = 0

      list.forEach((a) => {
        somaComportamento += a.comportamento ?? 0
        somaSeguranca += a.seguranca_emocional ?? 0
        somaRespeito += a.respeito ?? 0
        somaCarater += a.carater ?? 0
        somaConfianca += a.confianca ?? 0

        redFlags += a.flags_negative?.length ?? 0
      })

      const mediaGeral =
        total > 0
          ? (
              (somaComportamento +
                somaSeguranca +
                somaRespeito +
                somaCarater +
                somaConfianca) /
              (5 * total)
            )
          : 0

      // SCORE enterprise
      const score =
        total > 0
          ? mediaGeral * Math.log(total + 1) - redFlags * 0.1
          : 0

      return {
        id: profile.id,
        nome: profile.display_name,
        cidade: profile.city,
        total_avaliacoes: total,
        media_geral: Number(mediaGeral.toFixed(1)),
        score: Number(score.toFixed(4)),

        percentuais: {
          comportamento:
            total > 0
              ? Number(((somaComportamento / (5 * total)) * 100).toFixed(0))
              : 0,
          seguranca:
            total > 0
              ? Number(((somaSeguranca / (5 * total)) * 100).toFixed(0))
              : 0,
          respeito:
            total > 0
              ? Number(((somaRespeito / (5 * total)) * 100).toFixed(0))
              : 0,
          carater:
            total > 0
              ? Number(((somaCarater / (5 * total)) * 100).toFixed(0))
              : 0,
          confianca:
            total > 0
              ? Number(((somaConfianca / (5 * total)) * 100).toFixed(0))
              : 0,
        },
      }
    })

    const ordenado = results?.sort((a, b) => b.score - a.score)

    return NextResponse.json({ success: true, results: ordenado })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    )
  }
}
