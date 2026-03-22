import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'
import * as ModerationActionButtonsModule from '@/components/admin/ModerationActionButtons'

export const dynamic = 'force-dynamic'

const ADMIN_EMAILS = ['privacidade@confiamais.net']

type ReportRow = {
  id: string
  avaliacao_id: string | null
  user_id: string | null
  motivo: string | null
  status: string | null
  admin_note: string | null
  created_at: string | null
  updated_at: string | null
  resolved_at: string | null
  resolved_by: string | null
}

type ReviewRow = {
  id: string
  male_profile_id: string | null
  relato: string | null
  notas: string | null
  created_at: string | null
}

type MaleProfileRow = {
  id: string
  name: string | null
  city: string | null
  display_name?: string | null
}

function normalizeEmail(email?: string | null) {
  return (email || '').trim().toLowerCase()
}

function isAllowedAdminEmail(email?: string | null) {
  const normalized = normalizeEmail(email)
  return ADMIN_EMAILS.includes(normalized)
}

function formatDate(value?: string | null) {
  if (!value) return 'Sem data'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Sem data'
  return date.toLocaleString('pt-BR')
}

function getStatusLabel(status?: string | null) {
  const normalized = (status || 'pendente').toLowerCase()

  switch (normalized) {
    case 'resolvido':
      return 'Resolvido'
    case 'removido':
      return 'Removido'
    case 'pendente':
    default:
      return 'Pendente'
  }
}

function getStatusClasses(status?: string | null) {
  const normalized = (status || 'pendente').toLowerCase()

  switch (normalized) {
    case 'resolvido':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
    case 'removido':
      return 'border-red-500/30 bg-red-500/10 text-red-300'
    case 'pendente':
    default:
      return 'border-amber-500/30 bg-amber-500/10 text-amber-300'
  }
}

const ModerationActionButtons =
  (ModerationActionButtonsModule as any).default ??
  (ModerationActionButtonsModule as any).ModerationActionButtons

