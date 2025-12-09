'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Shield, CheckCircle } from 'lucide-react';

export default function AceitarTermosPage() {
  const router = useRouter();
  const [termosAceitos, setTermosAceitos] = useState(false);
  const [privacidadeAceita, setPrivacidadeAceita] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAceitar = () => {
    if (!termosAceitos || !privacidadeAceita) {
      alert('Você precisa aceitar os Termos de Uso e a Política de Privacidade para continuar.');
      return;
    }

    setLoading(true);

    // Salvar aceite no localStorage
    const aceite = {
      termosAceitos: true,
      privacidadeAceita: true,
      dataAceite: new Date().toISOString(),
      userId: 'user-123' // Em produção, usar ID real do usuário autenticado
    };

    localStorage.setItem('confia_termos_aceite', JSON.stringify(aceite));

    // Redirecionar para home
    setTimeout(() => {
      router.push('/home');
    }, 500);
  };

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#D4AF37]/20 to-transparent pt-8 pb-6 px-4">
        <div className="text-center">
          <div className="w-20 h-20 bg-[#D4AF37]/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-10 h-10 text-[#D4AF37]" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Bem-vinda ao Confia+</h1>
          <p className="text-gray-400 text-sm">
            Para continuar, você precisa aceitar nossos termos
          </p>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 px-4 py-6 space-y-6">
        {/* Card Termos de Uso */}
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 bg-[#D4AF37]/20 rounded-full flex items-center justify-center flex-shrink-0">
              <FileText className="w-6 h-6 text-[#D4AF37]" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-white mb-2">Termos de Uso</h2>
              <p className="text-gray-400 text-sm leading-relaxed mb-3">
                Leia atentamente nossos termos de uso para entender como funciona o Confia+ e suas responsabilidades.
              </p>
              <button
                onClick={() => router.push('/perfil/termos')}
                className="text-[#D4AF37] text-sm font-semibold hover:underline"
              >
                Ler Termos de Uso →
              </button>
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={termosAceitos}
              onChange={(e) => setTermosAceitos(e.target.checked)}
              className="w-5 h-5 rounded border-2 border-[#D4AF37] bg-transparent checked:bg-[#D4AF37] checked:border-[#D4AF37] cursor-pointer"
            />
            <span className="text-white text-sm">
              Li e aceito os Termos de Uso
            </span>
          </label>
        </div>

        {/* Card Política de Privacidade */}
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 bg-[#D4AF37]/20 rounded-full flex items-center justify-center flex-shrink-0">
              <Shield className="w-6 h-6 text-[#D4AF37]" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-white mb-2">Política de Privacidade</h2>
              <p className="text-gray-400 text-sm leading-relaxed mb-3">
                Entenda como coletamos, usamos e protegemos suas informações pessoais.
              </p>
              <button
                onClick={() => router.push('/perfil/privacidade')}
                className="text-[#D4AF37] text-sm font-semibold hover:underline"
              >
                Ler Política de Privacidade →
              </button>
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={privacidadeAceita}
              onChange={(e) => setPrivacidadeAceita(e.target.checked)}
              className="w-5 h-5 rounded border-2 border-[#D4AF37] bg-transparent checked:bg-[#D4AF37] checked:border-[#D4AF37] cursor-pointer"
            />
            <span className="text-white text-sm">
              Li e aceito a Política de Privacidade
            </span>
          </label>
        </div>

        {/* Aviso de Segurança */}
        <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-[#D4AF37] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[#D4AF37] text-sm font-semibold mb-1">
                Seu aceite é registrado
              </p>
              <p className="text-gray-400 text-xs leading-relaxed">
                Ao aceitar, registramos sua concordância com data e hora. Você pode revisar estes documentos a qualquer momento no seu perfil.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Botão Aceitar */}
      <div className="px-4 pb-6">
        <button
          onClick={handleAceitar}
          disabled={!termosAceitos || !privacidadeAceita || loading}
          className={`w-full py-4 rounded-xl font-semibold transition-all shadow-lg ${
            termosAceitos && privacidadeAceita
              ? 'bg-[#D4AF37] hover:bg-[#B8941F] text-black'
              : 'bg-gray-800 text-gray-500 cursor-not-allowed'
          }`}
        >
          {loading ? 'Processando...' : 'Aceitar e Continuar'}
        </button>
      </div>
    </div>
  );
}
