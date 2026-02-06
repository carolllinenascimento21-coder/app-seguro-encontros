'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, FileText } from 'lucide-react';

export default function TermosPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-black pb-20">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#D4AF37]/20 to-transparent pt-8 pb-6 px-4">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => router.back()}
            className="text-white hover:text-[#D4AF37] transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold text-white">Termos de Uso</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 space-y-6">
        {/* Ícone */}
        <div className="flex justify-center py-4">
          <div className="w-20 h-20 bg-[#D4AF37]/20 rounded-full flex items-center justify-center">
            <FileText className="w-10 h-10 text-[#D4AF37]" />
          </div>
        </div>

        {/* Conteúdo */}
        <div className="bg-gray-900 rounded-2xl p-6 space-y-6 border border-gray-800">
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white mb-2">1. Aceitação dos Termos</h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                Ao utilizar o Confia+, você concorda com estes Termos de Uso. Se você não concordar com qualquer parte destes termos, não utilize nosso serviço.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-bold text-white mb-2">2. Uso do Serviço</h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                O Confia+ é uma plataforma destinada a compartilhar experiências de encontros de forma segura e anônima. Você concorda em usar o serviço apenas para fins legais e de acordo com estes termos.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-bold text-white mb-2">3. Responsabilidades do Usuário</h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                Você é responsável por manter a confidencialidade de sua conta e senha. Você concorda em fornecer informações verdadeiras e atualizadas ao criar sua conta.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-bold text-white mb-2">4. Conteúdo do Usuário</h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                Você é responsável pelo conteúdo que publica no Confia+. Não é permitido publicar conteúdo difamatório, ofensivo, ilegal ou que viole os direitos de terceiros.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-bold text-white mb-2">5. Privacidade e Segurança</h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                Levamos sua privacidade a sério. Consulte nossa Política de Privacidade para entender como coletamos, usamos e protegemos suas informações pessoais.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-bold text-white mb-2">6. Verificação Facial</h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                A verificação facial é opcional, mas recomendada para aumentar a confiança na plataforma. As imagens são processadas de forma segura e não são compartilhadas publicamente.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-bold text-white mb-2">7. Modificações dos Termos</h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                Reservamo-nos o direito de modificar estes termos a qualquer momento. Notificaremos você sobre mudanças significativas através do aplicativo ou por e-mail.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-bold text-white mb-2">8. Rescisão</h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                Podemos suspender ou encerrar sua conta se você violar estes termos. Você pode encerrar sua conta a qualquer momento através das configurações do aplicativo.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-bold text-white mb-2">9. Limitação de Responsabilidade</h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                O Confia+ não se responsabiliza por danos diretos, indiretos, incidentais ou consequenciais resultantes do uso ou incapacidade de usar o serviço.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-bold text-white mb-2">10. Contato</h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                Para dúvidas sobre estes termos, entre em contato conosco através do e-mail: contato@confiamais.com.br
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-800">
            <p className="text-gray-500 text-xs text-center">
              Última atualização: Janeiro de 2024
            </p>
          </div>
        </div>

        {/* Botão Voltar */}
        <button
          onClick={() => router.back()}
          className="w-full bg-[#D4AF37] hover:bg-[#B8941F] text-black font-semibold py-4 rounded-xl transition-all shadow-lg"
        >
          Voltar ao Perfil
        </button>
      </div>
    </div>
  );
}
