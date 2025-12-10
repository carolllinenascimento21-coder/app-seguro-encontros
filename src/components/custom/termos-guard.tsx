'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function TermosGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [termosAceitos, setTermosAceitos] = useState(false);

  useEffect(() => {
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
      setLoading(false);
      setTermosAceitos(true);
      return;
    }

    // Verificar se termos foram aceitos (apenas no cliente)
    if (typeof window !== 'undefined') {
      const aceiteStr = localStorage.getItem('confia_termos_aceite');
      
      if (!aceiteStr) {
        // Não aceitou ainda - redireciona
        router.push('/aceitar-termos');
        setLoading(false);
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
    }

    setLoading(false);
  }, [pathname, router]);

  // Mostrar loading enquanto verifica
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-400 text-sm">Verificando...</p>
        </div>
      </div>
    );
  }

  // Se não aceitou, não renderiza nada (já redirecionou)
  if (!termosAceitos) {
    return null;
  }

  // Termos aceitos - renderiza conteúdo
  return <>{children}</>;
}
