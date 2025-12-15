'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Camera } from 'lucide-react';
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

  const validateEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const validateForm = () => {
    const newErrors = { nome: '', email: '', senha: '' };

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

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.senha,
      });

      if (error) throw error;

      router.push('/verificacao-selfie');
    } catch (err: any) {
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
        <div className="flex items-center justify-center gap-2">
          <Camera size={18} />
          <h1 className="text-xl font-semibold">Criar conta</h1>
        </div>

        <input
          placeholder="Nome completo"
          value={formData.nome}
          onChange={(e) =>
            setFormData({ ...formData, nome: e.target.value })
          }
          className="w-full p-2 border rounded bg-black"
        />

        <input
          placeholder="E-mail"
          value={formData.email}
          onChange={(e) =>
            setFormData({ ...formData, email: e.target.value })
          }
          className="w-full p-2 border rounded bg-black"
        />

        <input
          type="password"
          placeholder="Senha"
          value={formData.senha}
          onChange={(e) =>
            setFormData({ ...formData, senha: e.target.value })
          }
          className="w-full p-2 border rounded bg-black"
        />

        <button
          disabled={loading}
          className="w-full bg-[#D4AF37] text-black py-2 rounded"
        >
          {loading ? 'Criando conta...' : 'Criar conta'}
        </button>
      </form>
    </div>
  );
}
