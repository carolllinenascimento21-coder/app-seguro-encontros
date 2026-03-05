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
            <h2 className="text-lg font-semibold text-white">3. Conteúdo gerado por usuárias (UGC)</h2>
            <p>
              O Confia+ permite a publicação de relatos e avaliações de experiência. É proibido publicar conteúdo
              falso de forma intencional, difamatório, ameaçador, discriminatório, com discurso de ódio, dados
              pessoais sensíveis sem base legal, ou qualquer material que viole direitos de personalidade,
              privacidade e reputação de terceiros.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white">4. Aviso sobre avaliações e reputação</h2>
            <p>
              As avaliações refletem experiências pessoais das usuárias e não constituem, por si só, afirmações
              factuais verificadas pela plataforma. O uso dessas informações deve ocorrer com responsabilidade,
              cautela e análise de contexto.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white">5. Sistema de denúncia de conteúdo</h2>
            <p>
              Qualquer pessoa pode denunciar conteúdo inadequado, falso, ofensivo ou potencialmente difamatório.
              As denúncias podem ser realizadas para revisão, limitação de visibilidade ou remoção de avaliações,
              inclusive por terceiros afetados.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white">6. Processo de moderação</h2>
            <p>
              O aplicativo pode revisar, editar ou remover avaliações que violem este termo, as regras da
              comunidade, a legislação aplicável ou as políticas da Google Play. Em situações graves, poderemos
              adotar medidas adicionais, como suspensão de contas e comunicação às autoridades competentes.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white">7. Segurança e responsabilidade da conta</h2>
            <p>
              Você é responsável por manter a confidencialidade de seus dados de acesso e por todas as ações
              realizadas em sua conta. Em caso de uso indevido, comunique a equipe de suporte imediatamente.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white">8. Limites do serviço e responsabilidade da plataforma</h2>
            <p>
              O Confia+ atua como ambiente de compartilhamento de informações e recursos de segurança. Não há
              garantia de disponibilidade ininterrupta, nem responsabilidade por danos indiretos decorrentes do
              uso da plataforma. A plataforma adota medidas razoáveis de prevenção e resposta, mas não endossa
              automaticamente o conteúdo publicado por usuárias.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white">9. Alterações e contato</h2>
            <p>
              Este termo pode ser atualizado periodicamente. Em caso de alterações relevantes, os usuários serão
              notificados pelos canais oficiais da plataforma.
            </p>
            <p className="mt-2">Contato: contato@confiamais.com.br</p>
            <p>Canal para solicitação de revisão/remoção: suporte@confiamais.com.br</p>
          </section>
        </div>
      </article>
    </main>
  )
}
