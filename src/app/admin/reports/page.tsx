import { createServerClient } from '@/lib/supabase/server'

export default async function ReportsPage() {
  const supabase = createServerClient()

  // 1. Buscar denúncias
  const { data: reports, error: reportsError } = await supabase
    .from('reportes_ugc')
    .select('*')
    .order('created_at', { ascending: false })

  if (reportsError) {
    console.error(reportsError)
    return <div>Erro ao carregar denúncias</div>
  }

  if (!reports || reports.length === 0) {
    return <div>Nenhuma denúncia encontrada</div>
  }

  // 2. Buscar avaliações relacionadas
  const avaliacaoIds = reports.map((r) => r.avaliacao_id)

  const { data: avaliacoes } = await supabase
    .from('avaliacoes')
    .select('id, relato, notas, male_profile_id')
    .in('id', avaliacaoIds)

  const avaliacoesMap = new Map(
    (avaliacoes || []).map((a) => [a.id, a])
  )

  // 3. Buscar perfis
  const profileIds = (avaliacoes || []).map((a) => a.male_profile_id)

  const { data: profiles } = await supabase
    .from('male_profiles')
    .select('id, nome, city')
    .in('id', profileIds)

  const profilesMap = new Map(
    (profiles || []).map((p) => [p.id, p])
  )

  // 4. Montar dados seguros (ANTI-CRASH)
  const enriched = reports.map((r) => {
    const avaliacao = avaliacoesMap.get(r.avaliacao_id)

    if (!avaliacao) {
      return {
        ...r,
        nome: 'Avaliação removida',
        cidade: '-',
        texto: 'Avaliação não encontrada',
      }
    }

    const profile = profilesMap.get(avaliacao.male_profile_id)

    return {
      ...r,
      nome: profile?.nome || 'Sem nome',
      cidade: profile?.city || 'Sem cidade',
      texto: avaliacao.relato || avaliacao.notas || 'Sem texto',
    }
  })

  return (
    <div style={{ padding: 20 }}>
      <h1>Painel de Denúncias</h1>

      {enriched.map((r) => {
        if (!r) return null

        return (
          <div
            key={r.id}
            style={{
              border: '1px solid #333',
              padding: 12,
              marginBottom: 10,
              borderRadius: 8,
            }}
          >
            <strong>{r.nome}</strong> — {r.cidade}
            <p>{r.texto}</p>
            <small>Status: {r.status}</small>
          </div>
        )
      })}
    </div>
  )
}
