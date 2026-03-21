import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import ModerationActionButtons from '@/components/admin/ModerationActionButtons'

export const dynamic = 'force-dynamic'

// 👉 ajuste aqui para seu email admin
function isAdminEmail(email?: string | null) {
  return email === 'seuemail@admin.com'
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

  // 🔐 usuário logado
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')
  if (!isAdminEmail(user.email)) redirect('/')

  // 📊 busca denúncias + join completo
  const { data: reports, error } = await supabase
    .from('reportes_ugc')
    .select(`
      id,
      motivo,
      status,
      created_at,
      avaliacao_id,
      user_id,
      avaliacao:avaliacao_id (
        id,
        review_text,
        male_profile_id
      ),
      user:user_id (
        email
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <main className="p-6 text-white">
        Erro ao carregar denúncias
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black text-white px-4 py-8">
      <div className="max-w-4xl mx-auto">

        {/* HEADER */}
        <h1 className="text-2xl font-bold text-[#D4AF37] mb-6">
          Painel de Moderação
        </h1>

        {/* LISTA */}
        <div className="space-y-4">
          {reports?.length === 0 && (
            <p className="text-zinc-400">Nenhuma denúncia encontrada.</p>
          )}

          {reports?.map((report) => (
            <div
              key={report.id}
              className="border border-zinc-800 rounded-xl p-4 bg-zinc-950"
            >
              {/* STATUS + DATA */}
              <div className="flex justify-between items-center mb-2">
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    report.status === 'pendente'
                      ? 'bg-yellow-600'
                      : report.status === 'resolvido'
                      ? 'bg-green-600'
                      : 'bg-red-600'
                  }`}
                >
                  {report.status}
                </span>

                <span className="text-xs text-zinc-400">
                  {new Date(report.created_at).toLocaleString()}
                </span>
              </div>

              {/* MOTIVO */}
              <p className="text-sm text-red-400 font-semibold">
                Motivo: {report.motivo}
              </p>

              {/* QUEM DENUNCIOU */}
              <p className="text-xs text-zinc-400 mt-1">
                Denunciado por: {report.user?.email || 'Desconhecido'}
              </p>

              {/* TEXTO DA AVALIAÇÃO */}
              <div className="mt-3 p-3 rounded bg-zinc-900 text-sm">
                {report.avaliacao?.review_text || 'Sem texto'}
              </div>

              {/* LINK PERFIL */}
              <a
                href={`/consultar-reputacao/${report.avaliacao?.male_profile_id}`}
                className="text-blue-400 text-xs underline mt-2 inline-block"
              >
                Ver perfil
              </a>

              {/* BOTÕES DE AÇÃO */}
              <ModerationActionButtons
                reportId={report.id}
                avaliacaoId={report.avaliacao_id}
              />
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
