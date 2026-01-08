import type { SupabaseClient, User } from '@supabase/supabase-js'

type ProfileRecord = {
  id: string
  nome?: string | null
  email?: string | null
  telefone?: string | null
  selfie_url?: string | null
  onboarding_completed?: boolean | null
  selfie_verified?: boolean | null
  is_active?: boolean | null
  deleted_at?: string | null
}

export type ProfileErrorType = 'schema' | 'permission' | 'unknown'

type ProfileErrorInfo = {
  code?: string
  message?: string
  status?: number
}

type EnsureProfileResult = {
  profile: ProfileRecord | null
  error: unknown | null
  errorType?: ProfileErrorType
  errorInfo?: ProfileErrorInfo
}

const isBlank = (value?: string | null) =>
  !value || value.trim().length === 0

const resolveProfileDefaults = (user: User) => {
  const metadata = (user.user_metadata ?? {}) as Record<string, string | undefined>

  return {
    nome: metadata.nome || metadata.name || user.email || '',
    email: user.email || metadata.email || '',
    telefone: metadata.telefone || metadata.phone || user.phone || '',
  }
}

const baseProfileFields = [
  'id',
  'nome',
  'email',
  'selfie_url',
  'onboarding_completed',
  'selfie_verified',
] as const
const optionalProfileFields = ['telefone', 'is_active', 'deleted_at'] as const

const getErrorInfo = (error: unknown): ProfileErrorInfo => {
  if (!error || typeof error !== 'object') return {}

  const maybeError = error as {
    code?: string
    message?: string
    details?: string
    status?: number
  }

  return {
    code: maybeError.code,
    message: maybeError.message ?? maybeError.details,
    status: maybeError.status,
  }
}

const resolveErrorType = (error: unknown): ProfileErrorType => {
  if (!error || typeof error !== 'object') return 'unknown'

  const maybeError = error as { code?: string; message?: string; details?: string }
  const code = maybeError.code?.toUpperCase()
  const message = `${maybeError.message ?? ''} ${maybeError.details ?? ''}`.toLowerCase()

  if (
    code === '42501' ||
    message.includes('row level security') ||
    message.includes('permission denied')
  ) {
    return 'permission'
  }

  if (
    code === '42703' ||
    code === '42P01' ||
    message.includes('column ') ||
    message.includes('relation ')
  ) {
    return 'schema'
  }

  return 'unknown'
}

export const isMissingColumnError = (error: unknown, column: string) => {
  if (!error || typeof error !== 'object') return false

  const maybeError = error as { code?: string; message?: string; details?: string }
  const message = `${maybeError.message ?? ''} ${maybeError.details ?? ''}`

  return maybeError.code === '42703' || message.includes(`column "${column}"`)
}

const extractMissingColumnName = (error: unknown) => {
  if (!error || typeof error !== 'object') return null

  const maybeError = error as { message?: string; details?: string }
  const message = `${maybeError.message ?? ''} ${maybeError.details ?? ''}`
  const quotedMatch = message.match(/column "([^"]+)"/i)
  if (quotedMatch?.[1]) {
    return quotedMatch[1]
  }

  const unquotedMatch = message.match(/column ([\w.]+)/i)
  const rawColumn = unquotedMatch?.[1]
  if (!rawColumn) return null

  return rawColumn.split('.').pop() ?? null
}

const buildProfileSelect = (fields: readonly string[]) =>
  fields.filter(Boolean).join(', ')

const removeMissingColumnFromPayload = (
  payload: Record<string, unknown>,
  missingColumn: string | null
) => {
  if (!missingColumn) return payload
  if (!(missingColumn in payload)) return payload

  const { [missingColumn]: _removed, ...rest } = payload
  return rest
}

const fetchProfileById = async (
  supabase: SupabaseClient,
  userId: string,
  fields: readonly string[]
) => {
  return supabase
    .from('profiles')
    .select(buildProfileSelect(fields))
    .eq('id', userId)
    .maybeSingle()
}

export const getProfileErrorInfo = (error: unknown) => getErrorInfo(error)

