'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { MailCheck } from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabase'

export default function VerificationPendingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleResendEmail = async () => {
    setLoading(true)
    setError(null)
    setMessage(null)

    const supabase = createSupabaseClient()

    if (!supabase) {
      console.error('Supabase client não inicializado na confirmação de e-mail.')
      setError('Serviço indisponível no momento.')
      setLoading(false)
      return
    }

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError && sessionError.code !== 'AuthSessionMissingError') {
      setError('Não foi possível reenviar o e-mail de confirmação.')
      setLoading(false)
      return
    }

    if (!session) {
      setError('Não foi possível reenviar o e-mail de confirmação.')
      setLoading(false)
      return
    }

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error?.code === 'AuthSessionMissingError' || error || !user?.email) {
      setError('Não foi possível reenviar o e-mail de confirmação.')
      setLoading(false)
      return
    }

    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email: user.email,
    })

    if (resendError) {
      setError('Erro ao reenviar o e-mail. Tente novamente em alguns minutos.')
      setLoading(false)
      return
    }

    setMessage('E-mail de confirmação reenviado com sucesso.')
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4 text-white">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-[#D4AF37] p-8 text-center">
        <div className="flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#D4AF37]/20">
            <MailCheck className="h-7 w-7 text-[#D4AF37]" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-[#D4AF37]">
          Confirme seu e-mail
        </h1>

        <p className="text-sm text-gray-300 leading-relaxed">
          Enviamos um e-mail de confirmação para o endereço que você cadastrou.
          <br />
          Para continuar e acessar o aplicativo, é necessário confirmar seu e-mail.
        </p>

        {message && (
          <div className="rounded-md border border-green-700 bg-green-950/50 px-4 py-3 text-sm text-green-200">
            {message}
          </div>
        )}

        {error && (
          <div className="rounded-md border border-red-700 bg-red-950/50 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <Button
            onClick={handleResendEmail}
            disabled={loading}
            className="w-full rounded-xl bg-[#D4AF37] py-3 font-semibold text-black hover:bg-[#c9a634]"
          >
            {loading ? 'Reenviando...' : 'Reenviar e-mail de confirmação'}
          </Button>

          <Button
            variant="outline"
            onClick={() => router.push('/login')}
            className="w-full rounded-xl border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/10"
          >
            Voltar para o login
          </Button>
        </div>

        <p className="text-xs text-gray-500">
          Não esqueça de verificar sua caixa de spam ou promoções.
        </p>
      </div>
    </div>
  )
}
