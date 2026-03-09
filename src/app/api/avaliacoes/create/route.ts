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

type SupabaseErrorLike = {
  code?: string
  message?: string
  details?: string
  hint?: string
}

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

const isMissingColumnError = (error: SupabaseErrorLike | null | undefined, columnName: string) => {
  if (!error) return false
  if (error.code !== '42703') return false
  return (error.message ?? '').toLowerCase().includes(`column "${columnName.toLowerCase()}"`)
}

const isPostgresConstraintError = (error: SupabaseErrorLike | null | undefined) => {
  if (!error?.code) return false
  return ['23502', '23503', '23505', '23514', '22P02'].includes(error.code)
}

const safeLogError = (context: string, error: unknown, extras?: Record<string, unknown>) => {
  const e = (error ?? {}) as SupabaseErrorLike
  console.error(`[api/avaliacoes/create] ${context}`, {
    code: e.code,
    message: e.message,
    details: e.details,
    hint: e.hint,
    ...extras,
  })
}

const extractNotNullColumn = (error: SupabaseErrorLike | null | undefined) => {
  const source = `${error?.details ?? ''} ${error?.message ?? ''}`
  const match = source.match(/column\s+"([^"]+)"/i)
  return match?.[1] ?? null
}

const toClientError = (
  error: SupabaseErrorLike | null | undefined,
  fallbackMessage: string,
  defaultStatus = 400
) => {
  if (!error) {
    return { status: defaultStatus, message: fallbackMessage }
  }

  if (isPostgresConstraintError(error)) {
    switch (error.code) {
      case '23502': {
        const column = extractNotNullColumn(error)
        const suffix = column ? ` (coluna obrigatória: ${column})` : ''
        return { status: 400, message: `Falha ao salvar: campo obrigatório ausente${suffix}.` }
      }
      case '23503':
        return { status: 400, message: 'Referência inválida ao salvar avaliação.' }
      case '23505':
        return { status: 409, message: 'Registro duplicado detectado.' }
      case '23514':
        return { status: 400, message: 'Dados fora das regras de validação do banco.' }
      case '22P02':
        return { status: 400, message: 'Formato inválido de dados para publicação.' }
      default:
        return { status: 400, message: fallbackMessage }
    }
  }

  return { status: defaultStatus, message: fallbackMessage }
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID()
  const supabase = createRouteHandlerClient({ cookies })
  const supabaseAdmin = getSupabaseAdminClient()

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Serviço temporariamente indisponível.' }, { status: 503 })
  }

  const {
    data: { session },
    error: authError,
  } = await supabase.auth.getSession()

  if (authError) {
    safeLogError('Erro ao recuperar sessão', authError, { requestId })
    return NextResponse.json({ error: 'Sessão expirada. Faça login novamente.' }, { status: 401 })
  }

  const user = session?.user ?? null
  const autoraId = user?.id ?? null

  if (!user || !autoraId) {
    return NextResponse.json({ error: 'Sessão expirada. Faça login novamente.' }, { status: 401 })
  }

  let body: any
  try {
    body = await request.json()
  } catch (error) {
    safeLogError('Body JSON inválido', error, { requestId, userId: user?.id ?? null })
    return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 })
  }

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
    return NextResponse.json({ error: 'Preencha o nome e ao menos um identificador ou a cidade para localizar/criar o perfil.' }, { status: 400 })
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

  const hasAnyIdentifier = SUPPORTED_IDENTIFIER_PLATFORMS.some((platform) =>
    Boolean(getString(identifierInputs[platform]))
  )

  if (!city && !hasAnyIdentifier) {
    return NextResponse.json(
      { error: 'Preencha o nome e ao menos um identificador ou a cidade para localizar/criar o perfil.' },
      { status: 400 }
    )
  }

  const identifiersToMatch = SUPPORTED_IDENTIFIER_PLATFORMS.map((platform) => {
    const rawValue = identifierInputs[platform]
    if (!rawValue) return null

    return {
      platform,
      identifierHash: hashIdentifier(rawValue, platform),
    }
  }).filter((item): item is { platform: SupportedIdentifierPlatform; identifierHash: string } => Boolean(item))
  const payloadPresence = {
    nome: Boolean(displayName),
    cidade: Boolean(city),
    relato: Boolean(relato),
    anonimo,
    notas: Object.fromEntries(Object.entries(notas).map(([k, v]) => [k, Number.isFinite(v) && v > 0])),
    flags_positive: flags_positive.length,
    flags_negative: flags_negative.length,
    identifiers: Object.fromEntries(
      SUPPORTED_IDENTIFIER_PLATFORMS.map((platform) => [platform, Boolean(getString(identifierInputs[platform]))])
    ),
  }


  let maleProfileId: string | null = null

  for (const identifier of identifiersToMatch) {
    const existingIdentifier = await supabaseAdmin
      .from('profile_identifiers')
      .select('profile_id')
      .eq('platform', identifier.platform)
      .eq('identifier_hash', identifier.identifierHash)
      .maybeSingle()

    if (existingIdentifier.error) {
      safeLogError('Erro ao buscar identifier hash', existingIdentifier.error, { requestId, userId: user.id, stage: 'lookup_identifier', payloadPresence })
      return NextResponse.json({ error: 'Erro ao buscar identificador do perfil avaliado.' }, { status: 400 })
    }

    if (existingIdentifier.data?.profile_id) {
      maleProfileId = existingIdentifier.data.profile_id
      break
    }
  }

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
      safeLogError('Erro ao buscar perfil por nome/cidade', lookup.error, { requestId, userId: user.id, stage: 'lookup_male_profile', payloadPresence })
      return NextResponse.json({ error: 'Erro ao criar ou localizar perfil avaliado.' }, { status: 400 })
    }

    maleProfileId = lookup.data?.id ?? null
  }

  if (!maleProfileId) {
    const profileCount = await supabaseAdmin
      .from('male_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('created_by', user.id)
      .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    if (profileCount.error) {
      safeLogError('Erro ao validar limite de criação', profileCount.error, { requestId, userId: user.id, stage: 'rate_limit_profile_creation', payloadPresence })
      return NextResponse.json({ error: 'Erro ao validar limite de criação de perfil.' }, { status: 400 })
    }

    if ((profileCount.count ?? 0) >= 50) {
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
      safeLogError('Erro ao inserir male_profiles', insert.error, { requestId, userId: user.id, stage: 'insert_male_profile', payloadPresence })
      const mapped = toClientError(insert.error, 'Erro ao criar perfil avaliado.')
      return NextResponse.json({ error: mapped.message, requestId }, { status: mapped.status })
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
        safeLogError('Erro ao salvar identifier hash', identifierInsert.error, { requestId, userId: user.id, maleProfileId, stage: 'insert_profile_identifier', payloadPresence })
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
    safeLogError('Erro ao inserir avaliação', insertA.error, { requestId, userId: user.id, maleProfileId, stage: 'insert_avaliacao', payloadPresence })
    const mapped = toClientError(insertA.error, 'Erro ao publicar avaliação.')
    return NextResponse.json({ error: mapped.message, requestId }, { status: mapped.status })
  }

  const avaliacaoId = insertA.data?.id ?? null

  if (!avaliacaoId) {
    safeLogError('Inserção de avaliação sem id retornado', insertA.error, { requestId, userId: user.id, maleProfileId, stage: 'insert_avaliacao_missing_id', insertReturnedData: Boolean(insertA.data), payloadPresence })
    return NextResponse.json({ error: 'Erro ao publicar avaliação (id não retornado).' }, { status: 500 })
  }

  if (!autoraId) {
    safeLogError('autoraId vazio após inserção da avaliação', null, { requestId, userId: user.id, maleProfileId, avaliacaoId, stage: 'insert_avaliacao_autora_missing' })
    return NextResponse.json(
      { error: 'Avaliação criada, mas autora não pôde ser vinculada por falta de autenticação.' },
      { status: 401 }
    )
  }

  const insertAutora = await supabaseAdmin.from('avaliacoes_autoras').insert({
    avaliacao_id: avaliacaoId,
    autora_id: autoraId,
  })

  if (insertAutora.error) {
    safeLogError('Erro ao vincular autora da avaliação', insertAutora.error, { requestId, userId: user.id, maleProfileId, avaliacaoId, stage: 'insert_avaliacao_autora', payloadPresence })
    const mapped = toClientError(insertAutora.error, 'Erro ao vincular autora da avaliação.')
    return NextResponse.json({ error: mapped.message, requestId }, { status: mapped.status })
  }

  return NextResponse.json({
    ok: true,
    requestId,
    male_profile_id: maleProfileId,
    avaliacao_id: avaliacaoId,
  })
}
