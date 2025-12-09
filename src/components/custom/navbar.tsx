'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Users, Shield, Star, ShieldCheck, User } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();

  const links = [
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
