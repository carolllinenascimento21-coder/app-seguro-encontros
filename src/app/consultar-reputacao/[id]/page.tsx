'use client';

import { useParams, useRouter } from 'next/navigation';
import { Star, ArrowLeft, AlertTriangle, CheckCircle2 } from 'lucide-react';
import Navbar from '@/components/custom/navbar';
import { useEffect, useState } from 'react';
import { getNegativeFlagLabel, getPositiveFlagLabel } from '@/lib/flags';
export default function DetalhesReputacao() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [avaliacao, setAvaliacao] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const carregar = async () => {
      try {
        const res = await fetch(`/api/reputation/${id}`);

        if (res.status === 401) {
          router.push('/login');
          return;
        }

        if (!res.ok) {
          console.error('Erro ao carregar avaliação', await res.text());
          setAvaliacao(null);
          return;
        }

        const payload = await res.json();
        if (payload.allowed === false) {
          router.push('/planos');
          return;
        }

        setAvaliacao(payload.data ?? null);
      } catch (err) {
        console.error(err);
        setAvaliacao(null);
      } finally {
        setLoading(false);
      }
    };

    carregar();
  }, [id, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-gray-400">
        Carregando...
      </div>
    );
  }

  if (!avaliacao) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center">
        <p className="text-white mb-4">Perfil não encontrado</p>
        <button
          onClick={() => router.back()}
          className="text-[#D4AF37]"
        >
          Voltar
        </button>
      </div>
    );
  }

  const media =
    (
      (avaliacao.comportamento +
        avaliacao.seguranca_emocional +
        avaliacao.respeito +
        avaliacao.carater +
        avaliacao.confianca) / 5
    ).toFixed(1);

  return (
    <div className="min-h-screen bg-black pb-20">
      <div className="px-4 pt-8 max-w-md mx-auto">
        <button
          onClick={() => router.back()}
          className="text-gray-400 flex items-center gap-2 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>

        <h1 className="text-2xl font-bold text-white mb-1">
          {avaliacao.nome || 'Nome não informado'}
        </h1>

        {avaliacao.cidade && (
          <p className="text-gray-400 text-sm mb-4">
            {avaliacao.cidade}
          </p>
        )}

        <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl p-6 mb-4">
          <div className="flex justify-center items-center gap-2 text-[#D4AF37] mb-2">
            <Star className="w-8 h-8 fill-current" />
            <span className="text-4xl font-bold">{media}</span>
          </div>

          <p className="text-center text-gray-400 text-sm">
            Média geral das avaliações
          </p>
        </div>

        {avaliacao.flags_negative?.length > 0 && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4">
            <div className="flex gap-2 text-red-400 font-bold mb-2">
              <AlertTriangle className="w-5 h-5" />
              Pontos de atenção (Red Flags)
            </div>
            <div className="flex flex-wrap gap-2">
              {avaliacao.flags_negative.map((f: string, i: number) => (
                <span
                  key={i}
                  className="bg-red-500/20 text-red-300 px-3 py-1 rounded-full text-xs"
                >
                  {getNegativeFlagLabel(f)}
                </span>
              ))}
            </div>
          </div>
        )}

        {avaliacao.flags_positive?.length > 0 && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
            <div className="flex gap-2 text-green-400 font-bold mb-2">
              <CheckCircle2 className="w-5 h-5" />
              Pontos positivos (Green Flags)
            </div>
            <div className="flex flex-wrap gap-2">
              {avaliacao.flags_positive.map((f: string, i: number) => (
                <span
                  key={i}
                  className="bg-green-500/20 text-green-300 px-3 py-1 rounded-full text-xs"
                >
                  {getPositiveFlagLabel(f)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <Navbar />
    </div>
  );
}
