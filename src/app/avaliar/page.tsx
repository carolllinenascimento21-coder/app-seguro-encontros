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
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [selectedPositiveFlags, setSelectedPositiveFlags] = useState<string[]>([]);
  const [selectedNegativeFlags, setSelectedNegativeFlags] = useState<string[]>([]);
  const [perfil, setPerfil] = useState<PerfilMasculino | null>(null);
  const [perfilLoading, setPerfilLoading] = useState(false);
  const [perfilError, setPerfilError] = useState<string | null>(null);

  const avaliadoId = useMemo(() => {
    const raw =
      searchParams.get('avaliadoId') ?? searchParams.get('avaliacaoId');
    return raw?.trim() ?? null;
  }, [searchParams]);

  const isValidUuid = useMemo(() => {
    if (!avaliadoId) return false;
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(avaliadoId);
  }, [avaliadoId]);

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

  const setNota = (key: CriterioKey, value: number) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const toggleFlag = (
    flag: string,
    setter: Dispatch<SetStateAction<string[]>>
  ) => {
    setter(prev =>
      prev.includes(flag)
        ? prev.filter(f => f !== flag)
        : [...prev, flag]
    );
  };

  useEffect(() => {
    if (!isValidUuid) {
      setPerfil(null);
      setPerfilError(null);
      setPerfilLoading(false);
      return;
    }

    setPerfilLoading(true);
    setPerfilError(null);

    const perfilEncontrado = perfisMock.find(
      perfilItem => perfilItem.id === avaliadoId
    );

    if (!perfilEncontrado) {
      setPerfil(null);
      setPerfilError('Perfil não encontrado.');
    } else {
      setPerfil(perfilEncontrado);
    }

    setPerfilLoading(false);
  }, [avaliadoId, isValidUuid]);

  const enviar = async () => {
    if (loading) return;

    setErro(null);
    setLoading(true);

    try {
      if (!avaliadoId || !isValidUuid) {
        setErro('Link de avaliação inválido ou incompleto.');
        return;
      }

      if (!form.nome || form.comportamento === 0) {
        setErro('Preencha o nome e ao menos a avaliação de comportamento.');
        return;
      }

      const res = await fetch('/api/avaliacoes/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          avaliadoId,
          nome: form.nome,
          cidade: form.cidade,
          contato: form.contato,
          relato: form.relato,
          flags_positive: selectedPositiveFlags,
          flags_negative: selectedNegativeFlags,
          anonimo: form.anonimo,
          comportamento: form.comportamento,
          seguranca_emocional: form.seguranca_emocional,
          respeito: form.respeito,
          carater: form.carater,
          confianca: form.confianca,
        }),
      });

      if (res.status === 401) {
        router.push('/login');
        return;
      }

      if (res.status === 403) {
        router.push('/planos');
        return;
      }

      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || 'Erro ao enviar avaliação.');
      }

      const payload = await res.json();
      if (payload?.success === false && payload?.reason === 'PAYWALL') {
        router.push('/planos');
        return;
      }

      router.push('/minhas-avaliacoes');

    } catch (err) {
      console.error('Erro ao enviar avaliação:', err);
      setErro('Erro ao enviar avaliação. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black">
      <div className="px-4 py-8 max-w-md mx-auto">
        <h1 className="text-xl font-bold text-white mb-4">Nova Avaliação</h1>

        {!avaliadoId || !isValidUuid ? (
          <div className="bg-[#1A1A1A] border border-red-500/30 text-gray-200 rounded-xl p-5 mb-6">
            <p className="text-red-400 font-semibold mb-2">
              Link de avaliação inválido ou incompleto.
            </p>
            <p className="text-sm text-gray-400 mb-4">
              Verifique se o link contém um ID válido de perfil.
            </p>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="w-full bg-[#D4AF37] text-black py-2 rounded font-semibold"
              >
                Voltar
              </button>
              <Link
                href="/home"
                className="w-full text-center border border-[#D4AF37] text-[#D4AF37] py-2 rounded font-semibold"
              >
                Ir para início
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl p-4 mb-6">
            <p className="text-gray-400 text-xs uppercase tracking-wide mb-2">
              Avaliando perfil
            </p>
            {perfilLoading && (
              <p className="text-gray-300 text-sm">Carregando perfil...</p>
            )}
            {perfilError && (
              <p className="text-red-400 text-sm">
                {perfilError} (ID: {avaliadoId})
              </p>
            )}
            {!perfilLoading && !perfilError && perfil && (
              <div>
                <p className="text-white font-semibold">{perfil.nome}</p>
                {perfil.cidade && (
                  <p className="text-gray-400 text-sm">{perfil.cidade}</p>
                )}
              </div>
            )}
          </div>
        )}

      {avaliadoId && isValidUuid && (
        <>
          {erro && <p className="text-red-500 mb-3">{erro}</p>}

          <input
            className="w-full mb-3 p-3 rounded bg-[#1A1A1A] text-white"
            placeholder="Nome *"
            value={form.nome}
            onChange={e => setForm({ ...form, nome: e.target.value })}
          />

          <input
            className="w-full mb-3 p-3 rounded bg-[#1A1A1A] text-white"
            placeholder="Cidade (opcional)"
            value={form.cidade}
            onChange={e => setForm({ ...form, cidade: e.target.value })}
          />

          <input
            className="w-full mb-3 p-3 rounded bg-[#1A1A1A] text-white"
            placeholder="Contato / rede social (opcional)"
            value={form.contato}
            onChange={e => setForm({ ...form, contato: e.target.value })}
          />

          {criterios.map(c => (
            <div key={c.key} className="mb-4">
              <p className="text-gray-300 mb-1">{c.label}</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(n => (
                  <Star
                    key={n}
                    onClick={() => setNota(c.key, n)}
                    className={`w-6 h-6 cursor-pointer ${
                      form[c.key] >= n
                        ? 'text-yellow-400 fill-current'
                        : 'text-gray-600'
                    }`}
                  />
                ))}
              </div>
            </div>
          ))}

          <div className="mt-6">
            <p className="text-gray-300 mb-2">Pontos positivos (Green Flags)</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {GREEN_FLAGS.map(flag => (
                <button
                  key={flag.slug}
                  type="button"
                  onClick={() => toggleFlag(flag.slug, setSelectedPositiveFlags)}
                  className={`px-3 py-1 rounded-full text-xs ${
                    selectedPositiveFlags.includes(flag.slug)
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  {flag.label}
                </button>
              ))}
            </div>

            <p className="text-gray-300 mb-2">Pontos de atenção (Red Flags)</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {RED_FLAGS.map(flag => (
                <button
                  key={flag.slug}
                  type="button"
                  onClick={() => toggleFlag(flag.slug, setSelectedNegativeFlags)}
                  className={`px-3 py-1 rounded-full text-xs ${
                    selectedNegativeFlags.includes(flag.slug)
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  {flag.label}
                </button>
              ))}
            </div>
          </div>

          <textarea
            className="w-full p-3 rounded bg-[#1A1A1A] text-white mb-4"
            placeholder="Relato (opcional)"
            value={form.relato}
            onChange={e => setForm({ ...form, relato: e.target.value })}
          />

          <label className="flex items-center gap-2 text-gray-300 mb-6">
            <input
              type="checkbox"
              checked={form.anonimo}
              onChange={e => setForm({ ...form, anonimo: e.target.checked })}
            />
            Avaliação anônima (recomendado)
          </label>

          <button
            onClick={enviar}
            disabled={loading}
            className="w-full bg-[#D4AF37] text-black py-3 rounded font-bold disabled:opacity-60"
          >
            {loading ? 'Enviando...' : 'Enviar avaliação'}
          </button>
        </>
      )}
      </div>
    </div>
  );
}
