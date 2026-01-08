'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase'
import { ensureProfileForUser, type ProfileErrorType } from '@/lib/profile-utils'

type GuardStatus = 'checking' | 'ready' | 'error'

type GuardState = {
  status: GuardStatus
  errorMessage?: string | null
}

const supabase = createSupabaseClient()

const resolveErrorMessage = (errorType?: ProfileErrorType) => {
  if (errorType === 'schema') {
    return 'Erro técnico ao carregar seu perfil. Tente novamente em instantes.'
  }

  if (errorType === 'permission') {
    return 'Não foi possível acessar seu perfil. Faça login novamente ou tente mais tarde.'
  }

  return 'Não foi possível carregar seus dados agora. Verifique sua conexão e tente novamente.'
}

export default function OnboardingGuard({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [state, setState] = useState<GuardState>({ status: 'checking' })

  const isOnboardingRoute = useMemo(
    () => pathname === '/onboarding' || pathname.startsWith('/onboarding/'),
    [pathname]
  )

  const checkProfile = useCallback(async () => {
    setState({ status: 'checking' })

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) {
      console.error('Erro ao carregar usuário:', {
        message: userError.message,
        status: userError.status,
        error: userError,
      })
      setState({
        status: 'error',
        errorMessage: resolveErrorMessage(),
      })
      return
    }

    if (!user) {
      setState({ status: 'ready' })
      return
    }

    const {
      profile,
      error: profileError,
      errorType,
      errorInfo,
    } = await ensureProfileForUser(supabase, user)

    if (profileError || !profile) {
      console.error('Erro ao carregar perfil:', {
        status: errorInfo?.status,
        code: errorInfo?.code,
        message: errorInfo?.message,
        error: profileError,
      })
      setState({
        status: 'error',
        errorMessage: resolveErrorMessage(errorType),
      })
      return
    }

    const needsOnboarding =
      profile.onboarding_completed === false ||
      profile.onboarding_completed === null

    if (needsOnboarding) {
      if (!isOnboardingRoute) {
        router.replace('/onboarding/selfie')
        return
      }

      if (pathname === '/onboarding') {
        router.replace('/onboarding/selfie')
        return
      }
    } else if (
      isOnboardingRoute ||
      pathname === '/login' ||
      pathname === '/signup' ||
      pathname === '/register'
    ) {
      router.replace('/home')
      return
    }

    setState({ status: 'ready' })
  }, [isOnboardingRoute, pathname, router])

  useEffect(() => {
    let isMounted = true

    const runCheck = async () => {
      await checkProfile()
    }

    runCheck().catch(error => {
      if (!isMounted) return
      console.error('Erro ao validar onboarding:', {
        message: error instanceof Error ? error.message : String(error),
        error,
      })
      setState({
        status: 'error',
        errorMessage: resolveErrorMessage(),
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
            {state.errorMessage ??
              'Não foi possível carregar seus dados agora. Verifique sua conexão e tente novamente.'}
          </p>
          <button
            type="button"
            onClick={checkProfile}
            className="w-full rounded-xl bg-[#D4AF37] py-3 font-semibold text-black transition hover:bg-[#c9a634]"
          >
            Tentar novamente
          </button>
          <button
            type="button"
            onClick={async () => {
              const { error } = await supabase.auth.signOut()
              if (error) {
                console.error('Erro ao sair:', {
                  message: error.message,
                  status: error.status,
                  error,
                })
              }
              router.replace('/')
            }}
            className="w-full rounded-xl border border-[#D4AF37] py-3 font-semibold text-[#D4AF37] transition hover:bg-[#d4af37]/10"
          >
            Sair
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
