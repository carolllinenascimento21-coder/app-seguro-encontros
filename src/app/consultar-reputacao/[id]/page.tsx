import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Star, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

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
    .order('created_at', { ascending: false })

  if (!perfil) return <div className="text-white">Perfil não encontrado</div>

  return (
    <div className="min-h-screen bg-black text-white pb-24">

      <div className="max-w-md mx-auto px-4 pt-6">

        <Link href="/consultar-reputacao" className="text-sm text-gray-400">
          ← Voltar
        </Link>

        <div className="mt-4 bg-[#1A1A1A] p-5 rounded-xl border border-gray-800">

          <h1 className="text-xl font-bold">
            {perfil.display_name}
          </h1>

          <p className="text-gray-400 text-sm">
            {perfil.city}
          </p>

        </div>

        <div className="mt-6 bg-[#1A1A1A] p-6 rounded-xl border border-gray-800 text-center">

          <div className="flex justify-center items-center gap-2 text-[#D4AF37]">
            <Star size={28} fill="currentColor" />
            <span className="text-4xl font-bold">
              {perfil.media_geral?.toFixed(1) ?? '0.0'}
            </span>
          </div>

          <p className="text-gray-400 text-sm mt-2">
            {perfil.total_avaliacoes} avaliações • {perfil.confiabilidade_percentual}% confiável
          </p>

        </div>

        {perfil.flags_negative?.length > 0 && (
          <div className="mt-6 bg-red-900/40 border border-red-600 p-5 rounded-xl">
            <div className="flex items-center gap-2 text-red-400 font-bold">
              <AlertTriangle size={16} />
              Alertas de Segurança
            </div>

            <ul className="mt-3 text-sm text-red-300 space-y-2">
              {perfil.flags_negative.map((f: string) => (
                <li key={f}>• {f}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-8 space-y-4">

          {avaliacoes?.map((a) => (
            <div
              key={a.id}
              className="bg-[#1A1A1A] border border-gray-800 p-4 rounded-xl"
            >
              <div className="flex items-center gap-2 text-[#D4AF37] font-bold">
                <Star size={14} fill="currentColor" />
                {a.media_geral?.toFixed(1)}
              </div>

              <p className="text-sm text-gray-300 mt-2">
                {a.notas}
              </p>
            </div>
          ))}

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
