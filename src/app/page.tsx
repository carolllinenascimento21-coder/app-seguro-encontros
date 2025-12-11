'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function RootPage() {
  const router = useRouter();
  
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      router.replace('/home');
    } else {
      router.replace('/splash');
    }
  };
  
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-white">Carregando...</div>
    </div>
  );
}
