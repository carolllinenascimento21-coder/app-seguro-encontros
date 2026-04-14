const DEFAULT_NEXT_PATH = '/home'

const getSafeNextPath = (nextPath?: string) => {
  if (!nextPath) {
    return DEFAULT_NEXT_PATH
  }

  if (!nextPath.startsWith('/') || nextPath.startsWith('//')) {
    return DEFAULT_NEXT_PATH
  }

  return nextPath
}

export const getRedirectUrl = (nextPath?: string) => {
  const safeNext = getSafeNextPath(nextPath)

  if (typeof window === 'undefined') {
    return `/auth/callback?next=${encodeURIComponent(safeNext)}`
  }

  const callbackUrl = new URL('/auth/callback', window.location.origin)
  callbackUrl.searchParams.set('next', safeNext)

  return callbackUrl.toString()
}
