'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { GREEN_FLAGS, RED_FLAGS } from '@/lib/flags';

function normalize(text: string) {
  return text
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

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
    { value: comportamento },
    { value: segurancaEmocional },
    { value: respeito },
    { value: carater },
    { value: confianca },
  ];

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      alert('Você precisa estar autenticada.');
      setLoading(false);
      return;
    }

    if (!cidade || criterios.some(c => c.value === 0)) {
      alert('Cidade e todas as avaliações são obrigatórias.');
      setLoading(false);
      return;
    }

    if (!anonimo && !nome) {
      alert('Nome é obrigatório.');
      setLoading(false);
      return;
    }

    /**
     * 🔹 PASSO 5 — CRIAR OU BUSCAR PERFIL MASCULINO
     */
    const normalized_name = normalize(nome || 'desconhecido');
    const normalized_city = normalize(cidade);

    let { data: profile } = await supabase
      .from('male_profiles')
      .select('id')
      .eq('normalized_name', normalized_name)
      .eq('normalized_city', normalized_city)
      .maybeSingle();

    if (!profile) {
      const { data: created } = await supabase
        .from('male_profiles')
        .insert({
          display_name: anonimo ? 'Não informado' : nome,
          city: cidade,
          normalized_name,
          normalized_city,
          is_active: true,
        })
        .select('id')
        .single();

      profile = created;
    }

    /**
     * 🔹 INSERÇÃO DA AVALIAÇÃO (SEM REDIRECIONAR)
     */
    const { error } = await supabase.from('avaliacoes').insert({
      autor_id: user.id,
      anonimo,
      nome: anonimo ? null : nome,
      cidade,
      contato,
      relato,
      comportamento,
      seguranca_emocional: segurancaEmocional,
      respeito,
      carater,
      confianca,
      male_profile_id: profile.id,
    });

    setLoading(false);

    if (error) {
      alert(error.message);
    } else {
      alert('Avaliação publicada com sucesso');
    }
  }

  return (
    <main className="min-h-screen bg-black text-white px-4 py-6">
      <h1 className="text-xl font-semibold mb-6">Fazer avaliação</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* (resto do JSX exatamente igual ao seu código funcional) */}
      </form>
    </main>
  );
}
