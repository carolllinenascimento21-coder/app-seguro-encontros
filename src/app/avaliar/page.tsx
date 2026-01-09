'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { useRouter } from 'next/navigation';

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

const redFlagsList = [
  'Mentiras constantes',
  'Manipulação emocional',
  'Desrespeito',
  'Agressividade',
  'Falta de respeito',
  'Imaturidade emocional',
  'Traição',
  'Golpe amoroso',
  'Stalking',
  'Comportamento abusivo',
  'Liso',
];

export default function AvaliarPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [form, setForm] = useState({
    nome: '',
    cidade: '',
    contato: '',
    relato: '',
    anonimo: true,
    flags: [] as string[],
    comportamento: 0,
    seguranca_emocional: 0,
    respeito: 0,
    carater: 0,
    confianca: 0,
  });

  const setNota = (key: CriterioKey, value: number) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const toggleFlag = (flag: string) => {
    setForm(prev => ({
      ...prev,
      flags: prev.flags.includes(flag)
        ? prev.flags.filter(f => f !== flag)
        : [...prev.flags, flag],
    }));
  };

  const enviar = async () => {
    if (loading) return;

    setErro(null);
    setLoading(true);

    try {
      if (!form.nome || form.comportamento === 0) {
        setErro('Preencha o nome e ao menos a avaliação de comportamento.');
        return;
      }

      const res = await fetch('/api/avaliacoes/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: form.nome,
          cidade: form.cidade,
          contato: form.contato,
          relato: form.relato,
          flags: form.flags,
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

      <p className="text-gray-300 mb-2 mt-4">Red Flags</p>

      <div className="flex flex-wrap gap-2 mb-4">
        {redFlagsList.map(f => (
          <button
            key={f}
            type="button"
            onClick={() => toggleFlag(f)}
            className={`px-3 py-1 rounded-full text-xs ${
              form.flags.includes(f)
                ? 'bg-red-500 text-white'
                : 'bg-gray-700 text-gray-300'
            }`}
          >
            {f}
          </button>
        ))}
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
      </div>
    </div>
  );
}
