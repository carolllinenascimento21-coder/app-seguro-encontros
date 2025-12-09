'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Star, AlertTriangle, Calendar, Shield, TrendingUp, MessageSquare } from 'lucide-react';
import Navbar from '@/components/custom/navbar';

// Dados simulados detalhados
const mockDetails: Record<string, any> = {
  '1': {
    name: 'João S.',
    city: 'São Paulo',
    state: 'SP',
    rating: 4.2,
    totalReviews: 8,
    keywords: ['respeitoso', 'confiável', 'gentil'],
    hasAlerts: false,
    reviews: [
      {
        id: 1,
        rating: 5,
        date: '2024-01-15',
        summary: 'Pessoa muito respeitosa e educada. Sempre foi gentil e atencioso.',
        keywords: ['respeitoso', 'gentil']
      },
      {
        id: 2,
        rating: 4,
        date: '2024-01-10',
        summary: 'Comportamento adequado, confiável e honesto.',
        keywords: ['confiável', 'honesto']
      },
      {
        id: 3,
        rating: 4,
        date: '2023-12-20',
        summary: 'Educado e atencioso. Sem problemas de comportamento.',
        keywords: ['educado', 'atencioso']
      }
    ],
    patterns: []
  },
  '2': {
    name: 'Carlos M.',
    city: 'Rio de Janeiro',
    state: 'RJ',
    rating: 2.1,
    totalReviews: 15,
    keywords: ['agressivo', 'manipulador', 'desrespeitoso'],
    hasAlerts: true,
    reviews: [
      {
        id: 1,
        rating: 1,
        date: '2024-01-20',
        summary: 'Comportamento agressivo e desrespeitoso. Não recomendo.',
        keywords: ['agressivo', 'desrespeitoso']
      },
      {
        id: 2,
        rating: 2,
        date: '2024-01-18',
        summary: 'Tentou manipular situações. Falta de respeito.',
        keywords: ['manipulador', 'desrespeitoso']
      },
      {
        id: 3,
        rating: 1,
        date: '2024-01-15',
        summary: 'Comportamento inadequado e agressivo verbalmente.',
        keywords: ['agressivo', 'inadequado']
      },
      {
        id: 4,
        rating: 3,
        date: '2024-01-10',
        summary: 'Às vezes educado, mas pode ser manipulador.',
        keywords: ['manipulador']
      }
    ],
    patterns: [
      {
        type: 'warning',
        title: 'Padrão de comportamento agressivo',
        description: '73% das avaliações mencionam comportamento agressivo ou desrespeitoso.'
      },
      {
        type: 'danger',
        title: 'Múltiplos relatos de manipulação',
        description: 'Várias usuárias relataram tentativas de manipulação emocional.'
      }
    ]
  },
  '3': {
    name: 'Pedro L.',
    city: 'Belo Horizonte',
    state: 'MG',
    rating: 3.8,
    totalReviews: 5,
    keywords: ['educado', 'atencioso', 'respeitoso'],
    hasAlerts: false,
    reviews: [
      {
        id: 1,
        rating: 4,
        date: '2024-01-12',
        summary: 'Pessoa educada e respeitosa. Comportamento adequado.',
        keywords: ['educado', 'respeitoso']
      },
      {
        id: 2,
        rating: 4,
        date: '2024-01-05',
        summary: 'Atencioso e gentil. Sem problemas.',
        keywords: ['atencioso', 'gentil']
      },
      {
        id: 3,
        rating: 3,
        date: '2023-12-28',
        summary: 'Comportamento normal, nada de especial.',
        keywords: ['normal']
      }
    ],
    patterns: []
  }
};

