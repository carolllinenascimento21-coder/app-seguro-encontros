'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Crown } from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabase/browser'
import { getRedirectUrl } from '@/lib/auth/getRedirectUrl'

export default function OnboardingPage() {
  const router = useRouter()
  const [agreed, setAgreed] = useState(false)
  const [gender, setGender] = useState('')
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null)
  const [isEmbeddedWebView, setIsEmbeddedWebView] = useState(false)
  const oauthInFlightRef = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const ua = window.navigator.userAgent || ''
    const isAndroidWebView = /\bwv\b|; wv\)/i.test(ua)
    const isIOSWebView = /iPhone|iPad|iPod/i.test(ua) && !/Safari/i.test(ua)
    const isInAppBrowser = /(FBAN|FBAV|Instagram|Line|TikTok|MicroMessenger)/i.test(ua)

    setIsEmbeddedWebView(isAndroidWebView || isIOSWebView || isInAppBrowser)
  }, [])

  const validatePreconditions = () => {
    if (!agreed) {
      alert('Você precisa aceitar os termos para continuar.')
      return false
    }

    if (gender !== 'female') {
      alert('Este aplicativo é exclusivo para mulheres.')
      return false
    }

    return true
  }

  const startOAuth = async (provider: 'google' | 'apple') => {
    if (!validatePreconditions()) return
    if (oauthInFlightRef.current) return

    oauthInFlightRef.current = true
    setOauthLoading(provider)

    try {
      if (provider === 'google') {
        if (isEmbeddedWebView) {
          alert('Login Google não funciona dentro de WebView. Abra este link no navegador externo.')
          oauthInFlightRef.current = false
          setOauthLoading(null)
          return
        }

        const googleEntryUrl = new URL('/api/auth/google', window.location.origin)
        googleEntryUrl.searchParams.set('next', '/login')

        const currentParams = new URLSearchParams(window.location.search)
        const returnMode = currentParams.get('return_mode')
        const returnTo = currentParams.get('return_to')
        const platform = currentParams.get('platform')
        const flowId = currentParams.get('flow_id')
        const nonce = currentParams.get('nonce')

        if (returnMode === 'app' && returnTo) {
          googleEntryUrl.searchParams.set('return_mode', 'app')
          googleEntryUrl.searchParams.set('return_to', returnTo)
          googleEntryUrl.searchParams.set('platform', platform || 'android')
          if (flowId) googleEntryUrl.searchParams.set('flow_id', flowId)
          if (nonce) googleEntryUrl.searchParams.set('nonce', nonce)
        }

        window.location.assign(googleEntryUrl.toString())
        return
      }

      const supabase = createSupabaseClient()

      if (!supabase) {
        console.error('Supabase client não inicializado no onboarding.')
        alert('Serviço indisponível no momento. Tente novamente mais tarde.')
        oauthInFlightRef.current = false
        setOauthLoading(null)
        return
      }

      const redirectTo = getRedirectUrl('/login')
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      })

      if (error) {
        console.error(`${provider} login error`, error)
        alert('Não foi possível iniciar o login social. Tente novamente.')
        oauthInFlightRef.current = false
        setOauthLoading(null)
        return
      }

      if (!data?.url) {
        console.error(`${provider} login did not return redirect URL`)
        alert('Não foi possível iniciar o login social. Tente novamente.')
        oauthInFlightRef.current = false
        setOauthLoading(null)
        return
      }

      window.location.assign(data.url)
    } catch (error) {
      console.error(`${provider} login unexpected error`, error)
      alert('Erro inesperado ao iniciar o login social.')
      oauthInFlightRef.current = false
      setOauthLoading(null)
    }
  }

  const signInWithGoogle = async () => startOAuth('google')

  const signInWithApple = async () => startOAuth('apple')

  const handleSignup = () => {
    if (!validatePreconditions()) return

    localStorage.setItem(
      'pre_onboarding',
      JSON.stringify({
        agreed: true,
        gender: 'female',
      })
    )

    router.push('/signup')
  }

  const handleLogin = () => {
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 relative">
      {/* Botão Ver Planos */}
      <div className="absolute top-6 right-6 z-20">
        <button
          onClick={() => router.push('/planos-publicos')}
          className="flex items-center gap-2 bg-gradient-to-r from-[#D4AF37] to-[#FFD700] text-black font-bold py-2 px-4 rounded-full"
        >
          <Crown className="w-4 h-4" />
          Ver Planos
        </button>
      </div>

      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <img
          src="https://k6hrqrxuu8obbfwn.public.blob.vercel-storage.com/temp/3e57b2bc-0cab-46ef-aeca-c129a3e01f01.png"
          alt="Confia+ Logo"
          className="w-48 mx-auto"
        />

        {/* Headline */}
        <div className="border-2 border-[#D4AF37] rounded-3xl p-8">
          <p className="text-white text-2xl font-bold text-center">
            Ferramenta segura para mulheres
          </p>
        </div>

        {/* Termos */}
        <div className="flex items-start gap-3">
          <Checkbox checked={agreed} onCheckedChange={(v) => setAgreed(!!v)} />
          <p className="text-sm text-[#EFD9A7]">
            Ao continuar, você confirma que tem mais de 18 anos e aceita os termos.
          </p>
        </div>

        {/* Gênero */}
        <div className="space-y-2">
          <p className="text-sm text-[#EFD9A7] font-semibold">Gênero</p>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="w-full rounded-lg border border-[#D4AF37] bg-transparent px-3 py-2 text-[#EFD9A7]"
          >
            <option value="" className="bg-black text-[#EFD9A7]">
              Selecione seu gênero
            </option>
            <option value="female" className="bg-black text-[#EFD9A7]">
              Mulher
            </option>
            <option value="other" className="bg-black text-[#EFD9A7]">
              Outro (não permitido)
            </option>
          </select>
        </div>

        {/* Google */}
        {isEmbeddedWebView && (
          <div className="rounded-xl border border-amber-500/60 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            O Google bloqueia login em WebView (erro 403 disallowed_useragent). Abra no navegador externo
            para continuar com Google.
          </div>
        )}

        <button
          onClick={signInWithGoogle}
          disabled={!agreed || !gender || oauthLoading !== null || isEmbeddedWebView}
          className="btn-google w-full bg-[#D4AF37] text-black py-6 rounded-2xl font-medium disabled:opacity-50"
        >
          {oauthLoading === 'google' ? 'Conectando com Google...' : 'Continuar com Google'}
        </button>

        <button
          onClick={signInWithApple}
          disabled={!agreed || !gender || oauthLoading !== null}
          className="btn-apple w-full rounded-2xl border border-[#D4AF37] py-6 font-medium text-[#EFD9A7] disabled:opacity-50"
        >
          {oauthLoading === 'apple' ? 'Conectando com Apple...' : 'Continuar com Apple'}
        </button>

        <div className="divider text-center text-sm text-gray-400">ou</div>

        {/* Email */}
        <Button
          onClick={handleSignup}
          variant="outline"
          className="w-full border-[#D4AF37] text-[#D4AF37] py-6 rounded-2xl"
        >
          Criar conta com e-mail
        </Button>

        {/* Login */}
        <p className="text-center text-sm text-[#EFD9A7]">
          Já tem uma conta?{' '}
          <button
            onClick={handleLogin}
            className="text-[#D4AF37] font-semibold hover:underline"
          >
            Fazer login
          </button>
        </p>
      </div>
    </div>
  )
}
