'use client'

import { useState } from 'react'
import { Eye, Lock, Check, X, Shield, Zap, Crown, Star, AlertTriangle, ChevronDown } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function PlanosPage() {
  const router = useRouter()

  const scrollToPlans = () => {
    const plansSection = document.getElementById('planos-section')
    plansSection?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-[#000000] text-white relative overflow-hidden">
      {/* Textura metálica de fundo */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(212,175,55,0.1) 10px, rgba(212,175,55,0.1) 20px)'
      }}></div>

      {/* Pontos dourados flutuantes */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-[#D4AF37] rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              opacity: Math.random() * 0.4 + 0.2
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        {/* Header com logo */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center gap-3 mb-4">
            <div className="relative">
              <Eye className="w-10 h-10 text-[#D4AF37]" />
              <Lock className="w-5 h-5 text-[#C0C0C0] absolute -bottom-1 -right-1" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-[#D4AF37] via-[#FFD700] to-[#D4AF37] bg-clip-text text-transparent mb-2">
            Confia+
          </h1>
          <p className="text-[#C0C0C0] text-lg">Segurança e Proteção Feminina</p>
        </div>

        {/* Paywall Emocional */}
        <div className="max-w-2xl mx-auto mb-16">
          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border-2 border-[#D4AF37] rounded-2xl p-8 shadow-2xl relative overflow-hidden">
            {/* Brilho de fundo */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(212,175,55,0.1)_0%,_transparent_50%)]"></div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-8 h-8 text-[#FFD700] animate-pulse" />
                <h2 className="text-2xl font-bold text-[#FFD700]">Atenção</h2>
              </div>
              
              <p className="text-xl text-white mb-3 font-semibold">
                ⚠️ Este homem possui alertas importantes.
              </p>
              
              <p className="text-lg text-[#C0C0C0] mb-2">
                Desbloqueie para ver detalhes completos.
              </p>
              
              <p className="text-lg text-[#D4AF37] font-medium mb-6">
                Proteja suas escolhas. Tome decisões inteligentes.
              </p>

              <button
                onClick={scrollToPlans}
                className="w-full bg-gradient-to-r from-[#D4AF37] to-[#FFD700] text-black font-bold py-4 px-8 rounded-xl hover:shadow-[0_0_30px_rgba(212,175,55,0.6)] transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2"
              >
                Ver Planos
                <ChevronDown className="w-5 h-5 animate-bounce" />
              </button>
            </div>
          </div>
        </div>

        {/* Seção de Planos */}
        <div id="planos-section" className="mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 bg-gradient-to-r from-[#D4AF37] to-[#C0C0C0] bg-clip-text text-transparent">
            Escolha Seu Plano
          </h2>
          <p className="text-center text-[#C0C0C0] mb-12 text-lg">
            Acesso completo à verdade. Proteção que você merece.
          </p>

          {/* Grid de Planos */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {/* Plano Premium Mensal */}
            <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border border-[#D4AF37] rounded-2xl p-6 hover:shadow-[0_0_30px_rgba(212,175,55,0.3)] transition-all duration-300 transform hover:scale-105">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-6 h-6 text-[#D4AF37]" />
                <h3 className="text-xl font-bold text-[#D4AF37]">Premium Mensal</h3>
              </div>
              
              <div className="mb-6">
                <p className="text-4xl font-bold text-white">R$ 9,90</p>
                <p className="text-[#C0C0C0]">/mês</p>
              </div>

              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-5 h-5 text-[#D4AF37] flex-shrink-0 mt-0.5" />
                  <span className="text-[#C0C0C0]">Pesquisas ilimitadas</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-5 h-5 text-[#D4AF37] flex-shrink-0 mt-0.5" />
                  <span className="text-[#C0C0C0]">Acesso a todas as avaliações completas</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-5 h-5 text-[#D4AF37] flex-shrink-0 mt-0.5" />
                  <span className="text-[#C0C0C0]">Alertas detalhados</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-5 h-5 text-[#D4AF37] flex-shrink-0 mt-0.5" />
                  <span className="text-[#C0C0C0]">Relatos anônimos completos</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-5 h-5 text-[#D4AF37] flex-shrink-0 mt-0.5" />
                  <span className="text-[#C0C0C0]">Histórico comportamental</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-5 h-5 text-[#D4AF37] flex-shrink-0 mt-0.5" />
                  <span className="text-[#C0C0C0]">Red flags reveladas</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-5 h-5 text-[#D4AF37] flex-shrink-0 mt-0.5" />
                  <span className="text-[#C0C0C0]">Sinais emocionais e padrões</span>
                </li>
              </ul>

              <a
                href="https://checkout.keoto.com/f9c8f82f-eb6b-4fdc-ada5-b66627fd87d6"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-gradient-to-r from-[#D4AF37] to-[#FFD700] text-black font-bold py-3 px-6 rounded-xl hover:shadow-[0_0_20px_rgba(212,175,55,0.5)] transition-all duration-300 text-center"
              >
                Ativar Premium Mensal
              </a>
            </div>

            {/* Plano Premium Anual - DESTAQUE */}
            <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border-4 border-[#FFD700] rounded-2xl p-6 hover:shadow-[0_0_40px_rgba(255,215,0,0.5)] transition-all duration-300 transform hover:scale-105 relative lg:scale-110 lg:z-10">
              {/* Selo "Mais Escolhido" */}
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <div className="bg-gradient-to-r from-[#FFD700] to-[#D4AF37] text-black px-6 py-2 rounded-full font-bold text-sm flex items-center gap-2 shadow-lg">
                  <Star className="w-4 h-4 fill-current" />
                  MAIS ESCOLHIDO
                </div>
              </div>

              <div className="flex items-center gap-2 mb-4 mt-4">
                <Crown className="w-6 h-6 text-[#FFD700]" />
                <h3 className="text-xl font-bold text-[#FFD700]">Premium Anual</h3>
              </div>
              
              <div className="mb-6">
                <p className="text-4xl font-bold text-white">R$ 79,90</p>
                <p className="text-[#FFD700] font-semibold">/ano</p>
                <p className="text-sm text-[#D4AF37] mt-1">Equivalente a R$ 6,60 por mês</p>
                <p className="text-xs text-[#C0C0C0] mt-1">💰 Economia anual de 33%</p>
              </div>

              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-5 h-5 text-[#FFD700] flex-shrink-0 mt-0.5" />
                  <span className="text-white font-semibold">Tudo do plano mensal</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-5 h-5 text-[#FFD700] flex-shrink-0 mt-0.5" />
                  <span className="text-[#C0C0C0]">Avisos antecipados sobre novas avaliações</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-5 h-5 text-[#FFD700] flex-shrink-0 mt-0.5" />
                  <span className="text-[#C0C0C0]">Prioridade de segurança</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-5 h-5 text-[#FFD700] flex-shrink-0 mt-0.5" />
                  <span className="text-[#C0C0C0]">Pesquisas ilimitadas</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-5 h-5 text-[#FFD700] flex-shrink-0 mt-0.5" />
                  <span className="text-[#C0C0C0]">Acesso completo a avaliações</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-5 h-5 text-[#FFD700] flex-shrink-0 mt-0.5" />
                  <span className="text-[#C0C0C0]">Alertas e histórico completo</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-5 h-5 text-[#FFD700] flex-shrink-0 mt-0.5" />
                  <span className="text-[#C0C0C0]">Red flags e padrões emocionais</span>
                </li>
              </ul>

              <a
                href="https://checkout.keoto.com/8da165cc-f183-4139-8d6b-bc52103a0eea"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-gradient-to-r from-[#FFD700] to-[#D4AF37] text-black font-bold py-4 px-6 rounded-xl hover:shadow-[0_0_30px_rgba(255,215,0,0.7)] transition-all duration-300 transform hover:scale-105 text-center"
              >
                Assinar Anual
              </a>
            </div>

            {/* Plano Premium Plus */}
            <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border border-[#C0C0C0] rounded-2xl p-6 hover:shadow-[0_0_30px_rgba(192,192,192,0.3)] transition-all duration-300 transform hover:scale-105">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-6 h-6 text-[#C0C0C0]" />
                <h3 className="text-xl font-bold text-[#C0C0C0]">Premium Plus</h3>
              </div>
              
              <div className="mb-6">
                <p className="text-4xl font-bold text-white">R$ 19,90</p>
                <p className="text-[#C0C0C0]">/mês</p>
              </div>

              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-5 h-5 text-[#C0C0C0] flex-shrink-0 mt-0.5" />
                  <span className="text-[#C0C0C0]">Análise de padrões emocionais</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-5 h-5 text-[#C0C0C0] flex-shrink-0 mt-0.5" />
                  <span className="text-[#C0C0C0]">Mapa de risco comportamental</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-5 h-5 text-[#C0C0C0] flex-shrink-0 mt-0.5" />
                  <span className="text-[#C0C0C0]">Desbloqueio automático de alertas especiais</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-5 h-5 text-[#C0C0C0] flex-shrink-0 mt-0.5" />
                  <span className="text-[#C0C0C0]">Detecta comportamento manipulador recorrente</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-5 h-5 text-[#C0C0C0] flex-shrink-0 mt-0.5" />
                  <span className="text-[#C0C0C0]">Notificações de segurança em tempo real</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Check className="w-5 h-5 text-[#C0C0C0] flex-shrink-0 mt-0.5" />
                  <span className="text-[#C0C0C0]">Tudo do Premium Anual</span>
                </li>
              </ul>

              <a
                href="https://checkout.keoto.com/bd3ab94b-c3d1-4c94-b24d-cc9dbcaf951d"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-gradient-to-r from-[#C0C0C0] to-[#A8A8A8] text-black font-bold py-3 px-6 rounded-xl hover:shadow-[0_0_20px_rgba(192,192,192,0.5)] transition-all duration-300 text-center"
              >
                Ativar Premium Plus
              </a>
            </div>

            {/* Créditos Avulsos */}
            <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border border-[#D4AF37] rounded-2xl p-6 hover:shadow-[0_0_30px_rgba(212,175,55,0.3)] transition-all duration-300">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-6 h-6 text-[#FFD700]" />
                <h3 className="text-xl font-bold text-[#FFD700]">Créditos Avulsos</h3>
              </div>
              
              <p className="text-sm text-[#C0C0C0] mb-6">
                Os créditos desbloqueiam alertas críticos, denúncias graves, relatos sigilosos e comportamentos reincidentes.
              </p>

              <div className="space-y-3 mb-6">
                <a
                  href="https://checkout.keoto.com/ca8e2dbc-5014-49d7-bf46-9a9fd6275c88"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-[#0a0a0a] border border-[#D4AF37]/30 rounded-lg p-3 hover:border-[#D4AF37] transition-all"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-white font-semibold">3 créditos</span>
                    <span className="text-[#D4AF37] font-bold">R$ 6,90</span>
                  </div>
                </a>
                
                <a
                  href="https://checkout.keoto.com/122c1b53-5bbd-433c-b1db-420df700525f"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-[#0a0a0a] border border-[#D4AF37]/30 rounded-lg p-3 hover:border-[#D4AF37] transition-all"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-white font-semibold">10 créditos</span>
                    <span className="text-[#D4AF37] font-bold">R$ 14,90</span>
                  </div>
                </a>
                
                <a
                  href="https://checkout.keoto.com/24994c03-12ba-4653-8bd3-9c749c2da650"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-[#0a0a0a] border border-[#D4AF37]/30 rounded-lg p-3 hover:border-[#D4AF37] transition-all"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-white font-semibold">25 créditos</span>
                    <span className="text-[#D4AF37] font-bold">R$ 27,90</span>
                  </div>
                  <div className="text-xs text-[#FFD700] mt-1">⭐ Melhor custo-benefício</div>
                </a>
              </div>

              <div className="text-center text-sm text-[#C0C0C0] italic">
                Clique no pacote desejado para comprar
              </div>
            </div>
          </div>
        </div>

        {/* Tabela de Comparação */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-[#D4AF37] to-[#C0C0C0] bg-clip-text text-transparent">
            Compare os Planos
          </h2>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] rounded-2xl overflow-hidden">
              <thead>
                <tr className="bg-[#0a0a0a]">
                  <th className="text-left p-4 text-[#D4AF37] font-bold border-b border-[#D4AF37]/30">Recurso</th>
                  <th className="text-center p-4 text-[#C0C0C0] font-bold border-b border-[#D4AF37]/30">Gratuito</th>
                  <th className="text-center p-4 text-[#D4AF37] font-bold border-b border-[#D4AF37]/30">Premium Mensal</th>
                  <th className="text-center p-4 text-[#FFD700] font-bold border-b border-[#D4AF37]/30">Premium Anual</th>
                  <th className="text-center p-4 text-[#C0C0C0] font-bold border-b border-[#D4AF37]/30">Premium Plus</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-[#D4AF37]/10 hover:bg-[#0a0a0a]/50">
                  <td className="p-4 text-[#C0C0C0]">Consultas diárias</td>
                  <td className="text-center p-4 text-white">1</td>
                  <td className="text-center p-4 text-[#D4AF37] font-semibold">Ilimitadas</td>
                  <td className="text-center p-4 text-[#FFD700] font-semibold">Ilimitadas</td>
                  <td className="text-center p-4 text-[#C0C0C0] font-semibold">Ilimitadas</td>
                </tr>
                <tr className="border-b border-[#D4AF37]/10 hover:bg-[#0a0a0a]/50">
                  <td className="p-4 text-[#C0C0C0]">Ver detalhes das avaliações</td>
                  <td className="text-center p-4"><X className="w-5 h-5 text-red-500 mx-auto" /></td>
                  <td className="text-center p-4"><Check className="w-5 h-5 text-[#D4AF37] mx-auto" /></td>
                  <td className="text-center p-4"><Check className="w-5 h-5 text-[#FFD700] mx-auto" /></td>
                  <td className="text-center p-4"><Check className="w-5 h-5 text-[#C0C0C0] mx-auto" /></td>
                </tr>
                <tr className="border-b border-[#D4AF37]/10 hover:bg-[#0a0a0a]/50">
                  <td className="p-4 text-[#C0C0C0]">Ver alertas graves</td>
                  <td className="text-center p-4"><X className="w-5 h-5 text-red-500 mx-auto" /></td>
                  <td className="text-center p-4"><Check className="w-5 h-5 text-[#D4AF37] mx-auto" /></td>
                  <td className="text-center p-4"><Check className="w-5 h-5 text-[#FFD700] mx-auto" /></td>
                  <td className="text-center p-4 text-[#C0C0C0] text-sm">✔ (automático)</td>
                </tr>
                <tr className="border-b border-[#D4AF37]/10 hover:bg-[#0a0a0a]/50">
                  <td className="p-4 text-[#C0C0C0]">Histórico comportamental</td>
                  <td className="text-center p-4"><X className="w-5 h-5 text-red-500 mx-auto" /></td>
                  <td className="text-center p-4"><Check className="w-5 h-5 text-[#D4AF37] mx-auto" /></td>
                  <td className="text-center p-4"><Check className="w-5 h-5 text-[#FFD700] mx-auto" /></td>
                  <td className="text-center p-4"><Check className="w-5 h-5 text-[#C0C0C0] mx-auto" /></td>
                </tr>
                <tr className="border-b border-[#D4AF37]/10 hover:bg-[#0a0a0a]/50">
                  <td className="p-4 text-[#C0C0C0]">Notificações de risco</td>
                  <td className="text-center p-4"><X className="w-5 h-5 text-red-500 mx-auto" /></td>
                  <td className="text-center p-4"><X className="w-5 h-5 text-red-500 mx-auto" /></td>
                  <td className="text-center p-4"><Check className="w-5 h-5 text-[#FFD700] mx-auto" /></td>
                  <td className="text-center p-4 text-[#C0C0C0] text-sm">✔ (tempo real)</td>
                </tr>
                <tr className="hover:bg-[#0a0a0a]/50">
                  <td className="p-4 text-[#C0C0C0]">Análise de padrões</td>
                  <td className="text-center p-4"><X className="w-5 h-5 text-red-500 mx-auto" /></td>
                  <td className="text-center p-4"><X className="w-5 h-5 text-red-500 mx-auto" /></td>
                  <td className="text-center p-4"><X className="w-5 h-5 text-red-500 mx-auto" /></td>
                  <td className="text-center p-4"><Check className="w-5 h-5 text-[#C0C0C0] mx-auto" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Gatilho Final de Conversão */}
        <div className="max-w-3xl mx-auto text-center mb-12">
          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border-2 border-[#D4AF37] rounded-2xl p-8 shadow-2xl">
            <Shield className="w-16 h-16 text-[#D4AF37] mx-auto mb-4" />
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
              Proteja suas escolhas.
            </h3>
            <p className="text-lg text-[#C0C0C0] mb-4">
              A informação certa pode salvar sua paz emocional.
            </p>
            <p className="text-xl text-[#D4AF37] font-semibold">
              Assine o Confia+ e tenha acesso completo à verdade.
            </p>
          </div>
        </div>

        {/* Botão Voltar */}
        <div className="text-center">
          <button
            onClick={() => router.back()}
            className="text-[#C0C0C0] hover:text-[#D4AF37] transition-colors duration-300 underline"
          >
            Voltar
          </button>
        </div>
      </div>
    </div>
  )
}
