'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CadastroRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/signup')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white px-4 text-center">
      Redirecionando para a página de cadastro...
    </div>
  )
}
