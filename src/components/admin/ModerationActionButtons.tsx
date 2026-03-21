'use client'

import { createSupabaseClient } from '@/lib/supabase/browser'

export default function ModerationActionButtons({
  reportId,
  avaliacaoId,
}: {
  reportId: string
  avaliacaoId: string
}) {
  const supabase = createSupabaseClient()

  async function handleApprove() {
    try {
      // Marca denúncia como resolvida
      await supabase
        .from('reportes_ugc')
        .update({ status: 'resolvido' })
        .eq('id', reportId)

      // Log da ação
      await supabase.from('moderation_actions').insert({
        report_id: reportId,
        action: 'approve',
      })

      window.location.reload()
    } catch (err) {
      console.error(err)
      alert('Erro ao aprovar')
    }
  }

  async function handleRemove() {
    try {
      // 🔥 NÃO deletar — apenas esconder conteúdo
      await supabase
        .from('avaliacoes')
        .update({ relato: '[REMOVIDO PELA MODERAÇÃO]' })
        .eq('id', avaliacaoId)

      // Marca denúncia como resolvida
      await supabase
        .from('reportes_ugc')
        .update({ status: 'resolvido' })
        .eq('id', reportId)

      // Log da ação
      await supabase.from('moderation_actions').insert({
        report_id: reportId,
        action: 'remove',
      })

      window.location.reload()
    } catch (err) {
      console.error(err)
      alert('Erro ao remover')
    }
  }

  return (
    <div className="flex gap-2 mt-3">
      <button
        onClick={handleApprove}
        className="bg-green-600 px-3 py-1 rounded"
      >
        Aprovar
      </button>

      <button
        onClick={handleRemove}
        className="bg-red-600 px-3 py-1 rounded"
      >
        Remover
      </button>
    </div>
  )
}
