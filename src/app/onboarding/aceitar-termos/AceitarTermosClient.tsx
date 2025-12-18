'use client'

import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FileText, Shield, CheckCircle } from 'lucide-react'
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

    // 1. Obter usuário autenticado
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error('Usuário não autenticado', userError)
      setLoading(false)
      return
    }

    // 2. Atualizar perfil no Supabase
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        termos_aceitos: true,
        onboarding_completed: true,
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Erro ao salvar aceite de termos', updateError)
      setLoading(false)
      return
    }

    // 3. Redirecionar para o próximo passo
    router.replace(next)
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="flex justify-center">
          <Shield className="w-10 h-10 text-yellow-400" />
        </div>

        <h1 className="text-2xl font-bold text-white">
          Aceite dos Termos
        </h1>

        <p className="text-gray-400 text-sm">
          Para continuar, leia e aceite os{' '}
          <a href="/perfil/termos" className="text-yellow-400 underline">
            Termos de Uso
          </a>{' '}
          e a{' '}
          <a href="/perfil/privacidade" className="text-yellow-400 underline">
            Política de Privacidade
          </a>.
        </p>

        <div className="space-y-3 text-left">
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
        </div>

        <button
          onClick={handleAceitar}
          disabled={!termosAceitos || !privacidadeAceita || loading}
          className={`w-full py-3 rounded-xl font-semibold transition ${
            termosAceitos && privacidadeAceita
              ? 'bg-yellow-400 text-black hover:bg-yellow-500'
              : 'bg-gray-800 text-gray-500 cursor-not-allowed'
          }`}
        >
          {loading ? 'Processando...' : 'Aceitar e continuar'}
        </button>
      </div>
    </div>
  )
}
