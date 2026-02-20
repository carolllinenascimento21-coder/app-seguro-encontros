import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Star, ShieldAlert } from 'lucide-react'

type Avaliacao = {
  id: string
  created_at: string
  publica: boolean
  is_anonymous: boolean
  comportamento: number | null
  seguranca_emocional: number | null
  respeito: number | null
  carater: number | null
  confianca: number | null
  relato: string | null
  flags_negative: string[] | null
  flags_positive: string[] | null
}

const categorias = [
  { key: 'comportamento', label: 'Comportamento' },
  { key: 'seguranca_emocional', label: 'Segurança Emocional' },
  { key: 'respeito', label: 'Respeito' },
  { key: 'carater', label: 'Caráter' },
  { key: 'confianca', label: 'Confiança' },
]

function calcularMediaIndividual(a: Avaliacao) {
  const valores = [
    a.comportamento,
    a.seguranca_emocional,
    a.respeito,
    a.carater,
    a.confianca,
  ].filter((v): v is number => typeof v === 'number')

  if (valores.length === 0) return 0
  return valores.reduce((acc, v) => acc + v, 0) / valores.length
}

function statusLabel(media: number) {
  if (media >= 4.2) return { text: 'Excelente', color: 'bg-green-600' }
  if (media >= 3.2) return { text: 'Confiável', color: 'bg-yellow-600' }
  if (media >= 2.2) return { text: 'Atenção', color: 'bg-orange-600' }
  return { text: 'Perigo', color: 'bg-red-600' }
}

