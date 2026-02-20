'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

const criterios = [
  { key: 'comportamento', label: 'Comportamento' },
  { key: 'seguranca_emocional', label: 'Segurança Emocional' },
  { key: 'respeito', label: 'Respeito' },
  { key: 'carater', label: 'Caráter' },
  { key: 'confianca', label: 'Confiança' },
]

const flagsNegativas = [
  'mentiras_constantes',
  'manipulacao_emocional',
  'agressividade',
  'falta_de_respeito',
]

export default function AvaliarPage({ params }: { params: { id: string } }) {
  const supabase = createClientComponentClient()
  const router = useRouter()

  const [notas, setNotas] = useState<any>({
    comportamento: 0,
    seguranca_emocional: 0,
    respeito: 0,
    carater: 0,
    confianca: 0,
  })

  const [relato, setRelato] = useState('')
  const [flagsSelecionadas, setFlagsSelecionadas] = useState<string[]>([])
  const [anonimo, setAnonimo] = useState(true)
  const [loading, setLoading] = useState(false)

  const toggleFlag = (flag: string) => {
    setFlagsSelecionadas((prev) =>
      prev.includes(flag)
        ? prev.filter((f) => f !== flag)
        : [...prev, flag]
    )
  }

  const handleSubmit = async () => {
    setLoading(true)

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) {
      alert('Você precisa estar logada.')
      return
    }

    const { error } = await supabase.from('avaliacoes').insert({
      male_profile_id: params.id,
      user_id: session.user.id,
      publica: true,
      is_anonymous: anonimo,
      comportamento: notas.comportamento,
      seguranca_emocional: notas.seguranca_emocional,
      respeito: notas.respeito,
      carater: notas.carater,
      confianca: notas.confianca,
      relato: relato,
      flags_negative: flagsSelecionadas,
    })

    setLoading(false)

    if (error) {
      console.error(error)
      alert('Erro ao publicar avaliação')
      return
    }

    router.push(`/consultar-reputacao/${params.id}`)
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 max-w-md mx-auto">

      <h1 className="text-xl font-semibold mb-6">
        Avaliar Perfil
      </h1>

      {criterios.map((c) => (
        <div key={c.key} className="mb-4">
          <label className="block text-sm mb-2">{c.label}</label>
          <input
            type="range"
            min="0"
            max="5"
            value={notas[c.key]}
            onChange={(e) =>
              setNotas({ ...notas, [c.key]: Number(e.target.value) })
            }
            className="w-full"
          />
          <div className="text-sm text-yellow-400">
            {notas[c.key]}/5
          </div>
        </div>
      ))}

      <div className="mt-6">
        <label className="block text-sm mb-2">
          Relato
        </label>
        <textarea
          value={relato}
          onChange={(e) => setRelato(e.target.value)}
          className="w-full bg-[#111] border border-gray-700 p-3 rounded-lg"
        />
      </div>

      <div className="mt-6">
        <p className="text-sm mb-2">Alertas</p>
        <div className="flex flex-wrap gap-2">
          {flagsNegativas.map((flag) => (
            <button
              key={flag}
              onClick={() => toggleFlag(flag)}
              className={`px-3 py-1 rounded-full text-xs border ${
                flagsSelecionadas.includes(flag)
                  ? 'bg-red-600 text-white border-red-600'
                  : 'border-gray-600 text-gray-400'
              }`}
            >
              {flag.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 flex items-center gap-2">
        <input
          type="checkbox"
          checked={anonimo}
          onChange={() => setAnonimo(!anonimo)}
        />
        <span className="text-sm">Avaliação anônima</span>
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="mt-8 w-full bg-yellow-500 text-black font-bold py-3 rounded-xl"
      >
        {loading ? 'Publicando...' : 'Publicar Avaliação'}
      </button>

    </div>
  )
}
