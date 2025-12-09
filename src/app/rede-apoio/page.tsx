'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Phone, Shield, Heart, ExternalLink, MapPin, Info, X, Home } from 'lucide-react';
import Navbar from '@/components/custom/navbar';

export default function RedeApoioPage() {
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);

  const emergencyContacts = [
    {
      name: 'Central de Atendimento à Mulher',
      number: '180',
      description: 'Atendimento 24h para denúncias e orientações',
      color: 'bg-red-500',
    },
    {
      name: 'Emergência da Polícia Militar',
      number: '190',
      description: 'Emergências e situações de risco imediato',
      color: 'bg-yellow-500',
    },
  ];

  const ongs = [
    {
      name: 'Mapa do Acolhimento',
      description: 'Rede de apoio psicológico e jurídico gratuito',
      url: 'https://www.mapadoacolhimento.org/',
    },
    {
      name: 'Instituto Patrícia Galvão',
      description: 'Comunicação e direitos das mulheres',
      url: 'https://agenciapatriciagalvao.org.br/',
    },
    {
      name: 'TamoJuntas',
      description: 'Plataforma de apoio e denúncia',
      url: 'https://www.tamojuntas.org.br/',
    },
    {
      name: 'Instituto Maria da Penha',
      description: 'Educação e enfrentamento à violência',
      url: 'https://www.institutomariadapenha.org.br/',
    },
    {
      name: 'Liga das Mulheres',
      description: 'Rede de apoio e empoderamento feminino',
      url: 'https://www.ligadasmulheres.org.br/',
    },
    {
      name: 'ONU Mulheres – Brasil',
      description: 'Igualdade de gênero e empoderamento',
      url: 'https://www.onumulheres.org.br/',
    },
    {
      name: 'Casa da Mulher Brasileira',
      description: 'Atendimento humanizado e integrado',
      url: 'https://www.gov.br/mdh/pt-br/navegue-por-temas/politicas-para-mulheres/arquivo/assuntos/violencia/programa-mulher-viver-sem-violencia',
    },
  ];

  const handleCall = (number: string) => {
    window.location.href = `tel:${number}`;
  };

  const handleQuickExit = () => {
    window.location.href = '/home';
  };

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Header com botão de saída rápida */}
      <header className="bg-gradient-to-b from-black to-black/95 border-b border-[#D4AF37]/20 sticky top-0 z-40">
        <div className="max-w-md mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-[#D4AF37]" />
              <div>
                <h1 className="text-2xl font-bold text-[#D4AF37]">Rede de Apoio</h1>
                <p className="text-sm text-gray-400">
                  Serviços oficiais e ONGs para mulheres
                </p>
              </div>
            </div>
            <button
              onClick={handleQuickExit}
              className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
              title="Sair rapidamente"
            >
              <Home className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Botão de Emergência */}
        <button
          onClick={() => setShowEmergencyModal(true)}
          className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white font-bold py-6 px-6 rounded-xl shadow-lg transition-all transform hover:scale-105 flex items-center justify-center gap-3"
        >
          <Phone className="w-6 h-6" />
          <span className="text-lg">PRECISO DE AJUDA AGORA</span>
        </button>

        {/* Lista de ONGs */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-[#D4AF37] flex items-center gap-2">
            <Heart className="w-5 h-5" />
            ONGs e Projetos de Apoio
          </h2>

          <div className="space-y-3">
            {ongs.map((ong, index) => (
              <a
                key={index}
                href={ong.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-white/5 border border-[#D4AF37]/20 rounded-xl p-4 hover:bg-white/10 transition-colors group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-[#D4AF37] transition-colors">
                      {ong.name}
                    </h3>
                    <p className="text-sm text-gray-400">{ong.description}</p>
                  </div>
                  <ExternalLink className="w-5 h-5 text-[#D4AF37] flex-shrink-0 ml-3" />
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="space-y-3">
          <a
            href="https://www.google.com/maps/search/ONG+mulher+perto+de+mim"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full bg-white/5 border border-[#D4AF37]/30 text-white font-semibold py-4 px-6 rounded-xl hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
          >
            <MapPin className="w-5 h-5 text-[#D4AF37]" />
            Ver mais ONGs próximas
          </a>

          <a
            href="https://www.gov.br/mdh/pt-br/navegue-por-temas/politicas-para-mulheres/arquivo/assuntos/violencia"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full bg-white/5 border border-[#D4AF37]/30 text-white font-semibold py-4 px-6 rounded-xl hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
          >
            <Info className="w-5 h-5 text-[#D4AF37]" />
            Informações sobre violência contra a mulher
          </a>
        </div>

        {/* Aviso de Segurança */}
        <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-xl p-4">
          <p className="text-sm text-gray-300 text-center">
            <Shield className="w-4 h-4 inline-block mr-2 text-[#D4AF37]" />
            Suas consultas nesta área não são registradas. Use o botão de saída rápida se
            necessário.
          </p>
        </div>
      </div>

      {/* Modal de Emergência */}
      {showEmergencyModal && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-[#D4AF37]/30 rounded-2xl max-w-md w-full p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-[#D4AF37]">Ajuda Emergencial</h2>
              <button
                onClick={() => setShowEmergencyModal(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <p className="text-gray-300 text-sm">
              Escolha um dos canais abaixo para receber ajuda imediata:
            </p>

            <div className="space-y-4">
              {emergencyContacts.map((contact, index) => (
                <div
                  key={index}
                  className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3"
                >
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">
                      {contact.name}
                    </h3>
                    <p className="text-sm text-gray-400">{contact.description}</p>
                  </div>
                  <button
                    onClick={() => handleCall(contact.number)}
                    className={`w-full ${contact.color} hover:opacity-90 text-white font-bold py-3 px-4 rounded-lg transition-opacity flex items-center justify-center gap-2`}
                  >
                    <Phone className="w-5 h-5" />
                    Ligar {contact.number}
                  </button>
                </div>
              ))}
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
              <p className="text-sm text-blue-300 text-center">
                <Info className="w-4 h-4 inline-block mr-2" />
                Em caso de emergência grave, ligue 190 imediatamente
              </p>
            </div>
          </div>
        </div>
      )}

      <Navbar />
    </div>
  );
}