export default async function Page({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createServerComponentClient({ cookies })

  // sessão
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.user) redirect('/login')

  // verificação plano REAL do seu banco
  const { data: me } = await supabase
    .from('profiles')
    .select('has_active_plan, subscription_status')
    .eq('id', session.user.id)
    .single()

  const hasActive =
    me?.has_active_plan === true &&
    me?.subscription_status === 'active'

  if (!hasActive) redirect('/planos')

  // perfil homem
  const { data: perfil } = await supabase
    .from('male_profiles')
    .select('id, display_name, city')
    .eq('id', params.id)
    .single()

  if (!perfil) {
    return <div className="text-white p-10">Perfil não encontrado</div>
  }

  // avaliações públicas
  const { data: avaliacoes } = await supabase
    .from('avaliacoes')
    .select(`
      id,
      created_at,
      publica,
      is_anonymous,
      comportamento,
      seguranca_emocional,
      respeito,
      carater,
      confianca,
      relato,
      flags_negative,
      flags_positive
    `)
    .eq('male_profile_id', params.id)
    .eq('publica', true)
    .order('created_at', { ascending: false })

  const lista = avaliacoes ?? []

  const mediasIndividuais = lista.map(calcularMediaIndividual)

  const totalAvaliacoes = lista.length

  const mediaGeral =
    totalAvaliacoes > 0
      ? mediasIndividuais.reduce((a, b) => a + b, 0) / totalAvaliacoes
      : 0

  const somaEstrelas = mediasIndividuais.reduce((a, b) => a + b, 0)

  const status = statusLabel(mediaGeral)

  // médias por categoria
  const mediasCategorias: any = {}

  categorias.forEach((cat) => {
    const valores = lista
      .map((a: any) => a[cat.key])
      .filter((v: any) => typeof v === 'number')

    mediasCategorias[cat.key] =
      valores.length > 0
        ? valores.reduce((a: number, b: number) => a + b, 0) /
          valores.length
        : 0
  })

  // alertas
  const contadorFlags: Record<string, number> = {}

  lista.forEach((a) => {
    a.flags_negative?.forEach((f: string) => {
      contadorFlags[f] = (contadorFlags[f] || 0) + 1
    })
  })

  const alertasOrdenados = Object.entries(contadorFlags).sort(
    (a, b) => b[1] - a[1]
  )

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <div className="max-w-md mx-auto px-4 pt-6">

        <Link href="/consultar-reputacao" className="text-gray-400 text-sm">
          ← Voltar
        </Link>

        {/* CARD 1 */}
        <div className="mt-4 bg-[#111] p-5 rounded-2xl border border-gray-800 relative">
          <div
            className={`absolute top-4 right-4 px-3 py-1 text-xs rounded-full text-white ${status.color}`}
          >
            {status.text}
          </div>

          <h1 className="text-xl font-semibold">
            {perfil.display_name}
          </h1>
          <p className="text-gray-400 text-sm">
            {perfil.city ?? 'Cidade não informada'}
          </p>
        </div>

        {/* CARD 2 */}
        <div className="mt-5 bg-[#111] border border-yellow-600/40 rounded-2xl p-6 text-center">
          <div className="flex justify-center items-center gap-2 text-yellow-400">
            <Star size={28} fill="currentColor" />
            <span className="text-4xl font-bold">
              {mediaGeral.toFixed(1)}
            </span>
          </div>

          <p className="text-sm text-gray-400 mt-2">
            {totalAvaliacoes} avaliações
          </p>

          <p className="text-xs text-gray-500 mt-1">
            Soma total das estrelas: {somaEstrelas.toFixed(1)}
          </p>
        </div>

        {/* CARD 3 ALERTAS */}
        <div className="mt-6 bg-[#111] border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 text-red-400 font-semibold">
            <ShieldAlert size={16} />
            Alertas de Segurança
          </div>

          {alertasOrdenados.length === 0 ? (
            <p className="text-gray-500 text-sm mt-3">
              Nenhum alerta registrado.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {alertasOrdenados.map(([flag, qtd]) => (
                <div
                  key={flag}
                  className="flex justify-between bg-black/40 p-3 rounded-lg border border-gray-800"
                >
                  <span className="text-red-300 capitalize">
                    {flag.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-gray-400">
                    citado {qtd}x
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CARD 4 MÉDIA POR CATEGORIA */}
        <div className="mt-6 bg-[#111] border border-gray-800 rounded-2xl p-5">
          <h2 className="text-yellow-400 font-semibold mb-4">
            Média por Categoria
          </h2>

          {categorias.map((cat) => (
            <div key={cat.key} className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span>{cat.label}</span>
                <span className="text-yellow-400">
                  {mediasCategorias[cat.key].toFixed(1)}/5
                </span>
              </div>

              <div className="w-full bg-gray-800 h-2 rounded-full">
                <div
                  className="bg-yellow-500 h-2 rounded-full"
                  style={{
                    width: `${(mediasCategorias[cat.key] / 5) * 100}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* CARD 5 RELATOS */}
        <div className="mt-6">
          <h2 className="text-yellow-400 font-semibold mb-4">
            Relatos das Usuárias
          </h2>

          {lista.length === 0 ? (
            <div className="text-gray-500 text-sm">
              Ainda não há relatos.
            </div>
          ) : (
            <div className="space-y-4">
              {lista.map((a) => (
                <div
                  key={a.id}
                  className="bg-[#111] border border-gray-800 p-5 rounded-2xl"
                >
                  <div className="flex justify-between items-center text-yellow-400 text-sm font-semibold">
                    <div className="flex items-center gap-1">
                      <Star size={14} fill="currentColor" />
                      {calcularMediaIndividual(a).toFixed(1)}
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(a.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>

                  {a.relato && (
                    <p className="text-sm text-gray-300 mt-3">
                      {a.relato}
                    </p>
                  )}

                  {a.flags_negative && a.flags_negative.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {a.flags_negative.map((flag) => (
                        <span
                          key={flag}
                          className="px-3 py-1 text-xs bg-red-600/20 text-red-400 rounded-full border border-red-600/30"
                        >
                          {flag.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="text-xs text-gray-500 mt-3">
                    {a.is_anonymous
                      ? 'Avaliação anônima'
                      : 'Avaliação identificada'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <Link
          href={`/avaliar/${perfil.id}`}
          className="mt-10 block text-center bg-yellow-500 text-black font-bold py-3 rounded-xl"
        >
          Avaliar Este Perfil
        </Link>
      </div>
    </div>
  )
}
