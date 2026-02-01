import Link from 'next/link'

export default function PlanosPublicosPage() {
  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="max-w-xl w-full text-center space-y-8">

        <h1 className="text-3xl font-semibold text-[#D4AF37]">
          Confia+
        </h1>

        <p className="text-lg">
          Segurança antes de se envolver.
        </p>

        <div className="border border-[#D4AF37]/40 rounded-2xl p-6 space-y-4 bg-[#0b0b0b]">
          <p>
            No Confia+, você consulta reputação, avaliações e alertas
            antes de decidir se vale a pena investir em alguém.
          </p>

          <ul className="text-left list-disc list-inside space-y-2 text-sm text-gray-300">
            <li>Consultas de reputação</li>
            <li>Avaliações reais de outras mulheres</li>
            <li>Alertas de comportamento e segurança</li>
            <li>Uso por créditos — você controla tudo</li>
          </ul>
        </div>

        <p className="text-sm text-gray-400">
          Para ver valores e escolher um plano, é necessário criar uma conta.
        </p>

        <div className="flex flex-col gap-3">
          <Link
            href="/onboarding"
            className="bg-[#D4AF37] text-black py-3 rounded-full font-semibold"
          >
            Criar conta e ver planos
          </Link>

          <Link
            href="/login"
            className="border border-[#D4AF37]/40 py-3 rounded-full text-[#D4AF37]"
          >
            Já tenho conta
          </Link>
        </div>

      </div>
    </main>
  )
}
