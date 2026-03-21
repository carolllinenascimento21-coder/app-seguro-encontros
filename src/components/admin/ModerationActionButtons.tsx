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
  const [message, setMessage] = useState('')

  async function handleAction(action: 'approve' | 'remove') {
    try {
      setLoading(true)
      setMessage('')

      const res = await fetch('/api/admin/moderation-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, avaliacaoId, action }),
      })

      const data = await res.json()

      if (!res.ok) {
        setMessage(data?.message || 'Erro ao executar ação.')
        return
      }

      setMessage(data?.message || 'Ação realizada com sucesso.')
      window.location.reload()
    } catch {
      setMessage('Erro inesperado.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={loading}
        onClick={() => handleAction('approve')}
        className="rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-60"
      >
        Aprovar denúncia
      </button>

      <button
        type="button"
        disabled={loading}
        onClick={() => handleAction('remove')}
        className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
      >
        Remover avaliação
      </button>

      {message ? (
        <span className="text-xs text-zinc-400">{message}</span>
      ) : null}
    </div>
  )
}
