'use client'

import { useState } from 'react'

const MOTIVOS = [
  'Conteúdo ofensivo',
  'Informação falsa',
  'Difamação',
  'Outro',
]

type ReportReviewButtonProps = {
  avaliacaoId: string
}

export function ReportReviewButton({
  avaliacaoId,
}: ReportReviewButtonProps) {
  const [open, setOpen] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!motivo || loading) return

    setLoading(true)
    setError(null)
    setFeedback(null)

    try {
      const res = await fetch('/api/ugc/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ avaliacaoId, motivo }),
      })

      const data = (await res.json().catch(() => ({}))) as {
        message?: string
      }

      if (!res.ok) {
        setError(data.message ?? 'Não foi possível enviar a denúncia.')
        return
      }

      setFeedback(data.message ?? 'Denúncia enviada para moderação.')
      setOpen(false)
      setMotivo('')
    } catch {
      setError('Erro inesperado ao enviar denúncia.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Encontrou conteúdo falso, ofensivo ou difamatório? Envie para revisão da moderação."
        className="text-xs text-red-300 hover:text-red-200 underline"
      >
        Denunciar conteúdo
      </button>

      {feedback && (
        <p className="text-xs text-green-400 mt-2">{feedback}</p>
      )}

      {error && (
        <p className="text-xs text-red-400 mt-2">{error}</p>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-sm rounded-xl border border-gray-700 bg-[#111] p-4">
            <h3 className="text-sm font-semibold text-white">
              Denunciar conteúdo
            </h3>
            <p className="mt-2 text-xs text-gray-400">
              Selecione o motivo da denúncia para enviar à moderação.
            </p>

            <div className="mt-3 space-y-2">
              {MOTIVOS.map((item) => (
                <label key={item} className="flex items-center gap-2 text-sm text-gray-200">
                  <input
                    type="radio"
                    name={`motivo-${avaliacaoId}`}
                    value={item}
                    checked={motivo === item}
                    onChange={(e) => setMotivo(e.target.value)}
                  />
                  {item}
                </label>
              ))}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-gray-700 px-3 py-1 text-xs text-gray-300"
                onClick={() => {
                  if (loading) return
                  setOpen(false)
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!motivo || loading}
                onClick={handleSubmit}
                className="rounded-lg bg-red-500 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
              >
                {loading ? 'Enviando...' : 'Enviar denúncia'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
