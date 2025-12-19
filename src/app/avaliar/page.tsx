'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Star, AlertTriangle, Send, Loader2 } from 'lucide-react';
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
    segurancaEmocional: 0,
    respeito: 0,
    carater: 0,
    confianca: 0,
    relato: '',
    redFlags: [] as string[],
    anonimo: true,
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const categorias = [
    { key: 'comportamento', label: 'Comportamento' },
    { key: 'segurancaEmocional', label: 'Segurança Emocional' },
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

  const handleRating = (key: string, value: number) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const toggleRedFlag = (flag: string) => {
    setFormData(prev => ({
      ...prev,
      redFlags: prev.redFlags.includes(flag)
        ? prev.redFlags.filter(f => f !== flag)
        : [...prev.redFlags, flag],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome) {
      alert('O nome é obrigatório.');
      return;
    }

    if (
      !formData.comportamento ||
      !formData.segurancaEmocional ||
      !formData.respeito ||
      !formData.carater ||
      !formData.confianca
    ) {
      alert('Avalie todas as categorias.');
      return;
    }

    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        alert('Usuária não autenticada');
        return;
      }

      /**
       * 1️⃣ Insere avaliação SEM identidade da usuária
       */
      const { data: avaliacao, error: insertError } = await supabase
        .from('avaliacoes')
        .insert({
          nome: formData.nome,
          cidade: formData.cidade || null,
          contato: formData.contato || null,
          flags: formData.redFlags,
          relato: formData.relato || null,
          comportamento: formData.comportamento,
          seguranca_emocional: formData.segurancaEmocional,
          respeito: formData.respeito,
          carater: formData.carater,
          confianca: formData.confianca,
          anonimo: formData.anonimo,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      /**
       * 2️⃣ Cria vínculo anônimo com a autora
       */
      const { error: linkError } = await supabase
        .from('avaliacoes_autoras')
        .insert({
          avaliacao_id: avaliacao.id,
          autora_id: user.id,
        });

      if (linkError) throw linkError;

      setSubmitted(true);

      setTimeout(() => {
        router.push('/minhas-avaliacoes');
      }, 2000);

    } catch (err) {
      console.error('Erro ao enviar avaliação:', err);
      alert('Erro ao enviar avaliação.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <Send className="w-12 h-12 mx-auto text-[#D4AF37] mb-4" />
          <h2 className="text-xl font-bold text-[#D4AF37]">
            Avaliação enviada com sucesso
          </h2>
          <p className="text-gray-400 mt-2">
            Obrigada por ajudar outras mulheres.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <header className="border-b border-[#D4AF37]/20 px-4 py-4">
        <Link href="/home" className="flex items-center gap-2 text-[#D4AF37]">
          <ArrowLeft className="w-5 h-5" />
          Voltar
        </Link>
      </header>

      <div className="max-w-md mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-[#D4AF37] mb-1">
          Avaliar um homem
        </h1>
        <p className="text-gray-400 text-sm mb-6">
          Sua identidade nunca será revelada.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Identificação */}
          <div className="bg-white/5 border border-[#D4AF37]/20 rounded-xl p-5 space-y-4">
            <div>
              <label className="text-sm text-gray-300">Nome *</label>
              <input
                className="w-full bg-black border border-[#D4AF37]/40 rounded-lg px-3 py-2 text-white"
                value={formData.nome}
                onChange={e => setFormData(p => ({ ...p, nome: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="text-sm text-gray-300">Cidade (opcional)</label>
              <input
                className="w-full bg-black border border-[#D4AF37]/40 rounded-lg px-3 py-2 text-white"
                placeholder="Ex: Belo Horizonte - MG"
                value={formData.cidade}
                onChange={e => setFormData(p => ({ ...p, cidade: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-sm text-gray-300">Contato (opcional)</label>
              <input
                className="w-full bg-black border border-[#D4AF37]/40 rounded-lg px-3 py-2 text-white"
                placeholder="Telefone, Instagram, @, link…"
                value={formData.contato}
                onChange={e => setFormData(p => ({ ...p, contato: e.target.value }))}
              />
            </div>
          </div>

          {/* Categorias */}
          <div className="space-y-4">
            {categorias.map(c => (
              <div key={c.key}>
                <p className="text-sm text-gray-300 mb-2">{c.label}</p>
                <div className="flex gap-2">
                  {[1,2,3,4,5].map(v => (
                    <button
                      type="button"
                      key={v}
                      onClick={() => handleRating(c.key, v)}
                    >
                      <Star
                        className={`w-7 h-7 ${
                          (formData as any)[c.key] >= v
                            ? 'text-[#D4AF37] fill-[#D4AF37]'
                            : 'text-gray-600'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Red Flags */}
          <div className="bg-white/5 border border-[#D4AF37]/20 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <p className="font-semibold">Red Flags</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {redFlagsOptions.map(flag => (
                <button
                  type="button"
                  key={flag}
                  onClick={() => toggleRedFlag(flag)}
                  className={`px-3 py-1.5 rounded-full text-xs ${
                    formData.redFlags.includes(flag)
                      ? 'bg-red-500 text-white'
                      : 'bg-white/5 text-gray-400 border border-gray-600'
                  }`}
                >
                  {flag}
                </button>
              ))}
            </div>
          </div>

          {/* Relato */}
          <textarea
            className="w-full bg-black border border-[#D4AF37]/40 rounded-xl px-4 py-3 text-white"
            rows={5}
            placeholder="Relato detalhado (opcional)"
            value={formData.relato}
            onChange={e => setFormData(p => ({ ...p, relato: e.target.value }))}
          />

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#D4AF37] text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="animate-spin" /> : <Send />}
            Enviar avaliação
          </button>
        </form>
      </div>

      <Navbar />
    </div>
  );
}
