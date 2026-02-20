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

const greenFlags = [
  'comunicacao_clara',
  'escuta_ativa',
  'respeita_limites',
  'controle_emocional',
  'empatia',
  'maturidade_emocional',
  'assume_erros',
  'cumpre_combinados',
  'transparencia',
  'coerencia',
  'nao_faz_jogos',
  'responsavel',
  'respeitoso',
  'confiavel',
]

const redFlags = [
  'mentiras_constantes',
  'manipulacao_emocional',
  'desrespeito',
  'agressividade',
  'falta_de_respeito',
  'imaturidade_emocional',
  'traicao',
  'golpe_amoroso',
  'stalking',
  'comportamento_abusivo',
]

export default function AvaliarPerfilPage({ params }: { params: { id: string } }) {
  const supabase = createClientComponentClient()
  const router = useRouter()

  const [notas, setNotas] = useState<any>({
    comportamento: 0,
    seguranca_emocional: 0,
    respeito: 0,
    carater: 0,
    confianca: 0,
  })

  const [greens, setGreens] = useState<string[]>([])
  const [reds, setReds] = useState<string[]>([])
  const [relato, setRelato] = useState('')
  const [anonimo, setAnonimo] = useState(true)
  const [loading, setLoading] = useState(false)

  const toggle = (value: string, list: string[], setter: any) => {
    setter(
      list.includes(value)
        ? list.filter((v) => v !== value)
        : [...list, value]
    )
  }

  const handleSubmit = async () => {
    setLoading(true)

    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      alert('Você precisa estar logada.')
      return
    }

    // 🔹 1. Inserir avaliação
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
      relato,
      flags_positive: greens,
      flags_negative: reds,
    })

    if (error) {
      console.error(error)
      alert('Erro ao publicar avaliação')
      setLoading(false)
      return
    }

    // 🔹 2. Recalcular médias
    const { data: todas } = await supabase
      .from('avaliacoes')
      .select('*')
      .eq('male_profile_id', params.id)
      .eq('publica', true)

    if (todas && todas.length > 0) {

      const total = todas.length

      const soma = (campo: string) =>
        todas.reduce((acc, item) => acc + (item[campo] || 0), 0)

      const mediaComportamento = soma('comportamento') / total
      const mediaSeguranca = soma('seguranca_emocional') / total
      const mediaRespeito = soma('respeito') / total
      const mediaCarater = soma('carater') / total
      const mediaConfianca = soma('confianca') / total

      const mediaGeral =
        (mediaComportamento +
          mediaSeguranca +
          mediaRespeito +
          mediaCarater +
          mediaConfianca) / 5

      // 🔹 3. Atualizar perfil
      await supabase
        .from('male_profiles')
        .update({
          media_comportamento: mediaComportamento,
          media_seguranca_emocional: mediaSeguranca,
          media_respeito: mediaRespeito,
          media_carater: mediaCarater,
          media_confianca: mediaConfianca,
          media_geral: mediaGeral,
          total_avaliacoes: total,
        })
        .eq('id', params.id)
    }

    setLoading(false)
    router.push(`/consultar-reputacao/${params.id}`)
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 max-w-md mx-auto">

      <h1 className="text-2xl font-semibold mb-8">
        Nova Avaliação
      </h1>

      {criterios.map((c) => (
        <div key={c.key} className="mb-6">
          <label className="block mb-2">{c.label}</label>
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
          <div className="text-yellow-400 text-sm">
            {notas[c.key]}/5
          </div>
        </div>
      ))}

      <div className="mb-8">
        <h2 className="mb-3 text-green-400">Green Flags</h2>
        <div className="flex flex-wrap gap-2">
          {greenFlags.map((flag) => (
            <button
              key={flag}
              onClick={() => toggle(flag, greens, setGreens)}
              className={`px-3 py-1 text-xs rounded-full border ${
                greens.includes(flag)
                  ? 'bg-green-600 border-green-600'
                  : 'border-gray-600 text-gray-400'
              }`}
            >
              {flag.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-8">
        <h2 className="mb-3 text-red-400">Red Flags</h2>
        <div className="flex flex-wrap gap-2">
          {redFlags.map((flag) => (
            <button
              key={flag}
              onClick={() => toggle(flag, reds, setReds)}
              className={`px-3 py-1 text-xs rounded-full border ${
                reds.includes(flag)
                  ? 'bg-red-600 border-red-600'
                  : 'border-gray-600 text-gray-400'
              }`}
            >
              {flag.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <label className="block mb-2">Relato</label>
        <textarea
          value={relato}
          onChange={(e) => setRelato(e.target.value)}
          className="w-full bg-[#111] border border-gray-700 p-3 rounded-lg"
        />
      </div>

      <div className="flex items-center gap-2 mb-8">
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
        className="w-full bg-yellow-500 text-black font-bold py-3 rounded-xl"
      >
        {loading ? 'Publicando...' : 'Publicar Avaliação'}
      </button>
    </div>
  )
}
