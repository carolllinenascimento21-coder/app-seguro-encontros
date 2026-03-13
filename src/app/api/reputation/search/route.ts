import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'

const MAX_TERM_LENGTH = 80
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX_REQUESTS = 20

type SearchRateState = {
  count: number
  resetAt: number
}

const rateLimitStore = new Map<string, SearchRateState>()

function isRateLimited(key: string) {
  const now = Date.now()
  const current = rateLimitStore.get(key)

  if (!current || now > current.resetAt) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    })
    return false
  }

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true
  }

  current.count += 1
  rateLimitStore.set(key, current)
  return false
}

function normalize(value: string | null) {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export async function GET(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: 'Não autorizada' },
        { status: 401 }
      )
    }

    if (isRateLimited(user.id)) {
      return NextResponse.json(
        { success: false, message: 'Muitas consultas. Tente novamente em instantes.' },
        { status: 429 }
      )
    }

    const { searchParams } = new URL(req.url)
    const nomeRaw = searchParams.get('nome')
    const cidadeRaw = searchParams.get('cidade')

    if ((nomeRaw?.length ?? 0) > MAX_TERM_LENGTH || (cidadeRaw?.length ?? 0) > MAX_TERM_LENGTH) {
      return NextResponse.json(
        { success: false, message: 'Termo de busca muito longo' },
        { status: 400 }
      )
    }

    const nome = normalize(nomeRaw)
    const cidade = normalize(cidadeRaw)

    if (!nome && !cidade) {
      return NextResponse.json(
        { success: false, message: 'Informe um termo para busca' },
        { status: 400 }
      )
    }

    const supabaseAdmin = getSupabaseAdminClient()

    let query = supabaseAdmin
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
