'use client'

import { useState } from 'react'
import { Mail, Lock, Eye, EyeOff, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

interface RegisterFormProps {
  onSwitchToLogin?: () => void
}

export default function RegisterForm({ onSwitchToLogin }: RegisterFormProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      alert('As senhas não coincidem!')
      return
    }

    setIsLoading(true)
    
    // Simulação de cadastro
    setTimeout(() => {
      setIsLoading(false)
      alert('Cadastro realizado com sucesso!')
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
            Junte-se ao Confia+
          </h1>
          <p className="text-[#EFD9A7] mt-2">Crie sua conta e comece a compartilhar</p>
        </div>

        {/* Form Card */}
        <div className="bg-[#1A1A1A] rounded-3xl shadow-2xl p-8 border-2 border-[#D4AF37]">
          <form onSubmit={handleRegister} className="space-y-6">
            {/* Name */}
            <div>
              <Label htmlFor="name" className="text-[#EFD9A7] font-semibold">
                Nome
              </Label>
              <div className="relative mt-2">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#D4AF37]" />
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  className="w-full pl-12 pr-4 py-3 border-2 border-[#D4AF37] rounded-2xl focus:ring-4 focus:ring-[#D4AF37]/50 focus:border-[#EFD9A7] bg-[#000000] text-[#FFFFFF] placeholder:text-[#EFD9A7]/50 transition-all duration-300"
                  required
                />
              </div>
            </div>

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

            {/* Confirm Password */}
            <div>
              <Label htmlFor="confirmPassword" className="text-[#EFD9A7] font-semibold">
                Confirmar Senha
              </Label>
              <div className="relative mt-2">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#D4AF37]" />
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-12 py-3 border-2 border-[#D4AF37] rounded-2xl focus:ring-4 focus:ring-[#D4AF37]/50 focus:border-[#EFD9A7] bg-[#000000] text-[#FFFFFF] placeholder:text-[#EFD9A7]/50 transition-all duration-300"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#D4AF37] hover:text-[#EFD9A7] transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#D4AF37] hover:bg-[#EFD9A7] text-[#000000] font-bold py-4 px-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 text-lg disabled:opacity-50"
            >
              {isLoading ? 'Criando conta...' : 'Criar Conta'}
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

          {/* Login Link */}
          <div className="text-center">
            <p className="text-[#EFD9A7]">
              Já tem uma conta?{' '}
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="text-[#D4AF37] hover:text-[#EFD9A7] font-bold transition-colors"
              >
                Entrar
              </button>
            </p>
          </div>
        </div>

        {/* Terms */}
        <p className="text-center text-xs text-[#EFD9A7]/70 mt-6">
          Ao criar uma conta, você concorda com nossos{' '}
          <a href="#" className="text-[#D4AF37] hover:underline">Termos de Uso</a>
          {' '}e{' '}
          <a href="#" className="text-[#D4AF37] hover:underline">Política de Privacidade</a>
        </p>
      </div>
    </div>
  )
}
