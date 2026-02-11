import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type ProfileRow = {
  id: string
  display_name: string
  city: string | null
  is_active?: boolean | null
}

type ReputacaoRow = {
  male_profile_id: string
  total_avaliacoes: number | null
  media_geral: number | null
  confiabilidade_percentual: number | null
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const nomeRaw = (searchParams.get('nome') ?? '').trim().toLowerCase()
    const cidadeRaw = (searchParams.get('cidade') ?? '').trim().toLowerCase()

    if (!nomeRaw && !cidadeRaw) {
      return NextResponse.json({ error: 'Informe nome ou cidade' }, { status: 400 })
    }

    // 1) Busca IDs em male_profiles (colunas reais: normalized_name / normalized_city)
    let q = supabase
      .from('male_profiles')
      .select('id, display_name, city, is_active')
      .eq('is_active', true)
      .limit(50)

    if (nomeRaw) q = q.ilike('normalized_name', `%${nomeRaw}%`)
    if (cidadeRaw) q = q.ilike('normalized_city', `%${cidadeRaw}%`)

    const { data: profiles, error: pErr } = await q

    if (pErr) {
      console.error('[busca] male_profiles error:', pErr)
      return NextResponse.json(
        { error: 'Erro ao consultar male_profiles', details: pErr.message },
        { status: 500 }
      )
    }

    const rows = (profiles ?? []) as ProfileRow[]
    if (rows.length === 0) {
      return NextResponse.json({ results: [] })
    }

    const ids = rows.map((r) => r.id)

    // 2) Busca reputação na view/tabela agregada (SEM join embed)
    const { data: rep, error: rErr } = await supabase
      .from('reputacao_agregada')
      .select('male_profile_id, total_avaliacoes, media_geral, confiabilidade_percentual')
      .in('male_profile_id', ids)

    if (rErr) {
      console.error('[busca] reputacao_agregada error:', rErr)
      return NextResponse.json(
        { error: 'Erro ao consultar reputacao_agregada', details: rErr.message },
        { status: 500 }
      )
    }

    const repMap = new Map<string, ReputacaoRow>()
    ;((rep ?? []) as ReputacaoRow[]).forEach((x) => repMap.set(x.male_profile_id, x))

    // 3) Merge no formato que a tela espera
    const results = rows.map((p) => {
      const agg = repMap.get(p.id)

      return {
        id: p.id,
        display_name: p.display_name,
        city: p.city,
        total_avaliacoes: agg?.total_avaliacoes ?? 0,
        media_geral: agg?.media_geral ?? 0,
        confiabilidade_percentual: agg?.confiabilidade_percentual ?? 0,
        flags_positive: null,
        flags_negative: null,
      }
    })

    return NextResponse.json({ results }, { status: 200 })
  } catch (e: any) {
    console.error('[busca] internal error:', e)
    return NextResponse.json(
      { error: 'Erro interno na busca', details: e?.message ?? String(e) },
      { status: 500 }
    )
  }
}
