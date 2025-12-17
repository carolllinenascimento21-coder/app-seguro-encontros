'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Camera, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type ProfileForm = {
  name: string;
  age: number;
  city: string;
  state: string;
  email: string;
  profilePhoto: string;
};

export default function EditarPerfilPage() {
  const router = useRouter();

  const [formData, setFormData] = useState<ProfileForm>({
    name: '',
    age: 0,
    city: '',
    state: '',
    email: '',
    profilePhoto: '',
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

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('name, age, city, state, email, profilePhoto')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) {
          throw profileError;
        }

        if (!profile) {
          const { error: insertError } = await supabase.from('profiles').insert({
            id: user.id,
            email: user.email ?? '',
            selfie_verified: false,
          });

          if (insertError) {
            throw insertError;
          }

          const { data: createdProfile, error: createdProfileError } = await supabase
            .from('profiles')
            .select('name, age, city, state, email, profilePhoto')
            .eq('id', user.id)
            .maybeSingle();

          if (createdProfileError) {
            throw createdProfileError;
          }

          if (!createdProfile) {
            throw new Error('Perfil não encontrado após criação.');
          }

          setFormData({
            name: createdProfile?.name ?? '',
            age: createdProfile?.age ?? 0,
            city: createdProfile?.city ?? '',
            state: createdProfile?.state ?? '',
            email: createdProfile?.email ?? user.email ?? '',
            profilePhoto: createdProfile?.profilePhoto ?? '',
          });
          return;
        }

        setFormData({
          name: profile?.name ?? '',
          age: profile?.age ?? 0,
          city: profile?.city ?? '',
          state: profile?.state ?? '',
          email: profile?.email ?? user.email ?? '',
          profilePhoto: profile?.profilePhoto ?? '',
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

      // Atualiza tabela profiles
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          name: formData.name,
          age: formData.age,
          city: formData.city,
          state: formData.state,
          email: formData.email,
          profilePhoto: formData.profilePhoto,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

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
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full border p-2 rounded"
        />

        <input
          type="number"
          placeholder="Idade"
          value={formData.age}
          onChange={(e) =>
            setFormData({ ...formData, age: Number(e.target.value) })
          }
          className="w-full border p-2 rounded"
        />

        <input
          type="text"
          placeholder="Cidade"
          value={formData.city}
          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
          className="w-full border p-2 rounded"
        />

        <input
          type="text"
          placeholder="Estado"
          value={formData.state}
          onChange={(e) => setFormData({ ...formData, state: e.target.value })}
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
          placeholder="URL da foto de perfil"
          value={formData.profilePhoto}
          onChange={(e) =>
            setFormData({ ...formData, profilePhoto: e.target.value })
          }
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
