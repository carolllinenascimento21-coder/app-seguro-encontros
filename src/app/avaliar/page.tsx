'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Star } from 'lucide-react';
import { GREEN_FLAGS, RED_FLAGS } from '@/lib/flags';
import { perfisMock } from '@/lib/mock-data';

type CriterioKey =
  | 'comportamento'
  | 'seguranca_emocional'
  | 'respeito'
  | 'carater'
  | 'confianca';

export default function AvaliarPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const avaliadoId = useMemo(() => {
    return searchParams.get('avaliadoId')?.trim() ?? null;
  }, [searchParams]);

  const isValidUuid = useMemo(() => {
    if (!avaliadoId) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      avaliadoId
    );
  }, [avaliadoId]);

  const [perfil, setPerfil] = useState<any>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  const [flags, setFlags] = useState<string[]>([]);

  useEffect(() => {
    if (!isValidUuid) return;

    const encontrado = perfisMock.find(p => p.id === avaliadoId);
    setPerfil(encontrado ?? null);
  }, [avaliadoId, isValidUuid]);

  const toggleFlag = (slug: string) => {
    setFlags(prev =>
      prev.includes(slug) ? prev.filter(f => f !== slug) : [...prev, slug]
    );
  };

  const enviar = async () => {
    if (!avaliadoId || !isValidUuid) return;
    if (!form.nome || form.comportamento === 0) {
      setErro('Preencha nome e comportamento.');
      return;
    }

    setLoading(true);
    setErro(null);

    try {
      const res = await fetch('/api/avaliacoes/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          avaliado_id: avaliadoId,
          nome: form.nome,
          cidade: form.cidade || null,
          contato: form.contato || null,
          relato: form.relato || null,
          flags,
          anonimo: form.anonimo,
          comportamento: form.comportamento,
          seguranca_emocional: form.seguranca_emocional,
          respeito: form.respeito,
          carater: form.carater,
          confianca: form.confianca,
        }),
      });

      if (!res.ok) throw new Error(await res.text());
      router.push('/minhas-avaliacoes');
    } catch {
      setErro('Erro ao enviar avaliação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black px-4 py-8 max-w-md mx-auto">
      <h1 className="text-xl text-white font-bold mb-4">Nova Avaliação</h1>

      {!isValidUuid && (
        <div className="bg-[#1A1A1A] border border-yellow-500/40 text-yellow-400 p-4 rounded mb-4">
          Link inválido ou incompleto. O formulário está disponível, mas o envio
          está desativado.
        </div>
      )}

      {perfil && (
        <div className="mb-4 text-gray-300">
          Avaliando <b className="text-white">{perfil.nome}</b>
        </div>
      )}

      <input
        className="w-full mb-3 p-3 rounded bg-[#1A1A1A] text-white"
        placeholder="Nome *"
        value={form.nome}
        onChange={e => setForm({ ...form, nome: e.target.value })}
      />

      {(['comportamento','seguranca_emocional','respeito','carater','confianca'] as CriterioKey[]).map(k => (
        <div key={k} className="mb-3">
          <p className="text-gray-300 capitalize">{k.replace('_', ' ')}</p>
          <div className="flex gap-1">
            {[1,2,3,4,5].map(n => (
              <Star
                key={n}
                onClick={() => setForm({ ...form, [k]: n })}
                className={`w-6 h-6 cursor-pointer ${
                  form[k] >= n ? 'text-yellow-400 fill-current' : 'text-gray-600'
                }`}
              />
            ))}
          </div>
        </div>
      ))}

      <textarea
        className="w-full p-3 rounded bg-[#1A1A1A] text-white mb-3"
        placeholder="Relato (opcional)"
        value={form.relato}
        onChange={e => setForm({ ...form, relato: e.target.value })}
      />

      <div className="flex flex-wrap gap-2 mb-4">
        {[...GREEN_FLAGS, ...RED_FLAGS].map(f => (
          <button
            key={f.slug}
            onClick={() => toggleFlag(f.slug)}
            className={`px-3 py-1 rounded-full text-xs ${
              flags.includes(f.slug)
                ? 'bg-yellow-500 text-black'
                : 'bg-gray-700 text-gray-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {erro && <p className="text-red-500 mb-3">{erro}</p>}

      <button
        disabled={!isValidUuid || loading}
        onClick={enviar}
        className="w-full bg-[#D4AF37] text-black py-3 rounded font-bold disabled:opacity-40"
      >
        {loading ? 'Enviando...' : 'Enviar avaliação'}
      </button>
    </div>
  );
}
