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
            <h2 className="text-lg font-semibold text-white">3. Base legal e transparência (LGPD)</h2>
            <p>
              O tratamento de dados ocorre com fundamento nas bases legais cabíveis da Lei Geral de Proteção de
              Dados (Lei nº 13.709/2018), incluindo execução de contrato, legítimo interesse, cumprimento de
              obrigação legal e, quando aplicável, consentimento.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white">4. Compartilhamento de informações</h2>
            <p>
              Não comercializamos dados pessoais. O compartilhamento pode ocorrer com operadores essenciais,
              autoridades competentes ou quando houver obrigação legal.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white">5. Conteúdo gerado por usuárias (UGC)</h2>
            <p>
              A plataforma permite publicação de avaliações e relatos por usuárias. Esses conteúdos podem conter
              opiniões e percepções pessoais. O Confia+ adota medidas para prevenção de abuso, incluindo regras de
              comunidade, detecção de condutas proibidas e mecanismos de denúncia.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white">6. Sistema de denúncia de conteúdo</h2>
            <p>
              Qualquer pessoa pode denunciar conteúdo considerado inadequado, falso, ofensivo, difamatório ou que
              viole direitos de terceiros. A denúncia pode ser usada para solicitar revisão, limitação de
              visibilidade ou remoção, conforme análise de conformidade legal e das regras da comunidade.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white">7. Processo de moderação</h2>
            <p>
              Podemos revisar, editar, restringir ou remover avaliações e comentários quando houver indícios de
              violação deste termo, de normas da plataforma, da legislação aplicável ou de políticas da Google Play.
              Em casos graves, poderemos suspender contas e preservar registros para cooperação com autoridades.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white">8. Seus direitos</h2>
            <p>
              Você pode solicitar acesso, correção, exclusão e portabilidade dos seus dados, além de revogar
              consentimentos, observadas as hipóteses legais de retenção.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white">9. Segurança, retenção e contato</h2>
            <p>
              Adotamos medidas técnicas e administrativas para proteção dos dados contra acesso não autorizado,
              perda ou alteração indevida. Os dados são mantidos pelo tempo necessário ao cumprimento das
              finalidades informadas e de obrigações legais/regulatórias.
            </p>
            <p className="mt-2">Contato: privacidade@confiamais.com.br</p>
            <p>Canal para revisão/remoção de avaliações: suporte@confiamais.com.br</p>
          </section>
        </div>
      </article>
    </main>
  )
}
