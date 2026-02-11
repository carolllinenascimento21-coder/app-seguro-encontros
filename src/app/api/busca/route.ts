import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'

function stripDiacritics(input: string) {
  return input.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function normalizeKey(value: string) {
  const noAccent = stripDiacritics(value.trim())
  return noAccent
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

export async function GET(req: Request) {
  const logPrefix = '[api/busca]'
  try {
    const supabaseAdmin = getSupabaseAdminClient()
    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, message: 'Supabase admin não configurado' },
        { status: 503 }
      )
    }

    const url = new URL(req.url)
    const nomeRaw = (url.searchParams.get('nome') ?? '').trim()
    const cidadeRaw = (url.searchParams.get('cidade') ?? '').trim()

    if (!nomeRaw && !cidadeRaw) {
      return NextResponse.json(
        { success: false, message: 'Informe nome e/ou cidade' },
        { status: 400 }
      )
    }

    const nome = nomeRaw ? normalizeKey(nomeRaw) : ''
    const cidade = cidadeRaw ? normalizeKey(cidadeRaw) : ''

    // Estratégia: prefix-match em normalized_* (rápido com índice btree)
    // Se você quiser "contains" (%termo%), funciona, mas pode ficar mais lento.
    let q = supabaseAdmin
      .from('male_profiles')
      .select(
        'id, display_name, city, state, country, is_active, created_at, updated_at'
      )
      .eq('is_active', true)
      .limit(30)

    if (nome) {
      // busca por prefixo; para "contains", use `%${nome}%`
      q = q.ilike('normalized_name', `${nome}%`)
    }
    if (cidade) {
      q = q.ilike('normalized_city', `${cidade}%`)
    }

    const { data: profiles, error } = await q
    if (error) {
      console.error(`${logPrefix} query_error`, error)
      return NextResponse.json(
        { success: false, message: error.message ?? 'Erro ao buscar' },
        { status: 500 }
      )
    }

    // Se você tiver uma VIEW de reputação agregada, pode enriquecer aqui:
    // Ex: reputacao_agregada com male_profile_id, media, total, confiavel_pct, alertas
    const ids = (profiles ?? []).map((p) => p.id)
    let reputacaoById = new Map<string, any>()

    if (ids.length > 0) {
      const { data: rep, error: repErr } = await supabaseAdmin
        .from('reputacao_agregada')
        .select('*')
        .in('male_profile_id', ids)

      if (!repErr && rep) {
        for (const r of rep) reputacaoById.set(r.male_profile_id, r)
      }
    }

    const results = (profiles ?? []).map((p) => ({
      ...p,
      reputacao: reputacaoById.get(p.id) ?? null,
    }))

    return NextResponse.json({ success: true, results }, { status: 200 })
  } catch (err) {
    console.error('[api/busca] unexpected_error', err)
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : 'Erro inesperado' },
      { status: 500 }
    )
  }
}
