import type { SupabaseClient, User } from '@supabase/supabase-js'

type ProfileRecord = {
  id: string
  nome: string | null
  email: string | null
  telefone?: string | null
  selfie_url: string | null
  onboarding_completed: boolean | null
  selfie_verified: boolean | null
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

const baseProfileFields =
  'id, nome, email, selfie_url, onboarding_completed, selfie_verified, is_active, deleted_at'

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

const isMissingColumnError = (error: unknown, column: string) => {
  if (!error || typeof error !== 'object') return false

  const maybeError = error as { code?: string; message?: string; details?: string }
  const message = `${maybeError.message ?? ''} ${maybeError.details ?? ''}`

  return maybeError.code === '42703' || message.includes(`column "${column}"`)
}

const fetchProfileById = async (
  supabase: SupabaseClient,
  userId: string,
  includeTelefone: boolean
) => {
  const selectFields = includeTelefone
    ? `${baseProfileFields}, telefone`
    : baseProfileFields

  return supabase
    .from('profiles')
    .select(selectFields)
    .eq('id', userId)
    .maybeSingle()
}

export const getProfileErrorInfo = (error: unknown) => getErrorInfo(error)

export async function ensureProfileForUser(
  supabase: SupabaseClient,
  user: User
): Promise<EnsureProfileResult> {
  // ✅ Garante perfil existente e com dados mínimos sem assumir telefone obrigatório.
  let supportsTelefone = true

  const { data: profile, error: profileError } = await fetchProfileById(
    supabase,
    user.id,
    supportsTelefone
  )

  if (profileError) {
    if (isMissingColumnError(profileError, 'telefone')) {
      supportsTelefone = false
    } else {
      return {
        profile: null,
        error: profileError,
        errorType: resolveErrorType(profileError),
        errorInfo: getErrorInfo(profileError),
      }
    }
  }

  const { data: fallbackProfile, error: fallbackError } = supportsTelefone
    ? { data: profile, error: profileError }
    : await fetchProfileById(supabase, user.id, false)

  if (fallbackError) {
    return {
      profile: null,
      error: fallbackError,
      errorType: resolveErrorType(fallbackError),
      errorInfo: getErrorInfo(fallbackError),
    }
  }

  if (fallbackProfile?.is_active === false) {
    return { profile: fallbackProfile, error: null }
  }

  const defaults = resolveProfileDefaults(user)

  if (!fallbackProfile) {
    const insertPayload: Partial<ProfileRecord> = {
      id: user.id,
      nome: defaults.nome,
      email: defaults.email,
      selfie_verified: false,
      onboarding_completed: false,
    }

    if (supportsTelefone) {
      insertPayload.telefone = defaults.telefone || null
    }

    const { error: upsertError } = await supabase
      .from('profiles')
      .upsert(insertPayload, { onConflict: 'id' })

    if (upsertError) {
      return {
        profile: null,
        error: upsertError,
        errorType: resolveErrorType(upsertError),
        errorInfo: getErrorInfo(upsertError),
      }
    }

    const { data: createdProfile, error: createdProfileError } =
      await fetchProfileById(supabase, user.id, supportsTelefone)

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

  if (isBlank(fallbackProfile.nome) && !isBlank(defaults.nome)) {
    updates.nome = defaults.nome
  }

  if (isBlank(fallbackProfile.email) && !isBlank(defaults.email)) {
    updates.email = defaults.email
  }

  if (
    supportsTelefone &&
    isBlank(fallbackProfile.telefone) &&
    !isBlank(defaults.telefone)
  ) {
    updates.telefone = defaults.telefone
  }

  if (fallbackProfile.onboarding_completed === null) {
    updates.onboarding_completed = false
  }

  if (fallbackProfile.selfie_verified === null) {
    updates.selfie_verified = false
  }

  if (Object.keys(updates).length === 0) {
    return { profile: fallbackProfile, error: null }
  }

  const { data: updatedProfile, error: updateError } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single()

  return {
    profile: updatedProfile ?? fallbackProfile,
    error: updateError ?? null,
    errorType: updateError ? resolveErrorType(updateError) : undefined,
    errorInfo: updateError ? getErrorInfo(updateError) : undefined,
  }
}
