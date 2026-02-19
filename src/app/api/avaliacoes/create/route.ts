import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

const getString = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
const getStringArray = (value: unknown) => {
  if (!Array.isArray(value)) return [] as string[]
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
}

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies })

  const { data: { session }, error: authError } = await supabase.auth.getSession()
  const user = session?.user ?? null

  if (authError || !user) {
    return NextResponse.json({ error: 'Sessão expirada. Faça login novamente.' }, { status: 401 })
  }

  const body = await request.json()

  const displayName = getString(body.nome ?? body.name ?? body.display_name)
  const city = getString(body.cidade ?? body.city)
  const contato = getString(body.contato ?? body.telefone ?? body.phone)
  const relato = getString(body.relato)
  const anonimo = Boolean(body.anonimo)

  const notas = {
    comportamento: Number(body?.notas?.comportamento ?? body.comportamento ?? 0),
    seguranca_emocional: Number(body?.notas?.seguranca_emocional ?? body.seguranca_emocional ?? 0),
    respeito: Number(body?.notas?.respeito ?? body.respeito ?? 0),
    carater: Number(body?.notas?.carater ?? body.carater ?? 0),
    confianca: Number(body?.notas?.confianca ?? body.confianca ?? 0),
  }

  const flags_positive = getStringArray(body.flags_positive ?? body.is_positive ?? body.greenFlags)
  const flags_negative = getStringArray(body.flags_negative ?? body.is_negative ?? body.redFlags)

  if (!displayName) {
    return NextResponse.json({ error: 'Nome é obrigatório.' }, { status: 400 })
  }

  let maleProfileId: string | null = null

  const lookup = await supabase
    .from('male_profiles')
    .select('id, display_name, city, normalized_name, normalized_city')
    .ilike('display_name', displayName)
    .eq('city', city || '')
    .maybeSingle()

  if (lookup.error) {
    console.error('[api/avaliacoes/create] Erro ao buscar perfil:', lookup.error)
    return NextResponse.json({ error: 'Erro ao criar ou localizar perfil avaliado.' }, { status: 400 })
  }

  maleProfileId = lookup.data?.id ?? null

  if (!maleProfileId) {
    let insert = await supabase
      .from('male_profiles')
      .insert({ display_name: displayName, city: city || null })
      .select('id, display_name, city, normalized_name, normalized_city')
      .single()

    if (insert.error || !insert.data) {
      console.error('[api/avaliacoes/create] Erro ao inserir male_profiles:', insert.error)
      return NextResponse.json(
        { error: insert.error?.message ?? 'Erro ao criar perfil avaliado.' },
        { status: 400 }
      )
    }

    maleProfileId = insert.data.id
  }

  const avaliacaoPayload: Record<string, any> = {
    male_profile_id: maleProfileId,
    contato: contato || null,
    relato: relato || null,
    anonimo,
    comportamento: notas.comportamento,
    seguranca_emocional: notas.seguranca_emocional,
    respeito: notas.respeito,
    carater: notas.carater,
    confianca: notas.confianca,
    flags_positive,
    flags_negative,
    user_id: user.id,
  }

  let insertA = await supabase
    .from('avaliacoes')
    .insert(avaliacaoPayload)
    .select('id')
    .single()

  if (insertA.error || !insertA.data) {
    console.error('[api/avaliacoes/create] Erro ao inserir avaliação:', insertA.error)
    return NextResponse.json(
      { error: insertA.error?.message ?? 'Erro ao publicar avaliação.' },
      { status: 400 }
    )
  }

  return NextResponse.json({
    ok: true,
    male_profile_id: maleProfileId,
    avaliacao_id: insertA.data.id,
  })
}
