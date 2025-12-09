'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, User, Mail, MapPin, Calendar, CheckCircle, Edit, Trash2, FileText, Shield, Info } from 'lucide-react';
import { useState } from 'react';

export default function PerfilPage() {
  const router = useRouter();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Dados mockados do usuário
  const usuario = {
    nome: 'Maria Silva',
    email: 'maria.silva@email.com',
    idade: 28,
    cidade: 'São Paulo',
    estado: 'SP',
    dataCadastro: '15 de Janeiro de 2024',
    fotoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
    verificacaoFacial: 'verificado' // 'verificado', 'pendente', 'nao_verificado'
  };

  const handleApagarConta = () => {
    // Lógica para apagar conta
    alert('Sua conta foi excluída com sucesso.');
    setShowDeleteModal(false);
    router.push('/');
  };

  const getVerificacaoBadge = () => {
    switch (usuario.verificacaoFacial) {
      case 'verificado':
        return (
          <div className="flex items-center gap-2 bg-green-900/30 border border-green-500/50 rounded-full px-4 py-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-green-400 text-sm font-medium">Verificado</span>
          </div>
        );
      case 'pendente':
        return (
          <div className="flex items-center gap-2 bg-yellow-900/30 border border-yellow-500/50 rounded-full px-4 py-2">
            <Calendar className="w-4 h-4 text-yellow-500" />
            <span className="text-yellow-400 text-sm font-medium">Pendente</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-full px-4 py-2">
            <User className="w-4 h-4 text-gray-400" />
            <span className="text-gray-400 text-sm font-medium">Não Verificado</span>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-black pb-20">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#D4AF37]/20 to-transparent pt-8 pb-6 px-4">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.push('/home')}
            className="text-white hover:text-[#D4AF37] transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold text-white">Minha Conta</h1>
        </div>

        {/* Foto e Nome */}
        <div className="flex flex-col items-center">
          <div className="relative mb-4">
            <img
              src={usuario.fotoUrl}
              alt={usuario.nome}
              className="w-24 h-24 rounded-full object-cover border-4 border-[#D4AF37]"
            />
            {usuario.verificacaoFacial === 'verificado' && (
              <div className="absolute bottom-0 right-0 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center border-2 border-black">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
            )}
          </div>
          <h2 className="text-xl font-bold text-white mb-2">{usuario.nome}</h2>
          {getVerificacaoBadge()}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 space-y-6">
        {/* Informações Pessoais */}
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-[#D4AF37]" />
            Informações Pessoais
          </h3>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-gray-400 text-xs">E-mail</p>
                <p className="text-white text-sm">{usuario.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-gray-400 text-xs">Idade</p>
                <p className="text-white text-sm">{usuario.idade} anos</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-gray-400 text-xs">Localização</p>
                <p className="text-white text-sm">{usuario.cidade}, {usuario.estado}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-gray-400 text-xs">Membro desde</p>
                <p className="text-white text-sm">{usuario.dataCadastro}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Verificação Facial */}
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-[#D4AF37]" />
            Status da Verificação
          </h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Verificação Facial</span>
              {getVerificacaoBadge()}
            </div>

            {usuario.verificacaoFacial === 'verificado' && (
              <p className="text-gray-400 text-xs leading-relaxed">
                Sua identidade foi verificada com sucesso. Isso aumenta a confiança na plataforma.
              </p>
            )}

            {usuario.verificacaoFacial === 'nao_verificado' && (
              <button className="w-full bg-[#D4AF37] hover:bg-[#B8941F] text-black font-semibold py-3 rounded-xl transition-all">
                Verificar Agora
              </button>
            )}
          </div>
        </div>

        {/* Ações */}
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 space-y-3">
          <h3 className="text-white font-semibold mb-4">Ações</h3>

          <button
            onClick={() => router.push('/perfil/editar')}
            className="w-full flex items-center justify-between p-4 bg-gray-800 hover:bg-gray-700 rounded-xl transition-all"
          >
            <div className="flex items-center gap-3">
              <Edit className="w-5 h-5 text-[#D4AF37]" />
              <span className="text-white text-sm font-medium">Editar Perfil</span>
            </div>
            <span className="text-gray-400 text-sm">→</span>
          </button>

          <button
            onClick={() => router.push('/perfil/status-termos')}
            className="w-full flex items-center justify-between p-4 bg-gray-800 hover:bg-gray-700 rounded-xl transition-all"
          >
            <div className="flex items-center gap-3">
              <Info className="w-5 h-5 text-[#D4AF37]" />
              <span className="text-white text-sm font-medium">Status dos Termos</span>
            </div>
            <span className="text-gray-400 text-sm">→</span>
          </button>

          <button
            onClick={() => router.push('/perfil/termos')}
            className="w-full flex items-center justify-between p-4 bg-gray-800 hover:bg-gray-700 rounded-xl transition-all"
          >
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-[#D4AF37]" />
              <span className="text-white text-sm font-medium">Ver Termos de Uso</span>
            </div>
            <span className="text-gray-400 text-sm">→</span>
          </button>

          <button
            onClick={() => router.push('/perfil/privacidade')}
            className="w-full flex items-center justify-between p-4 bg-gray-800 hover:bg-gray-700 rounded-xl transition-all"
          >
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-[#D4AF37]" />
              <span className="text-white text-sm font-medium">Ver Política de Privacidade</span>
            </div>
            <span className="text-gray-400 text-sm">→</span>
          </button>

          <button
            onClick={() => setShowDeleteModal(true)}
            className="w-full flex items-center justify-between p-4 bg-red-900/20 hover:bg-red-900/30 border border-red-500/30 rounded-xl transition-all"
          >
            <div className="flex items-center gap-3">
              <Trash2 className="w-5 h-5 text-red-500" />
              <span className="text-red-400 text-sm font-medium">Apagar Conta</span>
            </div>
            <span className="text-red-400 text-sm">→</span>
          </button>
        </div>
      </div>

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-6 max-w-md w-full border border-red-500/30">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-900/30 rounded-full flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-white">Apagar Conta</h3>
            </div>

            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              Tem certeza que deseja apagar sua conta? Esta ação é irreversível e todos os seus dados serão permanentemente excluídos.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleApagarConta}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-xl transition-all"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
