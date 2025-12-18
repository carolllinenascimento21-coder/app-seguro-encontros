'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs'
import { User, LogOut } from 'lucide-react'

export default function PerfilPage() {
  const supabase = createBrowserSupabaseClient()
  const router = useRouter()

  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    const loadProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/login')
        return
      }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      setProfile(data)
    }

    loadProfile()
  }, [router, supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  if (!profile) return null

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-sm border border-[#D4AF37] rounded-2xl p-8 space-y-4 text-white">
        <div className="text-center space-y-2">
          <User className="mx-auto text-[#D4AF37]" size={32} />
          <h1 className="text-xl font-bold text-[#D4AF37]">Meu Perfil</h1>
        </div>

        <div className="space-y-2 text-sm">
          <p><span className="text-gray-400">Nome:</span> {profile.full_name}</p>
          <p><span className="text-gray-400">E-mail:</span> {profile.email}</p>
          <p><span className="text-gray-400">Nascimento:</span> {profile.birth_date || '—'}</p>
          <p><span className="text-gray-400">Plano:</span> Padrão</p>
          <p><span className="text-gray-400">Verificação:</span> Em análise</p>
        </div>

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
