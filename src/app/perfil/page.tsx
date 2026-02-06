'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { User, LogOut, Plus, Trash2, Shield, Pencil, Crown, X } from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabase'
import { ensureProfileForUser, getProfileErrorInfo } from '@/lib/profile-utils'

type EmergencyContact = {
  id: string
  nome: string
  telefone: string
}

const supabase = createSupabaseClient()

export default function PerfilPage() {
  const router = useRouter()

  const [profile, setProfile] = useState<any | null>(null)
  const [contacts, setContacts] = useState<EmergencyContact[]>([])
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // ✅ edição segura (sem upload por enquanto)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editNome, setEditNome] = useState('')
  const [editTelefone, setEditTelefone] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  useEffect(() => {
    const load = async () => {
      setError(null)

      if (!supabase) {
        setError('Serviço indisponível no momento.')
        setLoading(false)
        return
      }

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError || !session?.user) {
        router.replace('/login')
        setLoading(false)
        return
      }

      const user = session.user

      const { profile: ensuredProfile, error: profileError } =
        await ensureProfileForUser(supabase, user)

      if (profileError) {
        console.error('Erro ao carregar perfil:', getProfileErrorInfo(profileError))
        setError('Erro ao carregar perfil.')
        setLoading(false)
        return
      }

      const finalProfile = ensuredProfile

      const { data: contactsData } = await supabase
        .from('emergency_contacts')
        .select('id, nome, telefone')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      setProfile(finalProfile)
      setContacts(contactsData || [])

      // preparar modal de edição
      setEditNome(finalProfile?.nome || finalProfile?.name || finalProfile?.full_name || '')
      setEditTelefone(finalProfile?.telefone || '')

      if (finalProfile?.selfie_url) {
        const { data: signedUrlData, error: selfieError } = await supabase.storage
          .from('selfie-verifications')
          .createSignedUrl(finalProfile.selfie_url, 60 * 60)

        if (!selfieError) {
          setSelfieUrl(signedUrlData?.signedUrl || null)
        }
      }

      setLoading(false)
    }

    load()
  }, [router])

  const addContact = async () => {
    if (!nome || !telefone) {
      alert('Preencha nome e telefone')
      return
    }
    if (!supabase) {
      setError('Serviço indisponível no momento.')
      return
    }

    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return

    const { error } = await supabase.from('emergency_contacts').insert({
      user_id: session.user.id,
      nome,
      telefone
    })

    if (error) {
      alert('Erro ao salvar contato')
      return
    }

    setNome('')
    setTelefone('')

    const { data } = await supabase
      .from('emergency_contacts')
      .select('id, nome, telefone')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })

    setContacts(data || [])
  }

  const removeContact = async (id: string) => {
    if (!supabase) {
      setError('Serviço indisponível no momento.')
      return
    }
    await supabase.from('emergency_contacts').delete().eq('id', id)
    setContacts(prev => prev.filter(c => c.id !== id))
  }

  // ✅ DEFINIDO (era isso que estava quebrando)
  const logout = async () => {
    if (!supabase) {
      setError('Serviço indisponível no momento.')
      return
    }
    await supabase.auth.signOut()
    router.replace('/login')
  }

  const deleteAccount = async () => {
    const confirmed = window.confirm(
      'Tem certeza que deseja apagar sua conta? Seus dados pessoais serão anonimizados.'
    )
    if (!confirmed) return

    setDeleting(true)
    setError(null)

    try {
      const response = await fetch('/api/delete-account', { method: 'POST' })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error || 'Erro ao apagar conta.')
      }

      await supabase.auth.signOut()
      router.replace('/login')
    } catch (err) {
      console.error('Erro ao apagar conta:', err)
      setError('Erro ao apagar conta. Tente novamente.')
    } finally {
      setDeleting(false)
    }
  }

  // ✅ salvar edição (nome/telefone) – seguro
  const saveEdit = async () => {
    if (!profile?.id) return
    setSavingEdit(true)
    setError(null)

    try {
      const { error: upErr } = await supabase
        .from('profiles')
        .update({
          nome: editNome?.trim() || null,
          telefone: editTelefone?.trim() || null,
        })
        .eq('id', profile.id)

      if (upErr) throw upErr

      setProfile((p: any) => ({
        ...p,
        nome: editNome,
        telefone: editTelefone,
      }))

      setIsEditOpen(false)
    } catch (e) {
      console.error(e)
      setError('Não foi possível salvar as alterações.')
    } finally {
      setSavingEdit(false)
    }
  }

  if (loading) return null

  const displayName =
    profile?.nome || profile?.name || profile?.full_name || 'Não informado'

  return (
    <div className="min-h-screen bg-black px-4 py-10 text-white">
      <div className="max-w-md mx-auto space-y-6">

        {/* PERFIL */}
        <div className="border border-[#D4AF37] rounded-xl p-6 relative">
          <button
            onClick={() => setIsEditOpen(true)}
            className="absolute top-4 right-4 text-[#D4AF37] hover:opacity-80"
            aria-label="Editar perfil"
          >
            <Pencil size={18} />
          </button>

          <div className="text-center mb-4">
            <User className="mx-auto text-[#D4AF37]" size={32} />
            <h1 className="text-xl font-bold text-[#D4AF37] mt-2">
              Meu Perfil
            </h1>
          </div>

          {error && (
            <p className="text-red-500 text-sm mb-2 text-center">{error}</p>
          )}

          {selfieUrl && (
            <div className="mb-4">
              <img
                src={selfieUrl}
                alt="Foto do perfil"
                className="mx-auto h-40 w-40 rounded-full border border-[#D4AF37] object-cover"
              />
            </div>
          )}

          <p><span className="text-gray-400">Nome:</span> {displayName}</p>
          <p><span className="text-gray-400">Email:</span> {profile?.email || '—'}</p>
          <p><span className="text-gray-400">Telefone:</span> {profile?.telefone || '—'}</p>
        </div>

        {/* ✅ MEU PLANO (link para /planos) */}
        <button
          type="button"
          onClick={() => router.push('/planos')}
          className="w-full text-left border border-[#D4AF37] rounded-xl p-5 hover:bg-[#D4AF37]/10 transition"
        >
          <div className="flex items-center gap-3">
            <Crown className="text-[#D4AF37]" size={20} />
            <div>
              <p className="text-sm text-gray-400">Meu plano</p>
              <p className="font-semibold text-[#D4AF37]">
                Plano Free — Ver planos e benefícios
              </p>
              {/* Créditos invisíveis: não mostramos números aqui */}
            </div>
          </div>
        </button>

        {/* CONTATOS */}
        <div className="border border-green-600 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-green-500 font-semibold">
            <Shield size={18} />
            Contatos de Emergência
          </div>

          {contacts.length === 0 && (
            <p className="text-sm text-gray-400">
              Nenhum contato cadastrado.
            </p>
          )}

          {contacts.map(c => (
            <div
              key={c.id}
              className="flex justify-between items-center bg-black/40 p-3 rounded-lg"
            >
              <div>
                <p>{c.nome}</p>
                <p className="text-sm text-gray-400">{c.telefone}</p>
              </div>
              <button onClick={() => removeContact(c.id)} className="text-red-500">
                <Trash2 size={18} />
              </button>
            </div>
          ))}

          <div className="space-y-2">
            <input
              placeholder="Nome"
              value={nome}
              onChange={e => setNome(e.target.value)}
              className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2"
            />
            <input
              placeholder="Telefone (+55...)"
              value={telefone}
              onChange={e => setTelefone(e.target.value)}
              className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2"
            />
            <button
              onClick={addContact}
              className="w-full bg-green-600 text-black font-bold py-2 rounded-lg flex items-center justify-center gap-2"
            >
              <Plus size={16} />
              Adicionar contato
            </button>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full border border-red-600 text-red-500 py-2 rounded-lg hover:bg-red-600 hover:text-white transition flex items-center justify-center gap-2"
        >
          <LogOut size={16} /> Sair
        </button>

        <button
          onClick={deleteAccount}
          disabled={deleting}
          className="w-full border border-yellow-500 text-yellow-400 py-2 rounded-lg hover:bg-yellow-500 hover:text-black transition disabled:opacity-60"
        >
          {deleting ? 'Apagando conta...' : 'Apagar conta'}
        </button>

        {/* ✅ MODAL EDITAR PERFIL (seguro) */}
        {isEditOpen && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center px-4 z-50">
            <div className="w-full max-w-md bg-black border border-[#D4AF37] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-[#D4AF37]">Editar perfil</h2>
                <button onClick={() => setIsEditOpen(false)} className="text-gray-400">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3">
                <input
                  value={editNome}
                  onChange={e => setEditNome(e.target.value)}
                  placeholder="Nome"
                  className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2"
                />
                <input
                  value={editTelefone}
                  onChange={e => setEditTelefone(e.target.value)}
                  placeholder="Telefone"
                  className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2"
                />

                <button
                  onClick={saveEdit}
                  disabled={savingEdit}
                  className="w-full rounded-xl bg-[#D4AF37] py-3 font-semibold text-black disabled:opacity-60"
                >
                  {savingEdit ? 'Salvando...' : 'Salvar'}
                </button>
              </div>

              <p className="mt-3 text-xs text-gray-500">
                Foto: vamos ativar o upload na próxima etapa, sem quebrar o fluxo atual.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
