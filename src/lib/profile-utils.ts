import type { SupabaseClient, User } from '@supabase/supabase-js'

type ProfileRecord = {
  id: string
  nome: string | null
  email: string | null
  telefone: string | null
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

export async function ensureProfileForUser(
  supabase: SupabaseClient,
  user: User
): Promise<EnsureProfileResult> {
  // ✅ Garante perfil existente e com dados mínimos sem assumir telefone obrigatório.
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select(
      'id, nome, email, telefone, selfie_url, onboarding_completed, selfie_verified, is_active, deleted_at'
    )
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    return { profile: null, error: profileError }
  }

  if (profile?.is_active === false) {
    return { profile, error: null }
  }

  const defaults = resolveProfileDefaults(user)

  if (!profile) {
    const { data: createdProfile, error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        nome: defaults.nome,
        email: defaults.email,
        telefone: defaults.telefone || null,
        selfie_verified: false,
        onboarding_completed: false,
      })
      .select()
      .single()

    return { profile: createdProfile ?? null, error: insertError ?? null }
  }

  const updates: Partial<ProfileRecord> = {}

  if (isBlank(profile.nome) && !isBlank(defaults.nome)) {
    updates.nome = defaults.nome
  }

  if (isBlank(profile.email) && !isBlank(defaults.email)) {
    updates.email = defaults.email
  }

  if (isBlank(profile.telefone) && !isBlank(defaults.telefone)) {
    updates.telefone = defaults.telefone
  }

  if (profile.onboarding_completed === null) {
    updates.onboarding_completed = false
  }

  if (profile.selfie_verified === null) {
    updates.selfie_verified = false
  }

  if (Object.keys(updates).length === 0) {
    return { profile, error: null }
  }

  const { data: updatedProfile, error: updateError } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single()

  return { profile: updatedProfile ?? profile, error: updateError ?? null }
}