export async function ensureProfileForUser(
  supabase: SupabaseClient,
  user: User
): Promise<EnsureProfileResult> {
  // ✅ Garante perfil existente e com dados mínimos sem assumir telefone obrigatório.
  let availableFields = [...baseProfileFields, ...optionalProfileFields]

  let { data: profile, error: profileError } = await fetchProfileById(
    supabase,
    user.id,
    availableFields
  )

  while (profileError) {
    const missingColumn = extractMissingColumnName(profileError)
    if (
      !missingColumn ||
      missingColumn === 'id' ||
      !availableFields.includes(missingColumn as any)
    ) {
      return {
        profile: null,
        error: profileError,
        errorType: resolveErrorType(profileError),
        errorInfo: getErrorInfo(profileError),
      }
    }

    availableFields = availableFields.filter(
      column => column !== missingColumn
    )
    ;({ data: profile, error: profileError } = await fetchProfileById(
      supabase,
      user.id,
      availableFields
    ))
  }

  const fallbackProfile = profile
  const supportsTelefone = availableFields.includes('telefone')
  const supportsNome = availableFields.includes('nome')
  const supportsEmail = availableFields.includes('email')
  const supportsSelfieVerified = availableFields.includes('selfie_verified')
  const supportsOnboardingCompleted =
    availableFields.includes('onboarding_completed')

  if (fallbackProfile?.is_active === false) {
    return { profile: fallbackProfile, error: null }
  }

  const defaults = resolveProfileDefaults(user)

  if (!fallbackProfile) {
    const insertPayload: Partial<ProfileRecord> = {
      id: user.id,
    }

    if (supportsNome) {
      insertPayload.nome = defaults.nome
    }

    if (supportsEmail) {
      insertPayload.email = defaults.email
    }

    if (supportsSelfieVerified) {
      insertPayload.selfie_verified = false
    }

    if (supportsOnboardingCompleted) {
      insertPayload.onboarding_completed = false
    }

    if (supportsTelefone) {
      insertPayload.telefone = defaults.telefone || null
    }

    let upsertPayload = insertPayload
    let upsertError: unknown | null = null

    while (true) {
      ;({ error: upsertError } = await supabase
        .from('profiles')
        .upsert(upsertPayload, { onConflict: 'id' }))

      if (!upsertError) {
        break
      }

      const missingColumn = extractMissingColumnName(upsertError)
      if (!missingColumn) {
        break
      }

      const nextPayload = removeMissingColumnFromPayload(
        upsertPayload as Record<string, unknown>,
        missingColumn
      )

      if (Object.keys(nextPayload).length === Object.keys(upsertPayload).length) {
        break
      }

      upsertPayload = nextPayload
    }

    if (upsertError) {
      return {
        profile: null,
        error: upsertError,
        errorType: resolveErrorType(upsertError),
        errorInfo: getErrorInfo(upsertError),
      }
    }

    const { data: createdProfile, error: createdProfileError } =
      await fetchProfileById(supabase, user.id, availableFields)

    return {
      profile: createdProfile ?? null,
      error: createdProfileError ?? null,
      errorType: createdProfileError
        ? resolveErrorType(createdProfileError)
        : undefined,
      errorInfo: createdProfileError ? getErrorInfo(createdProfileError) : undefined,
    }
  }

  const updates: Partial<ProfileRecord> = {}

  if (supportsNome && isBlank(fallbackProfile.nome) && !isBlank(defaults.nome)) {
    updates.nome = defaults.nome
  }

  if (supportsEmail && isBlank(fallbackProfile.email) && !isBlank(defaults.email)) {
    updates.email = defaults.email
  }

  if (
    supportsTelefone &&
    isBlank(fallbackProfile.telefone) &&
    !isBlank(defaults.telefone)
  ) {
    updates.telefone = defaults.telefone
  }

  if (supportsOnboardingCompleted && fallbackProfile.onboarding_completed == null) {
    updates.onboarding_completed = false
  }

  if (supportsSelfieVerified && fallbackProfile.selfie_verified == null) {
    updates.selfie_verified = false
  }

  if (Object.keys(updates).length === 0) {
    return { profile: fallbackProfile, error: null }
  }

  let updatePayload = updates
  let updatedProfile: ProfileRecord | null = null
  let updateError: unknown | null = null

  while (true) {
    ;({ data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', user.id)
      .select(buildProfileSelect(availableFields))
      .maybeSingle())

    if (!updateError) {
      break
    }

    const missingColumn = extractMissingColumnName(updateError)
    if (!missingColumn) {
      break
    }

    const nextPayload = removeMissingColumnFromPayload(
      updatePayload as Record<string, unknown>,
      missingColumn
    )

    if (Object.keys(nextPayload).length === Object.keys(updatePayload).length) {
      break
    }

    updatePayload = nextPayload
  }

  return {
    profile: updatedProfile ?? fallbackProfile,
    error: updateError ?? null,
    errorType: updateError ? resolveErrorType(updateError) : undefined,
    errorInfo: updateError ? getErrorInfo(updateError) : undefined,
  }
}
