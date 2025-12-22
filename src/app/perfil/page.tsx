'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { User, LogOut, Plus, Trash2, Shield } from 'lucide-react'

type EmergencyContact = {
  id: string
  nome: string
  telefone: string
}

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function PerfilPage() {
  const router = useRouter()

  const [profile, setProfile] = useState<any | null>(null)
  const [contacts, setContacts] = useState<EmergencyContact[]>([])
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      // 🔐 Sessão
      const {
        data: { session }
      } = await supabase.auth.getSession()

      if (!session?.user) {
        router.replace('/login')
        return
      }

      const user = session.user

      // 👤 Busca perfil (sem quebrar)
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      // ➕ Cria perfil automaticamente se não existir
      let finalProfile = profileData

      if (!profileData) {
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            full_name: '',
            selfie_verified: false,
          })
          .select()
          .single()

        if (insertError) {
          console.error('Erro ao criar perfil:', insertError)
          return
        }

        finalProfile = newProfile
      }

      // 📞 Contatos
      const { data: contactsData } = await supabase
        .from('emergency_contacts')
        .select('id, nome, telefone')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      setProfile(finalProfile)
      setContacts(contactsData || [])
      setLoading(false)
    }

    load()
  }, [router])

  const addContact = async () => {
    if (!nome || !telefone) {
      alert('Preencha nome e telefone')
      return
    }

    const {
      data: { session }
    } = await supabase.auth.getSession()

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
    await supabase.from('emergency_contacts').delete().eq('id', id)
    setContacts(prev => prev.filter(c => c.id !== id))
  }

  const logout = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  if (loading) return null

  return (
    <div className="min-h-screen bg-black px-4 py-10 text-white">
      <div className="max-w-md mx-auto space-y-6">

        {/* PERFIL */}
        <div className="border border-[#D4AF37] rounded-xl p-6">
          <div className="text-center mb-4">
            <User className="mx-auto text-[#D4AF37]" size={32} />
            <h1 className="text-xl font-bold text-[#D4AF37] mt-2">
              Meu Perfil
            </h1>
          </div>

          <p>
            <span className="text-gray-400">Nome:</span>{' '}
            {profile?.full_name || 'Não informado'}
          </p>
          <p>
            <span className="text-gray-400">Email:</span>{' '}
            {profile?.email || '—'}
          </p>
        </div>

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
              <button
                onClick={() => removeContact(c.id)}
                className="text-red-500"
              >
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
          className="w-full border border-red-600 text-red-500 py-2 rounded-lg hover:bg-red-600 hover:text-white transition"
        >
          <LogOut size={16} /> Sair
        </button>

      </div>
    </div>
  )
}
