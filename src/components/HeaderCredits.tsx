'use client'

import { useEffect, useState } from 'react'
import { Coins } from 'lucide-react'
import { useRouter } from 'next/navigation'

type CreditsState = {
  balance: number
  loading: boolean
}

export default function HeaderCredits() {
  const router = useRouter()
  const [state, setState] = useState<CreditsState>({
    balance: 0,
    loading: true,
  })

  useEffect(() => {
    let mounted = true

    const loadCredits = async () => {
      try {
        const res = await fetch('/api/me/entitlements')
        const data = await res.json()

        if (mounted) {
          setState({
            balance: data?.credits ?? 0,
            loading: false,
          })
        }
      } catch {
        if (mounted) {
          setState({ balance: 0, loading: false })
        }
      }
    }

    loadCredits()
    return () => {
      mounted = false
    }
  }, [])

  return (
    <div className="flex items-center gap-3 bg-black/60 border border-[#D4AF37]/40 rounded-xl px-4 py-2">
      <Coins className="w-5 h-5 text-[#D4AF37]" />

      <span className="text-sm text-white">
        {state.loading ? 'Carregando…' : `${state.balance} créditos`}
      </span>

      <button
        onClick={() => router.push('/planos')}
        className="text-xs bg-[#D4AF37] text-black font-semibold px-3 py-1 rounded-lg hover:brightness-110"
      >
        Comprar
      </button>
    </div>
  )
}
