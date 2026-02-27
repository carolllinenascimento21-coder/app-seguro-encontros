import type { Metadata } from 'next'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'Política de Privacidade | Confia+',
  description:
    'Política de Privacidade do Confia+, com transparência sobre coleta, uso e proteção de dados pessoais.',
}

export default function PrivacidadePage() {
  return (
    <main className="min-h-screen bg-black px-4 py-10 text-white">
      <article className="mx-auto w-full max-w-3xl rounded-2xl border border-[#D4AF37]/60 bg-zinc-950 p-6 sm:p-8">
        <header className="mb-8 border-b border-zinc-800 pb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D4AF37]">
            Confia+
          </p>
          <h1 className="mt-3 text-3xl font-bold text-[#D4AF37]">Política de Privacidade</h1>
          <p className="mt-2 text-sm text-zinc-300">Última atualização: 16 de fevereiro de 2026</p>
        </header>

        <div className="space-y-6 text-sm leading-7 text-zinc-200 sm:text-base">
          <section>
            <h2 className="text-lg font-semibold text-white">1. Dados que coletamos</h2>
            <p>
              Coletamos informações fornecidas por você durante o cadastro e uso da plataforma, como nome,
              e-mail, cidade, preferências de uso e dados opcionais de verificação.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white">2. Finalidades do tratamento</h2>
            <p>
              Utilizamos os dados para autenticação, personalização da experiência, prevenção de fraudes,
              melhoria de funcionalidades e cumprimento de obrigações legais aplicáveis.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white">3. Compartilhamento de informações</h2>
            <p>
              Não comercializamos dados pessoais. O compartilhamento pode ocorrer com operadores essenciais,
              autoridades competentes ou quando houver obrigação legal.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white">4. Seus direitos</h2>
            <p>
              Você pode solicitar acesso, correção, exclusão e portabilidade dos seus dados, além de revogar
              consentimentos, observadas as hipóteses legais de retenção.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white">5. Segurança e contato</h2>
            <p>
              Adotamos medidas técnicas e administrativas para proteção dos dados contra acesso não autorizado,
              perda ou alteração indevida.
            </p>
            <p className="mt-2">Contato: privacidade@confiamais.com.br</p>
          </section>
        </div>
      </article>
    </main>
  )
}
