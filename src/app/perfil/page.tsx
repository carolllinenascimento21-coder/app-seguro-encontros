'use client'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs'
import { User, LogOut, Plus, Trash2, Shield } from 'lucide-react'

type EmergencyContact = {
  id: string
  nome: string
  telefone: string
  ativo: boolean
}

export default function PerfilPage() {
  const supabase = createBrowserSupabaseClient()
  const router = useRouter()

  const [profile, setProfile] = useState<any>(null)
  const [contacts, setContacts] = useState<EmergencyContact[]>([])
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')

  useEffect(() => {
    const loadData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/login')
        return
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      const { data: contactsData } = await supabase
        .from('emergency_contacts')
        .select('*')
        .eq('user_id', user.id) // 🔒 garante que só veja seus contatos
        .order('created_at', { ascending: false })

      setProfile(profileData)
      setContacts(contactsData || [])
    }

    loadData()
  }, [router, supabase])

  const addContact = async () => {
    if (!nome || !telefone) {
      alert('Preencha nome e telefone')
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      alert('Usuária não autenticada')
      return
    }

    const { error } = await supabase.from('emergency_contacts').insert({
      user_id: user.id, // 🔑 vínculo correto
      nome,
      telefone,
      ativo: true,
    })

    if (error) {
      console.error(error)
      alert('Erro ao salvar contato')
      return
    }

    setNome('')
    setTelefone('')

    // recarrega lista sem reload da página
    const { data: updatedContacts } = await supabase
      .from('emergency_contacts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    setContacts(updatedContacts || [])
  }

  const removeContact = async (id: string) => {
    await supabase.from('emergency_contacts').delete().eq('id', id)
    setContacts(prev => prev.filter(c => c.id !== id))
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  if (!profile) return null

  return (
    <div className="min-h-screen bg-black px-4 py-8 text-white">
      <div className="max-w-md mx-auto space-y-6">

        {/* PERFIL */}
        <div className="border border-[#D4AF37] rounded-2xl p-6 space-y-3">
          <div className="text-center">
            <User className="mx-auto text-[#D4AF37]" size={32} />
            <h1 className="text-xl font-bold text-[#D4AF37] mt-2">
              Meu Perfil
            </h1>
          </div>

          <p>
            <span className="text-gray-400">Nome:</span>{' '}
            {profile.full_name}
          </p>
          <p>
            <span className="text-gray-400">E-mail:</span> {profile.email}
          </p>
        </div>

        {/* CONTATOS DE EMERGÊNCIA */}
        <div className="border border-green-600 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-green-500 font-semibold">
            <Shield size={18} />
            Contatos de Emergência
          </div>

          {contacts.length === 0 && (
            <p className="text-sm text-gray-400">
              Nenhum contato cadastrado. O Modo Seguro não enviará alertas.
            </p>
          )}

          {contacts.map(contact => (
            <div
              key={contact.id}
              className="flex justify-between items-center bg-black/40 p-3 rounded-lg"
            >
              <div>
                <p className="font-medium">{contact.nome}</p>
                <p className="text-sm text-gray-400">
                  {contact.telefone}
                </p>
              </div>
              <button
                onClick={() => removeContact(contact.id)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}

          {/* ADICIONAR CONTATO */}
          <div className="space-y-2">
            <input
              placeholder="Nome do contato"
              value={nome}
              onChange={e => setNome(e.target.value)}
              className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2"
            />
            <input
              placeholder="Telefone (ex: +5531999999999)"
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

        {/* LOGOUT */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 border border-red-600 text-red-500 py-2 rounded-lg hover:bg-red-600 hover:text-white transition"
        >
          <LogOut size={16} />
          Sair do app
        </button>
      </div>
    </div>
  )
}
