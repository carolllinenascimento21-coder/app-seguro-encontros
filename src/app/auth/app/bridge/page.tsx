'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

type BridgeState = 'loading' | 'error'

function AppAuthBridgeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [state, setState] = useState<BridgeState>('loading')
  const [errorMessage, setErrorMessage] = useState('')

  const payload = useMemo(() => {
    const accessToken = searchParams.get('access_token')?.trim() || ''
    const refreshToken = searchParams.get('refresh_token')?.trim() || ''
    const next = searchParams.get('next') || '/home'
    return { accessToken, refreshToken, next }
  }, [searchParams])

  useEffect(() => {
    const sync = async () => {
      if (!payload.accessToken || !payload.refreshToken) {
        setState('error')
        setErrorMessage('Tokens ausentes no bridge de autenticação.')
        return
      }

      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            access_token: payload.accessToken,
            refresh_token: payload.refreshToken,
          }),
        })

        if (!response.ok) {
          const body = await response.json().catch(() => ({ error: 'bridge_sync_failed' }))
          throw new Error(body?.error || 'bridge_sync_failed')
        }

        router.replace(payload.next)
      } catch (error) {
        console.error('[AUTH BRIDGE] Falha ao sincronizar sessão web:', error)
        setState('error')
        setErrorMessage('Não foi possível concluir o login no ambiente web.')
      }
    }

    void sync()
  }, [payload, router])

  if (state === 'error') {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-xl font-semibold">Falha ao concluir login</h1>
          <p className="text-sm text-zinc-300">{errorMessage}</p>
          <button
            className="mt-2 rounded-lg border border-[#D4AF37] px-4 py-2 text-[#D4AF37]"
            onClick={() => router.replace('/login')}
          >
            Voltar para login
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <p className="text-sm text-zinc-300">Concluindo seu acesso com segurança...</p>
    </main>
  )
}

export default function AppAuthBridgePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
          <p className="text-sm text-zinc-300">Preparando autenticação...</p>
        </main>
      }
    >
      <AppAuthBridgeContent />
    </Suspense>
  )
}
