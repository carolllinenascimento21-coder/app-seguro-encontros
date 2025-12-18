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

  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
    'Liso', // ✅ adicionada
  ];

  const handleRating = (categoria: string, valor: number) => {
    setFormData((prev) => ({ ...prev, [categoria]: valor }));
  };

  const toggleRedFlag = (flag: string) => {
    setFormData((prev) => ({
      ...prev,
      redFlags: prev.redFlags.includes(flag)
        ? prev.redFlags.filter((f) => f !== flag)
        : [...prev.redFlags, flag],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSubmitting(true);

      // 1️⃣ Verificar autenticação
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        alert('Usuária não autenticada');
        return;
      }

      // 2️⃣ Validar notas obrigatórias
      if (
        formData.comportamento === 0 ||
        formData.segurancaEmocional === 0 ||
        formData.respeito === 0 ||
        formData.carater === 0 ||
        formData.confianca === 0
      ) {
        alert('Por favor, avalie todas as categorias antes de enviar.');
        return;
      }

      // 3️⃣ Inserir avaliação (UMA ÚNICA VEZ)
      const { error: insertError } = await supabase
        .from('avaliacoes')
        .insert({
          user_id: user.id, // 🔑 obrigatório para RLS
          nome: formData.nome,
          telefone: formData.telefone || null,
          cidade: formData.cidade || null,
          flags: formData.redFlags,
          relato: formData.relato,
          anonima: formData.anonimo,
          comportamento: formData.comportamento,
          seguranca_emocional: formData.segurancaEmocional,
          respeito: formData.respeito,
          carater: formData.carater,
          confianca: formData.confianca,
        });

      if (insertError) {
        console.error('Erro Supabase:', insertError);
        alert('Erro ao enviar avaliação. Tente novamente.');
        return;
      }

      // 4️⃣ Sucesso
      setSubmitted(true);
      setTimeout(() => {
        router.push('/minhas-avaliacoes');
      }, 2000);

    } catch (err) {
      console.error('Erro inesperado:', err);
      alert('Erro inesperado ao enviar avaliação.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center px-4">
          <div className="w-20 h-20 bg-gradient-to-r from-[#D4AF37] to-[#C0C0C0] rounded-full flex items-center justify-center mx-auto mb-6">
            <Send className="w-10 h-10 text-black" />
          </div>
          <h2 className="text-2xl font-bold text-[#D4AF37] mb-2">
            Avaliação Enviada!
          </h2>
          <p className="text-gray-400">
            Obrigada por contribuir com a segurança de outras mulheres.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <header className="bg-gradient-to-b from-black to-black/95 border-b border-[#D4AF37]/20 sticky top-0 z-40">
        <div className="max-w-md mx-auto px-4 py-4">
          <Link
            href="/home"
            className="flex items-center gap-2 text-[#D4AF37] hover:text-[#C0C0C0]"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Voltar</span>
          </Link>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* (resto do JSX permanece igual ao seu original) */}
        </form>
      </div>

      <Navbar />
    </div>
  );
}
