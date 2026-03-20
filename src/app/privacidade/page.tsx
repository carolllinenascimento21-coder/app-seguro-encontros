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
              e-mail, cidade e dados opcionais de verificação.
            </p>
            <p className="mt-2">
              Também podemos coletar dados técnicos automaticamente, como endereço IP, tipo de dispositivo,
              sistema operacional, navegador e registros de acesso (logs), para fins de segurança e prevenção
              de fraudes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">2. Finalidades do tratamento</h2>
            <p>
              Utilizamos os dados para autenticação, personalização da experiência, prevenção de fraudes,
              segurança da plataforma, melhoria de funcionalidades e cumprimento de obrigações legais.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">3. Base legal (LGPD)</h2>
            <p>
              O tratamento de dados ocorre com base na Lei Geral de Proteção de Dados (Lei nº 13.709/2018),
              incluindo execução de contrato, legítimo interesse, cumprimento de obrigação legal e, quando
              necessário, consentimento.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">4. Compartilhamento de dados</h2>
            <p>
              Não comercializamos dados pessoais. O compartilhamento pode ocorrer com operadores essenciais
              para funcionamento do serviço (como infraestrutura e autenticação), autoridades públicas ou
              quando exigido por lei.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">5. Conteúdo gerado por usuárias (UGC)</h2>
            <p>
              A plataforma permite a publicação de avaliações e relatos. Esses conteúdos refletem opiniões
              pessoais das usuárias.
            </p>
            <p className="mt-2">
              Sempre que possível, adotamos medidas para preservar o anonimato das usuárias e evitar exposição
              indevida de dados pessoais.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">6. Sistema de denúncia e moderação</h2>
            <p>
              Qualquer pessoa pode denunciar conteúdos considerados inadequados, falsos ou ofensivos.
              As denúncias podem resultar em revisão, limitação de visibilidade ou remoção do conteúdo.
            </p>
            <p className="mt-2">
              O Confia+ pode revisar, editar ou remover conteúdos que violem esta política, os termos de uso
              ou a legislação aplicável.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">7. Direitos do titular</h2>
            <p>
              Nos termos da LGPD, você pode solicitar acesso, correção, exclusão, portabilidade dos dados e
              revogação de consentimento, observadas as hipóteses legais de retenção.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">8. Segurança dos dados</h2>
            <p>
              Adotamos medidas técnicas e administrativas para proteger os dados contra acesso não autorizado,
              perda, alteração ou divulgação indevida.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">9. Retenção de dados</h2>
            <p>
              Os dados pessoais são armazenados pelo tempo necessário para cumprimento das finalidades
              informadas, obrigações legais e proteção contra fraudes e abusos.
            </p>
          </section>

          {/* 🔥 NOVA SEÇÃO CRÍTICA */}
          <section>
            <h2 className="text-lg font-semibold text-white">10. Natureza da plataforma</h2>
            <p>
              O Confia+ atua como plataforma intermediadora de conteúdo gerado por usuárias, não realizando
              verificação prévia das informações publicadas.
            </p>
            <p className="mt-2">
              As avaliações refletem opiniões pessoais das usuárias e não constituem dados verificados ou
              garantias sobre terceiros.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">11. Alterações e contato</h2>
            <p>
              Esta política pode ser atualizada periodicamente. Em caso de alterações relevantes, os usuários
              poderão ser notificados pelos canais oficiais da plataforma.
            </p>
            <p className="mt-2">Contato: privacidade@confiamais.net</p>
            <p>Canal para revisão/remoção: suporte@confiamais.net</p>
          </section>

        </div>
      </article>
    </main>
  )
}
