'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Coins } from 'lucide-react'

type Entitlements = {
  credits: number
  hasActivePlan: boolean
  currentPlan: string | null
}

export default function HeaderCredits() {
  const router = useRouter()
  const [data, setData] = useState<Entitlements | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/me/entitlements')
        if (res.ok) {
          const json = await res.json()
          setData(json)
        }
      } catch {}
    }
    load()
  }, [])

  if (!data) return null

  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="flex items-center gap-1 text-[#D4AF37] font-semibold">
        <Coins size={16} />
        {data.credits} créditos
      </div>

      <button
        onClick={() => router.push('/planos')}
        className="px-3 py-1 rounded-full border border-[#D4AF37]/40 hover:bg-[#D4AF37]/10 transition"
      >
        Comprar
      </button>
    </div>
  )
}
