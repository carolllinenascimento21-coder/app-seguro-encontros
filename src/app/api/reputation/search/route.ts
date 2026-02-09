import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const nome = searchParams.get('nome')
    const cidade = searchParams.get('cidade')
    const nomeNormalizado = nome?.trim().toLowerCase() ?? ''
    const cidadeNormalizada = cidade?.trim().toLowerCase() ?? ''

    if (!nomeNormalizado && !cidadeNormalizada) {
      return NextResponse.json(
        { success: false, message: 'Informe nome ou cidade para buscar' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdminClient()

    let query = supabase
      .from('avaliados')
      .select(
        `
        id,
        nome,
        cidade,
        avaliacoes!inner (
          comportamento,
          seguranca_emocional,
          respeito,
          carater,
          confianca,
          flags_positive,
          flags_negative,
          publica
        )
      `
      )
      .eq('avaliacoes.publica', true)

    if (nomeNormalizado) {
      query = query.ilike('nome', `%${nomeNormalizado}%`)
    }

    if (cidadeNormalizada) {
      query = query.ilike('cidade', `%${cidadeNormalizada}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error(error)
      return NextResponse.json(
        { success: false, message: 'Erro ao buscar reputação' },
        { status: 500 }
      )
    }

    // 🔥 AGREGAÇÃO EM MEMÓRIA (segura e simples)
    const results = (data ?? []).map((avaliado: any) => {
      const avaliacoes = Array.isArray(avaliado.avaliacoes)
        ? avaliado.avaliacoes
        : []
      const totalAvaliacoes = avaliacoes.length
      const soma = avaliacoes.reduce((acc: number, a: any) => {
        const media =
          (a.comportamento +
            a.seguranca_emocional +
            a.respeito +
            a.carater +
            a.confianca) /
          5
        return acc + media
      }, 0)
      const flagsPositive = new Set<string>()
      const flagsNegative = new Set<string>()
      avaliacoes.forEach((a: any) => {
        a.flags_positive?.forEach((f: string) => flagsPositive.add(f))
        a.flags_negative?.forEach((f: string) => flagsNegative.add(f))
      })

      return {
        id: avaliado.id,
        nome: avaliado.nome,
        cidade: avaliado.cidade,
        total_avaliacoes: totalAvaliacoes,
        media_geral:
          totalAvaliacoes > 0
            ? Number((soma / totalAvaliacoes).toFixed(1))
            : 0,
        flags_positive: Array.from(flagsPositive),
        flags_negative: Array.from(flagsNegative),
      }
    })

    return NextResponse.json({ success: true, results })
  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { success: false, message: 'Erro interno' },
      { status: 500 }
    )
  }
}