export default function DetalhesReputacao() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const details = mockDetails[id];

  if (!details) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-lg mb-4">Perfil não encontrado</p>
          <button
            onClick={() => router.back()}
            className="text-[#D4AF37] hover:underline"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return 'text-green-500';
    if (rating >= 3) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getKeywordColor = (keyword: string) => {
    const negative = ['agressivo', 'manipulador', 'desrespeitoso', 'violento', 'abusivo', 'inadequado'];
    const positive = ['respeitoso', 'confiável', 'gentil', 'educado', 'atencioso', 'honesto'];
    
    if (negative.includes(keyword.toLowerCase())) {
      return 'bg-red-500/20 text-red-300 border-red-500/30';
    }
    if (positive.includes(keyword.toLowerCase())) {
      return 'bg-green-500/20 text-green-300 border-green-500/30';
    }
    return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
  };

  return (
    <div className="min-h-screen bg-black pb-20">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#D4AF37]/20 to-transparent pt-8 pb-6 px-4">
        <div className="max-w-md mx-auto">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-400 hover:text-[#D4AF37] transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Voltar</span>
          </button>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">{details.name}</h1>
              <p className="text-gray-400 text-sm">{details.city}, {details.state}</p>
            </div>
            {details.hasAlerts && (
              <div className="bg-red-500/20 p-3 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 max-w-md mx-auto">
        {/* Nota Geral */}
        <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#D4AF37]/20 mb-4">
          <div className="text-center">
            <p className="text-gray-400 text-sm mb-2">Nota Geral</p>
            <div className="flex items-center justify-center gap-3 mb-3">
              <Star className={`w-12 h-12 ${getRatingColor(details.rating)} fill-current`} />
              <span className={`text-5xl font-bold ${getRatingColor(details.rating)}`}>
                {details.rating.toFixed(1)}
              </span>
            </div>
            <p className="text-gray-400 text-sm">
              Baseado em {details.totalReviews} avaliações
            </p>
          </div>

          {/* Keywords principais */}
          <div className="mt-6 pt-6 border-t border-gray-800">
            <p className="text-gray-400 text-sm mb-3">Características mais mencionadas:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {details.keywords.map((keyword: string, idx: number) => (
                <span
                  key={idx}
                  className={`px-4 py-2 rounded-full text-sm font-medium border ${getKeywordColor(keyword)}`}
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Alertas de Padrões */}
        {details.patterns.length > 0 && (
          <div className="mb-4 space-y-3">
            {details.patterns.map((pattern: any, idx: number) => (
              <div
                key={idx}
                className={`rounded-xl p-4 border ${
                  pattern.type === 'danger'
                    ? 'bg-red-500/10 border-red-500/30'
                    : 'bg-yellow-500/10 border-yellow-500/30'
                }`}
              >
                <div className="flex gap-3">
                  <AlertTriangle
                    className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                      pattern.type === 'danger' ? 'text-red-400' : 'text-yellow-400'
                    }`}
                  />
                  <div>
                    <h3
                      className={`font-bold mb-1 ${
                        pattern.type === 'danger' ? 'text-red-300' : 'text-yellow-300'
                      }`}
                    >
                      {pattern.title}
                    </h3>
                    <p
                      className={`text-sm ${
                        pattern.type === 'danger' ? 'text-red-200/70' : 'text-yellow-200/70'
                      }`}
                    >
                      {pattern.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Histórico de Avaliações */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-5 h-5 text-[#D4AF37]" />
            <h2 className="text-lg font-bold text-white">
              Histórico de Avaliações
            </h2>
          </div>

          <div className="space-y-3">
            {details.reviews.map((review: any) => (
              <div
                key={review.id}
                className="bg-[#1A1A1A] rounded-xl p-4 border border-gray-800"
              >
                {/* Header da avaliação */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Star className={`w-4 h-4 ${getRatingColor(review.rating)} fill-current`} />
                    <span className={`font-bold ${getRatingColor(review.rating)}`}>
                      {review.rating.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-400 text-xs">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(review.date).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>

                {/* Resumo */}
                <p className="text-gray-300 text-sm mb-3">{review.summary}</p>

                {/* Keywords da avaliação */}
                <div className="flex flex-wrap gap-2">
                  {review.keywords.map((keyword: string, idx: number) => (
                    <span
                      key={idx}
                      className={`px-2 py-1 rounded-full text-xs font-medium border ${getKeywordColor(keyword)}`}
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Aviso de Privacidade */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex gap-3">
          <Shield className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-blue-300 text-sm font-medium mb-1">
              Privacidade e Segurança
            </p>
            <p className="text-blue-200/70 text-xs">
              Todas as informações sensíveis foram removidas. Apenas dados não identificáveis são exibidos para proteger a privacidade de todos.
            </p>
          </div>
        </div>
      </div>

      <Navbar />
    </div>
  );
}
