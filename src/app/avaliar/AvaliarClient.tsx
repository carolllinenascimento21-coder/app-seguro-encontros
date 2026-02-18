'use client'

import { useState } from 'react'
import { GREEN_FLAGS, RED_FLAGS } from '@/lib/flags'

type Notas = {
  comportamento: number
  seguranca_emocional: number
  respeito: number
  carater: number
  confianca: number
}

export default function AvaliarClient() {
  const [loading, setLoading] = useState(false)

  const [nome, setNome] = useState('')
  const [cidade, setCidade] = useState('')
  const [contato, setContato] = useState('')
  const [relato, setRelato] = useState('')
  const [anonimo, setAnonimo] = useState(false)

  const [notas, setNotas] = useState<Notas>({
    comportamento: 0,
    seguranca_emocional: 0,
    respeito: 0,
    carater: 0,
    confianca: 0,
  })

  const [greenFlags, setGreenFlags] = useState<string[]>([])
  const [redFlags, setRedFlags] = useState<string[]>([])

  const toggleFlag = (slug: string, type: 'green' | 'red') => {
    if (type === 'green') {
      setGreenFlags(prev =>
        prev.includes(slug)
          ? prev.filter(f => f !== slug)
          : [...prev, slug]
      )
    } else {
      setRedFlags(prev =>
        prev.includes(slug)
          ? prev.filter(f => f !== slug)
          : [...prev, slug]
      )
    }
  }

  const setNota = (key: keyof Notas, value: number) => {
    setNotas(prev => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async () => {
    try {
      setLoading(true)

      const response = await fetch('/api/avaliacoes/create', {
        method: 'POST',
        credentials: 'include', // 🔥 ESSENCIAL
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome,
          cidade,
          contato,
          relato,
          anonimo,
          notas,
          greenFlags,
          redFlags,
        }),
      })

      if (response.status === 401) {
        alert('Sessão inválida. Faça login novamente.')
        window.location.href = '/login'
        return
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao publicar')
      }

      alert('Avaliação publicada com sucesso!')
      window.location.href = '/'

    } catch (error: any) {
      console.error(error)
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto p-6 text-white space-y-6">

      <h1 className="text-2xl font-bold">Nova Avaliação</h1>

      {/* 1️⃣ Nome */}
      <input
        placeholder="Nome"
        value={nome}
        onChange={e => setNome(e.target.value)}
        className="w-full p-3 bg-zinc-900 rounded"
      />

      {/* 2️⃣ Cidade */}
      <input
        placeholder="Cidade"
        value={cidade}
        onChange={e => setCidade(e.target.value)}
        className="w-full p-3 bg-zinc-900 rounded"
      />

      {/* 3️⃣ Contato */}
      <input
        placeholder="Contato (telefone, instagram, etc)"
        value={contato}
        onChange={e => setContato(e.target.value)}
        className="w-full p-3 bg-zinc-900 rounded"
      />

      {/* 4️⃣ Estrelas */}
      {Object.keys(notas).map(key => (
        <div key={key}>
          <p className="capitalize">{key.replace('_', ' ')}</p>
          <div className="flex gap-2">
            {[1,2,3,4,5].map(n => (
              <button
                key={n}
                onClick={() => setNota(key as keyof Notas, n)}
                className={`text-xl ${notas[key as keyof Notas] >= n ? 'text-yellow-400' : 'text-gray-600'}`}
              >
                ★
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* 5️⃣ Green Flags */}
      <div>
        <h2 className="text-green-400 font-semibold">Green Flags</h2>
        <div className="flex flex-wrap gap-2 mt-2">
          {GREEN_FLAGS.map(flag => (
            <button
              key={flag.slug}
              onClick={() => toggleFlag(flag.slug, 'green')}
              className={`px-3 py-1 rounded border ${
                greenFlags.includes(flag.slug)
                  ? 'bg-green-600'
                  : 'bg-zinc-800'
              }`}
            >
              {flag.label}
            </button>
          ))}
        </div>
      </div>

      {/* 6️⃣ Red Flags */}
      <div>
        <h2 className="text-red-400 font-semibold">Red Flags</h2>
        <div className="flex flex-wrap gap-2 mt-2">
          {RED_FLAGS.map(flag => (
            <button
              key={flag.slug}
              onClick={() => toggleFlag(flag.slug, 'red')}
              className={`px-3 py-1 rounded border ${
                redFlags.includes(flag.slug)
                  ? 'bg-red-600'
                  : 'bg-zinc-800'
              }`}
            >
              {flag.label}
            </button>
          ))}
        </div>
      </div>

      {/* 7️⃣ Relato */}
      <textarea
        placeholder="Relato"
        value={relato}
        onChange={e => setRelato(e.target.value)}
        className="w-full p-3 bg-zinc-900 rounded"
      />

      {/* 8️⃣ Anônimo */}
      <label className="flex gap-2 items-center">
        <input
          type="checkbox"
          checked={anonimo}
          onChange={e => setAnonimo(e.target.checked)}
        />
        Avaliar de forma anônima
      </label>

      {/* 9️⃣ Botão */}
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full bg-yellow-500 text-black font-bold p-3 rounded"
      >
        {loading ? 'Publicando...' : 'Publicar avaliação'}
      </button>
    </div>
  )
}