export default async function AdminReportsPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/login?next=/admin/reports')
  }

  const userEmail = normalizeEmail(user.email)

  if (!isAllowedAdminEmail(userEmail)) {
    redirect('/')
  }

  const supabaseAdmin = getSupabaseAdminClient()

  if (!supabaseAdmin) {
    return (
      <main className="min-h-screen bg-black p-6 text-white">
        <div className="mx-auto max-w-6xl rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
          Serviço administrativo indisponível. Verifique a configuração do Supabase Admin.
        </div>
      </main>
    )
  }

  const { data: reportsData, error: reportsError } = await supabaseAdmin
    .from('reportes_ugc')
    .select(
      `
        id,
        avaliacao_id,
        user_id,
        motivo,
        status,
        admin_note,
        created_at,
        updated_at,
        resolved_at,
        resolved_by
      `
    )
    .order('created_at', { ascending: false })

  if (reportsError) {
    return (
      <main className="min-h-screen bg-black p-6 text-white">
        <div className="mx-auto max-w-6xl rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
          Erro ao carregar denúncias: {reportsError.message}
        </div>
      </main>
    )
  }

  const reports: ReportRow[] = Array.isArray(reportsData) ? reportsData : []

  const reviewIds = Array.from(
    new Set(reports.map((report) => report.avaliacao_id).filter(Boolean) as string[])
  )

  let reviewsById = new Map<string, ReviewRow>()
  let profilesById = new Map<string, MaleProfileRow>()

  if (reviewIds.length > 0) {
    const { data: reviewsData, error: reviewsError } = await supabaseAdmin
      .from('avaliacoes')
      .select('id, male_profile_id, relato, notas, created_at')
      .in('id', reviewIds)

    if (reviewsError) {
      return (
        <main className="min-h-screen bg-black p-6 text-white">
          <div className="mx-auto max-w-6xl rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
            Erro ao carregar avaliações denunciadas: {reviewsError.message}
          </div>
        </main>
      )
    }

    const reviews: ReviewRow[] = Array.isArray(reviewsData) ? reviewsData : []
    reviewsById = new Map(reviews.map((review) => [review.id, review]))

    const maleProfileIds = Array.from(
      new Set(reviews.map((review) => review.male_profile_id).filter(Boolean) as string[])
    )

    if (maleProfileIds.length > 0) {
      const { data: profilesData, error: profilesError } = await supabaseAdmin
        .from('male_profiles')
        .select('id, nome, city, display_name')
        .in('id', maleProfileIds)

      if (profilesError) {
        return (
          <main className="min-h-screen bg-black p-6 text-white">
            <div className="mx-auto max-w-6xl rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
              Erro ao carregar perfis masculinos: {profilesError.message}
            </div>
          </main>
        )
      }

      const profiles: MaleProfileRow[] = Array.isArray(profilesData) ? profilesData : []
      profilesById = new Map(profiles.map((profile) => [profile.id, profile]))
    }
  }

  const enrichedReports = reports.map((report) => {
    const review = report.avaliacao_id ? reviewsById.get(report.avaliacao_id) ?? null : null
    const profile =
      review?.male_profile_id ? profilesById.get(review.male_profile_id) ?? null : null

    const profileName =
      profile?.display_name?.trim() ||
      profile?.name?.trim() ||
      'Homem não identificado'

    const profileCity = profile?.city?.trim() || 'Cidade não informada'
    const reviewText = review?.relato?.trim() || review?.notas?.trim() || 'Sem texto'
    const reviewDate = formatDate(review?.created_at)

    return {
      ...report,
      review,
      profile,
      profileName,
      profileCity,
      reviewText,
      reviewDate,
    }
  })

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#D4AF37]">
              Confia+
            </p>
            <h1 className="mt-2 text-3xl font-bold text-[#D4AF37]">Painel de Denúncias</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Moderadora logada: <span className="text-zinc-200">{userEmail}</span>
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-300">
            Total de denúncias: <span className="font-semibold text-white">{enrichedReports.length}</span>
          </div>
        </header>

        {enrichedReports.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-zinc-300">
            Nenhuma denúncia encontrada.
          </div>
        ) : (
          <div className="grid gap-4">
            {enrichedReports.map((report) => (
              <article
                key={report.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-3 py-1 text-xs font-semibold text-[#D4AF37]">
                        Motivo: {report.motivo || 'Não informado'}
                      </span>

                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClasses(
                          report.status
                        )}`}
                      >
                        {getStatusLabel(report.status)}
                      </span>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-xl border border-zinc-800 bg-black/40 p-3">
                        <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                          Perfil denunciado
                        </p>
                        <p className="mt-1 font-semibold text-white">{report.profileName}</p>
                        <p className="text-sm text-zinc-400">{report.profileCity}</p>
                      </div>

                      <div className="rounded-xl border border-zinc-800 bg-black/40 p-3">
                        <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                          Data da denúncia
                        </p>
                        <p className="mt-1 text-sm text-zinc-200">{formatDate(report.created_at)}</p>
                      </div>

                      <div className="rounded-xl border border-zinc-800 bg-black/40 p-3">
                        <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                          Data da avaliação
                        </p>
                        <p className="mt-1 text-sm text-zinc-200">{report.reviewDate}</p>
                      </div>

                      <div className="rounded-xl border border-zinc-800 bg-black/40 p-3">
                        <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                          IDs técnicos
                        </p>
                        <p className="mt-1 break-all text-xs text-zinc-400">
                          Report: {report.id}
                        </p>
                        <p className="mt-1 break-all text-xs text-zinc-400">
                          Avaliação: {report.avaliacao_id || 'N/A'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-xl border border-zinc-800 bg-black/40 p-4">
                      <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                        Texto denunciado
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-200">
                        {report.reviewText}
                      </p>
                    </div>

                    {report.admin_note ? (
                      <div className="mt-4 rounded-xl border border-blue-500/20 bg-blue-500/10 p-4">
                        <p className="text-[11px] uppercase tracking-wide text-blue-300">
                          Observação administrativa
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-blue-100">
                          {report.admin_note}
                        </p>
                      </div>
                    ) : null}
                  </div>

                  <aside className="w-full lg:max-w-[260px]">
                    <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4">
                      <p className="text-sm font-semibold text-white">Ações de moderação</p>
                      <p className="mt-1 text-xs leading-5 text-zinc-400">
                        Aprovar mantém o conteúdo visível e marca a denúncia como resolvida.
                        Remover exclui a avaliação denunciada.
                      </p>

                      <div className="mt-4">
                        {ModerationActionButtons ? (
                          <ModerationActionButtons
                            reportId={report.id}
                            avaliacaoId={report.avaliacao_id || ''}
                          />
                        ) : (
                          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-200">
                            Componente de ação não encontrado.
                          </div>
                        )}
                      </div>

                      {report.resolved_at ? (
                        <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-xs text-zinc-400">
                          Resolvido em: {formatDate(report.resolved_at)}
                        </div>
                      ) : null}
                    </div>
                  </aside>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
