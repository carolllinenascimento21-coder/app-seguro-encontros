'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SplashScreen() {
  const router = useRouter()

  useEffect(() => {
    // Após 3 segundos, redireciona diretamente para onboarding
    const redirectTimer = setTimeout(() => {
      router.push('/onboarding')
    }, 3000)

    return () => {
      clearTimeout(redirectTimer)
    }
  }, [router])

  return (
    <div className="min-h-screen bg-[#000000] flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Efeito de brilho dourado de fundo */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(212,175,55,0.15)_0%,_transparent_70%)] animate-pulse"></div>
      
      {/* Pontos dourados flutuantes */}
      <div className="absolute inset-0">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-[#D4AF37] rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              opacity: Math.random() * 0.5 + 0.3
            }}
          />
        ))}
      </div>

      {/* Logo central com animação */}
      <div className="relative z-10 animate-[fadeInScale_1s_ease-out]">
        <div className="text-center">
          <img 
            src="https://k6hrqrxuu8obbfwn.public.blob.vercel-storage.com/temp/3e57b2bc-0cab-46ef-aeca-c129a3e01f01.png" 
            alt="Confia+ Logo" 
            className="w-64 h-auto mx-auto drop-shadow-2xl animate-[pulse_2s_ease-in-out_infinite]"
          />
        </div>
        
        {/* Texto premium abaixo da logo */}
        <div className="mt-8 text-center">
          <p className="text-[#D4AF37] text-xl font-bold tracking-widest animate-[fadeIn_1.5s_ease-out]">
            Confia+
          </p>
          <p className="text-[#EFD9A7] text-sm mt-2 tracking-wide animate-[fadeIn_2s_ease-out]">
            Segurança e Confiança
          </p>
        </div>
      </div>

      {/* Loading indicator */}
      <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2">
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 bg-[#D4AF37] rounded-full animate-bounce"
              style={{
                animationDelay: `${i * 0.15}s`
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
