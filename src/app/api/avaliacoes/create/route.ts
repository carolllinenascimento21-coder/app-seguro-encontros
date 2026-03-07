import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { hashIdentifier, normalizeIdentifierPlatform } from '@/lib/identifier-hash'

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
  const contatoPlatform = getString(body.contato_platform ?? body.platform)
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
  const normalizedPlatform = normalizeIdentifierPlatform(contatoPlatform)
  const hasContatoIdentifier = Boolean(contato)
  const identifierHash = hasContatoIdentifier
    ? hashIdentifier(contato, normalizedPlatform)
    : null

  if (identifierHash) {
    const existingIdentifier = await supabase
      .from('profile_identifiers')
      .select('profile_id')
      .eq('platform', normalizedPlatform)
      .eq('identifier_hash', identifierHash)
      .maybeSingle()

    if (existingIdentifier.error) {
      console.error('[api/avaliacoes/create] Erro ao buscar identifier hash:', existingIdentifier.error)
      return NextResponse.json(
        { error: 'Erro ao buscar identificador do perfil avaliado.' },
        { status: 400 }
      )
    }

    maleProfileId = existingIdentifier.data?.profile_id ?? null
  }

  if (!maleProfileId) {
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
  }

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

  if (identifierHash && maleProfileId) {
    const identifierUpsert = await supabase
      .from('profile_identifiers')
      .insert({
        profile_id: maleProfileId,
        platform: normalizedPlatform,
        identifier_hash: identifierHash,
      })

    if (identifierUpsert.error && identifierUpsert.error.code === '23505') {
      const existingIdentifier = await supabase
        .from('profile_identifiers')
        .select('profile_id')
        .eq('platform', normalizedPlatform)
        .eq('identifier_hash', identifierHash)
        .maybeSingle()

      if (existingIdentifier.error) {
        console.error(
          '[api/avaliacoes/create] Erro ao resolver identifier hash duplicado:',
          existingIdentifier.error
        )
        return NextResponse.json(
          { error: 'Erro ao resolver identificador existente do perfil avaliado.' },
          { status: 400 }
        )
      }

      if (existingIdentifier.data?.profile_id) {
        maleProfileId = existingIdentifier.data.profile_id
      }
    } else if (identifierUpsert.error) {
      console.error('[api/avaliacoes/create] Erro ao salvar identifier hash:', identifierUpsert.error)
      return NextResponse.json(
        { error: 'Erro ao vincular identificador ao perfil avaliado.' },
        { status: 400 }
      )
    }
  }

  const avaliacaoPayload: Record<string, any> = {
    male_profile_id: maleProfileId,
    contato: null,
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
