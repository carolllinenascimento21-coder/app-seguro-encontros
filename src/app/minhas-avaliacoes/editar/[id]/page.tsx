'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Star, AlertTriangle, Save, Loader2 } from 'lucide-react'
import Navbar from '@/components/custom/navbar'
import { createSupabaseClient } from '@/lib/supabase'

const supabase = createSupabaseClient()

export default function EditarAvaliacao() {
  const router = useRouter()
  const params = useParams()
  const avaliacaoId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [maleProfileId, setMaleProfileId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    nome: '',
    cidade: '',
    comportamento: 0,
    seguranca_emocional: 0,
    respeito: 0,
    carater: 0,
    confianca: 0,
    relato: '',
    flags_negative: [] as string[],
    flags_positive: [] as string[],
  })

  const categorias = [
    { key: 'comportamento', label: 'Comportamento' },
    { key: 'seguranca_emocional', label: 'Segurança Emocional' },
    { key: 'respeito', label: 'Respeito' },
    { key: 'carater', label: 'Caráter' },
    { key: 'confianca', label: 'Confiança' },
  ]

  useEffect(() => {
    loadAvaliacao()
  }, [avaliacaoId])

  const loadAvaliacao = async () => {
    try {
      setLoading(true)

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('avaliacoes')
        .select(`
          id,
          male_profile_id,
          relato,
          flags_positive,
          flags_negative,
          comportamento,
          seguranca_emocional,
          respeito,
          carater,
          confianca,
          male_profiles (
            id,
            display_name,
            city
          )
        `)
        .eq('id', avaliacaoId)
        .eq('author_id', session.user.id)
        .single()

      if (error) throw error

      if (!data) {
        router.push('/minhas-avaliacoes')
        return
      }

      setMaleProfileId(data.male_profile_id)

      setFormData({
        nome: data.male_profiles?.display_name || '',
        cidade: data.male_profiles?.city || '',
        comportamento: data.comportamento ?? 0,
        seguranca_emocional: data.seguranca_emocional ?? 0,
        respeito: data.respeito ?? 0,
        carater: data.carater ?? 0,
        confianca: data.confianca ?? 0,
        relato: data.relato || '',
        flags_negative: data.flags_negative || [],
        flags_positive: data.flags_positive || [],
      })
    } catch (error) {
      console.error('Erro ao carregar avaliação:', error)
      router.push('/minhas-avaliacoes')
    } finally {
      setLoading(false)
    }
  }

  const handleRating = (categoria: string, valor: number) => {
    setFormData((prev) => ({ ...prev, [categoria]: valor }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setSaving(true)

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.push('/login')
        return
      }

      // 1️⃣ Atualiza avaliação
      const { error: avaliacaoError } = await supabase
        .from('avaliacoes')
        .update({
          relato: formData.relato || null,
          flags_positive: formData.flags_positive,
          flags_negative: formData.flags_negative,
          comportamento: formData.comportamento,
          seguranca_emocional: formData.seguranca_emocional,
          respeito: formData.respeito,
          carater: formData.carater,
          confianca: formData.confianca,
        })
        .eq('id', avaliacaoId)
        .eq('author_id', session.user.id)

      if (avaliacaoError) throw avaliacaoError

      // 2️⃣ Atualiza male_profiles
      if (maleProfileId) {
        const { error: profileError } = await supabase
          .from('male_profiles')
          .update({
            display_name: formData.nome,
            city: formData.cidade || null,
          })
          .eq('id', maleProfileId)

        if (profileError) throw profileError
      }

      router.push('/minhas-avaliacoes')
    } catch (error) {
      console.error('Erro ao atualizar avaliação:', error)
      alert('Erro ao atualizar avaliação.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <header className="border-b border-[#D4AF37]/20 sticky top-0 z-40">
        <div className="max-w-md mx-auto px-4 py-4">
          <button
            onClick={() => router.push('/minhas-avaliacoes')}
            className="flex items-center gap-2 text-[#D4AF37]"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Voltar</span>
          </button>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-[#D4AF37] mb-6">
          Editar Avaliação
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <input
            value={formData.nome}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, nome: e.target.value }))
            }
            className="w-full bg-white/5 border rounded-xl px-4 py-3"
            placeholder="Nome"
          />

          <input
            value={formData.cidade}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, cidade: e.target.value }))
            }
            className="w-full bg-white/5 border rounded-xl px-4 py-3"
            placeholder="Cidade"
          />

          {categorias.map((categoria) => (
            <div key={categoria.key}>
              <p className="mb-2">{categoria.label}</p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((v) => (
                  <Star
                    key={v}
                    onClick={() => handleRating(categoria.key, v)}
                    className={`w-6 h-6 cursor-pointer ${
                      formData[categoria.key as keyof typeof formData] >= v
                        ? 'text-[#D4AF37] fill-[#D4AF37]'
                        : 'text-gray-600'
                    }`}
                  />
                ))}
              </div>
            </div>
          ))}

          <textarea
            value={formData.relato}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, relato: e.target.value }))
            }
            rows={5}
            className="w-full bg-white/5 border rounded-xl px-4 py-3"
            placeholder="Relato"
          />

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-[#D4AF37] text-black py-3 rounded-xl font-semibold"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </form>
      </div>

      <Navbar />
    </div>
  )
}
