import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const nome = searchParams.get('nome')
    const cidade = searchParams.get('cidade')

    if (!nome && !cidade) {
      return NextResponse.json(
        { error: 'Informe nome ou cidade para buscar' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdminClient()

    let query = supabase
      .from('avaliacoes')
      .select(`
        nome,
        cidade,
        comportamento,
        seguranca_emocional,
        respeito,
        carater,
        confianca,
        flags_positive,
        flags_negative
      `)
      .eq('publica', true)

    if (nome) {
      query = query.ilike('nome', `%${nome}%`)
    }

    if (cidade) {
      query = query.ilike('cidade', `%${cidade}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error(error)
      return NextResponse.json(
        { error: 'Erro ao buscar reputação' },
        { status: 500 }
      )
    }

    // 🔥 AGREGAÇÃO EM MEMÓRIA (segura e simples)
    const mapa = new Map<string, any>()

    for (const a of data ?? []) {
      const key = `${a.nome}-${a.cidade ?? ''}`

      if (!mapa.has(key)) {
        mapa.set(key, {
          nome: a.nome,
          cidade: a.cidade,
          total_avaliacoes: 0,
          soma: 0,
          flags_positive: new Set<string>(),
          flags_negative: new Set<string>(),
        })
      }

      const item = mapa.get(key)
      item.total_avaliacoes += 1
      item.soma +=
        (a.comportamento +
          a.seguranca_emocional +
          a.respeito +
          a.carater +
          a.confianca) / 5

      a.flags_positive?.forEach((f: string) => item.flags_positive.add(f))
      a.flags_negative?.forEach((f: string) => item.flags_negative.add(f))
    }

    const results = Array.from(mapa.values()).map(r => ({
      nome: r.nome,
      cidade: r.cidade,
      total_avaliacoes: r.total_avaliacoes,
      media_geral: Number((r.soma / r.total_avaliacoes).toFixed(1)),
      flags_positive: Array.from(r.flags_positive),
      flags_negative: Array.from(r.flags_negative),
    }))

    return NextResponse.json({ results })
  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { error: 'Erro interno' },
      { status: 500 }
    )
  }
}
