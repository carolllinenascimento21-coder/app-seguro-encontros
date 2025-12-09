'use client'

export default function SplashScreen() {
  return (
    <div className="min-h-screen bg-[#000000] flex items-center justify-center relative overflow-hidden">
      {/* Efeito de brilho dourado */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(212,175,55,0.15)_0%,_transparent_70%)]"></div>
      
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
              opacity: Math.random() * 0.7 + 0.3
            }}
          />
        ))}
      </div>

      {/* Logo centralizada */}
      <div className="relative z-10 animate-fade-in">
        <img 
          src="https://k6hrqrxuu8obbfwn.public.blob.vercel-storage.com/temp/3e57b2bc-0cab-46ef-aeca-c129a3e01f01.png" 
          alt="Confia+ Logo" 
          className="w-64 h-auto drop-shadow-2xl animate-pulse"
        />
      </div>

      {/* Loading indicator */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2">
        <div className="flex gap-2">
          <div className="w-3 h-3 bg-[#D4AF37] rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
          <div className="w-3 h-3 bg-[#D4AF37] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-3 h-3 bg-[#D4AF37] rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
        </div>
      </div>
    </div>
  )
}
