'use client';

import { useState, useEffect } from 'react';
import { History, X, Clock, Edit, Star } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';

interface Avaliacao {
  id: string;
  nomeHomem: string;
  nota: number;
  comentario: string;
  palavrasChave: string[];
  data: string;
  autorId: string;
  editadoEm?: string;
}

interface HistoricoItem {
  data: string;
  tipo: 'criacao' | 'edicao';
  nota: number;
  comentario: string;
  palavrasChave: string[];
}

export default function HistoricoAvaliacao() {
  const router = useRouter();
  const params = useParams();
  const avaliacaoId = params?.id as string;

  const [avaliacao, setAvaliacao] = useState<Avaliacao | null>(null);
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = localStorage.getItem('userId') || 'user-1';

    // Carregar avaliação
    const storedAvaliacoes = localStorage.getItem('minhasAvaliacoes');
    if (storedAvaliacoes) {
      const avaliacoes: Avaliacao[] = JSON.parse(storedAvaliacoes);
      const found = avaliacoes.find(av => av.id === avaliacaoId && av.autorId === userId);
      
      if (found) {
        setAvaliacao(found);
        
        // Criar histórico (simulado - em produção viria do banco)
        const hist: HistoricoItem[] = [
          {
            data: found.data,
            tipo: 'criacao',
            nota: found.nota,
            comentario: found.comentario,
            palavrasChave: found.palavrasChave
          }
        ];

        // Se foi editada, adicionar registro de edição
        if (found.editadoEm) {
          hist.push({
            data: found.editadoEm,
            tipo: 'edicao',
            nota: found.nota,
            comentario: found.comentario,
            palavrasChave: found.palavrasChave
          });
        }

        setHistorico(hist.reverse()); // Mais recente primeiro
      } else {
        alert('Avaliação não encontrada.');
        router.push('/minhas-avaliacoes');
      }
    }
    setLoading(false);
  }, [avaliacaoId, router]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return 'text-green-500';
    if (rating >= 3) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getKeywordColor = (keyword: string) => {
    const negative = ['agressivo', 'manipulador', 'desrespeitoso', 'violento', 'abusivo', 'insistente'];
    const positive = ['respeitoso', 'confiável', 'gentil', 'educado', 'atencioso', 'pontual'];
    
    if (negative.includes(keyword.toLowerCase())) {
      return 'bg-red-500/20 text-red-300 border-red-500/30';
    }
    if (positive.includes(keyword.toLowerCase())) {
      return 'bg-green-500/20 text-green-300 border-green-500/30';
    }
    return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-gray-400">Carregando...</p>
      </div>
    );
  }

  if (!avaliacao) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black pb-20">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#D4AF37]/20 to-transparent pt-8 pb-6 px-4">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <History className="w-8 h-8 text-[#D4AF37]" />
              <h1 className="text-2xl font-bold text-white">Histórico</h1>
            </div>
            <button
              onClick={() => router.push('/minhas-avaliacoes')}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <p className="text-gray-400 text-sm">
            Histórico de alterações da avaliação de {avaliacao.nomeHomem}
          </p>
        </div>
      </div>

      {/* Timeline */}
      <div className="px-4 max-w-md mx-auto mt-6">
        <div className="relative">
          {/* Linha vertical */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-[#D4AF37]/30" />

          {/* Items do histórico */}
          <div className="space-y-6">
            {historico.map((item, index) => (
              <div key={index} className="relative pl-16">
                {/* Ícone */}
                <div className="absolute left-0 top-0 w-12 h-12 bg-[#1A1A1A] border-2 border-[#D4AF37] rounded-full flex items-center justify-center">
                  {item.tipo === 'criacao' ? (
                    <Star className="w-6 h-6 text-[#D4AF37]" />
                  ) : (
                    <Edit className="w-6 h-6 text-[#D4AF37]" />
                  )}
                </div>

                {/* Card */}
                <div className="bg-[#1A1A1A] rounded-xl p-5 border border-gray-800">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-white font-bold">
                        {item.tipo === 'criacao' ? 'Avaliação criada' : 'Avaliação editada'}
                      </h3>
                      <div className="flex items-center gap-2 text-gray-400 text-xs mt-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(item.data)}</span>
                      </div>
                    </div>
                    
                    {/* Nota */}
                    <div className="flex items-center gap-1 bg-black px-3 py-1.5 rounded-lg">
                      <Star className={`w-4 h-4 ${getRatingColor(item.nota)} fill-current`} />
                      <span className={`font-bold text-sm ${getRatingColor(item.nota)}`}>
                        {item.nota.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  {/* Comentário */}
                  <p className="text-gray-300 text-sm mb-3">
                    {item.comentario}
                  </p>

                  {/* Palavras-chave */}
                  <div className="flex flex-wrap gap-2">
                    {item.palavrasChave.map((keyword, idx) => (
                      <span
                        key={idx}
                        className={`px-2 py-1 rounded-full text-xs font-medium border ${getKeywordColor(keyword)}`}
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Info adicional */}
        <div className="mt-8 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <p className="text-blue-300 text-sm">
            <strong>Total de alterações:</strong> {historico.length}
          </p>
          <p className="text-blue-200/70 text-xs mt-2">
            Este histórico mostra todas as versões da sua avaliação. Em caso de edição, a reputação é recalculada automaticamente.
          </p>
        </div>

        {/* Botão voltar */}
        <button
          onClick={() => router.push('/minhas-avaliacoes')}
          className="w-full mt-6 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] font-medium py-3 rounded-lg transition-colors"
        >
          Voltar para Minhas Avaliações
        </button>
      </div>
    </div>
  );
}
