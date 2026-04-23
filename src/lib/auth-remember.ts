const REMEMBER_EMAIL_STORAGE_KEY = 'confia_login_email'
const REMEMBER_EMAIL_TTL_DAYS = 30

type RememberedLoginEmail = {
  email: string
  expiresAt: number
}

function getStorage() {
  if (typeof window === 'undefined') return null
  return window.localStorage
}

export function readRememberedLoginEmail() {
  const storage = getStorage()
  if (!storage) return null

  const rawValue = storage.getItem(REMEMBER_EMAIL_STORAGE_KEY)
  if (!rawValue) return null

  try {
    const parsed = JSON.parse(rawValue) as RememberedLoginEmail

    if (!parsed?.email || typeof parsed.expiresAt !== 'number') {
      storage.removeItem(REMEMBER_EMAIL_STORAGE_KEY)
      return null
    }

    if (Date.now() > parsed.expiresAt) {
      storage.removeItem(REMEMBER_EMAIL_STORAGE_KEY)
      return null
    }

    return parsed.email
  } catch {
    storage.removeItem(REMEMBER_EMAIL_STORAGE_KEY)
    return null
  }
}

export function rememberLoginEmail(email: string) {
  const storage = getStorage()
  if (!storage) return

  const payload: RememberedLoginEmail = {
    email: email.trim().toLowerCase(),
    expiresAt: Date.now() + REMEMBER_EMAIL_TTL_DAYS * 24 * 60 * 60 * 1000,
  }

  storage.setItem(REMEMBER_EMAIL_STORAGE_KEY, JSON.stringify(payload))
}

export function clearRememberedLoginEmail() {
  const storage = getStorage()
  if (!storage) return

  storage.removeItem(REMEMBER_EMAIL_STORAGE_KEY)
}
