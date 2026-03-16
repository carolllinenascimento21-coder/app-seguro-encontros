import { NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin"

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseAdminClient()

    const maleProfileId = params.id

    if (!maleProfileId) {
      return NextResponse.json(
        { error: "male_profile_id não informado" },
        { status: 400 }
      )
    }

    const { data: reviews, error } = await supabase
      .from("avaliacoes")
      .select(`
        id,
        created_at,
        publica,
        status,
        comportamento,
        seguranca_emocional,
        respeito,
        carater,
        confianca,
        relato,
        notas,
        flags_negative,
        flags_positive
      `)
      .eq("male_profile_id", maleProfileId)

    if (error) {
      console.error("Erro ao buscar avaliações:", error)

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    const reviewsList = reviews ?? []

    let totalReviews = reviewsList.length
    let totalAlertas = 0

    let somaComportamento = 0
    let somaSeguranca = 0
    let somaRespeito = 0
    let somaCarater = 0
    let somaConfianca = 0

    let qtdComportamento = 0
    let qtdSeguranca = 0
    let qtdRespeito = 0
    let qtdCarater = 0
    let qtdConfianca = 0

    for (const r of reviewsList) {
      if (typeof r.comportamento === 'number') {
        somaComportamento += r.comportamento
        qtdComportamento += 1
      }

      if (typeof r.seguranca_emocional === 'number') {
        somaSeguranca += r.seguranca_emocional
        qtdSeguranca += 1
      }

      if (typeof r.respeito === 'number') {
        somaRespeito += r.respeito
        qtdRespeito += 1
      }

      if (typeof r.carater === 'number') {
        somaCarater += r.carater
        qtdCarater += 1
      }

      if (typeof r.confianca === 'number') {
        somaConfianca += r.confianca
        qtdConfianca += 1
      }

      if (Array.isArray(r.flags_negative) && r.flags_negative.length > 0) {
        totalAlertas++
      }
    }

    const mediaComportamento =
      qtdComportamento > 0 ? somaComportamento / qtdComportamento : 0

    const mediaSeguranca =
      qtdSeguranca > 0 ? somaSeguranca / qtdSeguranca : 0

    const mediaRespeito =
      qtdRespeito > 0 ? somaRespeito / qtdRespeito : 0

    const mediaCarater =
      qtdCarater > 0 ? somaCarater / qtdCarater : 0

    const mediaConfianca =
      qtdConfianca > 0 ? somaConfianca / qtdConfianca : 0

    const mediaGeral =
      (mediaComportamento +
        mediaSeguranca +
        mediaRespeito +
        mediaCarater +
        mediaConfianca) / 5

    return NextResponse.json({
      total_reviews: totalReviews,
      average_rating: Number(mediaGeral.toFixed(1)),
      alertas: totalAlertas,

      medias: {
        comportamento: Number(mediaComportamento.toFixed(1)),
        seguranca_emocional: Number(mediaSeguranca.toFixed(1)),
        respeito: Number(mediaRespeito.toFixed(1)),
        carater: Number(mediaCarater.toFixed(1)),
        confianca: Number(mediaConfianca.toFixed(1)),
      },

      reviews: reviewsList,
    })
  } catch (err) {
    console.error("Erro interno reputation route:", err)

    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
