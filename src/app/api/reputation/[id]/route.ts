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

    for (const r of reviewsList) {
      somaComportamento += r.comportamento ?? 0
      somaSeguranca += r.seguranca_emocional ?? 0
      somaRespeito += r.respeito ?? 0
      somaCarater += r.carater ?? 0
      somaConfianca += r.confianca ?? 0

      if (Array.isArray(r.flags_negative) && r.flags_negative.length > 0) {
        totalAlertas++
      }
    }

    const mediaComportamento =
      totalReviews > 0 ? somaComportamento / totalReviews : 0

    const mediaSeguranca =
      totalReviews > 0 ? somaSeguranca / totalReviews : 0

    const mediaRespeito =
      totalReviews > 0 ? somaRespeito / totalReviews : 0

    const mediaCarater =
      totalReviews > 0 ? somaCarater / totalReviews : 0

    const mediaConfianca =
      totalReviews > 0 ? somaConfianca / totalReviews : 0

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
