import type { User } from '@supabase/supabase-js'

export type ConfiaAuthState = 'authenticated' | 'anonymous' | 'unauthenticated'

export const PERMANENT_ACCOUNT_REQUIRED_MESSAGE =
  'Para salvar seu histórico, editar avaliações ou recuperar seu acesso depois, crie uma conta.'

type SupabaseUserIdentityLike = {
  provider?: string | null
  identity_data?: {
    provider?: string | null
  } | null
}

function hasAnonymousIdentity(user: User) {
  return (user.identities as SupabaseUserIdentityLike[] | undefined)?.some(
    (identity) =>
      identity.provider === 'anonymous' || identity.identity_data?.provider === 'anonymous'
  ) === true
}

export function isAnonymousUser(user: User | null | undefined) {
  if (!user) return false

  const providers = Array.isArray(user.app_metadata?.providers)
    ? user.app_metadata.providers
    : []

  return Boolean(
    user.is_anonymous === true ||
      user.app_metadata?.provider === 'anonymous' ||
      providers.includes('anonymous') ||
      hasAnonymousIdentity(user) ||
      (!user.email && !user.phone)
  )
}

export function getConfiaAuthState(user: User | null | undefined): ConfiaAuthState {
  if (!user) return 'unauthenticated'
  return isAnonymousUser(user) ? 'anonymous' : 'authenticated'
}
