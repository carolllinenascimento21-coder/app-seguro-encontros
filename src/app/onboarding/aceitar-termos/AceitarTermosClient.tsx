'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Shield } from 'lucide-react'
import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs'

export default function AceitarTermosClient() {
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()

  const [termosAceitos, setTermosAceitos] = useState(false)
  const [privacidadeAceita, setPrivacidadeAceita] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleAceitar = async () => {
    if (!termosAceitos || !privacidadeAceita) return

    setLoading(true)

    // 1. Usuário autenticado
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      console.error('Usuário não autenticado')
      setLoading(false)
      router.replace('/login')
      return
    }

    // 2. Atualiza SOMENTE termos
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        termos_aceitos: true,
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Erro ao salvar termos:', updateError)
      setLoading(false)
      return
    }

    // 3. NÃO decide rota — middleware decide
    router.replace('/onboarding')
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
          <a href="/perfil/privacidade" className="text-yellow-400 und
