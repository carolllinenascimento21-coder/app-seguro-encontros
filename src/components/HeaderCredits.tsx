'use client'

import { useEffect, useMemo, useState } from 'react'
import { Coins } from 'lucide-react'
import { usePathname } from 'next/navigation'

export default function HeaderCredits() {
  const [credits, setCredits] = useState<number | null>(null)
  const pathname = usePathname()

  const hideOnPlanos = useMemo(
    () => pathname === '/planos' || pathname.startsWith('/planos/') || pathname === '/plans',
    [pathname]
  )

  useEffect(() => {
    if (hideOnPlanos) return

    const loadCredits = async () => {
      const res = await fetch('/api/me/credits')
      if (!res.ok) return
      const data = await res.json()
      setCredits(data.balance ?? 0)
    }

    loadCredits()
  }, [hideOnPlanos])

  if (hideOnPlanos || credits === null) return null

  return (
    <div className="flex items-center gap-2 bg-[#111] border border-[#D4AF37]/40 px-4 py-2 rounded-full">
      <Coins className="w-4 h-4 text-[#D4AF37]" />
      <span className="text-sm text-[#D4AF37] font-semibold">
        {credits} créditos
      </span>
    </div>
  )
}
