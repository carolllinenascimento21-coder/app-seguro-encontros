'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff, ArrowLeft } from 'lucide-react'

export default function CadastroPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: ''
  })
  const [errors, setErrors] = useState({
    nome: '',
    email: '',
    senha: ''
  })

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validateForm = () => {
    const newErrors = {
      nome: '',
      email: '',
      senha: ''
    }

    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome completo é obrigatório'
    } else if (formData.nome.trim().split(' ').length < 2) {
      newErrors.nome = 'Digite seu nome completo'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'E-mail é obrigatório'
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'E-mail inválido'
    }

    if (!formData.senha) {
      newErrors.senha = 'Senha é obrigatória'
    } else if (formData.senha.length < 6) {
      newErrors.senha = 'Senha deve ter no mínimo 6 caracteres'
    }

    setErrors(newErrors)
    return !newErrors.nome && !newErrors.email && !newErrors.senha
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (validateForm()) {
      // Salva dados temporários no localStorage para usar na próxima tela
      localStorage.setItem('cadastro_temp', JSON.stringify({
        nome: formData.nome,
        email: formData.email,
        senha: formData.senha,
        dataCadastro: new Date().toISOString()
      }))
      
      // Redireciona para verificação de selfie
      router.push('/verificacao-selfie')
    }
  }

  return (
    <div className="min-h-screen bg-[#000000] flex flex-col px-4 py-8 relative overflow-hidden">
      {/* Efeito de brilho dourado de fundo */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(212,175,55,0.1)_0%,_transparent_70%)]"></div>
      
      {/* Pontos dourados flutuantes */}
      <div className="absolute inset-0">
        {[...Array(15)].map((_, i) => (
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

      {/* Conteúdo principal */}
      <div className="relative z-10 w-full max-w-md mx-auto">
        {/* Botão voltar */}
        <Button
          onClick={() => router.back()}
          variant="ghost"
          className="text-[#D4AF37] hover:text-[#EFD9A7] hover:bg-[#D4AF37]/10 mb-6"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Voltar
        </Button>

        {/* Logo */}
        <div className="text-center mb-8">
          <img 
            src="https://k6hrqrxuu8obbfwn.public.blob.vercel-storage.com/temp/3e57b2bc-0cab-46ef-aeca-c129a3e01f01.png" 
            alt="Confia+ Logo" 
            className="w-32 h-auto mx-auto drop-shadow-2xl"
          />
        </div>

        {/* Card de cadastro */}
        <div className="bg-[#0A0A0A] border-2 border-[#D4AF37] rounded-3xl p-8 shadow-2xl">
          <h1 className="text-[#D4AF37] text-3xl font-bold text-center mb-2">
            Criar Conta
          </h1>
          <p className="text-[#EFD9A7] text-center mb-8 text-sm">
            Preencha seus dados para começar
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Campo Nome Completo */}
            <div className="space-y-2">
              <Label htmlFor="nome" className="text-[#EFD9A7] font-semibold">
                Nome Completo
              </Label>
              <Input
                id="nome"
                type="text"
                placeholder="Digite seu nome completo"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className="bg-[#000000] border-[#D4AF37] text-[#FFFFFF] placeholder:text-[#666666] focus:border-[#EFD9A7] focus:ring-[#EFD9A7] rounded-xl py-6"
              />
              {errors.nome && (
                <p className="text-red-400 text-sm">{errors.nome}</p>
              )}
            </div>

            {/* Campo E-mail */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#EFD9A7] font-semibold">
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-[#000000] border-[#D4AF37] text-[#FFFFFF] placeholder:text-[#666666] focus:border-[#EFD9A7] focus:ring-[#EFD9A7] rounded-xl py-6"
              />
              {errors.email && (
                <p className="text-red-400 text-sm">{errors.email}</p>
              )}
            </div>

            {/* Campo Senha */}
            <div className="space-y-2">
              <Label htmlFor="senha" className="text-[#EFD9A7] font-semibold">
                Senha
              </Label>
              <div className="relative">
                <Input
                  id="senha"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mínimo 6 caracteres"
                  value={formData.senha}
                  onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                  className="bg-[#000000] border-[#D4AF37] text-[#FFFFFF] placeholder:text-[#666666] focus:border-[#EFD9A7] focus:ring-[#EFD9A7] rounded-xl py-6 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#D4AF37] hover:text-[#EFD9A7]"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.senha && (
                <p className="text-red-400 text-sm">{errors.senha}</p>
              )}
            </div>

            {/* Botão Criar Conta */}
            <Button
              type="submit"
              className="w-full bg-[#D4AF37] hover:bg-[#EFD9A7] text-[#000000] font-bold py-6 px-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 text-lg"
            >
              Criar Conta
            </Button>
          </form>

          {/* Link para login */}
          <div className="mt-6 text-center">
            <p className="text-[#EFD9A7] text-sm">
              Já tem uma conta?{' '}
              <button
                onClick={() => router.push('/onboarding')}
                className="text-[#D4AF37] font-semibold hover:underline"
              >
                Fazer login
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
