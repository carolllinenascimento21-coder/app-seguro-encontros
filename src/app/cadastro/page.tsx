'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function CadastroPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '',
  });

  const [errors, setErrors] = useState({
    nome: '',
    email: '',
    senha: '',
  });

  const [loading, setLoading] = useState(false);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validateForm = () => {
    const newErrors = {
      nome: '',
      email: '',
      senha: '',
    };

    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome completo é obrigatório';
    } else if (formData.nome.trim().split(' ').length < 2) {
      newErrors.nome = 'Digite seu nome completo';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'E-mail é obrigatório';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'E-mail inválido';
    }

    if (!formData.senha) {
      newErrors.senha = 'Senha é obrigatória';
    } else if (formData.senha.length < 6) {
      newErrors.senha = 'Senha deve ter no mínimo 6 caracteres';
    }

    setErrors(newErrors);
    return !newErrors.nome && !newErrors.email && !newErrors.senha;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);

    try {
      // 1️⃣ Cria usuário no Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.senha,
      });

      if (error) throw error;
      if (!data.user) throw new Error('Usuário não criado');

      const userId = data.user.id;

      // 2️⃣ Garante que o perfil exista com id = auth.uid()
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!existingProfile) {
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            nome: formData.nome,
          });

        if (insertError) throw insertError;
      }

      // 3️⃣ Redireciona após cadastro
      router.push('/verificacao-selfie');
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-4 bg-black text-white"
      >
        <h1 className="text-xl font-semibold text-center">Criar conta</h1>

        <input
          type="text"
          placeholder="Nome completo"
          value={formData.nome}
          onChange={(e) =>
            setFormData({ ...formData, nome: e.target.value })
          }
          className="w-full border border-gray-700 p-2 rounded bg-black"
        />
        {errors.nome && <p className="text-red-500 text-sm">{errors.nome}</p>}

        <input
          type="email"
          placeholder="E-mail"
          value={formData.email}
          onChange={(e) =>
            setFormData({ ...formData, email: e.target.value })
          }
          className="w-full border border-gray-700 p-2 rounded bg-black"
        />
        {errors.email && (
          <p className="text-red-500 text-sm">{errors.email}</p>
        )}

        <input
          type="password"
          placeholder="Senha"
          value={formData.senha}
          onChange={(e) =>
            setFormData({ ...formData, senha: e.target.value })
          }
          className="w-full border border-gray-700 p-2 rounded bg-black"
        />
        {errors.senha && (
          <p className="text-red-500 text-sm">{errors.senha}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#D4AF37] text-black py-2 rounded font-semibold disabled:opacity-50"
        >
          {loading ? 'Criando conta...' : 'Criar conta'}
        </button>
      </form>
    </div>
  );
}
