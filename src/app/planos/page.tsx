'use client'

import {
  Eye,
  Lock,
  Check,
  X,
  Shield,
  Zap,
  Crown,
  Star,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react'

export default function PlanosPage() {
  const scrollToPlans = () => {
    document.getElementById('planos-section')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">

      {/* Fundo */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(212,175,55,0.1) 10px, rgba(212,175,55,0.1) 20px)',
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-4">
            <Eye className="w-10 h-10 text-[#D4AF37]" />
            <Lock className="w-5 h-5 text-gray-400" />
          </div>
          <h1 className="text-5xl font-bold text-[#D4AF37]">Confia+</h1>
          <p className="text-gray-400 text-lg">Segurança e Proteção Feminina</p>
        </div>

        {/* Paywall */}
        <div className="max-w-2xl mx-auto mb-16">
          <div className="border-2 border-[#D4AF37] rounded-2xl p-8 bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a]">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-8 h-8 text-[#FFD700]" />
              <h2 className="text-2xl font-bold text-[#FFD700]">Atenção</h2>
            </div>
            <p className="text-xl font-semibold mb-2">
              ⚠️ Este homem possui alertas importantes.
            </p>
            <p className="text-gray-400 mb-4">
              Desbloqueie para ver detalhes completos.
            </p>

            <button
              onClick={scrollToPlans}
              className="w-full bg-gradient-to-r from-[#D4AF37] to-[#FFD700] text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2"
            >
              Ver Planos <ChevronDown className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PLANOS */}
        <div id="planos-section" className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">

          {/* Premium Mensal */}
          <PlanCard
            title="Premium Mensal"
            price="R$ 9,90"
            period="/mês"
            icon={<Zap className="w-6 h-6 text-[#D4AF37]" />}
            button="Ativar Premium Mensal"
            href="https://checkout.keoto.com/f9c8f82f-eb6b-4fdc-ada5-b66627fd87d6"
            color="gold"
          />

          {/* Premium Anual */}
          <PlanCard
            highlight
            title="Premium Anual"
            price="R$ 79,90"
            period="/ano"
            subtitle="Equivalente a R$ 6,60/mês • Economia de 33%"
            icon={<Crown className="w-6 h-6 text-[#FFD700]" />}
            button="Assinar Anual"
            href="https://checkout.keoto.com/8da165cc-f183-4139-8d6b-bc52103a0eea"
            color="yellow"
          />

          {/* Premium Plus */}
          <PlanCard
            title="Premium Plus"
            price="R$ 19,90"
            period="/mês"
            icon={<Shield className="w-6 h-6 text-gray-300" />}
            button="Ativar Premium Plus"
            href="https://checkout.keoto.com/bd3ab94b-c3d1-4c94-b24d-cc9dbcaf951d"
            color="silver"
          />

          {/* Créditos */}
          <div className="border border-[#D4AF37] rounded-2xl p-6">
            <h3 className="text-xl font-bold text-[#FFD700] mb-4">Créditos Avulsos</h3>

            <CreditLink
              label="3 créditos"
              price="R$ 6,90"
              href="https://checkout.keoto.com/ca8e2dbc-5014-49d7-bf46-9a9fd6275c88"
            />
            <CreditLink
              label="10 créditos"
              price="R$ 14,90"
              href="https://checkout.keoto.com/122c1b53-5bbd-433c-b1db-420df700525f"
            />
            <CreditLink
              label="25 créditos"
              price="R$ 27,90"
              highlight
              href="https://checkout.keoto.com/24994c03-12ba-4653-8bd3-9c749c2da650"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

/* COMPONENTES AUXILIARES */

function PlanCard({
  title,
  price,
  period,
  subtitle,
  button,
  href,
  icon,
  highlight,
  color,
}: any) {
  return (
    <div
      className={`rounded-2xl p-6 ${
        highlight ? 'border-4 border-[#FFD700]' : 'border border-[#D4AF37]/30'
      }`}
    >
      {highlight && (
        <div className="text-center mb-2">
          <span className="bg-[#FFD700] text-black text-xs font-bold px-4 py-1 rounded-full">
            MAIS ESCOLHIDO
          </span>
        </div>
      )}

      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h3 className="text-xl font-bold">{title}</h3>
      </div>

      <p className="text-4xl font-bold">{price}</p>
      <p className="text-gray-400 mb-2">{period}</p>
      {subtitle && <p className="text-sm text-[#FFD700] mb-4">{subtitle}</p>}

      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="block mt-4 bg-gradient-to-r from-[#D4AF37] to-[#FFD700] text-black font-bold py-3 rounded-xl text-center"
      >
        {button}
      </a>
    </div>
  )
}

function CreditLink({ label, price, href, highlight }: any) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="block border border-[#D4AF37]/30 rounded-lg p-3 mb-3 hover:border-[#FFD700]"
    >
      <div className="flex justify-between font-semibold">
        <span>{label}</span>
        <span className="text-[#D4AF37]">{price}</span>
      </div>
      {highlight && <div className="text-xs text-[#FFD700]">⭐ Melhor custo-benefício</div>}
    </a>
  )
}
