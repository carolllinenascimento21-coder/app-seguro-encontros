import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

type JsonObject = Record<string, unknown>

type SupabaseLike = ReturnType<typeof createRouteHandlerClient>

const MISSING_COLUMN_PATTERNS = [
  /could not find the ['"]?([a-zA-Z0-9_]+)['"]? column/i,
  /column ['"]?([a-zA-Z0-9_]+)['"]? .* does not exist/i,
]

const GENERATED_COLUMN_PATTERNS = [
  /column ['"]?([a-zA-Z0-9_]+)['"]? .*generated always/i,
]

function normalize(text: string) {
  return text
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

const getString = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

const getStringArray = (value: unknown) => {
  if (!Array.isArray(value)) return [] as string[]

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
}

const parseColumnFromError = (message: string, patterns: RegExp[]) => {
  for (const pattern of patterns) {
    const match = pattern.exec(message)
    const column = match?.[1]
    if (column) return column
  }
  return null
}

const isMissingColumnError = (message: string) => {
  return MISSING_COLUMN_PATTERNS.some((pattern) => pattern.test(message))
}

async function insertWithSchemaFallback(
  supabase: SupabaseLike,
  table: 'male_profiles' | 'avaliacoes',
  initialPayload: JsonObject,
  selectColumns: string
) {
  const payload: JsonObject = { ...initialPayload }
  const maxAttempts = Math.max(Object.keys(payload).length + 1, 4)

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const { data, error } = await supabase.from(table).insert(payload).select(selectColumns).single()

    if (!error) {
      return { data, error: null }
    }

    const message = error.message ?? ''
    const generatedColumn = parseColumnFromError(message, GENERATED_COLUMN_PATTERNS)

    if (generatedColumn && generatedColumn in payload) {
      delete payload[generatedColumn]
      continue
    }

    if (isMissingColumnError(message)) {
      const missingColumn = parseColumnFromError(message, MISSING_COLUMN_PATTERNS)

      if (missingColumn && missingColumn in payload) {
        delete payload[missingColumn]
        continue
      }
    }

    return { data: null, error }
  }

  return {
    data: null,
    error: {
      message: `Não foi possível inserir em ${table} após ajustes automáticos de schema.`,
    },
  }
}

async function findMaleProfileId(
  supabase: SupabaseLike,
  params: { nome: string; cidade: string }
): Promise<string | null> {
  const nome = params.nome.trim()
  const cidade = params.cidade.trim()

  if (!nome) return null

  const cityStrategies = cidade
    ? [
        { nameColumn: 'display_name', includeCity: true },
        { nameColumn: 'nome', includeCity: true },
      ]
    : []

  const nameOnlyStrategies = [
    { nameColumn: 'display_name', includeCity: false },
    { nameColumn: 'nome', includeCity: false },
  ]

  const strategies = [...cityStrategies, ...nameOnlyStrategies]

  for (const strategy of strategies) {
    let query = supabase.from('male_profiles').select('id').ilike(strategy.nameColumn, nome)

    if (strategy.includeCity) {
      query = query.ilike('cidade', cidade)
    }

    const { data, error } = await query.limit(1).maybeSingle()

    if (error) {
      if (isMissingColumnError(error.message ?? '')) {
        continue
      }

      throw error
    }

    if (data?.id) return data.id as string
  }

  return null
}

async function createMaleProfile(
  supabase: SupabaseLike,
  params: {
    nome: string
    cidade: string
    normalizedName: string
    normalizedCity: string
    userId: string
  }
): Promise<string> {
  const payload: JsonObject = {
    display_name: params.nome,
    nome: params.nome,
    cidade: params.cidade || null,
    normalized_name: params.normalizedName,
    normalized_city: params.normalizedCity,
    created_by: params.userId,
    author_id: params.userId,
    autor_id: params.userId,
    autora_id: params.userId,
  }

  const { data, error } = await insertWithSchemaFallback(supabase, 'male_profiles', payload, 'id')

  if (error || !data?.id) {
    throw new Error(error?.message ?? 'Erro ao criar perfil masculino.')
  }

  return data.id as string
}

async function createAvaliacao(
  supabase: SupabaseLike,
  params: {
    maleProfileId: string
    userId: string
    contato: string
    relato: string
    anonimo: boolean
    comportamento: number
    segurancaEmocional: number
    respeito: number
    carater: number
    confianca: number
    flagsPositive: string[]
    flagsNegative: string[]
  }
) {
  const payload: JsonObject = {
    male_profile_id: params.maleProfileId,
    contato: params.contato || null,
    relato: params.relato || null,
    anonimo: params.anonimo,
    comportamento: params.comportamento,
    seguranca_emocional: params.segurancaEmocional,
    respeito: params.respeito,
    carater: params.carater,
    confianca: params.confianca,
    flags_positive: params.flagsPositive,
    flags_negative: params.flagsNegative,
    author_id: params.userId,
    autor_id: params.userId,
    autora_id: params.userId,
    created_by: params.userId,
  }

  return insertWithSchemaFallback(supabase, 'avaliacoes', payload, 'id')
}

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Sessão expirada.' }, { status: 401 })
  }

  const user = session.user
  const body = await request.json()

  const nome = getString(body.nome ?? body.name)
  const cidade = getString(body.cidade ?? body.city)
  const contato = getString(body.contato)
  const relato = getString(body.relato)
  const anonimo = Boolean(body.anonimo)

  const flagsPositive = getStringArray(body.greenFlags ?? body.flags_positive)
  const flagsNegative = getStringArray(body.redFlags ?? body.flags_negative)

  const comportamento = Number(body.comportamento ?? body.notas?.comportamento ?? 0)
  const segurancaEmocional = Number(body.seguranca_emocional ?? body.notas?.seguranca_emocional ?? 0)
  const respeito = Number(body.respeito ?? body.notas?.respeito ?? 0)
  const carater = Number(body.carater ?? body.notas?.carater ?? 0)
  const confianca = Number(body.confianca ?? body.notas?.confianca ?? 0)

  if (!nome) {
    return NextResponse.json({ error: 'Nome é obrigatório.' }, { status: 400 })
  }

  const normalizedName = normalize(nome)
  const normalizedCity = cidade ? normalize(cidade) : ''

  try {
    let maleProfileId = await findMaleProfileId(supabase, { nome, cidade })

    if (!maleProfileId) {
      maleProfileId = await createMaleProfile(supabase, {
        nome,
        cidade,
        normalizedName,
        normalizedCity,
        userId: user.id,
      })
    }

    const { data: avaliacao, error: avaliacaoError } = await createAvaliacao(supabase, {
      maleProfileId,
      userId: user.id,
      contato,
      relato,
      anonimo,
      comportamento,
      segurancaEmocional,
      respeito,
      carater,
      confianca,
      flagsPositive,
      flagsNegative,
    })

    if (avaliacaoError || !avaliacao?.id) {
      return NextResponse.json(
        { error: avaliacaoError?.message ?? 'Erro ao criar avaliação.' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      ok: true,
      male_profile_id: maleProfileId,
      avaliacao_id: avaliacao.id,
    })
  } catch (error: any) {
    console.error('[api/avaliacoes/create] erro:', error)
    return NextResponse.json({ error: error?.message ?? 'Erro ao publicar avaliação.' }, { status: 400 })
  }
}
