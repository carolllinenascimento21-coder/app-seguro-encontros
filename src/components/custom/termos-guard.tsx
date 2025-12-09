'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function TermosGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [termosAceitos, setTermosAceitos] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Páginas que não precisam de verificação
    const paginasLivres = [
      '/',
      '/splash',
      '/onboarding',
      '/aceitar-termos',
      '/perfil/termos',
      '/perfil/privacidade'
    ];

    // Se está em página livre, não verifica
    if (paginasLivres.includes(pathname)) {
      setTermosAceitos(true);
      return;
    }

    // Verificar se termos foram aceitos
    const aceiteStr = localStorage.getItem('confia_termos_aceite');
    
    if (!aceiteStr) {
      // Não aceitou ainda - redireciona
      router.push('/aceitar-termos');
      return;
    }

    try {
      const aceite = JSON.parse(aceiteStr);
      
      if (aceite.termosAceitos && aceite.privacidadeAceita) {
        setTermosAceitos(true);
      } else {
        router.push('/aceitar-termos');
      }
    } catch (error) {
      // Erro ao parsear - redireciona
      router.push('/aceitar-termos');
    }
  }, [mounted, pathname, router]);

  // Não renderizar nada até montar no cliente
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 dark:text-gray-400 text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  // Se não aceitou e não está em página livre, não renderiza
  if (!termosAceitos) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 dark:text-gray-400 text-sm">Redirecionando...</p>
        </div>
      </div>
    );
  }

  // Termos aceitos - renderiza conteúdo
  return <>{children}</>;
}
