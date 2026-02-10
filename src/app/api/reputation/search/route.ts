import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'

function normalizeTerm(value: string | null) {
  return (value ?? '').trim().toLowerCase()
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const termo = normalizeTerm(searchParams.get('termo'))

    if (!termo) {
      return NextResponse.json(
        { success: false, message: 'Informe nome ou cidade para buscar' },
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

    const searchFilter = [
      `normalized_name.ilike.%${termo}%`,
      `normalized_city.ilike.%${termo}%`,
      `display_name.ilike.%${termo}%`,
      `city.ilike.%${termo}%`,
    ].join(',')

    const { data: maleProfiles, error } = await supabase
      .from('male_profiles')
      .select('id, display_name, city')
      .eq('is_active', true)
      .or(searchFilter)
      .limit(20)

    if (error) {
      console.error(error)
      return NextResponse.json(
        { success: false, message: `Erro ao buscar reputação: ${error.message}` },
        { status: 500 }
      )
    }

    const profileIds = (maleProfiles ?? []).map((profile) => profile.id)

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
      .in('male_profile_id', profileIds.length ? profileIds : [-1])

    if (avaliacoesError) {
      console.error(avaliacoesError)
      return NextResponse.json(
        { success: false, message: `Erro ao buscar avaliações: ${avaliacoesError.message}` },
        { status: 500 }
      )
    }

    const grouped = (avaliacoes ?? []).reduce((acc: Record<string, any[]>, item: any) => {
      const id = String(item.male_profile_id)
      if (!acc[id]) acc[id] = []
      acc[id].push(item)
      return acc
    }, {})

    const results = (maleProfiles ?? []).map((profile: any) => {
      const related = grouped[String(profile.id)] ?? []
      const totalAvaliacoes = related.length
      const soma = related.reduce((acc: number, a: any) => {
        const media =
          (Number(a.comportamento ?? 0) +
            Number(a.seguranca_emocional ?? 0) +
            Number(a.respeito ?? 0) +
            Number(a.carater ?? 0) +
            Number(a.confianca ?? 0)) /
          5
        return acc + media
      }, 0)
      const flagsPositive = new Set<string>()
      const flagsNegative = new Set<string>()
      related.forEach((a: any) => {
        a.flags_positive?.forEach((f: string) => flagsPositive.add(f))
        a.flags_negative?.forEach((f: string) => flagsNegative.add(f))
      })

      return {
        id: profile.id,
        nome: profile.display_name,
        cidade: profile.city,
        total_avaliacoes: totalAvaliacoes,
        media_geral: totalAvaliacoes > 0 ? Number((soma / totalAvaliacoes).toFixed(1)) : 0,
        flags_positive: Array.from(flagsPositive),
        flags_negative: Array.from(flagsNegative),
      }
    })

    return NextResponse.json({ success: true, results })
  } catch (err) {
    console.error(err)
    return NextResponse.json(
      {
        success: false,
        message: err instanceof Error ? err.message : 'Erro interno',
      },
      { status: 500 }
    )
  }
}
