export type AvaliacaoRatings = {
  comportamento: number
  seguranca_emocional: number
  respeito: number
  carater: number
  confianca: number
}

export type AvaliacaoPayloadNormalizado = {
  maleProfileId: string
  nome: string | null
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
  errors: Record<string, string>
}

type AvaliacaoPayloadValidationResult =
  | AvaliacaoPayloadValidationSuccess
  | AvaliacaoPayloadValidationError

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const normalizeString = (value: unknown) => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed || null
}

const normalizeStringArray = (
  value: unknown,
  fieldName: string,
  errors: Record<string, string>
) => {
  if (value == null) return []
  if (!Array.isArray(value)) {
    errors[fieldName] = `Campo ${fieldName} deve ser um array.`
    return []
  }
  return value
    .filter((v) => typeof v === 'string')
    .map((v) => v.trim())
    .filter(Boolean)
}

const parseRating = (
  value: unknown,
  fieldName: string,
  errors: Record<string, string>
) => {
  if (value === undefined || value === null || value === '') return 0
  const numeric = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(numeric)) {
    errors.ratings = `Nota inválida para ${fieldName}.`
    return 0
  }
  return Math.round(numeric)
}

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )

export const validateAvaliacaoPayload = (
  payload: unknown
): AvaliacaoPayloadValidationResult => {
  const errors: Record<string, string> = {}
  const body = isPlainObject(payload) ? payload : {}

  const anonimoRaw = body.anonimo ?? body.is_anonymous
  const anonimo = typeof anonimoRaw === 'boolean' ? anonimoRaw : null
  if (anonimo === null) {
    errors.anonimo = 'Campo anonimo é obrigatório.'
  }

  const nome = normalizeString(body.nome)
  const descricao = normalizeString(
    body.descricao ?? body.relato ?? body.comentario ?? body.comment
  )

  const maleProfileIdRaw =
    body.maleProfileId ?? body.male_profile_id
  const maleProfileId =
    typeof maleProfileIdRaw === 'string'
      ? maleProfileIdRaw.trim()
      : typeof maleProfileIdRaw === 'number'
        ? String(maleProfileIdRaw)
        : null

  // 🔒 REGRA: maleProfileId é obrigatório e precisa ser UUID
  if (!maleProfileId) {
    errors.maleProfileId = 'maleProfileId é obrigatório.'
  } else if (!isUuid(maleProfileId)) {
    errors.maleProfileId = 'maleProfileId inválido.'
  }

  // 🔒 REGRA: nome deve ser null quando anônimo e obrigatório quando não for
  if (anonimo === true && nome !== null) {
    errors.nome = 'Nome deve ser nulo quando anônimo.'
  }
  if (anonimo === false && !nome) {
    errors.nome = 'Nome é obrigatório quando não for anônimo.'
  }

  const ratingsInput = body.ratings ?? body.criterios
  const ratingsObject = isPlainObject(ratingsInput) ? ratingsInput : null

  if (ratingsInput !== undefined && !ratingsObject) {
    errors.ratings = 'ratings deve ser um objeto com notas numéricas.'
  }

  if (!ratingsObject) {
    const hasLegacyRatings = [
      body.comportamento,
      body.seguranca_emocional,
      body.respeito,
      body.carater,
      body.confianca,
    ].some((v) => v !== undefined)

    if (!hasLegacyRatings) {
      errors.ratings = 'ratings é obrigatório.'
    }
  }

  const ratings: AvaliacaoRatings = {
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
    errors.comportamento =
      'Preencha ao menos a avaliação de comportamento.'
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

  const cidade = normalizeString(body.cidade)
  const contato = normalizeString(body.contato)

  if (Object.keys(errors).length > 0) {
    return {
      success: false,
      status: 400,
      message: 'Payload inválido.',
      errors,
    }
  }

  const isAnonimo = anonimo === true

  return {
    success: true,
    data: {
      maleProfileId: maleProfileId as string,
      nome: isAnonimo ? null : nome,
      descricao: descricao || null,
      cidade,
      contato,
      anonimo: isAnonimo,
      ratings,
      greenFlags,
      redFlags,
    },
  }
}
