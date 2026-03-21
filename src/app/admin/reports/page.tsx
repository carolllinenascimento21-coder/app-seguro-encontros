import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'
import ModerationActionButtons from '@/components/admin/ModerationActionButtons'

export default async function AdminReportsPage() {
  const supabase = await createServerClient()

  // 🔐 pega usuário logado
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirect('/login')
  }

  // 🔐 proteção admin REAL
  if (user.email !== 'privacidade@confiamais.net') {
    return redirect('/')
  }

  // 🔥 usa admin client (bypass RLS)
  const admin = getSupabaseAdminClient()

  const { data: reports, error } = await admin
    .from('reports_ugc')
    .select(`
      id,
      motivo,
      status,
      created_at,
      user_id,
      avaliacao_id,
      avaliacoes (
        id,
        relato
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
    <main className="min-h-screen bg-black text-white p-6">
      <h1 className="text-2xl font-bold mb-6 text-[#D4AF37]">
        Painel de Denúncias
      </h1>

      <div className="space-y-4">
        {reports?.map((report: any) => (
          <div
            key={report.id}
            className="bg-zinc-900 p-4 rounded-xl border border-zinc-800"
          >
            <p className="text-red-400 font-semibold">
              Motivo: {report.motivo}
            </p>

            <p className="text-xs text-zinc-400">
              Status: {report.status || 'pendente'}
            </p>

            <p className="text-xs text-zinc-500">
              {new Date(report.created_at).toLocaleString()}
            </p>

            <div className="mt-3 text-sm italic text-zinc-300">
              {report.avaliacoes?.relato || 'Sem texto'}
            </div>

            <ModerationActionButtons
              reportId={report.id}
              avaliacaoId={report.avaliacao_id}
            />
          </div>
        ))}
      </div>
    </main>
  )
}
