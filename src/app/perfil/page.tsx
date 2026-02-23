'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { User, LogOut, Plus, Trash2, Shield, Pencil, Crown, X, Camera } from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabase'
import { ensureProfileForUser, getProfileErrorInfo, type ProfileRecord } from '@/lib/profile-utils'

type EmergencyContact = {
  id: string
  nome: string
  telefone: string
}

const supabase = createSupabaseClient()

function PlanLabel(plan?: string | null) {
  if (!plan) return 'Plano Free'
  if (plan === 'premium_monthly') return 'Premium Mensal'
  if (plan === 'premium_yearly') return 'Premium Anual'
  if (plan === 'premium_plus') return 'Premium Plus'
  if (plan === 'free') return 'Plano Free'
  return plan
}

export default function PerfilPage() {
  const router = useRouter()

  const [profile, setProfile] = useState<(ProfileRecord & { current_plan_id?: string | null }) | null>(null)
  const [contacts, setContacts] = useState<EmergencyContact[]>([])
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editNome, setEditNome] = useState('')
  const [editTelefone, setEditTelefone] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  useEffect(() => {
    const load = async () => {
      setError(null)
      setLoading(true)

      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.user) {
        router.replace('/login')
        return
      }

      const user = session.user

      // garante profile
      const ensured = await ensureProfileForUser(supabase, user)
      if (ensured.error) {
        console.error(getProfileErrorInfo(ensured.error))
        setError('Erro ao carregar perfil.')
        setLoading(false)
        return
      }

      // opcional: puxa current_plan_id se existir no schema
      const { data: planRow } = await supabase
        .from('profiles')
        .select('current_plan_id')
        .eq('id', user.id)
        .maybeSingle()

      const merged = { ...(ensured.profile ?? {}), ...(planRow ?? {}) }
      setProfile(merged as any)
      setEditNome((merged as any)?.nome || '')
      setEditTelefone((merged as any)?.telefone || '')

      const { data: contactsData } = await supabase
        .from('emergency_contacts')
        .select('id, nome, telefone')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      setContacts(contactsData || [])

      // avatar > selfie
      if ((merged as any)?.avatar_url) {
        const { data } = await supabase.storage.from('avatars').createSignedUrl((merged as any).avatar_url, 3600)
        setAvatarUrl(data?.signedUrl || null)
      } else if ((merged as any)?.selfie_url) {
        const { data } = await supabase.storage.from('selfie-verifications').createSignedUrl((merged as any).selfie_url, 3600)
        setSelfieUrl(data?.signedUrl || null)
      }

      setLoading(false)
    }

    load()
  }, [router])

  const uploadAvatar = async (file: File) => {
    if (!profile?.id) return

    if (file.size > 2 * 1024 * 1024) {
      setError('A imagem deve ter no máximo 2MB.')
      return
    }

    setUploadingAvatar(true)
    setError(null)

    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const filePath = `${profile.id}/avatar.${ext}`

      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, {
        upsert: true,
        contentType: file.type,
      })
      if (uploadError) throw uploadError

      const { error: updateError } = await supabase.from('profiles').update({ avatar_url: filePath }).eq('id', profile.id)
      if (updateError) throw updateError

      const { data } = await supabase.storage.from('avatars').createSignedUrl(filePath, 3600)
      setAvatarUrl(data?.signedUrl || null)
      setProfile((p: any) => ({ ...p, avatar_url: filePath }))
    } catch (e) {
      console.error(e)
      setError('Erro ao enviar foto.')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const addContact = async () => {
    if (!nome || !telefone) return
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return

    await supabase.from('emergency_contacts').insert({
      user_id: session.user.id,
      nome,
      telefone,
    })

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
    await supabase.from('emergency_contacts').delete().eq('id', id)
    setContacts((prev) => prev.filter((c) => c.id !== id))
  }

  const logout = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  const deleteAccount = async () => {
    if (!confirm('Tem certeza que deseja apagar sua conta?')) return
    setDeleting(true)
    await fetch('/api/delete-account', { method: 'POST' })
    await supabase.auth.signOut()
    router.replace('/login')
  }

  const saveEdit = async () => {
    if (!profile?.id) return
    setSavingEdit(true)

    await supabase.from('profiles').update({ nome: editNome || null, telefone: editTelefone || null }).eq('id', profile.id)

    setProfile((p: any) => ({ ...p, nome: editNome, telefone: editTelefone }))
    setIsEditOpen(false)
    setSavingEdit(false)
  }

  // ✅ sem tela branca: skeleton dark
  if (loading) {
    return (
      <div className="min-h-screen bg-black px-4 py-10 text-white">
        <div className="max-w-md mx-auto space-y-6">
          <div className="border border-[#D4AF37] rounded-xl p-6 animate-pulse">
            <div className="h-6 w-40 bg-white/10 rounded mb-4" />
            <div className="h-40 w-40 bg-white/10 rounded-full mx-auto mb-4" />
            <div className="h-4 w-3/4 bg-white/10 rounded mb-2" />
            <div className="h-4 w-2/3 bg-white/10 rounded mb-2" />
            <div className="h-4 w-1/2 bg-white/10 rounded" />
          </div>
          <div className="border border-[#D4AF37] rounded-xl p-5 animate-pulse">
            <div className="h-4 w-40 bg-white/10 rounded" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black px-4 py-10 text-white">
      <div className="max-w-md mx-auto space-y-6">

        {error && (
          <div className="border border-red-600 bg-red-950/30 text-red-200 rounded-xl p-4 text-sm">
            {error}
          </div>
        )}

        <div className="border border-[#D4AF37] rounded-xl p-6 relative">
          <button onClick={() => setIsEditOpen(true)} className="absolute top-4 right-4 text-[#D4AF37]">
            <Pencil size={18} />
          </button>

          <div className="text-center mb-4">
            <User className="mx-auto text-[#D4AF37]" size={32} />
            <h1 className="text-xl font-bold text-[#D4AF37] mt-2">Meu Perfil</h1>
          </div>

          <div className="relative w-40 h-40 mx-auto mb-4">
            <img
              src={avatarUrl || selfieUrl || '/avatar-placeholder.png'}
              className="w-full h-full rounded-full object-cover border border-[#D4AF37]"
              alt="Avatar"
            />
            <label className="absolute bottom-1 right-1 bg-black border border-[#D4AF37] rounded-full p-2 cursor-pointer">
              <Camera size={16} />
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={(e) => e.target.files && uploadAvatar(e.target.files[0])}
              />
            </label>

            {uploadingAvatar && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-xs rounded-full">
                Enviando...
              </div>
            )}
          </div>

          <p><span className="text-gray-400">Nome:</span> {profile?.nome || '—'}</p>
          <p><span className="text-gray-400">Email:</span> {profile?.email || '—'}</p>
          <p><span className="text-gray-400">Telefone:</span> {(profile as any)?.telefone || '—'}</p>
        </div>

        <button
          onClick={() => router.push('/planos')}
          className="w-full text-left border border-[#D4AF37] rounded-xl p-5"
        >
          <div className="flex items-center gap-3">
            <Crown className="text-[#D4AF37]" />
            <div>
              <p className="text-sm text-gray-400">Meu plano</p>
              <p className="font-semibold text-[#D4AF37]">
                {PlanLabel((profile as any)?.current_plan_id)} — Ver planos
              </p>
            </div>
          </div>
        </button>

        <div className="border border-green-600 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-green-500 font-semibold">
            <Shield size={18} /> Contatos de Emergência
          </div>

          {contacts.map((c) => (
            <div key={c.id} className="flex justify-between">
              <div>
                <p>{c.nome}</p>
                <p className="text-sm text-gray-400">{c.telefone}</p>
              </div>
              <button onClick={() => removeContact(c.id)} className="text-red-500">
                <Trash2 size={18} />
              </button>
            </div>
          ))}

          <input
            placeholder="Nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2"
          />
          <input
            placeholder="Telefone"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2"
          />
          <button
            onClick={addContact}
            className="w-full bg-green-600 text-black py-2 rounded-lg flex justify-center gap-2"
          >
            <Plus size={16} /> Adicionar contato
          </button>
        </div>

        <button onClick={logout} className="w-full border border-red-600 py-2 rounded-lg flex items-center justify-center gap-2">
          <LogOut size={16} /> Sair
        </button>

        <button
          onClick={deleteAccount}
          disabled={deleting}
          className="w-full border border-yellow-500 py-2 rounded-lg"
        >
          {deleting ? 'Apagando...' : 'Apagar conta'}
        </button>

        {isEditOpen && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-black border border-[#D4AF37] rounded-xl p-6 w-full max-w-md">
              <div className="flex justify-between mb-4">
                <h2 className="text-[#D4AF37] font-semibold">Editar perfil</h2>
                <button onClick={() => setIsEditOpen(false)}>
                  <X size={18} />
                </button>
              </div>

              <input
                value={editNome}
                onChange={(e) => setEditNome(e.target.value)}
                placeholder="Nome"
                className="w-full mb-2 bg-black border border-gray-700 px-3 py-2 rounded-lg"
              />
              <input
                value={editTelefone}
                onChange={(e) => setEditTelefone(e.target.value)}
                placeholder="Telefone"
                className="w-full mb-3 bg-black border border-gray-700 px-3 py-2 rounded-lg"
              />

              <button
                onClick={saveEdit}
                disabled={savingEdit}
                className="w-full bg-[#D4AF37] text-black py-2 rounded-lg"
              >
                {savingEdit ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
