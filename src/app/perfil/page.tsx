'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Profile = {
  id: string;
  name: string | null;
  email: string | null;
  selfie_verified: boolean | null;
};

export default function PerfilPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;

      if (!session) {
        setLoading(false);
        return;
      }

      const userId = session.user.id;

      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, selfie_verified')
        .eq('id', userId)
        .maybeSingle(); // 🔴 CORREÇÃO PRINCIPAL

      if (error) {
        console.error('Erro ao buscar perfil:', error);
        setLoading(false);
        return;
      }

      // Caso não exista perfil ainda
      if (!data) {
        console.warn('Perfil não encontrado para o usuário');
        setProfile(null);
        setLoading(false);
        return;
      }

      setProfile(data);
      setLoading(false);
    };

    loadProfile();
    }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Carregando perfil...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Perfil não encontrado.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <h1 className="text-2xl font-bold mb-4">Meu Perfil</h1>

      <div className="space-y-2">
        <p><strong>Nome:</strong> {profile.name ?? 'Não informado'}</p>
        <p><strong>Email:</strong> {profile.email}</p>
        <p>
          <strong>Selfie verificada:</strong>{' '}
          {profile.selfie_verified ? 'Sim' : 'Não'}
        </p>
      </div>
    </div>
  );
}
