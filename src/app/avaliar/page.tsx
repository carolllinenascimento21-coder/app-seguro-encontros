'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { GREEN_FLAGS, RED_FLAGS } from '@/lib/flags';

export default function AvaliarPage() {
  const [anonimo, setAnonimo] = useState(false);
  const [nome, setNome] = useState('');
  const [cidade, setCidade] = useState('');
  const [contato, setContato] = useState('');
  const [relato, setRelato] = useState('');
  const [comportamento, setComportamento] = useState(0);
  const [segurancaEmocional, setSegurancaEmocional] = useState(0);
  const [respeito, setRespeito] = useState(0);
  const [carater, setCarater] = useState(0);
  const [confianca, setConfianca] = useState(0);
  const [greenFlags, setGreenFlags] = useState<string[]>([]);
  const [redFlags, setRedFlags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const criterios = [
    {
      key: 'comportamento',
      label: 'Comportamento',
      value: comportamento,
      setValue: setComportamento,
    },
    {
      key: 'segurancaEmocional',
      label: 'Segurança emocional',
      value: segurancaEmocional,
      setValue: setSegurancaEmocional,
    },
    {
      key: 'respeito',
      label: 'Respeito',
      value: respeito,
      setValue: setRespeito,
    },
    {
      key: 'carater',
      label: 'Caráter',
      value: carater,
      setValue: setCarater,
    },
    {
      key: 'confianca',
      label: 'Confiança',
      value: confianca,
      setValue: setConfianca,
    },
  ] as const;

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

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setLoading(false);
      alert('Você precisa estar autenticada para publicar uma avaliação.');
      return;
    }

    const payload = {
      autor_id: user.id,
      anonimo,
      nome: anonimo ? null : nome,
      cidade,
      contato,
      relato,
      // Mapeamento direto para as colunas reais do schema (não existe "estrelas").
      comportamento,
      seguranca_emocional: segurancaEmocional,
      respeito,
      carater,
      confianca,
    };

    const possuiTodasAvaliacoes = criterios.every(
      (criterio) => criterio.value > 0
    );

    if (!payload.cidade || !possuiTodasAvaliacoes) {
      setLoading(false);
      alert('Cidade e avaliações por critério são obrigatórias');
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
      setNome('');
      setCidade('');
      setContato('');
      setRelato('');
      setGreenFlags([]);
      setRedFlags([]);
      setComportamento(0);
      setSegurancaEmocional(0);
      setRespeito(0);
      setCarater(0);
      setConfianca(0);
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
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full bg-zinc-900 p-3 rounded"
          />
        )}

        <input
          name="cidade"
          placeholder="Cidade"
          required
          value={cidade}
          onChange={(e) => setCidade(e.target.value)}
          className="w-full bg-zinc-900 p-3 rounded"
        />

        <input
          name="contato"
          placeholder="Contato (opcional)"
          value={contato}
          onChange={(e) => setContato(e.target.value)}
          className="w-full bg-zinc-900 p-3 rounded"
        />

        {/* ESTRELAS POR CRITÉRIO */}
        <div>
          <p className="mb-2">Avaliação por critério</p>
          <div className="space-y-3">
            {criterios.map((criterio) => (
              <div key={criterio.key}>
                <p className="text-sm text-zinc-300 mb-1">
                  {criterio.label}
                </p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => criterio.setValue(n)}
                      className={`text-2xl ${
                        criterio.value >= n
                          ? 'text-yellow-400'
                          : 'text-zinc-600'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
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
          value={relato}
          onChange={(e) => setRelato(e.target.value)}
          className="w-full bg-zinc-900 p-3 rounded min-h-[120px]"
        />

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={anonimo}
            onChange={(e) => {
              const checked = e.target.checked;
              setAnonimo(checked);
              if (checked) {
                setNome('');
              }
            }}
          />
          Avaliar de forma anônima
        </label>

        <button
          disabled={loading || !criterios.every((c) => c.value > 0)}
          className="w-full bg-yellow-500 text-black py-3 rounded font-semibold disabled:opacity-50"
        >
          {loading ? 'Publicando...' : 'Publicar avaliação'}
        </button>
      </form>
    </main>
  );
}
