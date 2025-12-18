'use client'

import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Shield } from 'lucide-react'
import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs'

export default function AceitarTermosClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createBrowserSupabaseClient()

  const next = useMemo(
    () => searchParams?.get('next') ?? '/home',
    [searchParams]
  )

  const [termosAceitos, setTermosAceitos] = useState(false)
  const [privacidadeAceita, setPrivacidadeAceita] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleAceitar = async () => {
    if (!termosAceitos || !privacidadeAceita) return

    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        termos_aceitos: true,
        onboarding_completed: true,
      })
      .eq('id', user.id)

    if (error) {
      console.error(error)
      setLoading(false)
      return
    }

    router.replace(next)
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-6 text-center">
        <Shield className="w-10 h-10 text-yellow-400 mx-auto" />

        <h1 className="text-2xl font-bold text-white">
          Aceite dos Termos
        </h1>

        <p className="text-gray-400 text-sm">
          Para continuar, leia e aceite os
          <a href="/perfil/termos" className="text-yellow-400 underline mx-1">
            Termos de Uso
          </a>
          e a
          <a href="/perfil/privacidade" className="text-yellow-400 underline mx-1">
            Política de Privacidade
          </a>.
        </p>

        <label className="flex items-center gap-2 text-white text-sm">
          <input
            type="checkbox"
            checked={termosAceitos}
            onChange={(e) => setTermosAceitos(e.target.checked)}
          />
          Li e aceito os Termos de Uso
        </label>

        <label className="flex items-center gap-2 text-white text-sm">
          <input
            type="checkbox"
            checked={privacidadeAceita}
            onChange={(e) => setPrivacidadeAceita(e.target.checked)}
          />
          Li e aceito a Política de Privacidade
        </label>

        <button
          onClick={handleAceitar}
          disabled={!termosAceitos || !privacidadeAceita || loading}
          className="w-full py-3 rounded-xl font-semibold bg-yellow-400 text-black disabled:opacity-50"
        >
          {loading ? 'Processando...' : 'Aceitar e continuar'}
        </button>
      </div>
    </div>
  )
}
