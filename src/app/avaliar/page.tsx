'use client';

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Star, AlertTriangle, Send, Loader2 } from 'lucide-react';
import Navbar from '@/components/custom/navbar';
import { useRouter } from 'next/navigation';

const supabase = createClientComponentClient();

export default function AvaliarPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    cidade: '',
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

  const handleRating = (categoria: string, valor: number) => {
    setFormData(prev => ({ ...prev, [categoria]: valor }));
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

  try {
    setSubmitting(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert('Usuária não autenticada');
      return;
    }

    // 1️⃣ Inserir avaliação pública (anônima)
    const { data: avaliacao, error: avaliacaoError } = await supabase
      .from('avaliacoes')
      .insert({
        nome: formData.nome,
        telefone: formData.telefone || null,
        cidade: formData.cidade || null,
        comportamento: formData.comportamento,
        seguranca_emocional: formData.segurancaEmocional,
        respeito: formData.respeito,
        carater: formData.carater,
        confianca: formData.confianca,
        flags: formData.redFlags,
        relato: formData.relato,
        anonima: true,
      })
      .select('id')
      .single();

    if (avaliacaoError || !avaliacao) {
      console.error(avaliacaoError);
      alert('Erro ao salvar avaliação');
      return;
    }

    // 2️⃣ Criar vínculo privado (NÃO público)
    const { error: linkError } = await supabase
      .from('avaliacoes_autoras')
      .insert({
        avaliacao_id: avaliacao.id,
        user_id: user.id,
      });

    if (linkError) {
      console.error(linkError);
      alert('Erro ao finalizar avaliação');
      return;
    }

    setSubmitted(true);
    setTimeout(() => {
      router.push('/minhas-avaliacoes');
    }, 1500);

  } catch (err) {
    console.error(err);
    alert('Erro inesperado');
  } finally {
    setSubmitting(false);
  }
};


  if (submitted) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <Send className="w-12 h-12 text-[#D4AF37] mx-auto mb-4" />
          <h2 className="text-xl font-bold">Avaliação enviada!</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <header className="border-b border-[#D4AF37]/20 p-4">
        <Link href="/home" className="text-[#D4AF37] flex items-center gap-2">
          <ArrowLeft size={18} /> Voltar
        </Link>
      </header>

      <form onSubmit={handleSubmit} className="max-w-md mx-auto p-4 space-y-6">
        <input
          required
          placeholder="Nome completo"
          className="w-full p-3 rounded bg-white/5"
          value={formData.nome}
          onChange={e => setFormData(p => ({ ...p, nome: e.target.value }))}
        />

        {categorias.map(cat => (
          <div key={cat.key}>
            <p className="mb-2">{cat.label}</p>
            <div className="flex gap-2">
              {[1,2,3,4,5].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => handleRating(cat.key, n)}
                >
                  <Star className={formData[cat.key as keyof typeof formData] >= n ? 'text-[#D4AF37]' : 'text-gray-600'} />
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="flex flex-wrap gap-2">
          {redFlagsOptions.map(flag => (
            <button
              type="button"
              key={flag}
              onClick={() => toggleRedFlag(flag)}
              className={`px-3 py-1 rounded-full text-sm ${
                formData.redFlags.includes(flag)
                  ? 'bg-red-600'
                  : 'bg-white/10'
              }`}
            >
              {flag}
            </button>
          ))}
        </div>

        <textarea
          placeholder="Relato (opcional)"
          className="w-full p-3 rounded bg-white/5"
          rows={4}
          value={formData.relato}
          onChange={e => setFormData(p => ({ ...p, relato: e.target.value }))}
        />

        <button
          disabled={submitting}
          className="w-full bg-[#D4AF37] text-black py-3 rounded"
        >
          {submitting ? <Loader2 className="animate-spin mx-auto" /> : 'Enviar avaliação'}
        </button>
      </form>

      <Navbar />
    </div>
  );
}
