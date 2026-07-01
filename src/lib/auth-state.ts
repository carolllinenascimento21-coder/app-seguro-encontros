import type { User } from '@supabase/supabase-js'

export type ConfiaAuthState = 'authenticated' | 'anonymous' | 'unauthenticated'

export const PERMANENT_ACCOUNT_REQUIRED_MESSAGE =
  'Para salvar seu histórico, editar avaliações ou recuperar seu acesso depois, crie uma conta.'

export function isAnonymousUser(user: User | null | undefined) {
  return Boolean(
    user?.is_anonymous === true ||
      user?.app_metadata?.provider === 'anonymous' ||
      user?.aud === 'authenticated' && !user?.email
  )
}

export function getConfiaAuthState(user: User | null | undefined): ConfiaAuthState {
  if (!user) return 'unauthenticated'
  return isAnonymousUser(user) ? 'anonymous' : 'authenticated'
}

export function isPermanentAccountUser(user: User | null | undefined) {
  return getConfiaAuthState(user) === 'authenticated'
}
