'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  ensureProfileForUser,
  getProfileErrorInfo,
  isMissingColumnError,
} from '@/lib/profile-utils';

type ProfileForm = {
  nome: string;
  email: string;
  telefone: string;
};

export default function EditarPerfilPage() {
  const router = useRouter();

  const [formData, setFormData] = useState<ProfileForm>({
    nome: '',
    email: '',
    telefone: '',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🔹 Carrega perfil do usuário autenticado
  useEffect(() => {
    const loadProfile = async () => {
      setError(null);
      try {
        const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError('Usuário não autenticado');
        setIsLoading(false);
        return;
      }

        const { profile, error: profileError } = await ensureProfileForUser(
          supabase,
          user
        );

        if (profileError) {
          const errorInfo = getProfileErrorInfo(profileError);
          console.error('Erro ao carregar perfil:', {
            code: errorInfo.code,
            message: errorInfo.message,
            error: profileError,
          });
          throw profileError;
        }

        if (!profile) {
          throw new Error('Perfil não encontrado após criação.');
        }

        setFormData({
          nome: profile?.nome ?? '',
          email: profile?.email ?? user.email ?? '',
          telefone: profile?.telefone ?? '',
        });
      } catch (err: any) {
        setError('Erro ao carregar perfil.');
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [router]);

  // 🔹 Salva alterações (restrito ao usuário logado)
  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error('Usuário não autenticado');
      }

      const basePayload = {
        nome: formData.nome,
        email: formData.email,
      };

      // Atualiza tabela profiles com fallback quando coluna opcional não existir
      let { error: updateError } = await supabase
        .from('profiles')
        .update({
          ...basePayload,
          telefone: formData.telefone || null,
        })
        .eq('id', user.id);

      if (updateError && isMissingColumnError(updateError, 'telefone')) {
        const { error: fallbackError } = await supabase
          .from('profiles')
          .update(basePayload)
          .eq('id', user.id);

        updateError = fallbackError ?? null;
      }

      if (updateError) {
        throw updateError;
      }

      // Sincroniza e-mail no Auth, se mudou
      if (user.email !== formData.email) {
        const { error: authError } = await supabase.auth.updateUser({
          email: formData.email,
        });

        if (authError) {
          throw authError;
        }
      }

      router.back();
    } catch (err: any) {
      setError('Erro ao salvar alterações.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="p-4">Carregando perfil...</div>;
  }

  return (
    <div className="p-4 max-w-xl mx-auto">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 mb-4 text-sm"
      >
        <ArrowLeft size={18} />
        Voltar
      </button>

      <h1 className="text-xl font-semibold mb-6">Editar Perfil</h1>

      {error && (
        <div className="mb-4 text-red-600 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <input
          type="text"
          placeholder="Nome"
          value={formData.nome}
          onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
          className="w-full border p-2 rounded"
        />

        <input
          type="email"
          placeholder="E-mail"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full border p-2 rounded"
        />

        <input
          type="text"
          placeholder="Telefone"
          value={formData.telefone}
          onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
          className="w-full border p-2 rounded"
        />
      </div>

      <button
        onClick={handleSave}
        disabled={isSaving}
        className="mt-6 w-full flex items-center justify-center gap-2 bg-black text-white py-2 rounded disabled:opacity-50"
      >
        <Save size={18} />
        {isSaving ? 'Salvando...' : 'Salvar alterações'}
      </button>
    </div>
  );
}
