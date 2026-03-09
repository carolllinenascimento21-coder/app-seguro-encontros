import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import {
  extractIdentifierInputs,
  hashIdentifier,
  normalizeIdentifierPlatform,
  SUPPORTED_IDENTIFIER_PLATFORMS,
  type SupportedIdentifierPlatform,
} from '@/lib/identifier-hash'
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'

const getString = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
const getStringArray = (value: unknown) => {
  if (!Array.isArray(value)) return [] as string[]
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
}

const normalizeNameOrCity = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()

const isMissingColumnError = (error: { code?: string; message?: string } | null | undefined, columnName: string) => {
  if (!error) return false
  if (error.code !== '42703') return false
  return (error.message ?? '').toLowerCase().includes(`column "${columnName.toLowerCase()}"`)
}

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies })
  const supabaseAdmin = getSupabaseAdminClient()

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Serviço temporariamente indisponível.' }, { status: 503 })
  }

  const {
    data: { session },
    error: authError,
  } = await supabase.auth.getSession()
  const user = session?.user ?? null

  if (authError || !user) {
    return NextResponse.json({ error: 'Sessão expirada. Faça login novamente.' }, { status: 401 })
  }

  const autoraId = user.id

  if (!autoraId) {
    throw new Error('Missing author id')
  }

  const body = await request.json()

  const displayName = getString(body.nome ?? body.name ?? body.display_name)
  const city = getString(body.cidade ?? body.city)
  const legacyContato = getString(body.contato ?? body.telefone ?? body.phone)
  const legacyContatoPlatform = getString(body.contato_platform ?? body.platform)
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

  const identifierInputs = extractIdentifierInputs(body.identifiers)

  for (const platform of SUPPORTED_IDENTIFIER_PLATFORMS) {
    const directValue = getString(body[platform])
    if (directValue) {
      identifierInputs[platform] = directValue
    }
  }

  if (legacyContato) {
    const legacyPlatform = normalizeIdentifierPlatform(legacyContatoPlatform) as SupportedIdentifierPlatform
    if (SUPPORTED_IDENTIFIER_PLATFORMS.includes(legacyPlatform)) {
      identifierInputs[legacyPlatform] = legacyContato
    } else {
      identifierInputs.outro = legacyContato
    }
  }

  const identifiersToMatch = SUPPORTED_IDENTIFIER_PLATFORMS.map((platform) => {
    const rawValue = identifierInputs[platform]
    if (!rawValue) return null

    return {
      platform,
      identifierHash: hashIdentifier(rawValue, platform),
    }
  }).filter((item): item is { platform: SupportedIdentifierPlatform; identifierHash: string } => Boolean(item))

  let maleProfileId: string | null = null

  // STEP 1 — identifier match
  for (const identifier of identifiersToMatch) {
    const existingIdentifier = await supabaseAdmin
      .from('profile_identifiers')
      .select('profile_id')
      .eq('platform', identifier.platform)
      .eq('identifier_hash', identifier.identifierHash)
      .maybeSingle()

    if (existingIdentifier.error) {
      console.error('[api/avaliacoes/create] Erro ao buscar identifier hash:', existingIdentifier.error)
      return NextResponse.json({ error: 'Erro ao buscar identificador do perfil avaliado.' }, { status: 400 })
    }

    if (existingIdentifier.data?.profile_id) {
      maleProfileId = existingIdentifier.data.profile_id
      break
    }
  }

  // STEP 2 — name + city match (fallback)
  if (!maleProfileId) {
    const normalizedName = normalizeNameOrCity(displayName)
    const normalizedCity = normalizeNameOrCity(city)

    const lookup = await supabaseAdmin
      .from('male_profiles')
      .select('id')
      .eq('normalized_name', normalizedName)
      .eq('normalized_city', normalizedCity)
      .limit(1)
      .maybeSingle()

    if (lookup.error) {
      console.error('[api/avaliacoes/create] Erro ao buscar perfil por nome/cidade:', lookup.error)
      return NextResponse.json({ error: 'Erro ao criar ou localizar perfil avaliado.' }, { status: 400 })
    }

    maleProfileId = lookup.data?.id ?? null
  }

  // STEP 3 — create profile (only if no previous match)
  if (!maleProfileId) {
    // Rate limit: max 3 new profiles per user in 24h
    const profileCount = await supabaseAdmin
      .from('male_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('created_by', user.id)
      .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    if (profileCount.error) {
      console.error('[api/avaliacoes/create] Erro ao validar limite de criação:', profileCount.error)
      return NextResponse.json({ error: 'Erro ao validar limite de criação de perfil.' }, { status: 400 })
    }

    if ((profileCount.count ?? 0) >= 3) {
      return NextResponse.json(
        { error: 'Limite diário atingido para criação de novos perfis. Tente novamente em 24h.' },
        { status: 429 }
      )
    }

    const insert = await supabaseAdmin
      .from('male_profiles')
      .insert({ display_name: displayName, city: city || null, created_by: user.id })
      .select('id')
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

  if (maleProfileId && identifiersToMatch.length > 0) {
    for (const identifier of identifiersToMatch) {
      const identifierInsert = await supabaseAdmin.from('profile_identifiers').insert({
        profile_id: maleProfileId,
        platform: identifier.platform,
        identifier_hash: identifier.identifierHash,
      })

      if (identifierInsert.error && identifierInsert.error.code === '23505') {
        continue
      }

      if (identifierInsert.error) {
        console.error('[api/avaliacoes/create] Erro ao salvar identifier hash:', identifierInsert.error)
        return NextResponse.json({ error: 'Erro ao vincular identificador ao perfil avaliado.' }, { status: 400 })
      }
    }
  }

  const avaliacaoPayload: Record<string, any> = {
    male_profile_id: maleProfileId,
    autora_id: autoraId,
    contato: null,
    relato: relato || null,
    anonimo,
    is_anonymous: anonimo,
    comportamento: notas.comportamento,
    seguranca_emocional: notas.seguranca_emocional,
    respeito: notas.respeito,
    carater: notas.carater,
    confianca: notas.confianca,
    flags_positive,
    flags_negative,
    user_id: user.id,
  }

  let insertA = await supabaseAdmin.from('avaliacoes').insert(avaliacaoPayload).select('id').maybeSingle()

  if (isMissingColumnError(insertA.error, 'autora_id')) {
    const { autora_id: _ignoredAutoraId, ...payloadWithoutAutoraId } = avaliacaoPayload
    insertA = await supabaseAdmin.from('avaliacoes').insert(payloadWithoutAutoraId).select('id').maybeSingle()
  }

  if (insertA.error || !insertA.data) {
    console.error('[api/avaliacoes/create] Erro ao inserir avaliação:', insertA.error)
    return NextResponse.json(
      { error: insertA.error?.message ?? 'Erro ao publicar avaliação.' },
      { status: 400 }
    )
  }

  if (!insertA.data.id) {
    console.error('[api/avaliacoes/create] Inserção de avaliação sem id retornado:', insertA)
    return NextResponse.json(
      { error: 'Erro ao publicar avaliação (id não retornado).' },
      { status: 500 }
    )
  }

  const insertAutora = await supabaseAdmin.from('avaliacoes_autoras').insert({
    avaliacao_id: insertA.data.id,
    autora_id: autoraId,
  })

  if (insertAutora.error) {
    console.error('[api/avaliacoes/create] Erro ao vincular autora da avaliação:', insertAutora.error)
    return NextResponse.json(
      { error: insertAutora.error.message ?? 'Erro ao vincular autora da avaliação.' },
      { status: 400 }
    )
  }

  return NextResponse.json({
    ok: true,
    male_profile_id: maleProfileId,
    avaliacao_id: insertA.data.id,
  })
}
