'use client';

import { useState, useEffect } from 'react';
import { Star, Save, X, AlertCircle } from 'lucide-react';
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

const palavrasChaveDisponiveis = [
  'respeitoso',
  'educado',
  'atencioso',
  'confiável',
  'gentil',
  'pontual',
  'desrespeitoso',
  'agressivo',
  'manipulador',
  'insistente',
  'violento',
  'abusivo'
];

export default function EditarAvaliacao() {
  const router = useRouter();
  const params = useParams();
  const avaliacaoId = params?.id as string;

  const [avaliacao, setAvaliacao] = useState<Avaliacao | null>(null);
  const [nota, setNota] = useState(0);
  const [comentario, setComentario] = useState('');
  const [palavrasChave, setPalavrasChave] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  useEffect(() => {
    const userId = localStorage.getItem('userId') || 'user-1';
    setCurrentUserId(userId);

    // Carregar avaliação
    const storedAvaliacoes = localStorage.getItem('minhasAvaliacoes');
    if (storedAvaliacoes) {
      const avaliacoes: Avaliacao[] = JSON.parse(storedAvaliacoes);
      const found = avaliacoes.find(av => av.id === avaliacaoId && av.autorId === userId);
      
      if (found) {
        setAvaliacao(found);
        setNota(found.nota);
        setComentario(found.comentario);
        setPalavrasChave(found.palavrasChave);
      } else {
        alert('Avaliação não encontrada ou você não tem permissão para editá-la.');
        router.push('/minhas-avaliacoes');
      }
    }
    setLoading(false);
  }, [avaliacaoId, router]);

  const handleSave = () => {
    if (nota === 0) {
      alert('Por favor, selecione uma nota.');
      return;
    }

    if (comentario.trim().length < 10) {
      alert('O comentário deve ter pelo menos 10 caracteres.');
      return;
    }

    if (palavrasChave.length === 0) {
      alert('Selecione pelo menos uma palavra-chave.');
      return;
    }

    // Atualizar avaliação
    const storedAvaliacoes = localStorage.getItem('minhasAvaliacoes');
    if (storedAvaliacoes) {
      const avaliacoes: Avaliacao[] = JSON.parse(storedAvaliacoes);
      const index = avaliacoes.findIndex(av => av.id === avaliacaoId);
      
      if (index !== -1) {
        avaliacoes[index] = {
          ...avaliacoes[index],
          nota,
          comentario,
          palavrasChave,
          editadoEm: new Date().toISOString().split('T')[0]
        };
        
        localStorage.setItem('minhasAvaliacoes', JSON.stringify(avaliacoes));
        
        // Recalcular reputação
        recalcularReputacao(avaliacoes[index]);
        
        alert('Avaliação atualizada com sucesso!');
        router.push('/minhas-avaliacoes');
      }
    }
  };

  const recalcularReputacao = (avaliacaoAtualizada: Avaliacao) => {
    const todasAvaliacoes = JSON.parse(localStorage.getItem('todasAvaliacoes') || '[]');
    const index = todasAvaliacoes.findIndex((av: Avaliacao) => av.id === avaliacaoId);
    
    if (index !== -1) {
      todasAvaliacoes[index] = avaliacaoAtualizada;
      localStorage.setItem('todasAvaliacoes', JSON.stringify(todasAvaliacoes));
      
      // Recalcular nota média
      const avaliacoesDoHomem = todasAvaliacoes.filter(
        (av: Avaliacao) => av.nomeHomem === avaliacaoAtualizada.nomeHomem
      );
      
      const novaNotaMedia = avaliacoesDoHomem.reduce((sum: number, av: Avaliacao) => sum + av.nota, 0) / avaliacoesDoHomem.length;
      
      console.log(`Reputação recalculada para ${avaliacaoAtualizada.nomeHomem}: ${novaNotaMedia.toFixed(1)}`);
    }
  };

  const togglePalavraChave = (palavra: string) => {
    if (palavrasChave.includes(palavra)) {
      setPalavrasChave(palavrasChave.filter(p => p !== palavra));
    } else {
      setPalavrasChave([...palavrasChave, palavra]);
    }
  };

  const getKeywordColor = (keyword: string) => {
    const negative = ['agressivo', 'manipulador', 'desrespeitoso', 'violento', 'abusivo', 'insistente'];
    const positive = ['respeitoso', 'confiável', 'gentil', 'educado', 'atencioso', 'pontual'];
    
    if (negative.includes(keyword.toLowerCase())) {
      return 'border-red-500/50 text-red-300';
    }
    if (positive.includes(keyword.toLowerCase())) {
      return 'border-green-500/50 text-green-300';
    }
    return 'border-gray-500/50 text-gray-300';
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
              <Star className="w-8 h-8 text-[#D4AF37] fill-current" />
              <h1 className="text-2xl font-bold text-white">Editar Avaliação</h1>
            </div>
            <button
              onClick={() => router.push('/minhas-avaliacoes')}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <p className="text-gray-400 text-sm">
            Editando avaliação de {avaliacao.nomeHomem}
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="px-4 max-w-md mx-auto mt-6">
        <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#D4AF37]/20">
          {/* Nota */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Nota *
            </label>
            <div className="flex gap-2 justify-center">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  onClick={() => setNota(value)}
                  className="transition-all"
                >
                  <Star
                    className={`w-10 h-10 ${
                      value <= nota
                        ? 'text-[#D4AF37] fill-current'
                        : 'text-gray-600'
                    } hover:scale-110 transition-transform`}
                  />
                </button>
              ))}
            </div>
            <p className="text-center text-gray-400 text-sm mt-2">
              {nota === 0 ? 'Selecione uma nota' : `Nota: ${nota}/5`}
            </p>
          </div>

          {/* Comentário */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Comentário *
            </label>
            <textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="Descreva sua experiência de forma respeitosa e objetiva..."
              rows={5}
              className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37] transition-colors resize-none"
            />
            <p className="text-gray-500 text-xs mt-1">
              {comentario.length} caracteres (mínimo 10)
            </p>
          </div>

          {/* Palavras-chave */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Palavras-chave * (selecione pelo menos uma)
            </label>
            <div className="flex flex-wrap gap-2">
              {palavrasChaveDisponiveis.map((palavra) => (
                <button
                  key={palavra}
                  onClick={() => togglePalavraChave(palavra)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                    palavrasChave.includes(palavra)
                      ? `${getKeywordColor(palavra)} bg-opacity-20`
                      : 'border-gray-700 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  {palavra}
                </button>
              ))}
            </div>
          </div>

          {/* Aviso */}
          <div className="mb-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-blue-300 text-sm font-medium mb-1">
                Edição responsável
              </p>
              <p className="text-blue-200/70 text-xs">
                Ao salvar, a reputação será recalculada automaticamente. Mantenha sua avaliação honesta e respeitosa.
              </p>
            </div>
          </div>

          {/* Botões */}
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/minhas-avaliacoes')}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="flex-1 bg-gradient-to-r from-[#D4AF37] to-[#F4D03F] text-black font-bold py-3 rounded-lg hover:shadow-lg hover:shadow-[#D4AF37]/50 transition-all duration-300 flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" />
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
