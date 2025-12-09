'use client'

import { useState } from 'react'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

interface LoginFormProps {
  onSwitchToRegister?: () => void
}

export default function LoginForm({ onSwitchToRegister }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    // Simulação de login
    setTimeout(() => {
      setIsLoading(false)
      alert('Login realizado com sucesso!')
    }, 1500)
  }

  return (
    <div className="min-h-screen bg-[#000000] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img 
            src="https://k6hrqrxuu8obbfwn.public.blob.vercel-storage.com/temp/3e57b2bc-0cab-46ef-aeca-c129a3e01f01.png" 
            alt="Confia+ Logo" 
            className="h-20 w-auto mx-auto drop-shadow-2xl mb-4"
          />
          <h1 className="text-3xl font-bold text-[#D4AF37]">
            Bem-vinda de volta!
          </h1>
          <p className="text-[#EFD9A7] mt-2">Entre para acessar sua conta</p>
        </div>

        {/* Form Card */}
        <div className="bg-[#1A1A1A] rounded-3xl shadow-2xl p-8 border-2 border-[#D4AF37]">
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Email */}
            <div>
              <Label htmlFor="email" className="text-[#EFD9A7] font-semibold">
                Email
              </Label>
              <div className="relative mt-2">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#D4AF37]" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full pl-12 pr-4 py-3 border-2 border-[#D4AF37] rounded-2xl focus:ring-4 focus:ring-[#D4AF37]/50 focus:border-[#EFD9A7] bg-[#000000] text-[#FFFFFF] placeholder:text-[#EFD9A7]/50 transition-all duration-300"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <Label htmlFor="password" className="text-[#EFD9A7] font-semibold">
                Senha
              </Label>
              <div className="relative mt-2">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#D4AF37]" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-12 py-3 border-2 border-[#D4AF37] rounded-2xl focus:ring-4 focus:ring-[#D4AF37]/50 focus:border-[#EFD9A7] bg-[#000000] text-[#FFFFFF] placeholder:text-[#EFD9A7]/50 transition-all duration-300"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#D4AF37] hover:text-[#EFD9A7] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Forgot Password */}
            <div className="text-right">
              <button
                type="button"
                className="text-sm text-[#D4AF37] hover:text-[#EFD9A7] font-semibold transition-colors"
              >
                Esqueceu a senha?
              </button>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#D4AF37] hover:bg-[#EFD9A7] text-[#000000] font-bold py-4 px-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 text-lg disabled:opacity-50"
            >
              {isLoading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#D4AF37]/30"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-[#1A1A1A] text-[#EFD9A7]">ou</span>
            </div>
          </div>

          {/* Register Link */}
          <div className="text-center">
            <p className="text-[#EFD9A7]">
              Não tem uma conta?{' '}
              <button
                type="button"
                onClick={onSwitchToRegister}
                className="text-[#D4AF37] hover:text-[#EFD9A7] font-bold transition-colors"
              >
                Cadastre-se
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
