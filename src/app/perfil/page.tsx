'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs'
import { Button } from '@/components/ui/button'
import { LogOut, Crown, User } from 'lucide-react'

const supabase = createBrowserSupabaseClient()

type Profile = {
  full_name: string | null
  birth_date: string | null
  premium: boolean | null
  selfie_verified: boolean | null
}

export default function PerfilClient() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/login')
        return
      }

      setEmail(user.email ?? '')

      const { data } = await supabase
        .from('profiles')
        .select('full_name, birth_date, premium, selfie_verified')
        .eq('id', user.id)
        .single()

      setProfile(data)
      setLoading(false)
    }

    loadProfile()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-[#D4AF37]">
        Carregando perfil...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md border border-[#D4AF37] rounded-2xl p-8 space-y-6">

        {/* Header */}
        <div className="text-center space-y-2">
          <User className="mx-auto text-[#D4AF37]" size={36} />
          <h1 className="text-2xl font-bold text-[#D4AF37]">
            Meu Perfil
          </h1>
        </div>

        {/* Dados */}
        <div className="space-y-4 text-sm">
          <div>
            <p className="text-gray-400">Nome</p>
            <p className="font-semibold">
              {profile?.full_name || 'Não informado'}
            </p>
          </div>

          <div>
            <p className="text-gray-400">E-mail</p>
            <p className="font-semibold">{email}</p>
          </div>

          <div>
            <p className="text-gray-400">Data de nascimento</p>
            <p className="font-semibold">
              {profile?.birth_date
                ? new Date(profile.birth_date).toLocaleDateString('pt-BR')
                : 'Não informado'}
            </p>
          </div>

          <div>
            <p className="text-gray-400">Status da conta</p>
            <div className="flex items-center gap-2 font-semibold">
              {profile?.premium ? (
                <>
                  <Crown className="text-[#D4AF37]" size={16} />
                  Premium
                </>
              ) : (
                'Padrão'
              )}
            </div>
          </div>

          <div>
            <p className="text-gray-400">Verificação</p>
            <p className="font-semibold">
              {profile?.selfie_verified
                ? 'Verificada'
                : 'Em análise'}
            </p>
          </div>
        </div>

        {/* Ações */}
        <Button
          onClick={handleLogout}
          variant="outline"
          className="w-full border-red-600 text-red-500 hover:bg-red-900/20"
        >
          <LogOut className="mr-2" size={16} />
          Sair do app
        </Button>
      </div>
    </div>
  )
}
