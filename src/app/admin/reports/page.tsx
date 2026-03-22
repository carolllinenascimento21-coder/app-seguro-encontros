'use client'

import { useEffect, useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase/browser'

type Report = {
  id: string
  reason: string
  status: string
  content: string
  created_at: string
  male_profiles: {
    nome: string | null
    city: string | null
  } | null
}

export default function ReportsPage() {
  const supabase = createSupabaseClient()

  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchReports() {
    setLoading(true)

    const { data, error } = await supabase
      .from('reports')
      .select(`
        id,
        reason,
        status,
        content,
        created_at,
        male_profiles (
          nome,
          city
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao buscar denúncias:', error)
    } else {
      setReports(data || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchReports()
  }, [])

  async function handleAction(reportId: string, action: 'approve' | 'remove') {
    try {
      // 1️⃣ registra ação
      await supabase.from('moderation_actions').insert({
        report_id: reportId,
        action,
        created_at: new Date().toISOString(),
      })

      // 2️⃣ atualiza status
      await supabase
        .from('reports')
        .update({ status: action === 'approve' ? 'aprovado' : 'removido' })
        .eq('id', reportId)

      // 3️⃣ NÃO remove da tela — só recarrega
      fetchReports()
    } catch (err) {
      console.error('Erro na ação:', err)
    }
  }

  if (loading) {
    return <p style={{ color: 'white' }}>Carregando...</p>
  }

  return (
    <div style={{ padding: 20, background: '#000', minHeight: '100vh' }}>
      <h1 style={{ color: 'yellow' }}>Painel de Denúncias</h1>

      {reports.length === 0 && (
        <p style={{ color: 'white' }}>Nenhuma denúncia encontrada</p>
      )}

      {reports.map((report) => (
        <div
          key={report.id}
          style={{
            background: '#111',
            borderRadius: 10,
            padding: 20,
            marginTop: 20,
            color: 'white',
          }}
        >
          {/* 👇 NOME + CIDADE CORRETOS */}
          <h3>
            {report.male_profiles?.nome || 'Sem nome'} -{' '}
            {report.male_profiles?.city || 'Sem cidade'}
          </h3>

          <p>
            <strong>Motivo:</strong> {report.reason}
          </p>

          <p>
            <strong>Status:</strong> {report.status}
          </p>

          <p>{report.content}</p>

          <div style={{ marginTop: 10 }}>
            <button
              onClick={() => handleAction(report.id, 'approve')}
              style={{
                background: 'green',
                color: 'white',
                padding: '8px 12px',
                marginRight: 10,
                border: 'none',
                borderRadius: 5,
              }}
            >
              Aprovar
            </button>

            <button
              onClick={() => handleAction(report.id, 'remove')}
              style={{
                background: 'red',
                color: 'white',
                padding: '8px 12px',
                border: 'none',
                borderRadius: 5,
              }}
            >
              Remover
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
