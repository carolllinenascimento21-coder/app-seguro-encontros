import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function AvaliarPerfil({
  params,
}: {
  params: { id: string }
}) {
  const { data: profile } = await supabase
    .from('male_profiles')
    .select('id, display_name, city')
    .eq('id', params.id)
    .single()

  if (!profile) return notFound()

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <h1 className="text-2xl font-bold mb-2">
        Avaliar {profile.display_name}
      </h1>
      <p className="text-gray-400 mb-6">{profile.city}</p>

      {/* Aqui você renderiza seu formulário de avaliação */}
    </div>
  )
}
