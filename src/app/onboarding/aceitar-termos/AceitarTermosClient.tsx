'use client'

import { useState } from 'react'
import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs'
import { FileText, Shield, CheckCircle } from 'lucide-react'

export default function AceitarTermosClient() {
  const supabase = createBrowserSupabaseClient()

  const [termosAceitos, setTermosAceitos] = useState(false)
  const [privacidadeAceita, setPrivacidadeAceita] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleAceitar = async () => {
    if (!termosAceitos || !privacidadeAceita) return

    setLoading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setLoading(false)
      return
    }

    const { error } = await supabase
      .from('profiles')
      .update({ termos_aceitos: true })
      .eq('id', user.id)

    if (error) {
      console.error('Erro ao salvar termos:', error)
      setLoading(false)
      return
    }

    // NÃO redireciona
    // middleware assume a navegação
  }

  return (
    <div className="min-h-screen bg-black flex flex-col justify-center px-6">
      <div className="max-w-md mx-auto space-y-6">
        <div className="text-center">
          <Shield className="w-12 h-12 text-yellow-500 mx-auto mb-2" />
          <h1 className="text-2xl font-bold text-white">
            Aceite dos Termos
          </h1>
          <p className="text-gray-400 text-sm">
            Para continuar, aceite os termos abaixo
          </p>
        </div>

        <div className="bg-gray-900 p-4 rounded-lg">
          <label className="flex items-center gap-2 text-white text-sm">
            <input
              type="checkbox"
              checked={termosAceitos}
              onChange={(e) => setTermosAceitos(e.target.checked)}
            />
            Li e aceito os Termos de Uso
          </label>
        </div>

        <div className="bg-gray-900 p-4 rounded-lg">
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
          className="w-full bg-yellow-500 text-black font-semibold py-3 rounded-lg disabled:opacity-50"
        >
          {loading ? 'Processando...' : 'Aceitar e continuar'}
        </button>
      </div>
    </div>
  )
}
