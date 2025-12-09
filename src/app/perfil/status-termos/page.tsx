'use client';

import { useRouter } from 'next/navigation';
import { CheckCircle, FileText, Shield, Calendar, User } from 'lucide-react';
import { useEffect, useState } from 'react';

interface AceiteInfo {
  termosAceitos: boolean;
  privacidadeAceita: boolean;
  dataAceite: string;
  userId: string;
}

export default function StatusTermosPage() {
  const router = useRouter();
  const [aceiteInfo, setAceiteInfo] = useState<AceiteInfo | null>(null);

  useEffect(() => {
    const aceiteStr = localStorage.getItem('confia_termos_aceite');
    if (aceiteStr) {
      try {
        setAceiteInfo(JSON.parse(aceiteStr));
      } catch (error) {
        console.error('Erro ao carregar informações de aceite:', error);
      }
    }
  }, []);

  const formatarData = (dataISO: string) => {
    const data = new Date(dataISO);
    return data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-black pb-20">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#D4AF37]/20 to-transparent pt-8 pb-6 px-4">
        <div className="text-center">
          <div className="w-20 h-20 bg-[#D4AF37]/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-[#D4AF37]" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Status dos Termos</h1>
          <p className="text-gray-400 text-sm">
            Informações sobre seu aceite
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 space-y-6">
        {/* Status do Aceite */}
        {aceiteInfo ? (
          <>
            <div className="bg-green-900/20 border border-green-500/30 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="w-6 h-6 text-green-500" />
                <h2 className="text-lg font-bold text-white">Termos Aceitos</h2>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                Você aceitou os Termos de Uso e a Política de Privacidade do Confia+.
              </p>
            </div>

            {/* Informações do Aceite */}
            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 space-y-4">
              <h3 className="text-white font-semibold mb-4">Detalhes do Aceite</h3>

              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-[#D4AF37] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-gray-400 text-xs mb-1">Data do Aceite</p>
                  <p className="text-white text-sm font-medium">
                    {formatarData(aceiteInfo.dataAceite)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-[#D4AF37] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-gray-400 text-xs mb-1">ID do Usuário</p>
                  <p className="text-white text-sm font-medium font-mono">
                    {aceiteInfo.userId}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-800">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-[#D4AF37]" />
                  <span className="text-white text-sm font-medium">
                    Termos de Uso: Aceito ✓
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#D4AF37]" />
                  <span className="text-white text-sm font-medium">
                    Política de Privacidade: Aceita ✓
                  </span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-6 h-6 text-yellow-500" />
              <h2 className="text-lg font-bold text-white">Termos Não Aceitos</h2>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed mb-4">
              Você ainda não aceitou os termos. Para usar o Confia+, é necessário aceitar os Termos de Uso e a Política de Privacidade.
            </p>
            <button
              onClick={() => router.push('/aceitar-termos')}
              className="w-full bg-[#D4AF37] hover:bg-[#B8941F] text-black font-semibold py-3 rounded-xl transition-all"
            >
              Aceitar Termos Agora
            </button>
          </div>
        )}

        {/* Links para Documentos */}
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 space-y-3">
          <h3 className="text-white font-semibold mb-4">Revisar Documentos</h3>

          <button
            onClick={() => router.push('/perfil/termos')}
            className="w-full flex items-center justify-between p-4 bg-gray-800 hover:bg-gray-700 rounded-xl transition-all"
          >
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-[#D4AF37]" />
              <span className="text-white text-sm font-medium">Termos de Uso</span>
            </div>
            <span className="text-gray-400 text-sm">→</span>
          </button>

          <button
            onClick={() => router.push('/perfil/privacidade')}
            className="w-full flex items-center justify-between p-4 bg-gray-800 hover:bg-gray-700 rounded-xl transition-all"
          >
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-[#D4AF37]" />
              <span className="text-white text-sm font-medium">Política de Privacidade</span>
            </div>
            <span className="text-gray-400 text-sm">→</span>
          </button>
        </div>

        {/* Aviso */}
        <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-xl p-4">
          <p className="text-gray-400 text-xs leading-relaxed">
            <strong className="text-[#D4AF37]">Importante:</strong> Podemos atualizar nossos termos periodicamente. Você será notificado sobre mudanças significativas e poderá revisar os documentos atualizados a qualquer momento.
          </p>
        </div>

        {/* Botão Voltar */}
        <button
          onClick={() => router.push('/perfil')}
          className="w-full bg-[#D4AF37] hover:bg-[#B8941F] text-black font-semibold py-4 rounded-xl transition-all shadow-lg"
        >
          Voltar ao Perfil
        </button>
      </div>
    </div>
  );
}
