export type AuthSessionErrorLike = {
  code?: string
  message?: string
  name?: string
  status?: number
} | null | undefined

export const isAuthSessionMissingError = (error: AuthSessionErrorLike) => {
  if (!error) return false

  if (error.code === 'AuthSessionMissingError') return true
  if (error.name === 'AuthSessionMissingError') return true

  const message = error.message?.toLowerCase() ?? ''
  if (message.includes('auth session missing')) return true

  return false
}
