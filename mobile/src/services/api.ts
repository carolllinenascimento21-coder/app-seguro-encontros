import { supabase } from './supabase'

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL

if (!API_BASE_URL) {
  throw new Error('Variável de ambiente ausente: EXPO_PUBLIC_API_BASE_URL.')
}

export type ReputationResponse = {
  allowed: boolean
  locked?: boolean
  has_data?: boolean
  error?: string
  [key: string]: unknown
}

class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const headers = new Headers(init?.headers)
  headers.set('Content-Type', 'application/json')

  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  })

  const json = await response.json().catch(() => null)

  if (!response.ok) {
    const message = (json as { error?: string; message?: string } | null)?.error ||
      (json as { error?: string; message?: string } | null)?.message ||
      `Falha na requisição: ${response.status}`

    throw new ApiError(message, response.status)
  }

  return json as T
}

export const api = {
  getReputationById: (id: string) => request<ReputationResponse>(`/api/reputation/${id}`),
  getMyCredits: () => request<{ balance: number }>('/api/me/credits'),
}

export { ApiError }
