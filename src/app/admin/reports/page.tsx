import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'
import ModerationActionButtons from '@/components/admin/ModerationActionButtons'

export const dynamic = 'force-dynamic'

// 🔐 Controle de admin (LGPD + Play Store)
function isAdminEmail(email?: string | null) {
  return email === 'privacidade@confiamais.net'
}

export default async function AdminReportsPage() {
  const cookieStore = cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const supabaseAdmin = getSupabaseAdminClient()

  if (!supabaseAdmin) {
    return (
      <div className="p-6 text-white">
        Erro: Supabase Admin não configurado.
      </div>
    )
  }

  // 🔐 Autenticação
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')
  if (!isAdminEmail(user.email)) redirect('/')

  // 📊 Buscar denúncias + dados relacionados
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
        rating,
        created_at
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div className="p-6 text-red-500">
        Erro ao carregar denúncias: {error.message}
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-black p-6 text-white">
      <h1 className="text-2xl font-bold mb-6 text-[#D4AF37]">
        Painel de Moderação
      </h1>

      <div className="space-y-4">
        {reports?.length === 0 && (
          <p className="text-zinc-400">Nenhuma denúncia encontrada.</p>
        )}

        {reports?.map((report) => (
          <div
            key={report.id}
            className="border border-zinc-800 rounded-xl p-4 bg-zinc-900"
          >
            {/* STATUS */}
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-zinc-400">
                {new Date(report.created_at).toLocaleString()}
              </span>

              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  report.status === 'pendente'
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-green-500/20 text-green-400'
                }`}
              >
                {report.status || 'pendente'}
              </span>
            </div>

            {/* MOTIVO */}
            <p className="text-sm text-red-400 font-semibold">
              Motivo: {report.motivo}
            </p>

            {/* TEXTO DA AVALIAÇÃO */}
            <div className="mt-3 text-sm text-zinc-300">
              <p className="italic">
                "{report.avaliacoes?.review_text || 'Sem texto'}"
              </p>

              <p className="text-xs text-zinc-500 mt-1">
                ⭐ {report.avaliacoes?.rating || 0}
              </p>
            </div>

            {/* IDs técnicos */}
            <div className="mt-2 text-xs text-zinc-600">
              <p>Report ID: {report.id}</p>
              <p>Avaliação ID: {report.avaliacao_id}</p>
              <p>User ID: {report.user_id}</p>
            </div>

            {/* AÇÕES ADMIN */}
            <div className="mt-4">
              <ModerationActionButtons
                reportId={report.id}
                avaliacaoId={report.avaliacao_id}
              />
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
