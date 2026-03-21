import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'
import { isAdminEmail } from '@/lib/admin'
import { ModerationActionButtons } from '@/components/admin/ModerationActionButtons'

export const dynamic = 'force-dynamic'

export default async function AdminReportsPage() {
  const supabase = await createServerClient()
  const supabaseAdmin = getSupabaseAdminClient()

  if (!supabaseAdmin) {
    return <div className="p-8 text-white">Serviço indisponível.</div>
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')
  if (!isAdminEmail(user.email)) redirect('/')

  const { data: reports, error } = await supabaseAdmin
    .from('reportes_ugc')
    .select(`
      id,
      motivo,
      status,
      admin_note,
      created_at,
      updated_at,
      avaliacao_id,
      user_id
    `)
    .order('created_at', { ascending: false })

  if (error) {
    return <div className="p-8 text-white">Erro ao carregar denúncias.</div>
  }

  const avaliacaoIds = (reports ?? []).map((r) => r.avaliacao_id).filter(Boolean)

  const { data: avaliacoes } = await supabaseAdmin
    .from('avaliacoes')
    .select('id, review_text, relato, notas, male_profile_id, created_at')
    .in('id', avaliacaoIds)

  const maleProfileIds = (avaliacoes ?? []).map((a) => a.male_profile_id).filter(Boolean)

  const { data: maleProfiles } = await supabaseAdmin
    .from('male_profiles')
    .select('id, display_name, city')
    .in('id', maleProfileIds)

  const avaliacaoMap = new Map((avaliacoes ?? []).map((a) => [a.id, a]))
  const profileMap = new Map((maleProfiles ?? []).map((p) => [p.id, p]))

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 text-2xl font-bold text-[#D4AF37]">
          Moderação de denúncias
        </h1>

        <div className="space-y-4">
          {(reports ?? []).length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-zinc-400">
              Nenhuma denúncia encontrada.
            </div>
          ) : (
            reports!.map((report) => {
              const avaliacao = avaliacaoMap.get(report.avaliacao_id)
              const perfil = avaliacao ? profileMap.get(avaliacao.male_profile_id) : null
              const texto =
                avaliacao?.review_text ?? avaliacao?.relato ?? avaliacao?.notas ?? 'Sem texto'

              return (
                <div
                  key={report.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5"
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-red-400">
                        Motivo: {report.motivo}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        Status: {report.status}
                      </p>
                    </div>
                    <p className="text-xs text-zinc-500">
                      {new Date(report.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-black/40 p-4">
                    <p className="text-sm text-zinc-200">{texto}</p>
                    <div className="mt-3 text-xs text-zinc-400">
                      Perfil: {perfil?.display_name ?? 'Perfil não encontrado'} •{' '}
                      {perfil?.city ?? 'Cidade não informada'}
                    </div>
                  </div>

                  {report.admin_note && (
                    <p className="mt-3 text-xs text-zinc-400">
                      Observação admin: {report.admin_note}
                    </p>
                  )}

                  <div className="mt-4">
                    <ModerationActionButtons
                      reportId={report.id}
                      avaliacaoId={report.avaliacao_id}
                    />
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </main>
  )
}
