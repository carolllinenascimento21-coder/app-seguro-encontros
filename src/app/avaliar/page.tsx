'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const supabase = createClientComponentClient();

const criterios = [
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
    publica: true, // ✅ GARANTIA DE VISIBILIDADE
    flags: [] as string[],
    comportamento: 0,
    seguranca_emocional: 0,
    respeito: 0,
    carater: 0,
    confianca: 0,
  });

  const setNota = (key: string, value: number) => {
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
      // 🔐 garantir sessão
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // 🧪 validação mínima
      if (!form.nome.trim() || form.comportamento === 0) {
        setErro('Preencha o nome e ao menos a avaliação de comportamento.');
        setLoading(false);
        return;
      }

      // ✅ INSERT SIMPLES (trigger cuida do vínculo)
      const { error } = await supabase
        .from('avaliacoes')
        .insert({
          nome: form.nome.trim(),
          cidade: form.cidade || null,
          contato: form.contato || null,
          relato: form.relato || null,
          flags: form.flags,
          anonimo: form.anonimo,
          publica: true, // 🔒 explícito (evita falha de policy)
          comportamento: form.comportamento,
          seguranca_emocional: form.seguranca_emocional,
          respeito: form.respeito,
          carater: form.carater,
          confianca: form.confianca,
        });

      if (error) throw error;

      // ✅ sucesso
      router.push('/minhas-avaliacoes');

    } catch (err) {
      console.error('Erro ao enviar avaliação:', err);
      setErro('Erro ao enviar avaliação. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black px-4 py-8 max
