'use client';

import Link from 'next/link';
import { ArrowLeft, User, Bell, Lock, HelpCircle, LogOut, Shield, Eye } from 'lucide-react';
import Navbar from '@/components/custom/navbar';

export default function ConfiguracoesPage() {
  const opcoes = [
    {
      icon: User,
      titulo: 'Meu Perfil',
      descricao: 'Editar informações pessoais',
      href: '#',
    },
    {
      icon: Bell,
      titulo: 'Notificações',
      descricao: 'Gerenciar alertas e avisos',
      href: '#',
    },
    {
      icon: Lock,
      titulo: 'Privacidade',
      descricao: 'Controle de dados e anonimato',
      href: '#',
    },
    {
      icon: Shield,
      titulo: 'Segurança',
      descricao: 'Senha e autenticação',
      href: '#',
    },
    {
      icon: Eye,
      titulo: 'Minhas Avaliações',
      descricao: 'Ver e editar suas contribuições',
      href: '#',
    },
    {
      icon: HelpCircle,
      titulo: 'Ajuda e Suporte',
      descricao: 'FAQ e contato',
      href: '#',
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Header */}
      <header className="bg-gradient-to-b from-black to-black/95 border-b border-[#D4AF37]/20 sticky top-0 z-40">
        <div className="max-w-md mx-auto px-4 py-4">
          <Link
            href="/home"
            className="flex items-center gap-2 text-[#D4AF37] hover:text-[#C0C0C0] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Voltar</span>
          </Link>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-6">
        {/* Profile Header */}
        <div className="bg-gradient-to-br from-[#D4AF37]/20 to-[#C0C0C0]/10 border border-[#D4AF37]/30 rounded-2xl p-6 mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-20 h-20 bg-gradient-to-r from-[#D4AF37] to-[#C0C0C0] rounded-full flex items-center justify-center">
              <User className="w-10 h-10 text-black" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white mb-1">Maria Silva</h1>
              <p className="text-sm text-gray-400">maria.silva@email.com</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-[#D4AF37]/20">
            <div className="text-center">
              <p className="text-2xl font-bold text-[#D4AF37]">12</p>
              <p className="text-xs text-gray-400">Avaliações</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-[#D4AF37]">5</p>
              <p className="text-xs text-gray-400">Consultas</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-[#D4AF37]">3</p>
              <p className="text-xs text-gray-400">Alertas</p>
            </div>
          </div>
        </div>

        {/* Configurações */}
        <div className="space-y-3 mb-8">
          {opcoes.map((opcao, index) => {
            const Icon = opcao.icon;
            return (
              <Link
                key={index}
                href={opcao.href}
                className="block bg-white/5 border border-[#D4AF37]/20 rounded-xl p-4 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-[#D4AF37]/20 to-[#C0C0C0]/10 rounded-xl flex items-center justify-center">
                    <Icon className="w-6 h-6 text-[#D4AF37]" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold mb-1">{opcao.titulo}</h3>
                    <p className="text-sm text-gray-400">{opcao.descricao}</p>
                  </div>
                  <ArrowLeft className="w-5 h-5 text-gray-600 rotate-180" />
                </div>
              </Link>
            );
          })}
        </div>

        {/* Informações do App */}
        <div className="bg-white/5 border border-[#D4AF37]/20 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-[#D4AF37] mb-4">
            Sobre o Confia+
          </h2>
          <div className="space-y-3 text-sm text-gray-400">
            <div className="flex justify-between">
              <span>Versão</span>
              <span className="text-white">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span>Última atualização</span>
              <span className="text-white">15/03/2024</span>
            </div>
            <div className="pt-3 border-t border-[#D4AF37]/20">
              <Link href="#" className="text-[#D4AF37] hover:underline block mb-2">
                Termos de Uso
              </Link>
              <Link href="#" className="text-[#D4AF37] hover:underline block mb-2">
                Política de Privacidade
              </Link>
              <Link href="#" className="text-[#D4AF37] hover:underline block">
                Aviso Legal
              </Link>
            </div>
          </div>
        </div>

        {/* Logout */}
        <button className="w-full bg-red-500/10 border border-red-500/30 text-red-400 font-semibold py-4 rounded-xl hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2">
          <LogOut className="w-5 h-5" />
          Sair da Conta
        </button>
      </div>

      <Navbar />
    </div>
  );
}
