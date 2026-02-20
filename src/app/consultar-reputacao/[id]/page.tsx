import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Star, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

function getStatusBadge(media: number) {
  if (media <= 2) return { label: 'Perigo', color: 'bg-red-600' }
  if (media <= 3) return { label: 'Atenção', color: 'bg-orange-500' }
  if (media <= 4) return { label: 'Confiável', color: 'bg-yellow-500' }
  return { label: 'Excelente', color: 'bg-green-600' }
}

export default async function PerfilPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createServerComponentClient({ cookies })

  const { data: perfil } = await supabase
    .from('male_profiles')
    .select('*')
    .eq('id', params.id)
    .single()

  const { data: avaliacoes } = await supabase
    .from('avaliacoes')
    .select('*')
    .eq('male_profile_id', params.id)

  if (!perfil) {
    return <div className="text-white p-10">Perfil não encontrado</div>
  }

  const totalAvaliacoes = avaliacoes?.length ?? 0
  const somaEstrelas =
    avaliacoes?.reduce((acc, a) => acc + (a.media_geral ?? 0), 0) ?? 0

  const mediaGeral =
    totalAvaliacoes > 0 ? somaEstrelas / totalAvaliacoes : 0

  const status = getStatusBadge(mediaGeral)

  // Média por categoria
  const categorias = [
    'comportamento',
    'seguranca_emocional',
    'respeito',
    'carater',
    'confianca',
  ]

  const mediasCategorias: any = {}

  categorias.forEach((cat) => {
    const soma =
      avaliacoes?.reduce((acc, a) => acc + (a[cat] ?? 0), 0) ?? 0
    mediasCategorias[cat] =
      totalAvaliacoes > 0 ? soma / totalAvaliacoes : 0
  })

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <div className="max-w-md mx-auto px-4 pt-6">

        <Link href="/consultar-reputacao" className="text-sm text-gray-400">
          ← Voltar
        </Link>

        {/* CARD 1 - IDENTIFICAÇÃO */}
        <div className="mt-4 bg-[#111] border border-gray-800 p-5 rounded-xl relative">

          <div className={`absolute top-4 right-4 px-3 py-1 text-xs rounded-full text-white ${status.color}`}>
            {status.label}
          </div>

          <h1 className="text-xl font-bold">
            {perfil.display_name}
          </h1>

          <p className="text-gray-400 text-sm">
            {perfil.city}
          </p>

        </div>

        {/* CARD 2 - SCORE */}
        <div className="mt-6 bg-gradient-to-br from-[#1a1a1a] to-[#111] border border-yellow-600/30 p-6 rounded-xl text-center">

          <div className="flex justify-center items-center gap-2 text-[#D4AF37]">
            <Star size={28} fill="currentColor" />
            <span className="text-4xl font-bold">
              {mediaGeral.toFixed(1)}
            </span>
          </div>

          <p className="text-gray-400 text-sm mt-2">
            {totalAvaliacoes} avaliações
          </p>

          <p className="text-xs text-gray-500 mt-1">
            Soma total das estrelas: {somaEstrelas.toFixed(1)}
          </p>

        </div>

        {/* CARD 3 - ALERTAS */}
        {perfil.flags_negative?.length > 0 && (
          <div className="mt-6 bg-red-900/30 border border-red-600 p-5 rounded-xl">

            <div className="flex items-center gap-2 text-red-400 font-bold mb-3">
              <AlertTriangle size={16} />
              Possíveis Alertas de Segurança
            </div>

            <ul className="space-y-2 text-sm text-red-300">
              {perfil.flags_negative.map((f: string) => (
                <li key={f}>• {f}</li>
              ))}
            </ul>

          </div>
        )}

        {/* CARD 4 - MÉDIA POR CATEGORIA */}
        <div className="mt-8 bg-[#111] border border-gray-800 p-5 rounded-xl">

          <h2 className="text-yellow-500 font-semibold mb-4">
            Média por Categoria
          </h2>

          {categorias.map((cat) => (
            <div key={cat} className="mb-3">

              <div className="flex justify-between text-sm mb-1">
                <span className="capitalize">
                  {cat.replace('_', ' ')}
                </span>
                <span className="text-yellow-400">
                  {mediasCategorias[cat].toFixed(1)}/5
                </span>
              </div>

              <div className="w-full bg-gray-800 h-2 rounded-full">
                <div
                  className="bg-yellow-500 h-2 rounded-full"
                  style={{
                    width: `${(mediasCategorias[cat] / 5) * 100}%`,
                  }}
                />
              </div>

            </div>
          ))}

        </div>

        {/* CARD 5 - RELATOS */}
        <div className="mt-8 space-y-4">

          <h2 className="text-yellow-500 font-semibold">
            Relatos das Usuárias
          </h2>

          {avaliacoes?.map((a) => (
            <div
              key={a.id}
              className="bg-[#111] border border-gray-800 p-4 rounded-xl"
            >

              <div className="flex items-center gap-2 text-[#D4AF37] font-bold text-sm">
                <Star size={14} fill="currentColor" />
                {a.media_geral?.toFixed(1)}
              </div>

              <p className="text-sm text-gray-300 mt-2">
                {a.notas}
              </p>

              <p className="text-xs text-gray-500 mt-2">
                {new Date(a.created_at).toLocaleDateString()}
              </p>

            </div>
          ))}

        </div>

        <Link
          href={`/avaliar/${perfil.id}`}
          className="mt-10 block text-center bg-[#D4AF37] text-black font-bold py-3 rounded-lg hover:opacity-90 transition"
        >
          Avaliar Este Perfil
        </Link>

      </div>
    </div>
  )
}
