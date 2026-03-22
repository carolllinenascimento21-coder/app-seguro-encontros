'use client'

import { useEffect, useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase/browser'

type Report = {
  id: string
  reason: string
  content: string
  created_at: string
  male_profile_id: string
}

type MaleProfile = {
  id: string
  nome: string | null
  city: string | null
}

export default function ReportsPage() {
  const supabase = createSupabaseClient()

  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchReports()
  }, [])

  async function fetchReports() {
    setLoading(true)

    // 🔹 1. Buscar denúncias
    const { data: reportsData, error } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao buscar denúncias:', error)
      setLoading(false)
      return
    }

    if (!reportsData || reportsData.length === 0) {
      setReports([])
      setLoading(false)
      return
    }

    // 🔹 2. Buscar perfis relacionados
    const ids = reportsData.map(r => r.male_profile_id)

    const { data: profiles } = await supabase
      .from('male_profiles')
      .select('id, nome, city')
      .in('id', ids)

    // 🔹 3. Mapear perfis por ID
    const profilesMap: Record<string, MaleProfile> = {}

    profiles?.forEach(p => {
      profilesMap[p.id] = p
    })

    // 🔹 4. Combinar dados
    const combined = reportsData.map(r => ({
      ...r,
      profile: profilesMap[r.male_profile_id] || null
    }))

    setReports(combined)
    setLoading(false)
  }

  async function handleAction(reportId: string, action: 'approve' | 'remove') {
    await supabase.from('moderation_actions').insert({
      report_id: reportId,
      action,
      created_at: new Date().toISOString()
    })

    fetchReports()
  }

  if (loading) return <p>Carregando...</p>

  if (reports.length === 0) {
    return <p>Nenhuma denúncia encontrada</p>
  }

  return (
    <div>
      <h1>Painel de Denúncias</h1>

      {reports.map(report => (
        <div key={report.id} style={{ border: '1px solid #333', padding: 16, marginBottom: 16 }}>
          
          <h3>
            {report.profile?.nome || 'Sem nome'} — {report.profile?.city || 'Sem cidade'}
          </h3>

          <p><strong>Motivo:</strong> {report.reason}</p>
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
