'use client';

import Link from 'next/link';
import { ArrowLeft, AlertTriangle, Shield, Eye, Heart, Brain, Flag } from 'lucide-react';
import Navbar from '@/components/custom/navbar';

export default function AlertasPage() {
  const categorias = [
    {
      icon: AlertTriangle,
      titulo: 'Sinais de Perigo Imediato',
      cor: 'from-red-600 to-red-700',
      alertas: [
        'Ameaças de violência física ou verbal',
        'Comportamento extremamente possessivo',
        'Isolamento forçado de amigos e família',
        'Controle total sobre suas atividades',
        'Histórico de violência comprovado',
      ],
    },
    {
      icon: Brain,
      titulo: 'Manipulação Emocional',
      cor: 'from-orange-600 to-orange-700',
      alertas: [
        'Gaslighting (fazer você duvidar da sua sanidade)',
        'Culpabilização constante',
        'Chantagem emocional',
        'Vitimização para conseguir o que quer',
        'Mudanças bruscas de humor para controlar',
      ],
    },
    {
      icon: Heart,
      titulo: 'Desrespeito e Abuso',
      cor: 'from-yellow-600 to-yellow-700',
      alertas: [
        'Desrespeito aos seus limites e vontades',
        'Críticas constantes e humilhações',
        'Ciúmes excessivos e infundados',
        'Invasão de privacidade',
        'Pressão para atos que você não quer',
      ],
    },
    {
      icon: Eye,
      titulo: 'Comportamento Suspeito',
      cor: 'from-purple-600 to-purple-700',
      alertas: [
        'Mentiras frequentes e inconsistências',
        'Esconde informações importantes',
        'Múltiplos relacionamentos simultâneos',
        'Histórico de traições comprovadas',
        'Comportamento diferente em público vs privado',
      ],
    },
    {
      icon: Shield,
      titulo: 'Golpes e Fraudes',
      cor: 'from-blue-600 to-blue-700',
      alertas: [
        'Pedidos de dinheiro emprestado frequentes',
        'Histórias mirabolantes sobre riqueza',
        'Promessas exageradas de futuro',
        'Pressa excessiva para compromisso',
        'Evita apresentar família e amigos',
      ],
    },
    {
      icon: Flag,
      titulo: 'Red Flags Gerais',
      cor: 'from-pink-600 to-pink-700',
      alertas: [
        'Fala mal de todas as ex-parceiras',
        'Não assume responsabilidade por erros',
        'Falta de empatia e compaixão',
        'Comportamento agressivo com outros',
        'Desrespeito a funcionários e animais',
      ],
    },
  ];

  const dicas = [
    {
      titulo: 'Confie no seu instinto',
      descricao: 'Se algo parece errado, provavelmente está. Não ignore seus sentimentos.',
    },
    {
      titulo: 'Converse com amigas',
      descricao: 'Compartilhe suas preocupações com pessoas de confiança.',
    },
    {
      titulo: 'Documente tudo',
      descricao: 'Guarde mensagens, prints e evidências de comportamentos problemáticos.',
    },
    {
      titulo: 'Estabeleça limites claros',
      descricao: 'Comunique seus limites e não aceite desrespeito.',
    },
    {
      titulo: 'Busque ajuda profissional',
      descricao: 'Terapia pode ajudar a processar experiências e fortalecer sua autoestima.',
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
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-[#D4AF37] mb-3">
            Sinais de Alerta
          </h1>
          <p className="text-gray-400">
            Aprenda a identificar comportamentos problemáticos e proteja-se
          </p>
        </div>

        {/* Aviso Importante */}
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 mb-8">
          <div className="flex items-start gap-3">
            <Shield className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-lg font-semibold text-red-400 mb-2">
                Sua Segurança em Primeiro Lugar
              </h2>
              <p className="text-sm text-gray-300 leading-relaxed">
                Se você está em perigo imediato, ligue <strong>190</strong> (Polícia) ou{' '}
                <strong>180</strong> (Central de Atendimento à Mulher). Não hesite em
                buscar ajuda profissional.
              </p>
            </div>
          </div>
        </div>

        {/* Categorias de Alertas */}
        <div className="space-y-6 mb-8">
          {categorias.map((categoria, index) => {
            const Icon = categoria.icon;
            return (
              <div
                key={index}
                className="bg-white/5 border border-[#D4AF37]/20 rounded-2xl overflow-hidden"
              >
                <div
                  className={`bg-gradient-to-r ${categoria.cor} p-4 flex items-center gap-3`}
                >
                  <Icon className="w-6 h-6 text-white" />
                  <h2 className="text-lg font-semibold text-white">
                    {categoria.titulo}
                  </h2>
                </div>
                <div className="p-4">
                  <ul className="space-y-3">
                    {categoria.alertas.map((alerta, alertaIndex) => (
                      <li
                        key={alertaIndex}
                        className="flex items-start gap-3 text-sm text-gray-300"
                      >
                        <span className="text-red-500 mt-1">•</span>
                        <span>{alerta}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        {/* Dicas de Proteção */}
        <div className="bg-gradient-to-br from-[#D4AF37]/20 to-[#C0C0C0]/10 border border-[#D4AF37]/30 rounded-2xl p-6 mb-8">
          <h2 className="text-xl font-semibold text-[#D4AF37] mb-4 flex items-center gap-2">
            <Shield className="w-6 h-6" />
            Como Se Proteger
          </h2>
          <div className="space-y-4">
            {dicas.map((dica, index) => (
              <div key={index} className="bg-black/30 rounded-xl p-4">
                <h3 className="text-white font-semibold mb-2">{dica.titulo}</h3>
                <p className="text-sm text-gray-400">{dica.descricao}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-white/5 border border-[#D4AF37]/20 rounded-2xl p-6 text-center">
          <h2 className="text-xl font-semibold text-white mb-3">
            Viu algum desses sinais?
          </h2>
          <p className="text-gray-400 mb-6">
            Consulte avaliações no Confia+ antes de continuar o relacionamento
          </p>
          <Link
            href="/home"
            className="inline-block bg-gradient-to-r from-[#D4AF37] to-[#C0C0C0] text-black font-semibold px-8 py-3 rounded-xl hover:opacity-90 transition-opacity"
          >
            Buscar Perfil
          </Link>
        </div>
      </div>

      <Navbar />
    </div>
  );
}
