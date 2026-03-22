import Link from 'next/link'
import { redirect } from 'next/navigation'

import { createServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'
import { ModerationActionButtons } from '@/components/admin/ModerationActionButtons'

export const dynamic = 'force-dynamic'

export default async function AdminReportsPage() {
  const supabase = await createServerClient()
  const supabaseAdmin = getSupabaseAdminClient()

  if (!supabaseAdmin) {
    return <div>Erro admin</div>
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  if (user.email !== 'privacidade@confiamais.net') {
    redirect('/')
  }

  // 🔥 BUSCA DENÚNCIAS
  const { data: reports, error } = await supabaseAdmin
    .from('reportes_ugc')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return <div>Erro: {error.message}</div>
  }

  if (!reports || reports.length === 0) {
    return <div>Nenhuma denúncia encontrada</div>
  }

  // 🔥 BUSCA AVALIAÇÕES
  const avaliacaoIds = reports
    .map((r) => r.avaliacao_id)
    .filter(Boolean)

  const { data: avaliacoes } = await supabaseAdmin
    .from('avaliacoes')
    .select('id, male_profile_id, relato, notas')
    .in('id', avaliacaoIds)

  // 🔥 MAPA DE AVALIAÇÕES
  const avaliacoesMap = new Map(
    avaliacoes?.map((a) => [a.id, a]) || []
  )

  // 🔥 BUSCA PERFIS
  const profileIds = avaliacoes
    ?.map((a) => a.male_profile_id)
    .filter(Boolean) || []

  const { data: profiles } = await supabaseAdmin
    .from('male_profiles')
    .select('id, nome, city')
    .in('id', profileIds)

  const profilesMap = new Map(
    profiles?.map((p) => [p.id, p]) || []
  )

  // 🔥 ENRIQUECER DADOS
  const enriched = reports.map((r) => {
    const avaliacao = avaliacoesMap.get(r.avaliacao_id)
    const profile = profilesMap.get(avaliacao?.male_profile_id)

    const texto =
      avaliacao?.relato ||
      avaliacao?.notas ||
      'Sem texto'

    return {
      ...r,
      nome: profile?.nome || 'Sem nome',
      cidade: profile?.city || 'Sem cidade',
      texto,
    }
  })

  return (
    <main className="p-6 text-white bg-black min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Painel de Denúncias</h1>

      {enriched.map((r) => (
        <div
          key={r.id}
          className="border border-zinc-700 p-4 rounded-xl mb-4"
        >
          <p className="font-bold text-lg">{r.nome}</p>
          <p className="text-sm text-zinc-400">{r.cidade}</p>

          <p className="mt-2 text-red-400">
            Motivo: {r.motivo}
          </p>

          <p className="mt-2 text-zinc-300">
            {r.texto}
          </p>

          <p className="text-xs text-zinc-500 mt-2">
            {new Date(r.created_at).toLocaleString('pt-BR')}
          </p>

          <div className="mt-3">
            <ModerationActionButtons
              reportId={r.id}
              avaliacaoId={r.avaliacao_id}
            />
          </div>
        </div>
      ))}
    </main>
  )
}
