'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Star } from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabase'
import { GREEN_FLAGS, RED_FLAGS } from '@/lib/flags'

const supabase = createSupabaseClient()

const CRITERIOS = [
  { key: 'comportamento', label: 'Comportamento' },
  { key: 'seguranca_emocional', label: 'Segurança Emocional' },
  { key: 'respeito', label: 'Respeito' },
  { key: 'carater', label: 'Caráter' },
  { key: 'confianca', label: 'Confiança' },
] as const

type CriterioKey = (typeof CRITERIOS)[number]['key']

function Stars({
  value,
  onChange,
}: {
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="p-0.5"
          aria-label={`Nota ${n}`}
        >
          <Star
            className={[
              'w-6 h-6',
              n <= value ? 'text-[#D4AF37] fill-current' : 'text-gray-600',
            ].join(' ')}
          />
        </button>
      ))}
    </div>
  )
}

function Chip({
  label,
  active,
  onClick,
  tone,
}: {
  label: string
  active: boolean
  onClick: () => void
  tone: 'green' | 'red'
}) {
  const base =
    'px-3 py-1 rounded-lg text-xs border transition whitespace-nowrap'
  const activeCls =
    tone === 'green'
      ? 'bg-green-500/15 text-green-200 border-green-500/30'
      : 'bg-red-500/15 text-red-200 border-red-500/30'
  const idleCls = 'bg-[#111] text-gray-300 border-gray-800 hover:border-gray-700'
  return (
    <button type="button" onClick={onClick} className={`${base} ${active ? activeCls : idleCls}`}>
      {label}
    </button>
  )
}

export default function AvaliarClient() {
  const router = useRouter()

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

  const [greens, setGreens] = useState<string[]>([])
  const [reds, setReds] = useState<string[]>([])

  const [loading, setLoading] = useState(false)

  const canSubmit = useMemo(() => {
    const allRated = CRITERIOS.every(c => notas[c.key] >= 1 && notas[c.key] <= 5)
    return allRated && nome.trim().length >= 2 && cidade.trim().length >= 2 && !loading
  }, [notas, nome, cidade, loading])

  const toggleGreen = (f: string) => {
    setGreens(prev => (prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]))
  }

  const toggleRed = (f: string) => {
    setReds(prev => (prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]))
  }

  const publicar = async () => {
    try {
      setLoading(true)

      // 1) pega sessão no client (localStorage)
      const {
        data: { session },
        error: sessErr,
      } = await supabase.auth.getSession()

      if (sessErr) throw sessErr
      if (!session) {
        router.push('/login')
        return
      }

      // 2) manda token no header (resolve 401 quando cookie não existe)
      const payload = {
        anonimo,
        nome: nome.trim(),
        cidade: cidade.trim(),
        telefone: telefone.trim() || null,
        relato: relato.trim() || null,

        comportamento: notas.comportamento,
        seguranca_emocional: notas.seguranca_emocional,
        respeito: notas.respeito,
        carater: notas.carater,
        confianca: notas.confianca,

        flags_positive: greens,
        flags_negative: reds,
      }

      const res = await fetch('/api/avaliacoes/create', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        let msg = `Erro ao publicar (${res.status})`
        try {
          const j = await res.json()
          msg = j?.error || j?.message || msg
        } catch {}
        throw new Error(msg)
      }

      // sucesso
      router.push('/minhas-avaliacoes')
    } catch (e: any) {
      alert(e?.message || 'Erro ao publicar avaliação.')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black pb-24">
      <div className="px-4 pt-8 max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6">Nova Avaliação</h1>

        <div className="space-y-5">
          {CRITERIOS.map(c => (
            <div key={c.key} className="space-y-2">
              <p className="text-white text-sm font-semibold">{c.label}</p>
              <Stars
                value={notas[c.key]}
                onChange={v => setNotas(prev => ({ ...prev, [c.key]: v }))}
              />
            </div>
          ))}

          <input
            value={nome}
            onChange={e => setNome(e.target.value)}
            placeholder="Nome do homem"
            className="w-full bg-[#111] border border-gray-800 rounded-xl px-4 py-3 text-white outline-none"
          />

          <input
            value={cidade}
            onChange={e => setCidade(e.target.value)}
            placeholder="Cidade"
            className="w-full bg-[#111] border border-gray-800 rounded-xl px-4 py-3 text-white outline-none"
          />

          <input
            value={telefone}
            onChange={e => setTelefone(e.target.value)}
            placeholder="Telefone (opcional)"
            className="w-full bg-[#111] border border-gray-800 rounded-xl px-4 py-3 text-white outline-none"
          />

          <textarea
            value={relato}
            onChange={e => setRelato(e.target.value)}
            placeholder="Relato (opcional)"
            className="w-full bg-[#111] border border-gray-800 rounded-xl px-4 py-3 text-white outline-none min-h-[110px]"
          />

          {/* GREEN FLAGS */}
          <div className="space-y-2">
            <p className="text-green-400 font-semibold">Green Flags</p>
            <div className="flex flex-wrap gap-2">
              {GREEN_FLAGS.map(f => (
                <Chip
                  key={f}
                  label={f}
                  active={greens.includes(f)}
                  onClick={() => toggleGreen(f)}
                  tone="green"
                />
              ))}
            </div>
          </div>

          {/* RED FLAGS */}
          <div className="space-y-2">
            <p className="text-red-400 font-semibold">Red Flags</p>
            <div className="flex flex-wrap gap-2">
              {RED_FLAGS.map(f => (
                <Chip
                  key={f}
                  label={f}
                  active={reds.includes(f)}
                  onClick={() => toggleRed(f)}
                  tone="red"
                />
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-gray-200 text-sm">
            <input
              type="checkbox"
              checked={anonimo}
              onChange={e => setAnonimo(e.target.checked)}
            />
            Avaliar de forma anônima
          </label>

          <button
            onClick={publicar}
            disabled={!canSubmit}
            className={[
              'w-full font-bold py-3 rounded-xl',
              canSubmit ? 'bg-[#D4AF37] text-black' : 'bg-[#D4AF37]/40 text-black/60',
            ].join(' ')}
          >
            {loading ? 'Publicando...' : 'Publicar avaliação'}
          </button>
        </div>
      </div>
    </div>
  )
}
