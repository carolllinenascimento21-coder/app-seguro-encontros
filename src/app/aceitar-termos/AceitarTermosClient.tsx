'use client'

import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FileText, Shield, CheckCircle } from 'lucide-react'

export default function AceitarTermosClient() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const next = useMemo(
    () => searchParams?.get('next') ?? '/signup',
    [searchParams]
  )

  const [termosAceitos, setTermosAceitos] = useState(false)
  const [privacidadeAceita, setPrivacidadeAceita] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleAceitar = () => {
    if (!termosAceitos || !privacidadeAceita) return

    setLoading(true)

    const aceite = {
      termosAceitos: true,
      privacidadeAceita: true,
      dataAceite: new Date().toISOString(),
    }

    localStorage.setItem('confia_termos_aceite', JSON.stringify(aceite))

    setTimeout(() => {
      router.push(next)
    }, 300)
  }

  return (
   <div className="min-h-screen bg-black flex items-center justify-center">
    <h1 className="text-white text-2xl">Página Aceitar Termos OK</h1>
      {/* TODO: seu JSX exatamente como você já tem */}
    </div>
  )
}
