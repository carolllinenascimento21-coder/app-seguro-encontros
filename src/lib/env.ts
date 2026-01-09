export type SupabasePublicEnv = {
  url: string
  anonKey: string
}

export type SupabaseServiceEnv = {
  url: string
  serviceRoleKey: string
}

export type MissingEnvDetails = {
  status: number
  message: string
}

const missingEnvContexts = new Set<string>()

const isCI =
  process.env.CI === 'true' ||
  process.env.GITHUB_ACTIONS === 'true' ||
  process.env.GITLAB_CI === 'true'

const shouldThrowOnMissing = process.env.NODE_ENV === 'production' && !isCI

class MissingSupabaseEnvError extends Error {
  status: number
  missingKeys: string[]

  constructor(context: string, missingKeys: string[]) {
    super(
      `Supabase environment variables missing for ${context}: ${missingKeys.join(', ')}`
    )
    this.name = 'MissingSupabaseEnvError'
    this.status = 503
    this.missingKeys = missingKeys
  }
}

const collectMissing = (entries: Array<[string, string | undefined]>) =>
  entries.filter(([, value]) => !value).map(([key]) => key)

const logMissingOnce = (context: string, missingKeys: string[]) => {
  if (missingEnvContexts.has(context)) {
    return
  }

  missingEnvContexts.add(context)
  console.error(
    `[supabase][env] Variáveis ausentes para ${context}: ${missingKeys.join(', ')}`
  )
}

const resolveEnv = <T extends Record<string, string>>(
  context: string,
  entries: Array<[string, string | undefined]>,
  factory: (values: Record<string, string>) => T,
  throwOnMissing = shouldThrowOnMissing
): T | null => {
  const missingKeys = collectMissing(entries)

  if (missingKeys.length > 0) {
    logMissingOnce(context, missingKeys)

    if (throwOnMissing) {
      throw new MissingSupabaseEnvError(context, missingKeys)
    }

    return null
  }

  const values = entries.reduce<Record<string, string>>((acc, [key, value]) => {
    acc[key] = value ?? ''
    return acc
  }, {})

  return factory(values)
}

export const getSupabasePublicEnv = (
  context: string,
  options: { throwOnMissing?: boolean } = {}
): SupabasePublicEnv | null =>
  resolveEnv(
    context,
    [
      ['NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL],
      ['NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY],
    ],
    values => ({
      url: values.NEXT_PUBLIC_SUPABASE_URL,
      anonKey: values.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    }),
    options.throwOnMissing ?? shouldThrowOnMissing
  )

export const getSupabaseServiceEnv = (
  context: string,
  options: { throwOnMissing?: boolean } = {}
): SupabaseServiceEnv | null =>
  resolveEnv(
    context,
    [
      ['NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL],
      ['SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY],
    ],
    values => ({
      url: values.NEXT_PUBLIC_SUPABASE_URL,
      serviceRoleKey: values.SUPABASE_SERVICE_ROLE_KEY,
    }),
    options.throwOnMissing ?? shouldThrowOnMissing
  )

export const getMissingSupabaseEnvDetails = (
  error: unknown
): MissingEnvDetails | null => {
  if (error instanceof MissingSupabaseEnvError) {
    return { status: error.status, message: error.message }
  }

  return null
}

export const supabaseEnvRuntime = {
  isCI,
  shouldThrowOnMissing,
}
