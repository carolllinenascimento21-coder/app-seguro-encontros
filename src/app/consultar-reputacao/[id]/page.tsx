'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Star,
  AlertTriangle,
  Calendar,
  Shield,
  MessageSquare
} from 'lucide-react';
import Navbar from '@/components/custom/navbar';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const supabase = createClientComponentClient();

interface Review {
  id: string;
  rating: number;
  date: string;
  summary: string | null;
  keywords: string[];
}

interface Details {
  name: string;
  city: string | null;
  state: string | null;
  rating: number;
  totalReviews: number;
  keywords: string[];
  hasAlerts: boolean;
  reviews: Review[];
}

export default function DetalhesReputacao() {
  const params = useParams();
  const router = useRouter();
  const slug = decodeURIComponent(params.id as string);

  const [details, setDetails] = useState<Details | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarDetalhes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const carregarDetalhes = async () => {
    try {
      setLoading(true);

      /**
       * 🔓 BUSCA PÚBLICA
       * Apenas avaliações públicas
       * Sem vínculo com autora
       */
      const { data, error } = await supabase
        .from('avaliacoes')
        .select(`
          id,
          nome,
          cidade,
          estado,
          flags,
          relato,
          comportamento,
          seguranca_emocional,
          respeito,
          carater,
          confianca,
          created_at
        `)
        .eq('publica', true)
        .ilike('nome', slug);

      if (error) throw error;

      if (!data || data.length === 0) {
        setDetails(null);
        return;
      }

      setDetails(agruparAvaliacoes(data));
    } catch (err) {
      console.error('Erro ao carregar reputação:', err);
      setDetails(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-gray-400">Carregando reputação...</p>
      </div>
    );
  }

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
    const negative = ['agressivo', 'manipulador', 'desrespeitoso', 'abusivo', 'violento'];
    const positive = ['respeitoso', 'confiável', 'gentil', 'educado', 'atencioso'];

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
            className="flex items-center gap-2 text-gray-400 hover:text-[#D4AF37] mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </button>

          <h1 className="text-2xl font-bold text-white mb-1">
            {details.name}
          </h1>
          <p className="text-gray-400 text-sm">
            {details.city}
            {details.state ? `, ${details.state}` : ''}
          </p>
        </div>
      </div>

      <div className="px-4 max-w-md mx-auto">
        {/* Nota Geral */}
        <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#D4AF37]/20 mb-4">
          <div className="text-center">
            <p className="text-gray-400 text-sm mb-2">Nota Geral</p>
            <div className="flex items-center justify-center gap-3 mb-3">
              <Star
                className={`w-12 h-12 ${getRatingColor(details.rating)} fill-current`}
              />
              <span
                className={`text-5xl font-bold ${getRatingColor(details.rating)}`}
              >
                {details.rating.toFixed(1)}
              </span>
            </div>
            <p className="text-gray-400 text-sm">
              Baseado em {details.totalReviews} avaliações
            </p>
          </div>

          {/* Keywords */}
          {details.keywords.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-800">
              <p className="text-gray-400 text-sm mb-3">
                Características mais mencionadas:
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {details.keywords.map((k, i) => (
                  <span
                    key={i}
                    className={`px-4 py-2 rounded-full text-sm font-medium border ${getKeywordColor(
                      k
                    )}`}
                  >
                    {k}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Histórico */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-5 h-5 text-[#D4AF37]" />
            <h2 className="text-lg font-bold text-white">
              Histórico de Avaliações
            </h2>
          </div>

          <div className="space-y-3">
            {details.reviews.map(r => (
              <div
                key={r.id}
                className="bg-[#1A1A1A] rounded-xl p-4 border border-gray-800"
              >
                <div className="flex justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Star
                      className={`w-4 h-4 ${getRatingColor(r.rating)} fill-current`}
                    />
                    <span
                      className={`font-bold ${getRatingColor(r.rating)}`}
                    >
                      {r.rating.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-400 text-xs">
                    <Calendar className="w-3 h-3" />
                    {new Date(r.date).toLocaleDateString('pt-BR')}
                  </div>
                </div>

                {r.summary && (
                  <p className="text-gray-300 text-sm mb-3">
                    {r.summary}
                  </p>
                )}

                {r.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {r.keywords.map((k, i) => (
                      <span
                        key={i}
                        className={`px-2 py-1 rounded-full text-xs font-medium border ${getKeywordColor(
                          k
                        )}`}
                      >
                        {k}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Aviso */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex gap-3">
          <Shield className="w-5 h-5 text-blue-400" />
          <p className="text-blue-200/70 text-xs">
            Apenas informações públicas e não sensíveis são exibidas.
          </p>
        </div>
      </div>

      <Navbar />
    </div>
  );
}

/**
 * 🔧 AGREGAÇÃO SEGURA
 */
function agruparAvaliacoes(lista: any[]): Details {
  let soma = 0;
  const keywords = new Set<string>();
  let hasAlerts = false;

  const reviews: Review[] = lista.map(a => {
    const media =
      (a.comportamento +
        a.seguranca_emocional +
        a.respeito +
        a.carater +
        a.confianca) / 5;

    soma += media;

    (a.flags || []).forEach((f: string) => {
      keywords.add(f);
      if (['agressivo', 'abusivo', 'violento', 'manipulador'].includes(f)) {
        hasAlerts = true;
      }
    });

    return {
      id: a.id,
      rating: Number(media.toFixed(1)),
      date: a.created_at,
      summary: a.relato,
      keywords: a.flags || []
    };
  });

  const first = lista[0];

  return {
    name: first.nome,
    city: first.cidade,
    state: first.estado,
    rating: Number((soma / lista.length).toFixed(1)),
    totalReviews: lista.length,
    keywords: Array.from(keywords).slice(0, 8),
    hasAlerts,
    reviews
  };
}
