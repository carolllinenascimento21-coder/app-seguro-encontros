import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'

type AccessInfo = {
  allowed: boolean
  reason?: string | null
  plan: string
  free_queries_used: number
  credits: number
}

type ConsumeResult = {
  consumed?: boolean
  reason?: string
  mode?: string
  plan?: string
  free_queries_used?: number
  credits?: number
}

const DEFAULT_ACCESS: AccessInfo = {
  allowed: true,
  plan: 'free',
  free_queries_used: 0,
  credits: 0,
  reason: null,
}

export function useAccessControl() {
  const router = useRouter()
  const [accessInfo, setAccessInfo] = useState<AccessInfo>(DEFAULT_ACCESS)
  const [checking, setChecking] = useState(false)
  const [consuming, setConsuming] = useState(false)

  const fetchAccess = useCallback(async () => {
    setChecking(true)
    try {
      const res = await fetch('/api/can-query', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to check access')
      const data = (await res.json()) as Partial<AccessInfo>
      const merged = {
        ...DEFAULT_ACCESS,
        ...data,
        allowed: Boolean(data.allowed),
        free_queries_used: Number(data.free_queries_used ?? 0),
        credits: Number(data.credits ?? 0),
      }
      setAccessInfo(merged)
      return merged
    } catch (error) {
      console.error('Erro ao verificar acesso:', error)
      return { ...DEFAULT_ACCESS, allowed: false, reason: 'CHECK_FAILED' }
    } finally {
      setChecking(false)
    }
  }, [])

  const ensureAccess = useCallback(async () => {
    const result = await fetchAccess()

    if (!result.allowed) {
      router.push('/planos')
    }

    return result
  }, [fetchAccess, router])

  const consumeQuery = useCallback(async () => {
    setConsuming(true)
    try {
      const res = await fetch('/api/consume-query', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to consume query')
      const data = (await res.json()) as ConsumeResult

      if (!data.consumed && data.reason === 'PAYWALL') {
        router.push('/planos')
      }

      setAccessInfo(prev => ({
        ...prev,
        plan: data.plan ?? prev.plan,
        free_queries_used: data.free_queries_used ?? prev.free_queries_used,
        credits: data.credits ?? prev.credits,
        allowed: data.consumed ?? prev.allowed,
      }))

      return data
    } catch (error) {
      console.error('Erro ao consumir consulta:', error)
      return { consumed: false, reason: 'CONSUME_FAILED' }
    } finally {
      setConsuming(false)
    }
  }, [router])

  return {
    accessInfo,
    checking,
    consuming,
    ensureAccess,
    refreshAccess: fetchAccess,
    consumeQuery,
  }
}
