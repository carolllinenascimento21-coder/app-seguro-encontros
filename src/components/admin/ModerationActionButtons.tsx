'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type ModerationAction = 'approve' | 'remove'

type ModerationActionButtonsProps = {
  reportId: string
  avaliacaoId: string
}

export default function ModerationActionButtons({
  reportId,
  avaliacaoId,
}: ModerationActionButtonsProps) {
  const router = useRouter()
  const [pendingAction, setPendingAction] = useState<ModerationAction | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function submitAction(action: ModerationAction) {
    if (pendingAction) return

    setPendingAction(action)
    setErrorMessage(null)

    try {
      const response = await fetch('/api/admin/moderation-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportId,
          avaliacaoId,
          action,
        }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok || data?.success === false) {
        throw new Error(data?.message || data?.error || 'Não foi possível executar a ação.')
      }

      router.refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro inesperado ao moderar denúncia.'
      console.error('Erro ao executar ação de moderação:', error)
      setErrorMessage(message)
    } finally {
      setPendingAction(null)
    }
  }

  const isApprovePending = pendingAction === 'approve'
  const isRemovePending = pendingAction === 'remove'
  const isDisabled = pendingAction !== null

  return (
    <div className="mt-3 space-y-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => submitAction('approve')}
          disabled={isDisabled}
          className="rounded bg-green-600 px-3 py-1 text-sm font-semibold text-white transition hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isApprovePending ? 'Aprovando...' : 'Aprovar'}
        </button>

        <button
          type="button"
          onClick={() => submitAction('remove')}
          disabled={isDisabled || !avaliacaoId}
          className="rounded bg-red-600 px-3 py-1 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isRemovePending ? 'Removendo...' : 'Remover'}
        </button>
      </div>

      {errorMessage ? (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-xs leading-5 text-red-200">
          {errorMessage}
        </p>
      ) : null}
    </div>
  )
}
