'use client'

import { useState } from 'react'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Star } from 'lucide-react'

export default function AvaliarPage({
  params,
}: {
  params: { id: string }
}) {
  const [form, setForm] = useState({
    comportamento: 3,
    seguranca_emocional: 3,
    respeito: 3,
    carater: 3,
    confianca: 3,
    relato: '',
    flags: [] as string[],
    anonima: true,
  })

  const categorias = [
    { key: 'comportamento', label: 'Comportamento' },
    { key: 'seguranca_emocional', label: 'Segurança Emocional' },
    { key: 'respeito', label: 'Respeito' },
    { key: 'carater', label: 'Caráter' },
    { key: 'confianca', label: 'Confiança' },
  ]

  const flagsOptions = [
    'Manipulação emocional',
    'Mentiras constantes',
    'Agressividade',
    'Falta de respeito',
    'Controle excessivo',
  ]

  const media =
    (form.comportamento +
      form.seguranca_emocional +
      form.respeito +
      form.carater +
      form.confianca) / 5

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-md mx-auto px-4 pt-8 pb-24">

        <h1 className="text-xl font-bold mb-1">
          Avaliar Perfil
        </h1>

        <p className="text-gray-400 text-sm mb-6">
          Sua avaliação ajuda outras mulheres a tomarem decisões mais seguras.
        </p>

        {/* MÉDIA */}
        <div className="bg-gradient-to-br from-[#1a1a1a] to-[#111] border border-yellow-600/30 rounded-xl p-6 text-center mb-8">
          <div className="flex justify-center items-center gap-2 text-[#D4AF37]">
            <Star size={24} fill="currentColor" />
            <span className="text-3xl font-bold">
              {media.toFixed(1)}
            </span>
          </div>
          <p className="text-gray-400 text-sm mt-1">Média da avaliação</p>
        </div>

        {/* CATEGORIAS */}
        <div className="space-y-6">
          {categorias.map((cat) => (
            <div key={cat.key}>
              <div className="flex justify-between mb-1 text-sm">
                <span>{cat.label}</span>
                <span className="text-yellow-400">
                  {(form as any)[cat.key]}/5
                </span>
              </div>

              <input
                type="range"
                min="1"
                max="5"
                value={(form as any)[cat.key]}
                onChange={(e) =>
                  setForm({
                    ...form,
                    [cat.key]: Number(e.target.value),
                  })
                }
                className="w-full accent-yellow-500"
              />
            </div>
          ))}
        </div>

        {/* RELATO */}
        <div className="mt-8">
          <label className="text-sm text-gray-400">
            Relato da experiência
          </label>

          <textarea
            value={form.relato}
            onChange={(e) =>
              setForm({ ...form, relato: e.target.value })
            }
            className="w-full mt-2 bg-[#111] border border-gray-800 rounded-lg p-3 text-sm focus:border-yellow-500 outline-none"
            rows={4}
            placeholder="Descreva sua experiência com esse perfil..."
          />
        </div>

        {/* FLAGS */}
        <div className="mt-8">
          <p className="text-sm text-gray-400 mb-3">
            Alertas de comportamento (opcional)
          </p>

          <div className="flex flex-wrap gap-2">
            {flagsOptions.map((flag) => {
              const active = form.flags.includes(flag)

              return (
                <button
                  key={flag}
                  onClick={() => {
                    if (active) {
                      setForm({
                        ...form,
                        flags: form.flags.filter((f) => f !== flag),
                      })
                    } else {
                      setForm({
                        ...form,
                        flags: [...form.flags, flag],
                      })
                    }
                  }}
                  className={`px-3 py-1 rounded-full text-xs transition ${
                    active
                      ? 'bg-red-600 text-white'
                      : 'bg-[#1a1a1a] border border-gray-700 text-gray-400'
                  }`}
                >
                  {flag}
                </button>
              )
            })}
          </div>
        </div>

        {/* ANÔNIMA */}
        <div className="mt-8 flex items-center justify-between">
          <span className="text-sm text-gray-400">
            Avaliação anônima
          </span>

          <input
            type="checkbox"
            checked={form.anonima}
            onChange={() =>
              setForm({ ...form, anonima: !form.anonima })
            }
            className="accent-yellow-500"
          />
        </div>

        {/* BOTÃO */}
        <button
          className="mt-10 w-full bg-[#D4AF37] text-black font-bold py-3 rounded-lg hover:opacity-90 transition"
        >
          Publicar Avaliação
        </button>

      </div>
    </div>
  )
}
