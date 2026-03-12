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
    const nome = normalize(searchParams.get('nome'))
    const cidade = normalize(searchParams.get('cidade'))

    if (!nome && !cidade) {
      return NextResponse.json(
        { success: false, message: 'Informe um termo para busca' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdminClient()

    let query = supabase
      .from('male_profile_reputation_summary')
      .select(
        'male_profile_id, name, city, average_rating, total_reviews, positive_percentage, alert_count, classification'
      )

    if (nome) {
      query = query.ilike('name', `%${nome}%`)
    }

    if (cidade) {
      query = query.ilike('city', `%${cidade}%`)
    }

    const { data, error } = await query
      .order('average_rating', { ascending: false })
      .order('total_reviews', { ascending: false })
      .limit(30)

    if (error) throw error

    return NextResponse.json({ success: true, results: data ?? [] })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    )
  }
}
