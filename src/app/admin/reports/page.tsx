'use client'

import { useEffect, useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase/browser'

export default function ReportsPage() {
  const supabase = createSupabaseClient()
  const [reports, setReports] = useState<any[]>([])

  async function loadReports() {
    const { data, error } = await supabase
      .from('reports')
      .select(`
        id,
        reason,
        status,
        created_at,
        content,
        male_profile_id,
        male_profile_aliases (
          handle,
          platform
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error)
      return
    }

    setReports(data || [])
  }

  useEffect(() => {
    loadReports()
  }, [])

  async function handleAction(id: string, action: 'approve' | 'remove') {
    await supabase.from('moderation_actions').insert({
      report_id: id,
      action,
      created_at: new Date().toISOString(),
    })

    await supabase
      .from('reports')
      .update({ status: action === 'approve' ? 'approved' : 'removed' })
      .eq('id', id)

    loadReports()
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Painel de Denúncias</h1>

      {reports.map((report) => (
        <div key={report.id} style={{
          border: '1px solid #333',
          borderRadius: 10,
          padding: 15,
          marginBottom: 15
        }}>
          <h3>
            {report.male_profile_aliases?.handle || 'Sem nome'}
          </h3>

          <p><b>Plataforma:</b> {report.male_profile_aliases?.platform || '-'}</p>

          <p><b>Motivo:</b> {report.reason}</p>
          <p><b>Status:</b> {report.status}</p>
          <p>{report.content}</p>

          <button onClick={() => handleAction(report.id, 'approve')}>
            Aprovar
          </button>

          <button onClick={() => handleAction(report.id, 'remove')}>
            Remover
          </button>
        </div>
      ))}
    </div>
  )
}
