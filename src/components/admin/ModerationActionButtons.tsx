'use client'

import { useState } from 'react'

type Props = {
  reportId: string
  avaliacaoId: string
}

export default function ModerationActionButtons({
  reportId,
  avaliacaoId,
}: Props) {
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
    } catch (err) {
      alert('Erro inesperado')
    }

    setLoading(false)
  }

  return (
    <div className="mt-4 flex gap-2">
      <button
        onClick={() => handleAction('approve')}
        disabled={loading}
        className="bg-green-600 px-3 py-1 rounded"
      >
        Aprovar
      </button>

      <button
        onClick={() => handleAction('remove')}
        disabled={loading}
        className="bg-red-600 px-3 py-1 rounded"
      >
        Remover
      </button>
    </div>
  )
}
