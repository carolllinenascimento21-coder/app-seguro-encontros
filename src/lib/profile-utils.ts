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

type EnsureProfileResult = {
  profile: ProfileRecord | null
  error: unknown | null
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
      return { profile: null, error: profileError }
    }
  }

  const { data: fallbackProfile, error: fallbackError } = supportsTelefone
    ? { data: profile, error: profileError }
    : await fetchProfileById(supabase, user.id, false)

  if (fallbackError) {
    return { profile: null, error: fallbackError }
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
      return { profile: null, error: upsertError }
    }

    const { data: createdProfile, error: createdProfileError } =
      await fetchProfileById(supabase, user.id, supportsTelefone)

    return {
      profile: createdProfile ?? null,
      error: createdProfileError ?? null,
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
  }
}
