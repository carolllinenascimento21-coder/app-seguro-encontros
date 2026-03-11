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


const parseRating = (value: unknown) => {
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  if (!Number.isInteger(n)) return null
  if (n < 1 || n > 5) return null
  return n
}

const normalizeNameOrCity = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()

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

  if (error.code === '23502') {
    const column = extractNotNullColumn(error)
    const suffix = column ? ` (coluna obrigatória: ${column})` : ''
    return { status: 400, message: `Falha ao salvar: campo obrigatório ausente${suffix}.` }
  }

  if (error.code === '23503') {
    return { status: 400, message: 'Referência inválida ao salvar avaliação.' }
  }

  if (error.code === '23505') {
    return { status: 409, message: 'Registro duplicado detectado.' }
  }

  return { status: defaultStatus, message: fallbackMessage }
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID()

  const supabase = createRouteHandlerClient({ cookies })
  const supabaseAdmin = getSupabaseAdminClient()

  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Serviço temporariamente indisponível.' },
      { status: 503 }
    )
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user?.id) {
    safeLogError('Usuário não autenticado', authError, { requestId })
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = user.id
  const autoraId = userId

  let body: any

  try {
    body = await request.json()
  } catch (error) {
    safeLogError('Body inválido', error, { requestId })
    return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 })
  }

  const displayName = getString(body.nome ?? body.name)
  const city = getString(body.cidade ?? body.city)
  const relato = getString(body.relato)
  const anonimo = Boolean(body.anonimo)

  if (!displayName) {
    return NextResponse.json(
      { error: 'Informe o nome do perfil avaliado.' },
      { status: 400 }
    )
  }

  const flags_positive = getStringArray(body.flags_positive ?? body.greenFlags)
  const flags_negative = getStringArray(body.flags_negative ?? body.redFlags)

  const notas = {
    comportamento: parseRating(body?.notas?.comportamento ?? body.comportamento),
    seguranca_emocional: parseRating(body?.notas?.seguranca_emocional ?? body.seguranca_emocional),
    respeito: parseRating(body?.notas?.respeito ?? body.respeito),
    carater: parseRating(body?.notas?.carater ?? body.carater),
    confianca: parseRating(body?.notas?.confianca ?? body.confianca),
  }

  if (Object.values(notas).some((nota) => nota === null)) {
    return NextResponse.json(
      {
        error:
          'As notas comportamento, seguranca_emocional, respeito, carater e confianca devem ser inteiros entre 1 e 5.',
      },
      { status: 400 }
    )
  }

  const identifierInputs = extractIdentifierInputs(body.identifiers)
  const identifierRecords = SUPPORTED_IDENTIFIER_PLATFORMS.reduce<
    Array<{ platform: SupportedIdentifierPlatform; identifier_hash: string }>
  >((acc, platform) => {
    const rawIdentifier = identifierInputs[platform]
    if (!rawIdentifier) return acc

    const normalizedPlatform = normalizeIdentifierPlatform(platform)
    if (!SUPPORTED_IDENTIFIER_PLATFORMS.includes(normalizedPlatform as SupportedIdentifierPlatform)) {
      return acc
    }

    const identifierHash = hashIdentifier(rawIdentifier, normalizedPlatform)

    if (!identifierHash) return acc

    acc.push({
      platform: normalizedPlatform as SupportedIdentifierPlatform,
      identifier_hash: identifierHash,
    })

    return acc
  }, [])

  let maleProfileId: string | null = null

  for (const identifierRecord of identifierRecords) {
    const lookupByIdentifier = await supabaseAdmin
      .from('profile_identifiers')
      .select('male_profile_id')
      .eq('identifier_hash', identifierRecord.identifier_hash)
      .limit(1)
      .maybeSingle()

    if (lookupByIdentifier.error) {
      safeLogError('Erro ao buscar profile_identifiers', lookupByIdentifier.error, {
        requestId,
        platform: identifierRecord.platform,
      })
      return NextResponse.json({ error: 'Erro ao localizar perfil.' }, { status: 400 })
    }

    if (lookupByIdentifier.data?.male_profile_id) {
      maleProfileId = lookupByIdentifier.data.male_profile_id
      break
    }
  }

  const normalizedName = normalizeNameOrCity(displayName)
  const normalizedCity = normalizeNameOrCity(city)

  if (!maleProfileId) {
    const lookup = await supabaseAdmin
      .from('male_profiles')
      .select('id')
      .eq('normalized_name', normalizedName)
      .eq('normalized_city', normalizedCity)
      .limit(1)
      .maybeSingle()

    if (lookup.error) {
      safeLogError('Erro ao buscar male_profile', lookup.error, { requestId })
      return NextResponse.json({ error: 'Erro ao localizar perfil.' }, { status: 400 })
    }

    maleProfileId = lookup.data?.id ?? null
  }

  if (!maleProfileId) {
    const insertProfile = await supabaseAdmin
      .from('male_profiles')
      .insert({
        display_name: displayName,
        city: city || null,
        created_by: autoraId,
      })
      .select('id')
      .single()

    if (insertProfile.error || !insertProfile.data) {
      safeLogError('Erro ao criar male_profile', insertProfile.error, { requestId })
      const mapped = toClientError(insertProfile.error, 'Erro ao criar perfil.')
      return NextResponse.json({ error: mapped.message }, { status: mapped.status })
    }

    maleProfileId = insertProfile.data.id
  }

  if (identifierRecords.length > 0) {
    const uniqueIdentifierRecords = Array.from(
      new Map(
        identifierRecords.map((item) => [
          `${item.platform}:${item.identifier_hash}`,
          {
            male_profile_id: maleProfileId,
            platform: item.platform,
            identifier_hash: item.identifier_hash,
          },
        ])
      ).values()
    )

    const upsertIdentifiers = await supabaseAdmin
      .from('profile_identifiers')
      .upsert(uniqueIdentifierRecords, {
        onConflict: 'platform,identifier_hash',
        ignoreDuplicates: true,
      })

    if (upsertIdentifiers.error) {
      safeLogError('Erro ao salvar profile_identifiers', upsertIdentifiers.error, { requestId })
      const mapped = toClientError(upsertIdentifiers.error, 'Erro ao salvar identificadores.')
      return NextResponse.json({ error: mapped.message }, { status: mapped.status })
    }
  }

  const { data, error: rpcError } = await supabase.rpc(
    'create_avaliacao_transaction',
    {
      p_male_profile_id: maleProfileId,
      p_user_id: userId,
      p_relato: relato,
      p_anonimo: anonimo,
      p_comportamento: notas.comportamento,
      p_seguranca_emocional: notas.seguranca_emocional,
      p_respeito: notas.respeito,
      p_carater: notas.carater,
      p_confianca: notas.confianca,
      p_flags_positive: flags_positive ?? [],
      p_flags_negative: flags_negative ?? [],
    }
  )

  if (rpcError) {
    safeLogError('Erro ao criar avaliação via RPC', rpcError, { requestId })

    const mapped = toClientError(rpcError, 'Erro ao publicar avaliação.')
    return NextResponse.json({ error: mapped.message }, { status: mapped.status })
  }

  return NextResponse.json({ success: true, avaliacao_id: data })
}
