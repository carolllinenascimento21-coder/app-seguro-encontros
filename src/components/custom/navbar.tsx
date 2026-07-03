'use client';

import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Star, ShieldCheck, User, PlusCircle } from 'lucide-react';
import { createSupabaseClient } from '@/lib/supabase/browser';
import { isAnonymousUser } from '@/lib/auth-state';

export default function Navbar() {
  const pathname = usePathname();
  const [isAnonymous, setIsAnonymous] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseClient();

    const syncAuthState = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setIsAnonymous(isAnonymousUser(session?.user));
    };

    void syncAuthState();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
      setIsAnonymous(isAnonymousUser(session?.user));
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const links = isAnonymous
    ? [
        { href: '/home', icon: Home, label: 'Início' },
        { href: '/consultar-reputacao', icon: Search, label: 'Buscar' },
        { href: '/avaliar', icon: PlusCircle, label: 'Avaliar' },
      ]
    : [
        { href: '/home', icon: Home, label: 'Início' },
        { href: '/consultar-reputacao', icon: Search, label: 'Buscar' },
        { href: '/minhas-avaliacoes', icon: Star, label: 'Avaliações' },
        { href: '/modo-seguro', icon: ShieldCheck, label: 'Seguro' },
        { href: '/perfil', icon: User, label: 'Perfil' },
      ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-black border-t border-[#D4AF37]/20 z-50">
      <div className="max-w-md mx-auto flex justify-around items-center h-16 px-4">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href || pathname?.startsWith(link.href + '/');
          
          return (
            <Link
              key={link.href}
              href={link.href}
              prefetch={false}
              className={`flex flex-col items-center justify-center gap-1 transition-colors ${
                isActive ? 'text-[#D4AF37]' : 'text-gray-400 hover:text-[#D4AF37]'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
