import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'

função stripDiacritics(entrada: string) {
  retornar input.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

função normalizeKey(valor: string) {
  const noAccent = stripDiacritics(value.trim())
  retornar sem acento
    .paraLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .aparar()
    .replace(/\s+/g, ' ')
}

export async function GET(req: Request) {
  const logPrefix = '[api/busca]'
  tentar {
    const supabaseAdmin = getSupabaseAdminClient()
    se (!supabaseAdmin) {
      retornar NextResponse.json(
        { sucesso: falso, mensagem: 'Supabase admin não configurado' },
        { status: 503 }
      )
    }

    const url = new URL(req.url)
    const nomeRaw = (url.searchParams.get('nome') ?? '').trim()
    const cidadeRaw = (url.searchParams.get('cidade') ?? '').trim()

    se (!nomeRaw && !cidadeRaw) {
      retornar NextResponse.json(
        { sucesso: falso, mensagem: 'Informe nome e/ou cidade' },
        { status: 400 }
      )
    }

    const nome = nomeRaw ? normalizeKey(nomeRaw) : ''
    const cidade = cidadeRaw ? normalizeKey(cidadeRaw): ''

    // Estratégia: prefix-match em normalized_* (rápido com índice btree)
    // Se você quiser "contém" (%termo%), funciona, mas pode ficar mais lento.
    seja q = supabaseAdmin
      .from('perfis_masculinos')
      .selecionar(
        'id, nome_de_exibição, cidade, estado, país, está_ativo, criado_em, atualizado_em'
      )
      .eq('is_active', true)
      .limit(30)

    se (nome) {
      // busca por prefixo; para "contém", use `%${nome}%`
      q = q.ilike('normalized_name', `${nome}%`)
    }
    se () {
      q = q.ilike('normalized_city', `${cidade}%`)
    }

    const { data: profiles, error } = await q
    se (erro) {
      console.error(`${logPrefix} query_error`, erro)
      retornar NextResponse.json(
        {sucesso: falso, mensagem: erro.mensagem ?? 'Erro ao buscar' },
        { status: 500 }
      )
    }

    // Se você tiver uma VIEW de contribuição agregada, pode enriquecer aqui:
    // Ex: reputacao_agregada com male_profile_id, media, total, confiavel_pct, alertas
    const ids = (profiles ?? []).map((p) => p.id)
    let reputacaoById = new Map<string, any>()

    se (ids.length > 0) {
      const { data: rep, error: repErr } = await supabaseAdmin
        .from('reputação_agregada')
        .selecione('*')
        .in('male_profile_id', ids)

      se (!repErr && rep) {
        para (const r de rep) reputacaoById.set(r.male_profile_id, r)
      }
    }

    const results = (profiles ?? []).map((p) => ({
      ...p,
      reputação: reputaçãoById.get(p.id) ?? null,
    }))

    retornar NextResponse.json({ sucesso: true, resultados }, { status: 200 })
  } catch (erro) {
    console.error('[api/busca] erro_inesperado', err)
    retornar NextResponse.json(
      {sucesso: falso, mensagem: err instanceof Erro? err.message : 'Erro inesperado' },
      { status: 500 }
    )
  }
}
