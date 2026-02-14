import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'

function normalize(value: string | null) {
  return (value ?? '').trim().toLowerCase()
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const termo = normalize(searchParams.get('termo'))

    if (!termo) {
      return NextResponse.json(
        { success: false, message: 'Informe um termo para busca' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdminClient()

    if (!supabase) {
      return NextResponse.json(
        { success: false, message: 'Supabase admin não configurado' },
        { status: 500 }
      )
    }

    // 🔎 Busca simples sem unaccent (não quebra nada)
    const { data: profiles, error } = await supabase
      .from('male_profiles')
      .select('id, display_name, city')
      .eq('is_active', true)
      .or(`display_name.ilike.%${termo}%,city.ilike.%${termo}%`)
      .limit(20)

    if (error) {
      console.error(error)
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      )
    }

    const profileIds = (profiles ?? []).map((p) => p.id)

    const { data: avaliacoes } = await supabase
      .from('avaliacoes')
      .select(`
        male_profile_id,
        comportamento,
        seguranca_emocional,
        respeito,
        carater,
        confianca,
        flags_positive,
        flags_negative,
        publica
      `)
      .eq('publica', true)
      .in('male_profile_id', profileIds.length ? profileIds : ['00000000-0000-0000-0000-000000000000'])

    const grouped: Record<string, any[]> = {}

    ;(avaliacoes ?? []).forEach((a) => {
      const id = String(a.male_profile_id)
      if (!grouped[id]) grouped[id] = []
      grouped[id].push(a)
    })

    const results = (profiles ?? []).map((profile) => {
      const related = grouped[String(profile.id)] ?? []

      const total = related.length

      const soma = related.reduce((acc, a) => {
        const media =
          (Number(a.comportamento ?? 0) +
            Number(a.seguranca_emocional ?? 0) +
            Number(a.respeito ?? 0) +
            Number(a.carater ?? 0) +
            Number(a.confianca ?? 0)) / 5

        return acc + media
      }, 0)

      const flagsPositive = new Set<string>()
      const flagsNegative = new Set<string>()

      related.forEach((a) => {
        a.flags_positive?.forEach((f: string) => flagsPositive.add(f))
        a.flags_negative?.forEach((f: string) => flagsNegative.add(f))
      })

      return {
        id: profile.id,
        nome: profile.display_name,
        cidade: profile.city,
        total_avaliacoes: total,
        media_geral: total ? Number((soma / total).toFixed(1)) : 0,
        flags_positive: Array.from(flagsPositive),
        flags_negative: Array.from(flagsNegative),
      }
    })

    return NextResponse.json({
      success: true,
      results,
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { success: false, message: 'Erro interno' },
      { status: 500 }
    )
  }
}
