'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase'
import { ensureProfileForUser } from '@/lib/profile-utils'

type GuardStatus = 'checking' | 'ready' | 'error'

type GuardState = {
  status: GuardStatus
  errorMessage?: string | null
}

const SELFIE_FLOW_ROUTES = [
  '/onboarding/selfie',
  '/verification-pending',
  '/verificacao-selfie',
]

const supabase = createSupabaseClient()

export default function OnboardingGuard({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [state, setState] = useState<GuardState>({ status: 'checking' })

  const isSelfieFlowRoute = useMemo(
    () => SELFIE_FLOW_ROUTES.some(route => pathname.startsWith(route)),
    [pathname]
  )

  const checkProfile = useCallback(async () => {
    setState({ status: 'checking' })

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError) {
      console.error('Erro ao carregar sessão:', sessionError)
      setState({
        status: 'error',
        errorMessage: 'Erro ao carregar perfil.',
      })
      return
    }

    if (!session?.user) {
      setState({ status: 'ready' })
      return
    }

    const { profile, error: profileError } = await ensureProfileForUser(
      supabase,
      session.user
    )

    if (profileError || !profile) {
      console.error('Erro ao carregar perfil:', profileError)
      setState({
        status: 'error',
        errorMessage: 'Erro ao carregar perfil.',
      })
      return
    }

    const needsOnboarding =
      profile.onboarding_completed === false || profile.selfie_url === null

    if (needsOnboarding && !isSelfieFlowRoute) {
      router.replace('/onboarding/selfie')
      return
    }

    setState({ status: 'ready' })
  }, [isSelfieFlowRoute, router])

  useEffect(() => {
    let isMounted = true

    const runCheck = async () => {
      await checkProfile()
    }

    runCheck().catch(error => {
      if (!isMounted) return
      console.error('Erro ao validar onboarding:', error)
      setState({
        status: 'error',
        errorMessage: 'Erro ao carregar perfil.',
      })
    })

    return () => {
      isMounted = false
    }
  }, [checkProfile])

  if (state.status === 'checking') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Carregando perfil...</p>
        </div>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-6">
        <div className="max-w-md w-full border border-red-700/60 rounded-2xl p-6 text-center space-y-4">
          <h1 className="text-xl font-semibold text-red-400">
            Erro ao carregar perfil
          </h1>
          <p className="text-sm text-gray-400">
            Não foi possível carregar seus dados agora. Verifique sua conexão e
            tente novamente.
          </p>
          <button
            type="button"
            onClick={checkProfile}
            className="w-full rounded-xl bg-[#D4AF37] py-3 font-semibold text-black transition hover:bg-[#c9a634]"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
