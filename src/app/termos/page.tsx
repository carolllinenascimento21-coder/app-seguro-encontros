import type { Metadata } from 'next'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'Termo de Uso | Confia+',
  description:
    'Termo de Uso do Confia+, com condições de utilização, responsabilidades e direitos dos usuários.',
}

export default function TermosPage() {
  return (
    <main className="min-h-screen bg-black px-4 py-10 text-white">
      <article className="mx-auto w-full max-w-3xl rounded-2xl border border-[#D4AF37]/60 bg-zinc-950 p-6 sm:p-8">
        <header className="mb-8 border-b border-zinc-800 pb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D4AF37]">
            Confia+
          </p>
          <h1 className="mt-3 text-3xl font-bold text-[#D4AF37]">Termo de Uso</h1>
          <p className="mt-2 text-sm text-zinc-300">Última atualização: 16 de fevereiro de 2026</p>
        </header>

        <div className="space-y-6 text-sm leading-7 text-zinc-200 sm:text-base">
          <section>
            <h2 className="text-lg font-semibold text-white">1. Aceitação</h2>
            <p>
              Ao utilizar a plataforma Confia+, você declara que leu e concorda com este Termo de Uso. Se
              não concordar com qualquer cláusula, não prossiga com o cadastro ou utilização dos recursos.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white">2. Elegibilidade e conduta</h2>
            <p>
              O uso é permitido apenas para maiores de 18 anos. Você se compromete a fornecer informações
              verdadeiras e a não publicar conteúdo ofensivo, discriminatório, ilegal ou que viole direitos de
              terceiros.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white">3. Segurança e responsabilidade da conta</h2>
            <p>
              Você é responsável por manter a confidencialidade de seus dados de acesso e por todas as ações
              realizadas em sua conta. Em caso de uso indevido, comunique a equipe de suporte imediatamente.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white">4. Limites do serviço</h2>
            <p>
              O Confia+ atua como ambiente de compartilhamento de informações e recursos de segurança. Não há
              garantia de disponibilidade ininterrupta, nem responsabilidade por danos indiretos decorrentes do
              uso da plataforma.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white">5. Alterações e contato</h2>
            <p>
              Este termo pode ser atualizado periodicamente. Em caso de alterações relevantes, os usuários serão
              notificados pelos canais oficiais da plataforma.
            </p>
            <p className="mt-2">Contato: contato@confiamais.com.br</p>
          </section>
        </div>
      </article>
    </main>
  )
}
