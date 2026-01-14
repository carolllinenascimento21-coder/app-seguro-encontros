export type AvaliacaoRatings = {
  comportamento: number
  seguranca_emocional: number
  respeito: number
  carater: number
  confianca: number
}

export type AvaliacaoPayloadNormalizado = {
  avaliadoId: string | null
  nome: string
  descricao: string | null
  cidade: string | null
  contato: string | null
  anonimo: boolean
  ratings: AvaliacaoRatings
  greenFlags: string[]
  redFlags: string[]
}

type AvaliacaoPayloadValidationSuccess = {
  success: true
  data: AvaliacaoPayloadNormalizado
}

type AvaliacaoPayloadValidationError = {
  success: false
  status: 400
  message: string
  errors: string[]
}

type AvaliacaoPayloadValidationResult =
  | AvaliacaoPayloadValidationSuccess
  | AvaliacaoPayloadValidationError

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const normalizeString = (value: unknown) => {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

const normalizeStringArray = (
  value: unknown,
  fieldName: string,
  errors: string[]
) => {
  if (value === undefined || value === null) {
    return [] as string[]
  }

  if (!Array.isArray(value)) {
    errors.push(`Campo ${fieldName} deve ser um array.`)
    return [] as string[]
  }

  return value
    .filter((item) => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
}

const parseRating = (
  value: unknown,
  fieldName: string,
  errors: string[]
) => {
  if (value === undefined || value === null || value === '') {
    return 0
  }

  const numeric = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(numeric)) {
    errors.push(`Nota inválida para ${fieldName}.`)
    return 0
  }

  return Math.round(numeric)
}

export const validateAvaliacaoPayload = (
  payload: unknown
): AvaliacaoPayloadValidationResult => {
  const errors: string[] = []
  const body = isPlainObject(payload) ? payload : {}

  const nome = normalizeString(body.nome_avaliado ?? body.nome)
  const descricao = normalizeString(
    body.descricao ?? body.relato ?? body.comentario
  )

  const avaliadoIdRaw = body.avaliadoId ?? body.avaliado_id
  const avaliadoId =
    typeof avaliadoIdRaw === 'string'
      ? avaliadoIdRaw.trim()
      : typeof avaliadoIdRaw === 'number'
        ? String(avaliadoIdRaw)
        : null

  if (!nome) {
    errors.push('Nome é obrigatório.')
  }

  if (!avaliadoId) {
    errors.push('avaliadoId é obrigatório.')
  }

  if (!descricao) {
    errors.push('descricao é obrigatória.')
  }

  if (avaliadoIdRaw !== undefined && !avaliadoId) {
    errors.push('avaliadoId inválido.')
  }

  const ratingsInput = body.ratings
  const ratingsObject = isPlainObject(ratingsInput) ? ratingsInput : null

  if (ratingsInput !== undefined && !ratingsObject) {
    errors.push('ratings deve ser um objeto com notas numéricas.')
  }

  if (!ratingsObject) {
    const hasLegacyRatings = [
      body.comportamento,
      body.seguranca_emocional,
      body.respeito,
      body.carater,
      body.confianca,
    ].some((value) => value !== undefined)

    if (!hasLegacyRatings) {
      errors.push('ratings é obrigatório.')
    }
  }

  const ratings = {
    comportamento: parseRating(
      ratingsObject?.comportamento ?? body.comportamento,
      'comportamento',
      errors
    ),
    seguranca_emocional: parseRating(
      ratingsObject?.seguranca_emocional ?? body.seguranca_emocional,
      'seguranca_emocional',
      errors
    ),
    respeito: parseRating(
      ratingsObject?.respeito ?? body.respeito,
      'respeito',
      errors
    ),
    carater: parseRating(
      ratingsObject?.carater ?? body.carater,
      'carater',
      errors
    ),
    confianca: parseRating(
      ratingsObject?.confianca ?? body.confianca,
      'confianca',
      errors
    ),
  }

  if (ratings.comportamento === 0) {
    errors.push('Preencha ao menos a avaliação de comportamento.')
  }

  const greenFlags = normalizeStringArray(
    body.greenFlags ?? body.flags_positive,
    'greenFlags',
    errors
  )
  const redFlags = normalizeStringArray(
    body.redFlags ?? body.flags_negative ?? body.flags,
    'redFlags',
    errors
  )

  const anonimoRaw = body.anonimo ?? body.is_anonymous
  const anonimo = typeof anonimoRaw === 'boolean' ? anonimoRaw : true

  const cidade = normalizeString(body.cidade)
  const contato = normalizeString(body.contato)

  if (errors.length > 0) {
    return {
      success: false,
      status: 400,
      message: 'Payload inválido.',
      errors,
    }
  }

  return {
    success: true,
    data: {
      avaliadoId: avaliadoId || null,
      nome: nome ?? '',
      descricao: descricao || null,
      cidade,
      contato,
      anonimo,
      ratings,
      greenFlags,
      redFlags,
    },
  }
}
