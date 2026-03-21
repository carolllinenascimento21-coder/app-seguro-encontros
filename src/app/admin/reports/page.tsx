import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'

export default async function AdminReportsPage() {
  const supabase = getSupabaseAdminClient()

  const { data: reports, error } = await supabase
    .from('reportes_ugc')
    .select(`
      id,
      motivo,
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
      <div className="text-red-500 p-4">
        Erro ao carregar denúncias: {error.message}
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-black p-6 text-white">
      <h1 className="text-2xl font-bold mb-6 text-[#D4AF37]">
        Denúncias de Conteúdo
      </h1>

      <div className="space-y-4">
        {reports?.map((report: any) => (
          <div
            key={report.id}
            className="border border-zinc-800 rounded-xl p-4 bg-zinc-900"
          >
            <p className="text-sm text-red-400 font-semibold">
              Motivo: {report.motivo}
            </p>

            <p className="text-sm text-zinc-400">
              Data: {new Date(report.created_at).toLocaleString()}
            </p>

            <div className="mt-3 text-sm text-zinc-300">
              <p className="italic">
                {report.avaliacoes?.relato || 'Sem texto'}
              </p>
            </div>

            <div className="mt-2 text-xs text-zinc-500">
              <p>Report ID: {report.id}</p>
              <p>Avaliação ID: {report.avaliacao_id}</p>
              <p>User ID: {report.user_id}</p>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
