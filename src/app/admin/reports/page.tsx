import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'
import { isAdminEmail } from '@/lib/admin'
import ModerationActionButtons from '@/components/admin/ModerationActionButtons'

export const dynamic = 'force-dynamic'

type ReportRow = {
  id: string
  motivo: string
  status: string | null
  admin_note: string | null
  created_at: string
  avaliacao_id: string
  user_id: string
  avaliacoes:
    | {
        id: string
        review_text: string | null
        relato?: string | null
        notas?: string | null
        rating?: number | null
        created_at?: string | null
        male_profile_id?: string | null
      }
    | {
        id: string
        review_text: string | null
        relato?: string | null
        notas?: string | null
        rating?: number | null
        created_at?: string | null
        male_profile_id?: string | null
      }[]
    | null
}

function normalizeAvaliacao(avaliacoes: ReportRow['avaliacoes']) {
  if (!avaliacoes) return null
  return Array.isArray(avaliacoes) ? (avaliacoes[0] ?? null) : avaliacoes
}

function statusClass(status?: string | null) {
  if (status === 'removido') return 'bg-red-500/20 text-red-400'
  if (status === 'resolvido') return 'bg-green-500/20 text-green-400'
  return 'bg-yellow-500/20 text-yellow-400'
}

export default async function AdminReportsPage() {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )

  const supabaseAdmin = getSupabaseAdminClient()

  if (!supabaseAdmin) {
    return <div className="p-6 text-white">Supabase admin não configurado.</div>
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
      avaliacao_id,
      user_id,
      avaliacoes (
        id,
        review_text,
        relato,
        notas,
        rating,
        created_at,
        male_profile_id
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <main className="min-h-screen bg-black p-6 text-white">
        <div className="mx-auto max-w-4xl rounded-2xl border border-red-500/20 bg-zinc-950 p-6 text-red-400">
          Erro ao carregar denúncias: {error.message}
        </div>
      </main>
    )
  }

  const list = (reports ?? []) as ReportRow[]

  return (
    <main className="min-h-screen bg-black p-6 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D4AF37]">
            Confia+
          </p>
          <h1 className="mt-2 text-3xl font-bold text-[#D4AF37]">
            Painel de Moderação
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Revise denúncias, aprove registros e remova avaliações quando necessário.
          </p>
        </div>

        <div className="space-y-4">
          {list.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-zinc-400">
              Nenhuma denúncia encontrada.
            </div>
          ) : (
            list.map((report) => {
              const avaliacao = normalizeAvaliacao(report.avaliacoes)
              const texto =
                avaliacao?.review_text ??
                avaliacao?.relato ??
                avaliacao?.notas ??
                'Sem texto disponível'

              const perfilLink = avaliacao?.male_profile_id
                ? `/consultar-reputacao/${avaliacao.male_profile_id}`
                : null

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
                        {new Date(report.created_at).toLocaleString('pt-BR')}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(report.status)}`}
                    >
                      {report.status ?? 'pendente'}
                    </span>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-black/40 p-4">
                    <p className="text-sm italic text-zinc-200">"{texto}"</p>

                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-zinc-500">
                      <span>Rating: {Number(avaliacao?.rating ?? 0).toFixed(1)}</span>
                      <span>Report ID: {report.id}</span>
                      <span>Avaliação ID: {report.avaliacao_id}</span>
                      <span>User ID: {report.user_id}</span>
                    </div>

                    {perfilLink ? (
                      <a
                        href={perfilLink}
                        className="mt-3 inline-block text-xs text-blue-400 underline"
                      >
                        Ver perfil denunciado
                      </a>
                    ) : null}
                  </div>

                  {report.admin_note ? (
                    <p className="mt-3 text-xs text-zinc-400">
                      Observação admin: {report.admin_note}
                    </p>
                  ) : null}

                  <ModerationActionButtons
                    reportId={report.id}
                    avaliacaoId={report.avaliacao_id}
                  />
                </div>
              )
            })
          )}
        </div>
      </div>
    </main>
  )
}
