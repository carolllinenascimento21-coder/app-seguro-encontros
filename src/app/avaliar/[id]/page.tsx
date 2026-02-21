'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Star } from 'lucide-react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

type MaleProfile = {
  id: string
  display_name: string | null
  city: string | null
}

export default function AvaliarPerfilExistentePage() {
  const supabase = createClientComponentClient()
  const params = useParams()
  const router = useRouter()

  const [profile, setProfile] = useState<MaleProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const [notas, setNotas] = useState({
    comportamento: 0,
    seguranca_emocional: 0,
    respeito: 0,
    carater: 0,
    confianca: 0,
  })

  const [greenFlags, setGreenFlags] = useState<string[]>([])
  const [redFlags, setRedFlags] = useState<string[]>([])
  const [relato, setRelato] = useState('')
  const [anonimo, setAnonimo] = useState(false)

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true)

      const { data, error } = await supabase
        .from('male_profiles')
        .select('id, display_name, city')
        .eq('id', params?.id)
        .single()

      if (error) {
        console.error(error)
        setProfile(null)
      } else {
        setProfile(data)
      }

      setLoading(false)
    }

    if (params?.id) {
      fetchProfile()
    }
  }, [params?.id, supabase])

  const calcularMedia = () => {
    const valores = Object.values(notas)
    const soma = valores.reduce((acc, val) => acc + val, 0)
    return soma / valores.length
  }

  const publicarAvaliacao = async () => {
    const media = calcularMedia()

    const { error } = await supabase.from('avaliacoes').insert({
      male_profile_id: profile?.id,
      comportamento: notas.comportamento,
      seguranca_emocional: notas.seguranca_emocional,
      respeito: notas.respeito,
      carater: notas.carater,
      confianca: notas.confianca,
      media_geral: media,
      green_flags: greenFlags,
      red_flags: redFlags,
      relato,
      anonimo,
    })

    if (error) {
      console.error(error)
      alert('Erro ao publicar avaliação')
      return
    }

    router.push(`/consultar-reputacao/${profile?.id}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Carregando...
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Perfil não encontrado
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <div className="max-w-md mx-auto px-4 pt-8">

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#D4AF37]">
            Avaliar Perfil
          </h1>
          <p className="text-white/60 mt-2">
            Avalie com responsabilidade.
          </p>
        </div>

        {/* Perfil avaliado */}
        <div className="bg-[#1A1A1A] p-5 rounded-xl border border-gray-800 mb-8">
          <div className="text-sm text-white/50">Perfil avaliado</div>

          <div className="mt-1 text-lg font-semibold">
            {profile.display_name || 'Nome não informado'}
          </div>

          <div className="mt-1 text-sm text-white/60">
            {profile.city || 'Cidade não informada'}
          </div>
        </div>

        {/* Avaliação por estrelas */}
        {Object.keys(notas).map((categoria) => (
          <div
            key={categoria}
            className="bg-[#1A1A1A] p-4 rounded-xl border border-gray-800 mb-4"
          >
            <div className="flex justify-between items-center">
              <span className="capitalize">
                {categoria.replace('_', ' ')}
              </span>

              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((estrela) => (
                  <Star
                    key={estrela}
                    size={18}
                    onClick={() =>
                      setNotas({
                        ...notas,
                        [categoria]: estrela,
                      })
                    }
                    className={
                      estrela <= (notas as any)[categoria]
                        ? 'text-[#D4AF37] fill-[#D4AF37]'
                        : 'text-gray-600'
                    }
                  />
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* Relato */}
        <div className="bg-[#1A1A1A] p-4 rounded-xl border border-gray-800 mb-4">
          <textarea
            value={relato}
            onChange={(e) => setRelato(e.target.value)}
            placeholder="Conte o relato com contexto e fatos importantes"
            className="w-full bg-transparent outline-none text-sm"
            rows={4}
          />
        </div>

        {/* Anônimo */}
        <div className="mb-6">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={anonimo}
              onChange={() => setAnonimo(!anonimo)}
            />
            Avaliar de forma anônima
          </label>
        </div>

        {/* Botão */}
        <button
          onClick={publicarAvaliacao}
          className="w-full bg-[#D4AF37] text-black font-bold py-3 rounded-lg"
        >
          Publicar Avaliação
        </button>
      </div>
    </div>
  )
}
