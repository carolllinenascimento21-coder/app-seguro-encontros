'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const supabase = createClientComponentClient();

export default function AvaliarPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [form, setForm] = useState({
    nome: '',
    cidade: '',
    contato: '',
    comportamento: 0,
    seguranca_emocional: 0,
    respeito: 0,
    carater: 0,
    confianca: 0,
    flags: [] as string[],
    relato: '',
    anonimo: true,
  });

  const handleSubmit = async () => {
    setErro(null);
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { error } = await supabase
        .from('avaliacoes')
        .insert({
          nome: form.nome,
          cidade: form.cidade || null,
          contato: form.contato || null,
          comportamento: form.comportamento,
          seguranca_emocional: form.seguranca_emocional,
          respeito: form.respeito,
          carater: form.carater,
          confianca: form.confianca,
          flags: form.flags,
          relato: form.relato,
          anonimo: form.anonimo,
        });

      if (error) throw error;

      router.push('/minhas-avaliacoes');
    } catch (e: any) {
      console.error(e);
      setErro('Erro ao enviar avaliação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black px-4 py-8 max-w-md mx-auto">
      <h1 className="text-xl font-bold text-white mb-4">Nova Avaliação</h1>

      {erro && <p className="text-red-500 text-sm mb-3">{erro}</p>}

      <input
        placeholder="Nome do avaliado *"
        className="w-full mb-3 p-3 rounded bg-[#1A1A1A] text-white"
        value={form.nome}
        onChange={(e) => setForm({ ...form, nome: e.target.value })}
      />

      <input
        placeholder="Cidade (opcional)"
        className="w-full mb-3 p-3 rounded bg-[#1A1A1A] text-white"
        value={form.cidade}
        onChange={(e) => setForm({ ...form, cidade: e.target.value })}
      />

      <input
        placeholder="Contato / Rede social (opcional)"
        className="w-full mb-3 p-3 rounded bg-[#1A1A1A] text-white"
        value={form.contato}
        onChange={(e) => setForm({ ...form, contato: e.target.value })}
      />

      <textarea
        placeholder="Relato (opcional)"
        className="w-full mb-4 p-3 rounded bg-[#1A1A1A] text-white"
        value={form.relato}
        onChange={(e) => setForm({ ...form, relato: e.target.value })}
      />

      <label className="flex items-center gap-2 text-gray-300 mb-6">
        <input
          type="checkbox"
          checked={form.anonimo}
          onChange={(e) => setForm({ ...form, anonimo: e.target.checked })}
        />
        Avaliação anônima (recomendado)
      </label>

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full bg-[#D4AF37] text-black py-3 rounded font-bold"
      >
        {loading ? 'Enviando...' : 'Enviar avaliação'}
      </button>
    </div>
  );
}
