'use client';

import { useState } from 'react';
import { Star, AlertTriangle, Send, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/custom/navbar';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const supabase = createClientComponentClient();

export default function AvaliarPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    nome: '',
    cidade: '',
    contato: '',
    comportamento: 0,
    seguranca_emocional: 0,
    respeito: 0,
    carater: 0,
    confianca: 0,
    relato: '',
    flags: [] as string[],
    anonimo: true,
  });

  const [submitting, setSubmitting] = useState(false);

  const categorias = [
    { key: 'comportamento', label: 'Comportamento' },
    { key: 'seguranca_emocional', label: 'Segurança Emocional' },
    { key: 'respeito', label: 'Respeito' },
    { key: 'carater', label: 'Caráter' },
    { key: 'confianca', label: 'Confiança' },
  ];

  const redFlagsOptions = [
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

  const toggleFlag = (flag: string) => {
    setFormData((prev) => ({
      ...prev,
      flags: prev.flags.includes(flag)
        ? prev.flags.filter((f) => f !== flag)
        : [...prev.flags, flag],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSubmitting(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert('Usuária não autenticada');
        return;
      }

      // 1️⃣ CRIAR AVALIAÇÃO (SEM USER_ID)
      const { data: avaliacao, error: avaliacaoError } = await supabase
        .from('avaliacoes')
        .insert({
          nome: formData.nome,
          cidade: formData.cidade || null,
          contato: formData.contato || null,
          flags: formData.flags,
          relato: formData.relato,
          comportamento: formData.comportamento,
          seguranca_emocional: formData.seguranca_emocional,
          respeito: formData.respeito,
          carater: formData.carater,
          confianca: formData.confianca,
          anonimo: formData.anonimo,
        })
        .select()
        .single();

      if (avaliacaoError) throw avaliacaoError;

      // 2️⃣ CRIAR VÍNCULO ANÔNIMO
      const { error: vinculoError } = await supabase
        .from('avaliacoes_autoras')
        .insert({
          avaliacao_id: avaliacao.id,
          autora_id: user.id,
        });

      if (vinculoError) throw vinculoError;

      router.push('/minhas-avaliacoes');
    } catch (err) {
      console.error('Erro ao enviar avaliação:', err);
      alert('Erro ao enviar avaliação.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <div className="max-w-md mx-auto px-4 pt-6">
        <Link href="/home" className="text-[#D4AF37] text-sm mb-4 inline-block">
          ← Voltar
        </Link>

        <h1 className="text-2xl font-bold mb-4">Nova Avaliação</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <input
            required
            placeholder="Nome"
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            className="w-full p-3 rounded bg-white/5 border border-gray-700"
          />

          <input
            placeholder="Cidade (opcional)"
            value={formData.cidade}
            onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
            className="w-full p-3 rounded bg-white/5 border border-gray-700"
          />

          <input
            placeholder="Contato (opcional)"
            value={formData.contato}
            onChange={(e) => setFormData({ ...formData, contato: e.target.value })}
            className="w-full p-3 rounded bg-white/5 border border-gray-700"
          />

          {categorias.map((c) => (
            <div key={c.key}>
              <p className="mb-2">{c.label}</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((v) => (
                  <Star
                    key={v}
                    onClick={() =>
                      setFormData({ ...formData, [c.key]: v } as any)
                    }
                    className={`w-7 h-7 cursor-pointer ${
                      (formData as any)[c.key] >= v
                        ? 'text-[#D4AF37] fill-current'
                        : 'text-gray-600'
                    }`}
                  />
                ))}
              </div>
            </div>
          ))}

          <div>
            <p className="mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              Red Flags
            </p>
            <div className="flex flex-wrap gap-2">
              {redFlagsOptions.map((f) => (
                <button
                  type="button"
                  key={f}
                  onClick={() => toggleFlag(f)}
                  className={`px-3 py-1 rounded-full text-sm ${
                    formData.flags.includes(f)
                      ? 'bg-red-500 text-white'
                      : 'bg-white/10'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <textarea
            placeholder="Relato (opcional)"
            rows={4}
            value={formData.relato}
            onChange={(e) => setFormData({ ...formData, relato: e.target.value })}
            className="w-full p-3 rounded bg-white/5 border border-gray-700"
          />

          {/* 🔐 ANONIMATO */}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={formData.anonimo}
              onChange={(e) =>
                setFormData({ ...formData, anonimo: e.target.checked })
              }
            />
            Publicar como anônima (sua identidade nunca será revelada)
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#D4AF37] text-black py-3 rounded font-bold"
          >
            {submitting ? (
              <Loader2 className="animate-spin mx-auto" />
            ) : (
              <>
                <Send className="inline w-4 h-4 mr-2" />
                Enviar avaliação
              </>
            )}
          </button>
        </form>
      </div>

      <Navbar />
    </div>
  );
}
