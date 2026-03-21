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
      // Atualiza status
      await supabase
        .from('reportes_ugc')
        .update({ status: 'resolvido' })
        .eq('id', reportId)

      // Log
      await supabase.from('moderation_actions').insert({
        report_id: reportId,
        action: 'approve',
      })

      location.reload()
    } catch (err) {
      console.error(err)
      alert('Erro ao aprovar')
    }
  }

  async function handleRemove() {
    try {
      // Remove avaliação
      await supabase
        .from('avaliacoes')
        .delete()
        .eq('id', avaliacaoId)

      // Atualiza denúncia
      await supabase
        .from('reportes_ugc')
        .update({ status: 'resolvido' })
        .eq('id', reportId)

      // Log
      await supabase.from('moderation_actions').insert({
        report_id: reportId,
        action: 'remove',
      })

      location.reload()
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
