import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Star } from 'lucide-react'
import Link from 'next/link'

export default async function PerfilPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createServerComponentClient({ cookies })

  // 🔹 Buscar perfil
  const { data: perfil } = await supabase
    .from('male_profiles')
    .select('id, display_name, city')
    .eq('id', params.id)
    .single()

  if (!perfil) {
    return <div className="text-white p-6">Perfil não encontrado</div>
  }

  // 🔹 Buscar avaliações públicas
  const { data: avaliacoes } = await supabase
    .from('avaliacoes')
    .select(`
      id,
      comportamento,
      seguranca_emocional,
      respeito,
      carater,
      confianca,
      relato,
      created_at
    `)
    .eq('male_profile_id', params.id)
    .eq('publica', true)
    .order('created_at', { ascending: false })

  const total = avaliacoes?.length ?? 0

  let media = 0

  if (total > 0) {
    const soma = avaliacoes.reduce((acc, a) => {
      const individual =
        (a.comportamento +
          a.seguranca_emocional +
          a.respeito +
          a.carater +
          a.confianca) / 5

      return acc + individual
    }, 0)

    media = soma / total
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <div className="max-w-md mx-auto px-4 pt-6">

        <Link href="/consultar-reputacao" className="text-sm text-gray-400">
          ← Voltar
        </Link>

        {/* Perfil */}
        <div className="mt-4 bg-[#1A1A1A] p-5 rounded-xl border border-gray-800">
          <h1 className="text-xl font-bold">
            {perfil.display_name}
          </h1>

          <p className="text-gray-400 text-sm">
            {perfil.city ?? 'Cidade não informada'}
          </p>
        </div>

        {/* Média */}
        <div className="mt-6 bg-[#1A1A1A] p-6 rounded-xl border border-gray-800 text-center">
          <div className="flex justify-center items-center gap-2 text-[#D4AF37]">
            <Star size={28} fill="currentColor" />
            <span className="text-4xl font-bold">
              {media.toFixed(1)}
            </span>
          </div>

          <p className="text-gray-400 text-sm mt-2">
            {total} avaliações públicas
          </p>
        </div>

        {/* Relatos */}
        <div className="mt-8 space-y-4">
          {avaliacoes && avaliacoes.length > 0 ? (
            avaliacoes.map((a) => {
              const individual =
                (a.comportamento +
                  a.seguranca_emocional +
                  a.respeito +
                  a.carater +
                  a.confianca) / 5

              return (
                <div
                  key={a.id}
                  className="bg-[#1A1A1A] border border-gray-800 p-4 rounded-xl"
                >
                  <div className="flex items-center gap-2 text-[#D4AF37] font-bold">
                    <Star size={14} fill="currentColor" />
                    {individual.toFixed(1)}
                  </div>

                  {a.relato && (
                    <p className="text-sm text-gray-300 mt-2">
                      {a.relato}
                    </p>
                  )}

                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(a.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              )
            })
          ) : (
            <p className="text-gray-400 text-sm">
              Ainda não há avaliações públicas para este perfil.
            </p>
          )}
        </div>

        <Link
          href={`/avaliar/${perfil.id}`}
          className="mt-10 block text-center bg-[#D4AF37] text-black font-bold py-3 rounded-lg"
        >
          Avaliar Este Perfil
        </Link>

      </div>
    </div>
  )
}
