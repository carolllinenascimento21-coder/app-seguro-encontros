'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  User,
  LogOut,
  Plus,
  Trash2,
  Shield,
  Pencil,
  Crown,
  Camera
} from 'lucide-react'
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

  // 🆕 edição de perfil
  const [editing, setEditing] = useState(false)
  const [newNome, setNewNome] = useState('')
  const [uploading, setUploading] = useState(false)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const load = async () => {
      setError(null)

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        router.replace('/login')
        return
      }

      const { profile: ensuredProfile, error: profileError } =
        await ensureProfileForUser(supabase, session.user)

      if (profileError) {
        setError('Erro ao carregar perfil.')
        setLoading(false)
        return
      }

      setProfile(ensuredProfile)
      setNewNome(ensuredProfile?.nome || '')

      const { data: contactsData } = await supabase
        .from('emergency_contacts')
        .select('id, nome, telefone')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

      setContacts(contactsData || [])

      if (ensuredProfile?.selfie_url) {
        const { data } = await supabase.storage
          .from('selfie-verifications')
          .createSignedUrl(ensuredProfile.selfie_url, 3600)

        setSelfieUrl(data?.signedUrl || null)
      }

      setLoading(false)
    }

    load()
  }, [router])

  // 🆕 salvar edição de nome
  const saveProfile = async () => {
    if (!newNome.trim()) return

    await supabase
      .from('profiles')
      .update({ nome: newNome })
      .eq('id', profile.id)

    setProfile({ ...profile, nome: newNome })
    setEditing(false)
  }

  // 🆕 upload de foto
  const uploadPhoto = async (file: File) => {
    setUploading(true)

    const filePath = `${profile.id}/${Date.now()}.jpg`

    await supabase.storage
      .from('selfie-verifications')
      .upload(filePath, file, { upsert: true })

    await supabase
      .from('profiles')
      .update({ selfie_url: filePath })
      .eq('id', profile.id)

    const { data } = await supabase.storage
      .from('selfie-verifications')
      .createSignedUrl(filePath, 3600)

    setSelfieUrl(data?.signedUrl || null)
    setUploading(false)
  }

  if (loading) return null

  return (
    <div className="min-h-screen bg-black px-4 py-10 text-white">
      <div className="max-w-md mx-auto space-y-6">

        {/* PERFIL */}
        <div className="border border-[#D4AF37] rounded-xl p-6 relative">
          <button
            onClick={() => setEditing(true)}
            className="absolute top-4 right-4 text-[#D4AF37]"
          >
            <Pencil size={18} />
          </button>

          <div className="text-center mb-4">
            <User className="mx-auto text-[#D4AF37]" size={32} />
            <h1 className="text-xl font-bold text-[#D4AF37] mt-2">
              Meu Perfil
            </h1>
          </div>

          {selfieUrl && (
            <div className="relative w-32 h-32 mx-auto mb-4">
              <img
                src={selfieUrl}
                className="w-full h-full rounded-full object-cover border border-[#D4AF37]"
              />
              <label className="absolute bottom-0 right-0 bg-black border border-[#D4AF37] rounded-full p-2 cursor-pointer">
                <Camera size={16} />
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={e =>
                    e.target.files && uploadPhoto(e.target.files[0])
                  }
                />
              </label>
            </div>
          )}

          <p><span className="text-gray-400">Nome:</span> {profile?.nome}</p>
          <p><span className="text-gray-400">Email:</span> {profile?.email}</p>
          <p><span className="text-gray-400">Telefone:</span> {profile?.telefone || '—'}</p>

          {editing && (
            <div className="mt-4 space-y-2">
              <input
                value={newNome}
                onChange={e => setNewNome(e.target.value)}
                className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2"
              />
              <button
                onClick={saveProfile}
                className="w-full bg-[#D4AF37] text-black font-semibold py-2 rounded-lg"
              >
                Salvar alterações
              </button>
            </div>
          )}
        </div>

        {/* 🆕 MEU PLANO */}
        <div
          onClick={() => router.push('/planos')}
          className="border border-[#D4AF37] rounded-xl p-5 cursor-pointer hover:bg-[#D4AF37]/10 transition"
        >
          <div className="flex items-center gap-3">
            <Crown className="text-[#D4AF37]" />
            <div>
              <p className="text-sm text-gray-400">Meu plano</p>
              <p className="font-semibold text-[#D4AF37]">
                {profile?.plan === 'premium'
                  ? 'Premium ativo'
                  : 'Plano Free — Atualizar'}
              </p>
            </div>
          </div>
        </div>

        {/* CONTATOS DE EMERGÊNCIA (seu código original, intacto) */}
        {/* … permanece igual … */}

        <button
          onClick={logout}
          className="w-full border border-red-600 text-red-500 py-2 rounded-lg"
        >
          <LogOut size={16} /> Sair
        </button>

        <button
          onClick={deleteAccount}
          disabled={deleting}
          className="w-full border border-yellow-500 text-yellow-400 py-2 rounded-lg"
        >
          {deleting ? 'Apagando conta...' : 'Apagar conta'}
        </button>

      </div>
    </div>
  )
}
