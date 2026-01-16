'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { GREEN_FLAGS, RED_FLAGS } from '@/lib/flags';

export default function AvaliarPage() {
  const [anonimo, setAnonimo] = useState(false);
  const [estrelas, setEstrelas] = useState(0);
  const [greenFlags, setGreenFlags] = useState<string[]>([]);
  const [redFlags, setRedFlags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  function toggleFlag(
    flag: string,
    list: string[],
    setList: (v: string[]) => void
  ) {
    setList(
      list.includes(flag)
        ? list.filter((f) => f !== flag)
        : [...list, flag]
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    const payload = {
      anonimo,
      nome: anonimo ? null : formData.get('nome'),
      cidade: formData.get('cidade'),
      contato: formData.get('contato'),
      relato: formData.get('relato'),
      green_flags: greenFlags,
      red_flags: redFlags,
      estrelas,
    };

    if (!payload.cidade || estrelas === 0) {
      setLoading(false);
      alert('Cidade e estrelas são obrigatórias');
      return;
    }

    if (!anonimo && !payload.nome) {
      setLoading(false);
      alert('Nome é obrigatório quando não for anônimo');
      return;
    }

    const { error } = await supabase
      .from('avaliacoes')
      .insert(payload);

    setLoading(false);

    if (error) {
      alert(error.message);
    } else {
      alert('Avaliação publicada com sucesso');
      e.currentTarget.reset();
      setGreenFlags([]);
      setRedFlags([]);
      setEstrelas(0);
      setAnonimo(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white px-4 py-6">
      <h1 className="text-xl font-semibold mb-6">
        Fazer avaliação
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {!anonimo && (
          <input
            name="nome"
            placeholder="Nome"
            className="w-full bg-zinc-900 p-3 rounded"
          />
        )}

        <input
          name="cidade"
          placeholder="Cidade"
          required
          className="w-full bg-zinc-900 p-3 rounded"
        />

        <input
          name="contato"
          placeholder="Contato (opcional)"
          className="w-full bg-zinc-900 p-3 rounded"
        />

        {/* ESTRELAS */}
        <div>
          <p className="mb-2">Avaliação geral</p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setEstrelas(n)}
                className={`text-2xl ${
                  estrelas >= n ? 'text-yellow-400' : 'text-zinc-600'
                }`}
              >
                ★
              </button>
            ))}
          </div>
        </div>

        {/* GREEN FLAGS */}
        <div>
          <p className="mb-2 text-green-400">Green Flags</p>
          <div className="flex flex-wrap gap-2">
            {GREEN_FLAGS.map((flag) => (
              <button
                type="button"
                key={flag.slug}
                onClick={() =>
                  toggleFlag(flag.slug, greenFlags, setGreenFlags)
                }
                className={`px-3 py-1 rounded text-sm ${
                  greenFlags.includes(flag.slug)
                    ? 'bg-green-500 text-black'
                    : 'bg-zinc-800'
                }`}
              >
                {/* Evita erro #31: renderizamos label ao invés do objeto de flag. */}
                {flag.label}
              </button>
            ))}
          </div>
        </div>

        {/* RED FLAGS */}
        <div>
          <p className="mb-2 text-red-400">Red Flags</p>
          <div className="flex flex-wrap gap-2">
            {RED_FLAGS.map((flag) => (
              <button
                type="button"
                key={flag.slug}
                onClick={() =>
                  toggleFlag(flag.slug, redFlags, setRedFlags)
                }
                className={`px-3 py-1 rounded text-sm ${
                  redFlags.includes(flag.slug)
                    ? 'bg-red-500 text-black'
                    : 'bg-zinc-800'
                }`}
              >
                {/* Evita erro #31: renderizamos label ao invés do objeto de flag. */}
                {flag.label}
              </button>
            ))}
          </div>
        </div>

        <textarea
          name="relato"
          placeholder="Relato (opcional)"
          className="w-full bg-zinc-900 p-3 rounded min-h-[120px]"
        />

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={anonimo}
            onChange={(e) => setAnonimo(e.target.checked)}
          />
          Avaliar de forma anônima
        </label>

        <button
          disabled={loading || estrelas === 0}
          className="w-full bg-yellow-500 text-black py-3 rounded font-semibold disabled:opacity-50"
        >
          {loading ? 'Publicando...' : 'Publicar avaliação'}
        </button>
      </form>
    </main>
  );
}
