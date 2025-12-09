'use client';

import Link from 'next/link';
import { ArrowLeft, Heart, Shield, Users, MessageCircle, AlertTriangle, BookOpen } from 'lucide-react';
import Navbar from '@/components/custom/navbar';

export default function ComunidadePage() {
  const recursos = [
    {
      icon: Shield,
      titulo: 'Sinais de Relacionamento Abusivo',
      descricao: 'Aprenda a identificar comportamentos tóxicos e abusivos',
      cor: 'from-red-500 to-red-600',
    },
    {
      icon: Heart,
      titulo: 'Relacionamentos Saudáveis',
      descricao: 'Características de relações baseadas em respeito e amor',
      cor: 'from-pink-500 to-pink-600',
    },
    {
      icon: AlertTriangle,
      titulo: 'Red Flags Comuns',
      descricao: 'Sinais de alerta que você não deve ignorar',
      cor: 'from-yellow-500 to-yellow-600',
    },
    {
      icon: BookOpen,
      titulo: 'Guia de Segurança',
      descricao: 'Dicas práticas para encontros seguros',
      cor: 'from-blue-500 to-blue-600',
    },
  ];

  const depoimentos = [
    {
      id: 1,
      texto: 'O Confia+ me salvou de um relacionamento que poderia ter sido muito prejudicial. Gratidão eterna!',
      iniciais: 'M.S.',
      data: '15/03/2024',
    },
    {
      id: 2,
      texto: 'Finalmente um espaço onde mulheres se apoiam de verdade. Isso é sororidade na prática!',
      iniciais: 'A.L.',
      data: '10/03/2024',
    },
    {
      id: 3,
      texto: 'Consegui evitar um golpista graças às avaliações aqui. Obrigada a todas que compartilham!',
      iniciais: 'J.R.',
      data: '05/03/2024',
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
        {/* Hero Section */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-r from-[#D4AF37] to-[#C0C0C0] rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-10 h-10 text-black" />
          </div>
          <h1 className="text-3xl font-bold text-[#D4AF37] mb-3">
            Mulheres Ajudam Mulheres
          </h1>
          <p className="text-gray-400">
            Um espaço seguro de apoio, informação e sororidade
          </p>
        </div>

        {/* Manifesto */}
        <div className="bg-gradient-to-br from-[#D4AF37]/20 to-[#C0C0C0]/10 border border-[#D4AF37]/30 rounded-2xl p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Heart className="w-6 h-6 text-[#D4AF37]" />
            Nossa Missão
          </h2>
          <p className="text-gray-300 leading-relaxed mb-4">
            Acreditamos que mulheres unidas são mais fortes. O Confia+ é mais que um
            app - é um movimento de proteção, apoio e empoderamento feminino.
          </p>
          <p className="text-gray-300 leading-relaxed">
            Aqui, compartilhamos experiências, alertamos sobre perigos e construímos
            juntas um futuro onde todas possam se relacionar com segurança e respeito.
          </p>
        </div>

        {/* Recursos Educativos */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-[#D4AF37] mb-4">
            Recursos Educativos
          </h2>
          <div className="grid grid-cols-1 gap-4">
            {recursos.map((recurso, index) => {
              const Icon = recurso.icon;
              return (
                <button
                  key={index}
                  className="bg-white/5 border border-[#D4AF37]/20 rounded-xl p-4 hover:bg-white/10 transition-colors text-left"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-12 h-12 rounded-xl bg-gradient-to-r ${recurso.cor} flex items-center justify-center flex-shrink-0`}
                    >
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white font-semibold mb-1">
                        {recurso.titulo}
                      </h3>
                      <p className="text-sm text-gray-400">{recurso.descricao}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Depoimentos */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-[#D4AF37] mb-4 flex items-center gap-2">
            <MessageCircle className="w-6 h-6" />
            Depoimentos
          </h2>
          <div className="space-y-4">
            {depoimentos.map((depoimento) => (
              <div
                key={depoimento.id}
                className="bg-white/5 border border-[#D4AF37]/20 rounded-xl p-4"
              >
                <p className="text-gray-300 mb-3 italic">"{depoimento.texto}"</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-r from-[#D4AF37] to-[#C0C0C0] rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-black">
                        {depoimento.iniciais}
                      </span>
                    </div>
                    <span className="text-sm text-gray-400">Usuária anônima</span>
                  </div>
                  <span className="text-xs text-gray-500">{depoimento.data}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Estatísticas */}
        <div className="bg-gradient-to-br from-white/10 to-white/5 border border-[#D4AF37]/30 rounded-2xl p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4 text-center">
            Juntas Somos Mais Fortes
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-[#D4AF37] mb-1">1.2k+</p>
              <p className="text-xs text-gray-400">Usuárias Ativas</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-[#D4AF37] mb-1">500+</p>
              <p className="text-xs text-gray-400">Avaliações</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-[#D4AF37] mb-1">98%</p>
              <p className="text-xs text-gray-400">Satisfação</p>
            </div>
          </div>
        </div>

        {/* Canais de Apoio */}
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-red-400 mb-4 flex items-center gap-2">
            <Shield className="w-6 h-6" />
            Precisa de Ajuda Urgente?
          </h2>
          <div className="space-y-3">
            <a
              href="tel:180"
              className="block bg-red-500/20 border border-red-500/40 rounded-xl p-4 hover:bg-red-500/30 transition-colors"
            >
              <p className="text-white font-semibold mb-1">Central de Atendimento à Mulher</p>
              <p className="text-red-400 text-lg font-bold">180</p>
            </a>
            <a
              href="tel:190"
              className="block bg-red-500/20 border border-red-500/40 rounded-xl p-4 hover:bg-red-500/30 transition-colors"
            >
              <p className="text-white font-semibold mb-1">Polícia Militar</p>
              <p className="text-red-400 text-lg font-bold">190</p>
            </a>
            <a
              href="tel:188"
              className="block bg-red-500/20 border border-red-500/40 rounded-xl p-4 hover:bg-red-500/30 transition-colors"
            >
              <p className="text-white font-semibold mb-1">Centro de Valorização da Vida (CVV)</p>
              <p className="text-red-400 text-lg font-bold">188</p>
            </a>
          </div>
        </div>
      </div>

      <Navbar />
    </div>
  );
}
