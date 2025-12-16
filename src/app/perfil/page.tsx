'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Profile = {
  id: string;
  name: string | null;
  email: string | null;
  selfie_verified: boolean;
};

export default function PerfilPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      const { data: sessionData } = await supabase.auth.getSession();

      const session = sessionData.session;
      if (!session) {
        router.push('/login');
        return;
      }

      const userId = session.user.id;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      setProfile(data);
      setLoading(false);
    };

    loadProfile();
  }, [router]);

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
        Não foi possível carregar seu perfil.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <h1 className="text-2xl font-bold mb-4">Meu Perfil</h1>

      <div className="space-y-2">
        <p><strong>Nome:</strong> {profile.name}</p>
        <p><strong>Email:</strong> {profile.email}</p>
        <p>
          <strong>Selfie verificada:</strong>{' '}
          {profile.selfie_verified ? 'Sim' : 'Não'}
        </p>
      </div>
    </div>
  );
}
