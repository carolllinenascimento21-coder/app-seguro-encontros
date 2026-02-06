'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Shield } from 'lucide-react';

export default function PrivacidadePage() {
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
          <h1 className="text-2xl font-bold text-white">Política de Privacidade</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 space-y-6">
        {/* Ícone */}
        <div className="flex justify-center py-4">
          <div className="w-20 h-20 bg-[#D4AF37]/20 rounded-full flex items-center justify-center">
            <Shield className="w-10 h-10 text-[#D4AF37]" />
          </div>
        </div>

        {/* Conteúdo */}
        <div className="bg-gray-900 rounded-2xl p-6 space-y-6 border border-gray-800">
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white mb-2">1. Informações que Coletamos</h2>
              <p className="text-gray-400 text-sm leading-relaxed mb-2">
                Coletamos as seguintes informações quando você usa o Confia+:
              </p>
              <ul className="list-disc list-inside text-gray-400 text-sm space-y-1 ml-2">
                <li>Nome, idade, cidade e estado</li>
                <li>Endereço de e-mail</li>
                <li>Foto de perfil (opcional)</li>
                <li>Dados de verificação facial (opcional)</li>
                <li>Avaliações e comentários que você publica</li>
                <li>Dados de localização (quando você usa o Modo Encontro Seguro)</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-bold text-white mb-2">2. Como Usamos suas Informações</h2>
              <p className="text-gray-400 text-sm leading-relaxed mb-2">
                Usamos suas informações para:
              </p>
              <ul className="list-disc list-inside text-gray-400 text-sm space-y-1 ml-2">
                <li>Fornecer e melhorar nossos serviços</li>
                <li>Verificar sua identidade (quando solicitado)</li>
                <li>Processar e exibir avaliações</li>
                <li>Enviar alertas de segurança no Modo Encontro Seguro</li>
                <li>Comunicar atualizações e mudanças no serviço</li>
                <li>Prevenir fraudes e abusos</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-bold text-white mb-2">3. Compartilhamento de Informações</h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                Não vendemos suas informações pessoais. Podemos compartilhar informações apenas em casos específicos: com seu consentimento, para cumprir obrigações legais, ou para proteger a segurança dos usuários.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-bold text-white mb-2">4. Segurança dos Dados</h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                Implementamos medidas de segurança técnicas e organizacionais para proteger suas informações contra acesso não autorizado, alteração, divulgação ou destruição.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-bold text-white mb-2">5. Verificação Facial</h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                A verificação facial é opcional e usa tecnologia de reconhecimento facial para confirmar sua identidade. As imagens são criptografadas e armazenadas de forma segura. Você pode optar por não usar este recurso.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-bold text-white mb-2">6. Dados de Localização</h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                Coletamos dados de localização apenas quando você ativa o Modo Encontro Seguro. Esses dados são usados exclusivamente para sua segurança e podem ser compartilhados com seu contato de confiança em caso de emergência.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-bold text-white mb-2">7. Seus Direitos</h2>
              <p className="text-gray-400 text-sm leading-relaxed mb-2">
                Você tem o direito de:
              </p>
              <ul className="list-disc list-inside text-gray-400 text-sm space-y-1 ml-2">
                <li>Acessar suas informações pessoais</li>
                <li>Corrigir informações incorretas</li>
                <li>Solicitar a exclusão de seus dados</li>
                <li>Revogar consentimentos</li>
                <li>Exportar seus dados</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-bold text-white mb-2">8. Retenção de Dados</h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                Mantemos suas informações pelo tempo necessário para fornecer nossos serviços. Quando você exclui sua conta, removemos permanentemente seus dados pessoais, exceto quando exigido por lei.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-bold text-white mb-2">9. Cookies e Tecnologias Similares</h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                Usamos cookies e tecnologias similares para melhorar sua experiência, analisar o uso do aplicativo e personalizar conteúdo.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-bold text-white mb-2">10. Alterações nesta Política</h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                Podemos atualizar esta política periodicamente. Notificaremos você sobre mudanças significativas através do aplicativo ou por e-mail.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-bold text-white mb-2">11. Contato</h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                Para questões sobre privacidade ou para exercer seus direitos, entre em contato: privacidade@confiamais.com.br
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
