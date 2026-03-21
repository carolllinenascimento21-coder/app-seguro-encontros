'use client'

import { useState } from 'react'

type Props = {
  reportId: string
  avaliacaoId: string
}

export default function ModerationActionButtons({ reportId, avaliacaoId }: Props) {
  const [loading, setLoading] = useState(false)

  async function handleAction(action: 'approve' | 'remove') {
    setLoading(true)

    try {
      const res = await fetch('/api/admin/moderation-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, avaliacaoId, action }),
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.message || 'Erro')
      } else {
        alert('Ação realizada com sucesso')
        location.reload()
      }
    } catch {
      alert('Erro inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex gap-2 mt-3">
      <button
        onClick={() => handleAction('approve')}
        disabled={loading}
        className="px-3 py-1 text-xs rounded bg-green-600 hover:bg-green-700"
      >
        Aprovar
      </button>

      <button
        onClick={() => handleAction('remove')}
        disabled={loading}
        className="px-3 py-1 text-xs rounded bg-red-600 hover:bg-red-700"
      >
        Remover Avaliação
      </button>
    </div>
  )
}
