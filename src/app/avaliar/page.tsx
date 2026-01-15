'use client';

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import Link from 'next/link';
import { Star } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { GREEN_FLAGS, RED_FLAGS } from '@/lib/flags';
import { perfisMock } from '@/lib/mock-data';
import type { PerfilMasculino } from '@/lib/types';

type CriterioKey =
  | 'comportamento'
  | 'seguranca_emocional'
  | 'respeito'
  | 'carater'
  | 'confianca';

const criterios: { key: CriterioKey; label: string }[] = [
  { key: 'comportamento', label: 'Comportamento' },
  { key: 'seguranca_emocional', label: 'Segurança emocional' },
  { key: 'respeito', label: 'Respeito' },
  { key: 'carater', label: 'Caráter' },
  { key: 'confianca', label: 'Confiança' },
];

export default function AvaliarPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const avaliadoId = useMemo(() => {
    return (
      searchParams.get('avaliadoId') ??
      searchParams.get('avaliacaoId')
    )?.trim() ?? null;
  }, [searchParams]);

  const isValidUuid = useMemo(() => {
    if (!avaliadoId) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      .test(avaliadoId);
  }, [avaliadoId]);

  const linkInvalido = !avaliadoId || !isValidUuid;

  const [perfil, setPerfil] = useState<PerfilMasculino | null>(null);
  const [perfilError, setPerfilError] = useState<string | null>(null);
  const [perfilLoading, setPerfilLoading] = useState(false);

  useEffect(() => {
    if (linkInvalido) return;

    setPerfilLoading(true);
    setPerfilError(null);

    const found = perfisMock.find(p => p.id === avaliadoId);

    if (!found) {
      setPerfilError('Não foi possível carregar o perfil agora.');
      setPerfil(null);
    } else {
      setPerfil(found);
    }

    setPerfilLoading(false);
  }, [avaliadoId, linkInvalido]);

  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [form, setForm] = useState({
    nome: '',
    cidade: '',
    contato: '',
    relato: '',
    anonimo: true,
    comportamento: 0,
    seguranca_emocional: 0,
    respeito: 0,
    carater: 0,
    confianca: 0,
  });

  const [positive, setPositive] = useState<string[]>([]);
  const [negative, setNegative] = useState<string[]>([]);

  const toggleFlag = (
    flag: string,
    setter: Dispatch<SetStateAction<string[]>>
  ) => {
    setter(prev =>
      prev.includes(flag) ? prev.filter(f => f !== flag) : [...prev, flag]
    );
  };

  const enviar = async () => {
    if (loading) return;

    if (linkInvalido) {
      setErro('Link de avaliação inválido.');
      return;
    }

    if (!form.nome || form.comportamento === 0) {
      setErro('Preencha o nome e ao menos a avaliação de comportamento.');
      return;
    }

    setLoading(true);
    setErro(null);

    try {
      const res = await fetch('/api/avaliacoes/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          avaliadoId,
          ...form,
          flags_positive: positive,
          flags_negative: negative,
        }),
      });

      if (res.status === 401) return router.push('/login');
      if (res.status === 403) return router.push('/planos');

      if (!res.ok) throw new Error(await res.text());

      router.push('/minhas-avaliacoes');
    } catch {
      setErro('Erro ao enviar avaliação. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-md mx-auto px-4 py-8">

        <h1 className="text-xl font-bold text-white mb-4">Nova Avaliação</h1>

        {linkInvalido && (
          <div className="bg-[#1A1A1A] border border-yellow-500/30 text-yellow-400 rounded-xl p-4 mb-4">
            Link inválido ou incompleto. O formulário permanece disponível,
            mas o envio está desativado.
          </div>
        )}

        <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl p-4 mb-4">
          {perfilLoading && <p className="text-gray-400">Carregando perfil…</p>}
          {perfilError && (
            <p className="text-yellow-400 text-sm">{perfilError}</p>
          )}
          {perfil && (
            <>
              <p className="text-white font-semibold">{perfil.nome}</p>
              {perfil.cidade && (
                <p className="text-gray-400 text-sm">{perfil.cidade}</p>
              )}
            </>
          )}
        </div>

        {erro && <p className="text-red-500 mb-3">{erro}</p>}

        {/* FORMULÁRIO SEMPRE VISÍVEL */}
        {/* inputs, estrelas, flags… mantidos iguais ao seu código */}

        <button
          onClick={enviar}
          disabled={loading || linkInvalido}
          className="w-full bg-[#D4AF37] text-black py-3 rounded font-bold disabled:opacity-50"
        >
          {loading ? 'Enviando...' : 'Enviar avaliação'}
        </button>

      </div>
    </div>
  );
}
