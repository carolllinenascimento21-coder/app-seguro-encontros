'use client';


import { useState, useEffect } from 'react';
import { Star, Edit, Trash2, History, AlertCircle, Loader2 } from 'lucide-react';
import Navbar from '@/components/custom/navbar';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
const supabase = createClientComponentClient();

interface Avaliacao {
  id: string;
  nome_homem: string;
  nota_geral: number;
  nota_comportamento: number;
  nota_seguranca_emocional: number;
  nota_respeito: number;
  nota_carater: number;
  nota_confianca: number;
  comentario: string;
  red_flags: string[];
  created_at: string;
  updated_at: string;
  autor_id: string;
}

export default function MinhasAvaliacoes() {
  const router = useRouter();
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [avaliacaoToDelete, setAvaliacaoToDelete] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  useEffect(() => {
    loadAvaliacoes();
  }, []);

  const loadAvaliacoes = async () => {
    try {
      setLoading(true);
      
      // Obter usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      setCurrentUserId(user.id);

      const { data, error } = await supabase
  .from('avaliacoes_autoras')
  .select(`
    avaliacao_id,
    avaliacoes (
      id,
      nome,
      cidade,
      flags,
      relato,
      comportamento,
      seguranca_emocional,
      respeito,
      carater,
      confianca,
      created_at
    )
  `);

  };

  const handleEdit = (id: string) => {
    router.push(`/minhas-avaliacoes/editar/${id}`);
  };

  const handleDeleteClick = (id: string) => {
    setAvaliacaoToDelete(id);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!avaliacaoToDelete) return;

    try {
      // Deletar avaliação (o trigger do banco já salva no histórico)
      const { error } = await supabase
        .from('avaliacoes')
        .delete()
        .eq('id', avaliacaoToDelete)
        .eq('autor_id', currentUserId); // Garantir que só deleta próprias avaliações

      if (error) throw error;

      // Atualizar lista local
      setAvaliacoes(prev => prev.filter(av => av.id !== avaliacaoToDelete));
      
      setShowDeleteModal(false);
      setAvaliacaoToDelete(null);
    } catch (error) {
      console.error('Erro ao excluir avaliação:', error);
      alert('Erro ao excluir avaliação. Tente novamente.');
    }
  };

  const handleViewHistory = (id: string) => {
    router.push(`/minhas-avaliacoes/historico/${id}`);
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return 'text-green-500';
    if (rating >= 3) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getKeywordColor = (keyword: string) => {
    const negative = ['agressivo', 'manipulador', 'desrespeitoso', 'violento', 'abusivo', 'insistente', 'mentiras', 'traição', 'stalking'];
    const positive = ['respeitoso', 'confiável', 'gentil', 'educado', 'atencioso', 'pontual'];
    
    const lowerKeyword = keyword.toLowerCase();
    
    if (negative.some(word => lowerKeyword.includes(word))) {
      return 'bg-red-500/20 text-red-300 border-red-500/30';
    }
    if (positive.some(word => lowerKeyword.includes(word))) {
      return 'bg-green-500/20 text-green-300 border-green-500/30';
    }
    return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-20">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#D4AF37]/20 to-transparent pt-8 pb-6 px-4">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <Star className="w-8 h-8 text-[#D4AF37] fill-current" />
            <h1 className="text-2xl font-bold text-white">Minhas Avaliações</h1>
          </div>
          <p className="text-gray-400 text-sm">
            Gerencie todas as avaliações que você fez.
          </p>
        </div>
      </div>

      {/* Lista de Avaliações */}
      <div className="px-4 max-w-md mx-auto mt-6">
        {avaliacoes.length === 0 ? (
          <div className="bg-[#1A1A1A] rounded-2xl p-8 border border-gray-800 text-center">
            <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-sm">
              Você ainda não fez nenhuma avaliação.
            </p>
            <button
              onClick={() => router.push('/avaliar')}
              className="mt-4 bg-[#D4AF37] text-black font-medium px-6 py-2 rounded-lg hover:bg-[#F4D03F] transition-colors"
            >
              Fazer primeira avaliação
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {avaliacoes.map((avaliacao) => (
              <div
                key={avaliacao.id}
                className="bg-[#1A1A1A] rounded-xl p-5 border border-gray-800 hover:border-[#D4AF37]/30 transition-all"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-white font-bold text-lg">{avaliacao.nome_homem}</h3>
                    <p className="text-gray-400 text-xs mt-1">
                      Avaliado em {formatDate(avaliacao.created_at)}
                    </p>
                    {avaliacao.updated_at !== avaliacao.created_at && (
                      <p className="text-gray-500 text-xs mt-0.5">
                        Editado em {formatDate(avaliacao.updated_at)}
                      </p>
                    )}
                  </div>
                  
                  {/* Rating */}
                  <div className="flex items-center gap-1 bg-black px-3 py-1.5 rounded-lg">
                    <Star className={`w-5 h-5 ${getRatingColor(avaliacao.nota_geral)} fill-current`} />
                    <span className={`font-bold ${getRatingColor(avaliacao.nota_geral)}`}>
                      {avaliacao.nota_geral.toFixed(1)}
                    </span>
                  </div>
                </div>

                {/* Comentário */}
                {avaliacao.comentario && (
                  <p className="text-gray-300 text-sm mb-3 line-clamp-2">
                    {avaliacao.comentario}
                  </p>
                )}

                {/* Red Flags */}
                {avaliacao.red_flags && avaliacao.red_flags.length > 0 && (
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-2">
                      {avaliacao.red_flags.map((flag, idx) => (
                        <span
                          key={idx}
                          className={`px-2 py-1 rounded-full text-xs font-medium border ${getKeywordColor(flag)}`}
                        >
                          {flag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ações */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(avaliacao.id)}
                    className="flex-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Editar
                  </button>
                  
                  <button
                    onClick={() => handleViewHistory(avaliacao.id)}
                    className="flex-1 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <History className="w-4 h-4" />
                    Histórico
                  </button>
                  
                  <button
                    onClick={() => handleDeleteClick(avaliacao.id)}
                    className="bg-red-500/10 hover:bg-red-500/20 text-red-400 font-medium px-4 py-2 rounded-lg transition-colors flex items-center justify-center"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1A1A1A] rounded-2xl p-6 max-w-sm w-full border border-red-500/30">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-500/20 p-3 rounded-full">
                <AlertCircle className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-white font-bold text-lg">Excluir avaliação?</h3>
            </div>
            
            <p className="text-gray-300 text-sm mb-6">
              Esta ação não pode ser desfeita. A avaliação será removida permanentemente e o impacto na reputação será recalculado automaticamente.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-lg transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      <Navbar />
    </div>
  );
}
