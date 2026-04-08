export const getRedirectUrl = () => {
  if (typeof window === 'undefined') {
    return '/auth/callback'
  }

  return `${window.location.origin}/auth/callback`
}
