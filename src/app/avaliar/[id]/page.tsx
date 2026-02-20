import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export default async function AvaliarPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createServerComponentClient({ cookies })

  const { data: perfil } = await supabase
    .from('male_profiles')
    .select('id, display_name, city')
    .eq('id', params.id)
    .single()

  if (!perfil) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Perfil não encontrado
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-md mx-auto px-4 pt-8">

        <h1 className="text-xl font-bold">
          Avaliar {perfil.display_name}
        </h1>

        <p className="text-gray-400 text-sm">
          {perfil.city ?? 'Cidade não informada'}
        </p>

        {/* Formulário aqui */}
        <div className="mt-6 bg-[#1A1A1A] p-5 rounded-xl border border-gray-800">
          <p className="text-sm text-gray-400">
            Formulário de avaliação em construção.
          </p>
        </div>

      </div>
    </div>
  )
}
