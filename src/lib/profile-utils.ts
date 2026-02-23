import type { SupabaseClient, User } from '@supabase/supabase-js'

export type ProfileRecord = {
  id: string
  nome?: string | null
  email?: string | null
  telefone?: string | null
  cidade?: string | null
  avatar_url?: string | null
  selfie_url?: string | null
  selfie_verified?: boolean | null
  onboarding_completed?: boolean | null
  termos_aceitos?: boolean | null
  is_active?: boolean | null
  deleted_at?: string | null
  current_plan_id?: string | null
}

export type ProfileErrorType = 'schema' | 'permission' | 'unknown'

export type ProfileErrorInfo = {
  code?: string
  message?: string
  status?: number
}

export type EnsureProfileResult = {
  profile: ProfileRecord | null
  error: unknown | null
  errorType?: ProfileErrorType
  errorInfo?: ProfileErrorInfo
}

const isBlank = (v?: string | null) => !v || v.trim().length === 0

const baseProfileFields = [
  'id',
  'nome',
  'email',
  'telefone',
  'cidade',
  'avatar_url',
  'selfie_url',
  'selfie_verified',
  'onboarding_completed',
  'termos_aceitos',
  'is_active',
  'deleted_at',
  'current_plan_id',
] as const

function buildSelect(fields: readonly string[]) {
  return fields.filter(Boolean).join(', ')
}

function getErrorInfo(error: unknown): ProfileErrorInfo {
  if (!error || typeof error !== 'object') return {}
  const e = error as { code?: string; message?: string; details?: string; status?: number }
  return { code: e.code, message: e.message ?? e.details, status: e.status }
}

function resolveErrorType(error: unknown): ProfileErrorType {
  const info = getErrorInfo(error)
  const code = (info.code ?? '').toUpperCase()
  const msg = (info.message ?? '').toLowerCase()

  if (code === '42501' || msg.includes('row-level security') || msg.includes('permission denied')) {
    return 'permission'
  }
  if (code === '42703' || code === '42P01' || msg.includes('column') || msg.includes('relation')) {
    return 'schema'
  }
  return 'unknown'
}


export function isMissingColumnError(error: unknown) {
  const info = getErrorInfo(error)
  return (info.code ?? '').toUpperCase() === '42703'
}

function extractMissingColumnName(error: unknown) {
  const info = getErrorInfo(error)
  const message = `${info.message ?? ''}`
  const quoted = message.match(/column "([^"]+)"/i)?.[1]
  if (quoted) return quoted
  const unquoted = message.match(/column ([\w.]+)/i)?.[1]
  if (!unquoted) return null
  return unquoted.split('.').pop() ?? null
}

function removeMissingColumnFromPayload(
  payload: Record<string, unknown>,
  missing: string | null
) {
  if (!missing) return payload
  if (!(missing in payload)) return payload
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { [missing]: _removed, ...rest } = payload
  return rest
}

function resolveDefaults(user: User) {
  const md = (user.user_metadata ?? {}) as Record<string, unknown>
  const name =
    (md.full_name as string | undefined) ||
    (md.name as string | undefined) ||
    (md.nome as string | undefined) ||
    user.email ||
    ''
  const phone =
    (md.phone as string | undefined) ||
    (md.telefone as string | undefined) ||
    ''
  const email = user.email || (md.email as string | undefined) || ''
  return { nome: name, telefone: phone, email }
}

async function fetchProfile(
  supabase: SupabaseClient,
  userId: string,
  fields: readonly string[]
): Promise<{ data: ProfileRecord | null; error: unknown | null }> {
  const result = await supabase
    .from('profiles')
    .select(buildSelect(fields))
    .eq('id', userId)
    .maybeSingle()

  return {
    data: (result.data as ProfileRecord | null) ?? null,
    error: result.error,
  }
}

export const getProfileErrorInfo = (error: unknown) => getErrorInfo(error)

export async function ensureProfileForUser(
  supabase: SupabaseClient,
  user: User
): Promise<EnsureProfileResult> {
  let fields = [...baseProfileFields]

  // 1) fetch com fallback caso falte coluna no schema
  let { data: profile, error } = await fetchProfile(supabase, user.id, fields)

  while (error) {
    const missing = isMissingColumnError(error) ? extractMissingColumnName(error) : null
    if (!missing || missing === 'id' || !fields.includes(missing as any)) {
      return { profile: null, error, errorType: resolveErrorType(error), errorInfo: getErrorInfo(error) }
    }
    fields = fields.filter((f) => f !== missing)
    ;({ data: profile, error } = await fetchProfile(supabase, user.id, fields))
  }

  const resolvedProfile = profile as ProfileRecord | null
  const defaults = resolveDefaults(user)

  // 2) se não existe, cria
  if (!resolvedProfile) {
    let payload: Record<string, unknown> = {
      id: user.id,
      nome: defaults.nome,
      email: defaults.email,
      telefone: defaults.telefone || null,
      selfie_verified: false,
      onboarding_completed: false,
      termos_aceitos: false,
      is_active: true,
    }

    while (true) {
      const { error: upsertError } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' })
      if (!upsertError) break

      const missing = isMissingColumnError(upsertError) ? extractMissingColumnName(upsertError) : null
      const next = removeMissingColumnFromPayload(payload, missing)
      if (Object.keys(next).length === Object.keys(payload).length) {
        return {
          profile: null,
          error: upsertError,
          errorType: resolveErrorType(upsertError),
          errorInfo: getErrorInfo(upsertError),
        }
      }
      payload = next
    }

    const { data: created, error: createdError } = await fetchProfile(supabase, user.id, fields)
    if (createdError) {
      return { profile: null, error: createdError, errorType: resolveErrorType(createdError), errorInfo: getErrorInfo(createdError) }
    }
    return { profile: (created as ProfileRecord) ?? null, error: null }
  }

  // 3) se existe, preenche mínimos se faltarem
  const updates: Partial<ProfileRecord> = {}

  if (isBlank(resolvedProfile.nome) && !isBlank(defaults.nome)) updates.nome = defaults.nome
  if (isBlank(resolvedProfile.email) && !isBlank(defaults.email)) updates.email = defaults.email
  if (isBlank(resolvedProfile.telefone) && !isBlank(defaults.telefone)) updates.telefone = defaults.telefone

  // inicializa bools se vierem null
  if (resolvedProfile.selfie_verified == null) updates.selfie_verified = false
  if (resolvedProfile.onboarding_completed == null) updates.onboarding_completed = false
  if (resolvedProfile.termos_aceitos == null) updates.termos_aceitos = false

  if (Object.keys(updates).length === 0) {
    return { profile: resolvedProfile, error: null }
  }

  let payload: Record<string, unknown> = { ...updates }

  while (true) {
    const { data: updated, error: updateError } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', user.id)
      .select(buildSelect(fields))
      .maybeSingle()

    if (!updateError) {
      return { profile: (updated as ProfileRecord) ?? resolvedProfile, error: null }
    }

    const missing = isMissingColumnError(updateError) ? extractMissingColumnName(updateError) : null
    const next = removeMissingColumnFromPayload(payload, missing)
    if (Object.keys(next).length === Object.keys(payload).length) {
      return {
        profile: resolvedProfile,
        error: updateError,
        errorType: resolveErrorType(updateError),
        errorInfo: getErrorInfo(updateError),
      }
    }
    payload = next
  }
}
