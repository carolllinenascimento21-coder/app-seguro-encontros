import Link from 'next/link'
import { redirect } from 'next/navigation'

import { createServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'
import { ModerationActionButtons } from '@/components/admin/ModerationActionButtons'

export const dynamic = 'force-dynamic'

type ReportRow = {
  id: string
  motivo: string | null
  status: string | null
  created_at: string | null
  updated_at?: string | null
  avaliacao_id: string | null
  user_id: string | null
  admin_note?: string | null
  resolved_at?: string | null
  resolved_by?: string | null
}

type AvaliacaoRow = {
  id: string
  male_profile_id: string | null
  relato: string | null
  notas: string | null
  review_text?: string | null
}

type MaleProfileRow = {
  id: string
  nome: string | null
  display_name?: string | null
  city: string | null
}

function formatDate(value?: string | null) {
  if (!value) return 'Data indisponível'
  try {
    return new Date(value).toLocaleString('pt-BR')
  } catch {
    return 'Data indisponível'
  }
}

function getStatusLabel(status?: string | null) {
  if (status === 'resolvido') return 'Resolvido'
  if (status === 'removido') return 'Removido'
  return 'Pendente'
}

export default async function AdminReportsPage() {
  const supabase = await createServerClient()
  const supabaseAdmin = getSupabaseAdminClient()

  if (!supabaseAdmin) {
    return (
      <main className="min-h-screen bg-black p-6 text-white">
        <div className="mx-auto max-w-5xl rounded-2xl border border-red-900/40 bg-red-950/20 p-4 text-red-300">
          Serviço admin indisponível.
        </div>
      </main>
    )
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const adminEmail = user.email?.toLowerCase().trim()
  if (adminEmail !== 'privacidade@confiamais.net') {
    redirect('/')
  }

  const { data: reports, error: reportsError } = await supabaseAdmin
    .from('reportes_ugc')
    .select(`
      id,
      motivo,
      status,
      created_at,
      updated_at,
      avaliacao_id,
      user_id,
      admin_note,
      resolved_at,
      resolved_by
    `)
    .order('created_at', { ascending: false })

  if (reportsError) {
    return (
      <main className="min-h-screen bg-black p-6 text-white">
        <div className="mx-auto max-w-5xl rounded-2xl border border-red-900/40 bg-red-950/20 p-4 text-red-300">
          Erro ao carregar denúncias: {reportsError.message}
        </div>
      </main>
    )
  }

  const reportRows = (reports ?? []) as ReportRow[]

  const avaliacaoIds = Array.from(
    new Set(
      reportRows
        .map((item) => item.avaliacao_id)
        .filter((value): value is string => typeof value === 'string' && value.length > 0)
    )
  )

  let avaliacoesMap = new Map<string, AvaliacaoRow>()
  let maleProfilesMap = new Map<string, MaleProfileRow>()

  if (avaliacaoIds.length > 0) {
    const { data: avaliacoes, error: avaliacoesError } = await supabaseAdmin
      .from('avaliacoes')
      .select('id, male_profile_id, relato, notas, review_text')
      .in('id', avaliacaoIds)

    if (avaliacoesError) {
      return (
        <main className="min-h-screen bg-black p-6 text-white">
          <div className="mx-auto max-w-5xl rounded-2xl border border-red-900/40 bg-red-950/20 p-4 text-red-300">
            Erro ao carregar avaliações das denúncias: {avaliacoesError.message}
          </div>
        </main>
      )
    }

    const avaliacaoRows = (avaliacoes ?? []) as AvaliacaoRow[]
    avaliacoesMap = new Map(avaliacaoRows.map((item) => [item.id, item]))

    const maleProfileIds = Array.from(
      new Set(
        avaliacaoRows
          .map((item) => item.male_profile_id)
          .filter((value): value is string => typeof value === 'string' && value.length > 0)
      )
    )

    if (maleProfileIds.length > 0) {
      const { data: maleProfiles, error: maleProfilesError } = await supabaseAdmin
        .from('male_profiles')
        .select('id, nome, display_name, city')
        .in('id', maleProfileIds)

      if (maleProfilesError) {
        return (
          <main className="min-h-screen bg-black p-6 text-white">
            <div className="mx-auto max-w-5xl rounded-2xl border border-red-900/40 bg-red-950/20 p-4 text-red-300">
              Erro ao carregar perfis masculinos: {maleProfilesError.message}
            </div>
          </main>
        )
      }

      const profileRows = (maleProfiles ?? []) as MaleProfileRow[]
      maleProfilesMap = new Map(profileRows.map((item) => [item.id, item]))
    }
  }

  const enrichedReports = reportRows.map((report) => {
    const avaliacao = report.avaliacao_id ? avaliacoesMap.get(report.avaliacao_id) ?? null : null
    const maleProfile =
      avaliacao?.male_profile_id ? maleProfilesMap.get(avaliacao.male_profile_id) ?? null : null

    const profileName =
      maleProfile?.nome?.trim() ||
      maleProfile?.display_name?.trim() ||
      'Perfil sem nome'

    const profileCity = maleProfile?.city?.trim() || 'Cidade não informada'

    const reviewText =
      avaliacao?.relato?.trim() ||
      avaliacao?.review_text?.trim() ||
      avaliacao?.notas?.trim() ||
      'Sem texto informado'

    return {
      ...report,
      avaliacao,
      maleProfile,
      profileName,
      profileCity,
      reviewText,
    }
  })

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D4AF37]">
              Confia+
            </p>
            <h1 className="mt-2 text-3xl font-bold text-[#D4AF37]">Painel de Denúncias</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Revise denúncias enviadas pelas usuárias e decida pela aprovação ou remoção do conteúdo.
            </p>
          </div>

          <Link
            href="/"
            className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:border-zinc-500 hover:text-white"
          >
            Voltar ao app
          </Link>
        </div>

        {enrichedReports.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-zinc-300">
            Nenhuma denúncia encontrada.
          </div>
        ) : (
          <div className="space-y-4">
            {enrichedReports.map((report) => (
              <div
                key={report.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-[0_0_0_1px_rgba(212,175,55,0.05)]"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-3">
                    <div>
                      <p className="text-lg font-semibold text-white">{report.profileName}</p>
                      <p className="text-sm text-zinc-400">{report.profileCity}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 font-semibold text-red-300">
                        Motivo: {report.motivo || 'Não informado'}
                      </span>

                      <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-zinc-300">
                        Status: {getStatusLabel(report.status)}
                      </span>

                      <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-zinc-400">
                        {formatDate(report.created_at)}
                      </span>
                    </div>
                  </div>

                  <div className="md:min-w-[220px]">
                    <ModerationActionButtons
                      reportId={report.id}
                      avaliacaoId={report.avaliacao_id ?? ''}
                    />
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-zinc-800 bg-black/40 p-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Texto denunciado
                  </p>
                  <p className="text-sm leading-6 text-zinc-200">{report.reviewText}</p>
                </div>

                <div className="mt-4 grid gap-3 text-xs text-zinc-500 md:grid-cols-2">
                  <div className="rounded-xl border border-zinc-800 bg-black/30 p-3">
                    <p>Report ID: {report.id}</p>
                    <p>Avaliação ID: {report.avaliacao_id || 'Não informado'}</p>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-black/30 p-3">
                    <p>User ID: {report.user_id || 'Não informado'}</p>
                    <p>Atualizado em: {formatDate(report.updated_at)}</p>
                  </div>
                </div>

                {report.admin_note ? (
                  <div className="mt-4 rounded-xl border border-yellow-700/30 bg-yellow-500/5 p-3 text-sm text-yellow-200">
                    <span className="font-semibold">Observação admin:</span> {report.admin_note}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
