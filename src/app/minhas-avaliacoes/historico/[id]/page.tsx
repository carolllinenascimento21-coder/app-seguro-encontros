'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, History, Star, Clock, Loader2 } from 'lucide-react';
import Navbar from '@/components/custom/navbar';
import { createSupabaseClient } from '@/lib/supabase';

const supabase = createSupabaseClient();

interface HistoricoItem {
  id: string;
  nota_comportamento: number;
  nota_seguranca_emocional: number;
  nota_respeito: number;
  nota_carater: number;
  nota_confianca: number;
  nota_geral: number;
  comentario: string;
  red_flags: string[];
  editado_em: string;
}

interface AvaliacaoAtual {
  nome_homem: string;
  nota_geral: number;
  created_at: string;
}

export default function HistoricoAvaliacao() {
  const router = useRouter();
  const params = useParams();
  const avaliacaoId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [avaliacaoAtual, setAvaliacaoAtual] = useState<AvaliacaoAtual | null>(null);
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);

  useEffect(() => {
    loadHistorico();
  }, [avaliacaoId]);

  const loadHistorico = async () => {
    try {
      setLoading(true);
      if (!supabase) {
        console.error('Supabase client não inicializado no histórico de avaliações.');
        setLoading(false);
        return;
      }

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError && sessionError.code !== 'AuthSessionMissingError') {
        console.error('Erro ao carregar sessão:', sessionError);
        router.push('/login');
        return;
      }

      if (!session) {
        router.push('/login');
        return;
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError?.code === 'AuthSessionMissingError' || !user) {
        router.push('/login');
        return;
      }

      // Buscar avaliação atual
      const { data: avaliacaoData, error: avaliacaoError } = await supabase
        .from('avaliacoes')
        .select('nome_homem, nota_geral, created_at')
        .eq('id', avaliacaoId)
        .eq('autor_id', user.id)
        .single();

      if (avaliacaoError) throw avaliacaoError;

      if (!avaliacaoData) {
        alert('Avaliação não encontrada.');
        router.push('/minhas-avaliacoes');
        return;
      }

      setAvaliacaoAtual(avaliacaoData);

      // Buscar histórico de edições
      const { data: historicoData, error: historicoError } = await supabase
        .from('historico_avaliacoes')
        .select('*')
        .eq('avaliacao_id', avaliacaoId)
        .eq('user_id', user.id)
        .order('editado_em', { ascending: false });

      if (historicoError) throw historicoError;

      setHistorico(historicoData || []);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      alert('Erro ao carregar histórico.');
      router.push('/minhas-avaliacoes');
    } finally {
      setLoading(false);
    }
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
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Header */}
      <header className="bg-gradient-to-b from-black to-black/95 border-b border-[#D4AF37]/20 sticky top-0 z-40">
        <div className="max-w-md mx-auto px-4 py-4">
          <button
            onClick={() => router.push('/minhas-avaliacoes')}
            className="flex items-center gap-2 text-[#D4AF37] hover:text-[#C0C0C0] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Voltar</span>
          </button>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-6">
        {/* Informações da Avaliação */}
        {avaliacaoAtual && (
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <History className="w-8 h-8 text-[#D4AF37]" />
              <h1 className="text-2xl font-bold text-white">Histórico de Edições</h1>
            </div>
            <div className="bg-[#1A1A1A] rounded-xl p-4 border border-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-white font-bold text-lg">{avaliacaoAtual.nome_homem}</h2>
                  <p className="text-gray-400 text-xs mt-1">
                    Criado em {formatDate(avaliacaoAtual.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-1 bg-black px-3 py-1.5 rounded-lg">
                  <Star className={`w-5 h-5 ${getRatingColor(avaliacaoAtual.nota_geral)} fill-current`} />
                  <span className={`font-bold ${getRatingColor(avaliacaoAtual.nota_geral)}`}>
                    {avaliacaoAtual.nota_geral.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Lista de Histórico */}
        <div className="space-y-4">
          {historico.length === 0 ? (
            <div className="bg-[#1A1A1A] rounded-2xl p-8 border border-gray-800 text-center">
              <Clock className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-sm">
                Nenhuma edição foi feita nesta avaliação ainda.
              </p>
            </div>
          ) : (
            historico.map((item, index) => (
              <div
                key={item.id}
                className="bg-[#1A1A1A] rounded-xl p-5 border border-gray-800"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="bg-[#D4AF37]/20 p-2 rounded-lg">
                      <Clock className="w-4 h-4 text-[#D4AF37]" />
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">
                        Edição #{historico.length - index}
                      </p>
                      <p className="text-gray-400 text-xs">
                        {formatDate(item.editado_em)}
                      </p>
                    </div>
                  </div>
                  
                  {/* Rating */}
                  <div className="flex items-center gap-1 bg-black px-3 py-1.5 rounded-lg">
                    <Star className={`w-4 h-4 ${getRatingColor(item.nota_geral)} fill-current`} />
                    <span className={`font-bold text-sm ${getRatingColor(item.nota_geral)}`}>
                      {item.nota_geral.toFixed(1)}
                    </span>
                  </div>
                </div>

                {/* Notas por Categoria */}
                <div className="grid grid-cols-5 gap-2 mb-3">
                  <div className="bg-black/50 rounded-lg p-2 text-center">
                    <p className="text-gray-400 text-xs mb-1">Comp.</p>
                    <p className="text-white font-bold text-sm">{item.nota_comportamento}</p>
                  </div>
                  <div className="bg-black/50 rounded-lg p-2 text-center">
                    <p className="text-gray-400 text-xs mb-1">Seg.</p>
                    <p className="text-white font-bold text-sm">{item.nota_seguranca_emocional}</p>
                  </div>
                  <div className="bg-black/50 rounded-lg p-2 text-center">
                    <p className="text-gray-400 text-xs mb-1">Resp.</p>
                    <p className="text-white font-bold text-sm">{item.nota_respeito}</p>
                  </div>
                  <div className="bg-black/50 rounded-lg p-2 text-center">
                    <p className="text-gray-400 text-xs mb-1">Car.</p>
                    <p className="text-white font-bold text-sm">{item.nota_carater}</p>
                  </div>
                  <div className="bg-black/50 rounded-lg p-2 text-center">
                    <p className="text-gray-400 text-xs mb-1">Conf.</p>
                    <p className="text-white font-bold text-sm">{item.nota_confianca}</p>
                  </div>
                </div>

                {/* Comentário */}
                {item.comentario && (
                  <div className="mb-3">
                    <p className="text-gray-300 text-sm line-clamp-3">
                      {item.comentario}
                    </p>
                  </div>
                )}

                {/* Red Flags */}
                {item.red_flags && item.red_flags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {item.red_flags.map((flag, idx) => (
                      <span
                        key={idx}
                        className={`px-2 py-1 rounded-full text-xs font-medium border ${getKeywordColor(flag)}`}
                      >
                        {flag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <Navbar />
    </div>
  );
}
