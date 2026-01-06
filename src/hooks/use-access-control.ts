'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'

import { FREE_PLAN } from '@/lib/billing'
import { createSupabaseClient } from '@/lib/supabase'

type AccessProfile = {
  plan: string
  freeQueriesUsed: number
  credits: number
}

type CheckOptions = {
  redirectOnBlock?: boolean
}

const supabase = createSupabaseClient()

export function useAccessControl() {
  const router = useRouter()
  const [profile, setProfile] = useState<AccessProfile | null>(null)
  const [checking, setChecking] = useState(false)

  const checkAccess = useCallback(
    async (options: CheckOptions = { redirectOnBlock: true }) => {
      setChecking(true)
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.push('/login')
          return { allowed: false as const, profile: null }
        }

        const res = await fetch('/api/can-query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id }),
        })

        if (!res.ok) {
          console.error('Erro ao validar acesso', await res.text())
          return { allowed: false as const, profile: null }
        }

        const payload = await res.json()

        if (payload.allowed === false) {
          if (options.redirectOnBlock) {
            router.push('/planos')
          }
          setProfile(payload.profile ?? null)
          return { allowed: false as const, profile: payload.profile ?? null }
        }

        setProfile(payload.profile ?? null)
        return { allowed: true as const, profile: payload.profile ?? null }
      } catch (error) {
        console.error('Erro ao checar acesso', error)
        return { allowed: false as const, profile: null }
      } finally {
        setChecking(false)
      }
    },
    [router]
  )

  const consumeQuery = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return { success: false as const }
      }

      const res = await fetch('/api/consume-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      })

      if (!res.ok) {
        console.error('Erro ao consumir consulta', await res.text())
        return { success: false as const }
      }

      const payload = await res.json()
      if (payload.success) {
        const state = payload.state?.[0]
        if (state) {
          setProfile({
            plan: state.plan ?? FREE_PLAN,
            freeQueriesUsed: state.free_queries_used ?? state.freeQueriesUsed ?? 0,
            credits: state.credits ?? 0,
          })
        }
        return { success: true as const }
      }

      return { success: false as const }
    } catch (error) {
      console.error('Erro ao consumir consulta', error)
      return { success: false as const }
    }
  }, [router])

  return {
    checkAccess,
    consumeQuery,
    profile,
    checking,
  }
}
