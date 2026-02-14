'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'

export default function AvaliarPerfil() {
  const { id } = useParams()
  const router = useRouter()

  const [criterios, setCriterios] = useState({
    comportamento: 0,
    seguranca_emocional: 0,
    respeito: 0,
    carater: 0,
    confianca: 0,
  })

  const publicar = async () => {
    const res = await fetch('/api/avaliacoes/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        male_profile_id: id,
        ...criterios,
      }),
    })

    if (res.ok) {
      router.push(`/consultar-reputacao/${id}`)
    }
  }

  return (
    <div className="p-6 text-white">
      <h1 className="text-xl font-bold mb-6">Avaliar Perfil</h1>

      {Object.keys(criterios).map((key) => (
        <div key={key} className="mb-4">
          <label>{key}</label>
          <input
            type="number"
            min="1"
            max="5"
            onChange={(e) =>
              setCriterios({
                ...criterios,
                [key]: Number(e.target.value),
              })
            }
            className="w-full bg-black border p-2"
          />
        </div>
      ))}

      <button
        onClick={publicar}
        className="bg-yellow-500 text-black px-6 py-3 rounded"
      >
        Publicar avaliação
      </button>
    </div>
  )
}
