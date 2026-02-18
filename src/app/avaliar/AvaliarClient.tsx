'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Star } from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabase'
import { GREEN_FLAGS, RED_FLAGS } from '@/lib/flags'

const CRITERIOS = [
  { key: 'comportamento', label: 'Comportamento' },
  { key: 'seguranca_emocional', label: 'Segurança Emocional' },
  { key: 'respeito', label: 'Respeito' },
  { key: 'carater', label: 'Caráter' },
  { key: 'confianca', label: 'Confiança' },
] as const

type CriterioKey = (typeof CRITERIOS)[number]['key']

type FlagItem =
  | string
  | {
      slug: string
      label: string
    }

const supabase = createSupabaseClient()

function getFlagSlug(f: FlagItem) {
  return typeof f === 'string' ? f : f.slug
}

function getFlagLabel(f: FlagItem) {
  return typeof f === 'string' ? f : f.label
}

export default function AvaliarClient() {
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [anonimo, setAnonimo] = useState(false)

  const [nome, setNome] = useState('')
  const [cidade, setCidade] = useState('')
  const [telefone, setTelefone] = useState('')
  const [relato, setRelato] = useState('')

  const [notas, setNotas] = useState<Record<CriterioKey, number>>({
    comportamento: 0,
    seguranca_emocional: 0,
    respeito: 0,
    carater: 0,
    confianca: 0,
  })

  const [greenSelected, setGreenSelected] = useState<string[]>([])
  const [redSelected, setRedSelected] = useState<string[]>([])

  // Normaliza para garantir que mesmo se GREEN_FLAGS/RED_FLAGS vierem como objetos,
  // a UI renderiza label e salva slug.
  const greenFlags = useMemo(() => (GREEN_FLAGS as unknown as FlagItem[]) ?? [], [])
  const redFlags = useMemo(() => (RED_FLAGS as unknown as FlagItem[]) ?? [], [])

  useEffect(() => {
    // Se quiser obrigar login ao abrir a tela:
    // (mantém seu fluxo consistente com autor_id NOT NULL e evita 401)
    ;(async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) router.push('/login')
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function toggle(list: string[], setList: (v: string[]) => void, value: string) {
    if (list.includes(value)) setList(list.filter((x) => x !== value))
    else setList([...list, value])
  }

  function setNota(key: CriterioKey, value: number) {
    setNotas((prev) => ({ ...prev, [key]: value }))
  }

  function StarRow({ value, onChange }: { value: number; onChange: (n: number) => void }) {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className="p-0.5"
            aria-label={`Nota ${n}`}
          >
            <Star
              className={`w-6 h-6 ${
                n <= value ? 'text-[#D4AF37] fill-current' : 'text-gray-600'
              }`}
            />
          </button>
        ))}
      </div>
    )
  }

  async function handleSubmit() {
    try {
      setLoading(true)

      // validações básicas
      if (!nome.trim()) return alert('Informe o nome.')
      if (!cidade.trim()) return alert('Informe a cidade.')
      // telefone pode ser opcional, se quiser exigir: if (!telefone.trim()) return alert('Informe o telefone.')

      // garante sessão (evita 401)
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        alert('Você precisa estar logada para publicar.')
        router.push('/login')
        return
      }

      const payload = {
        nome: nome.trim(),
        cidade: cidade.trim(),
        telefone: telefone.trim() || null,
        relato: relato?.trim() || null,
        anonimo,
        flags_positive: greenSelected,
        flags_negative: redSelected,
        comportamento: notas.comportamento,
        seguranca_emocional: notas.seguranca_emocional,
        respeito: notas.respeito,
        carater: notas.carater,
        confianca: notas.confianca,
      }

      const res = await fetch('/api/avaliacoes/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // ✅ CORREÇÃO AQUI
        body: JSON.stringify(payload),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        if (res.status === 401) {
          alert('Sessão inválida. Faça login novamente.')
          router.push('/login')
          return
        }
        console.error('Erro create:', res.status, data)
        alert(data?.error || 'Erro ao publicar avaliação.')
        return
      }

      // sucesso
      router.push('/minhas-avaliacoes')
    } catch (e) {
      console.error(e)
      alert('Erro inesperado ao publicar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black pb-24">
      <div className="px-4 pt-8 max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6">Nova Avaliação</h1>

        <div className="space-y-5">
          {CRITERIOS.map((c) => (
            <div key={c.key}>
              <p className="text-white font-semibold mb-2">{c.label}</p>
              <StarRow value={notas[c.key]} onChange={(n) => setNota(c.key, n)} />
            </div>
          ))}

          <input
            className="w-full bg-[#1A1A1A] text-white rounded-xl px-4 py-3 outline-none border border-transparent focus:border-gray-700"
            placeholder="Nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />

          <input
            className="w-full bg-[#1A1A1A] text-white rounded-xl px-4 py-3 outline-none border border-transparent focus:border-gray-700"
            placeholder="Cidade"
            value={cidade}
            onChange={(e) => setCidade(e.target.value)}
          />

          <input
            className="w-full bg-[#1A1A1A] text-white rounded-xl px-4 py-3 outline-none border border-transparent focus:border-gray-700"
            placeholder="Telefone"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
          />

          {/* ✅ GREEN FLAGS */}
          <div>
            <p className="text-[#00ff7f] font-bold mb-2">Green Flags</p>
            <div className="flex flex-wrap gap-2">
              {greenFlags.map((f) => {
                const slug = getFlagSlug(f)
                const label = getFlagLabel(f)
                const active = greenSelected.includes(slug)
                return (
                  <button
                    key={slug}
                    type="button"
                    onClick={() => toggle(greenSelected, setGreenSelected, slug)}
                    className={`px-3 py-1.5 rounded-lg text-sm border ${
                      active
                        ? 'bg-[#00ff7f]/15 text-[#00ff7f] border-[#00ff7f]/40'
                        : 'bg-[#1A1A1A] text-gray-200 border-gray-700'
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ✅ RED FLAGS */}
          <div>
            <p className="text-red-400 font-bold mb-2">Red Flags</p>
            <div className="flex flex-wrap gap-2">
              {redFlags.map((f) => {
                const slug = getFlagSlug(f)
                const label = getFlagLabel(f)
                const active = redSelected.includes(slug)
                return (
                  <button
                    key={slug}
                    type="button"
                    onClick={() => toggle(redSelected, setRedSelected, slug)}
                    className={`px-3 py-1.5 rounded-lg text-sm border ${
                      active
                        ? 'bg-red-500/15 text-red-300 border-red-500/40'
                        : 'bg-[#1A1A1A] text-gray-200 border-gray-700'
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          <textarea
            className="w-full bg-[#1A1A1A] text-white rounded-xl px-4 py-3 outline-none border border-transparent focus:border-gray-700 min-h-[90px]"
            placeholder="Relato"
            value={relato}
            onChange={(e) => setRelato(e.target.value)}
          />

          <label className="flex items-center gap-2 text-gray-300 text-sm">
            <input
              type="checkbox"
              checked={anonimo}
              onChange={(e) => setAnonimo(e.target.checked)}
            />
            Avaliar de forma anônima
          </label>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-[#D4AF37] text-black font-bold py-3 rounded-xl disabled:opacity-60"
          >
            {loading ? 'Publicando...' : 'Publicar avaliação'}
          </button>
        </div>
      </div>
    </div>
  )
}
