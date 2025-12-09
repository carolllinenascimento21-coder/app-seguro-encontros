'use client';

import { useState, useEffect } from 'react';
import { Shield, MapPin, Clock, AlertTriangle, Phone, User, Check, X } from 'lucide-react';
import Navbar from '@/components/custom/navbar';

export default function ModoEncontroSeguro() {
  const [modoAtivo, setModoAtivo] = useState(false);
  const [localizacao, setLocalizacao] = useState<{ lat: number; lng: number } | null>(null);
  const [contatoConfianca, setContatoConfianca] = useState<string>('');
  const [tempoSelecionado, setTempoSelecionado] = useState(30);
  const [tempoRestante, setTempoRestante] = useState<number | null>(null);
  const [mostrarModalContato, setMostrarModalContato] = useState(false);
  const [mostrarModalEmergencia, setMostrarModalEmergencia] = useState(false);
  const [permissaoLocalizacao, setPermissaoLocalizacao] = useState<'concedida' | 'negada' | 'pendente'>('pendente');

  // Atualizar localização a cada 5 minutos quando modo ativo
  useEffect(() => {
    if (modoAtivo && permissaoLocalizacao === 'concedida') {
      const intervalo = setInterval(() => {
        obterLocalizacao();
      }, 5 * 60 * 1000); // 5 minutos

      return () => clearInterval(intervalo);
    }
  }, [modoAtivo, permissaoLocalizacao]);

  // Temporizador de segurança
  useEffect(() => {
    if (tempoRestante !== null && tempoRestante > 0) {
      const timer = setInterval(() => {
        setTempoRestante((prev) => {
          if (prev === null || prev <= 1) {
            enviarAlerta();
            return null;
          }
          return prev - 1;
        });
      }, 60000); // 1 minuto

      return () => clearInterval(timer);
    }
  }, [tempoRestante]);

  const obterLocalizacao = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocalizacao({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setPermissaoLocalizacao('concedida');
        },
        (error) => {
          console.error('Erro ao obter localização:', error);
          setPermissaoLocalizacao('negada');
        }
      );
    }
  };

  const ativarModoSeguro = () => {
    if (!contatoConfianca) {
      setMostrarModalContato(true);
      return;
    }

    obterLocalizacao();
    setModoAtivo(true);
    setTempoRestante(tempoSelecionado);
  };

  const desativarModoSeguro = () => {
    setModoAtivo(false);
    setTempoRestante(null);
  };

  const confirmarSeguranca = () => {
    setTempoRestante(tempoSelecionado);
  };

  const enviarAlerta = () => {
    if (contatoConfianca && localizacao) {
      const mensagem = `Estou em um encontro e preciso que você verifique se estou bem. Minha localização: https://maps.google.com/?q=${localizacao.lat},${localizacao.lng}`;
      
      // Simular envio de SMS (em produção, usar API de SMS)
      console.log('SMS enviado para:', contatoConfianca);
      console.log('Mensagem:', mensagem);
      
      alert(`Alerta enviado para ${contatoConfianca}!`);
    }
  };

  const acionarEmergencia = () => {
    setMostrarModalEmergencia(true);
  };

  const ligarNumero = (numero: string) => {
    window.location.href = `tel:${numero}`;
  };

  return (
    <div className="min-h-screen bg-black pb-20">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#D4AF37]/20 to-transparent p-6">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-8 h-8 text-[#D4AF37]" />
          <h1 className="text-2xl font-bold text-white">Modo Encontro Seguro</h1>
        </div>
        <p className="text-gray-400 text-sm">
          Ative para compartilhar sua localização e receber proteção durante encontros
        </p>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Status do Modo Seguro */}
        <div className={`rounded-2xl p-6 border-2 ${
          modoAtivo 
            ? 'bg-green-500/10 border-green-500' 
            : 'bg-gray-800/50 border-gray-700'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full ${
                modoAtivo ? 'bg-green-500 animate-pulse' : 'bg-gray-500'
              }`} />
              <span className="text-white font-semibold">
                {modoAtivo ? 'Modo Seguro Ativo' : 'Modo Seguro Inativo'}
              </span>
            </div>
          </div>

          {modoAtivo && tempoRestante !== null && (
            <div className="bg-black/30 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-[#D4AF37]" />
                <span className="text-white font-medium">Tempo restante</span>
              </div>
              <div className="text-3xl font-bold text-[#D4AF37]">
                {tempoRestante} min
              </div>
              <p className="text-gray-400 text-sm mt-2">
                Confirme sua segurança antes do tempo acabar
              </p>
            </div>
          )}

          {!modoAtivo && (
            <button
              onClick={ativarModoSeguro}
              className="w-full bg-gradient-to-r from-[#D4AF37] to-[#F4E5B8] text-black font-bold py-4 rounded-xl hover:shadow-lg hover:shadow-[#D4AF37]/50 transition-all"
            >
              Ativar Modo Seguro
            </button>
          )}

          {modoAtivo && (
            <div className="space-y-3">
              <button
                onClick={confirmarSeguranca}
                className="w-full bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5" />
                Estou Bem - Renovar Tempo
              </button>
              <button
                onClick={desativarModoSeguro}
                className="w-full bg-gray-700 text-white font-bold py-3 rounded-xl hover:bg-gray-600 transition-colors"
              >
                Desativar Modo Seguro
              </button>
            </div>
          )}
        </div>

        {/* Configurações */}
        {!modoAtivo && (
          <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-[#D4AF37]" />
              Contato de Confiança
            </h2>
            <input
              type="tel"
              placeholder="(00) 00000-0000"
              value={contatoConfianca}
              onChange={(e) => setContatoConfianca(e.target.value)}
              className="w-full bg-black/50 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-[#D4AF37] focus:outline-none"
            />
            <p className="text-gray-400 text-xs mt-2">
              Este contato receberá um alerta se você não confirmar sua segurança
            </p>
          </div>
        )}

        {!modoAtivo && (
          <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#D4AF37]" />
              Temporizador de Segurança
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {[15, 30, 60].map((tempo) => (
                <button
                  key={tempo}
                  onClick={() => setTempoSelecionado(tempo)}
                  className={`py-3 rounded-xl font-semibold transition-all ${
                    tempoSelecionado === tempo
                      ? 'bg-[#D4AF37] text-black'
                      : 'bg-black/50 text-gray-400 border border-gray-600 hover:border-[#D4AF37]'
                  }`}
                >
                  {tempo} min
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Localização */}
        {modoAtivo && (
          <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#D4AF37]" />
              Localização Atual
            </h2>
            {permissaoLocalizacao === 'concedida' && localizacao ? (
              <div>
                <div className="bg-black/50 rounded-xl p-4 mb-3">
                  <p className="text-gray-400 text-sm mb-1">Latitude</p>
                  <p className="text-white font-mono">{localizacao.lat.toFixed(6)}</p>
                </div>
                <div className="bg-black/50 rounded-xl p-4 mb-3">
                  <p className="text-gray-400 text-sm mb-1">Longitude</p>
                  <p className="text-white font-mono">{localizacao.lng.toFixed(6)}</p>
                </div>
                <p className="text-green-500 text-sm flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  Localização sendo atualizada a cada 5 minutos
                </p>
              </div>
            ) : permissaoLocalizacao === 'negada' ? (
              <div className="bg-red-500/10 border border-red-500 rounded-xl p-4">
                <p className="text-red-500 text-sm flex items-center gap-2">
                  <X className="w-4 h-4" />
                  Permissão de localização negada. Ative nas configurações do navegador.
                </p>
              </div>
            ) : (
              <p className="text-gray-400 text-sm">Aguardando permissão de localização...</p>
            )}
          </div>
        )}

        {/* Botão de Emergência */}
        <button
          onClick={acionarEmergencia}
          className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white font-bold py-6 rounded-2xl hover:shadow-lg hover:shadow-red-500/50 transition-all flex items-center justify-center gap-3 text-lg"
        >
          <AlertTriangle className="w-6 h-6" />
          ESTOU EM RISCO
        </button>

        {/* Avisos de Segurança */}
        <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-2xl p-4">
          <h3 className="text-[#D4AF37] font-semibold mb-2 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Dicas de Segurança
          </h3>
          <ul className="text-gray-300 text-sm space-y-2">
            <li>• Sempre informe alguém sobre seus encontros</li>
            <li>• Escolha locais públicos e movimentados</li>
            <li>• Mantenha seu celular carregado</li>
            <li>• Confie em seus instintos</li>
          </ul>
        </div>
      </div>

      {/* Modal Contato de Confiança */}
      {mostrarModalContato && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-6 max-w-md w-full border border-gray-700">
            <h3 className="text-white font-bold text-xl mb-4">Contato de Confiança Necessário</h3>
            <p className="text-gray-400 mb-6">
              Para ativar o Modo Seguro, você precisa cadastrar um contato de confiança que receberá alertas caso necessário.
            </p>
            <input
              type="tel"
              placeholder="(00) 00000-0000"
              value={contatoConfianca}
              onChange={(e) => setContatoConfianca(e.target.value)}
              className="w-full bg-black/50 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-[#D4AF37] focus:outline-none mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setMostrarModalContato(false)}
                className="flex-1 bg-gray-700 text-white font-bold py-3 rounded-xl hover:bg-gray-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (contatoConfianca) {
                    setMostrarModalContato(false);
                    ativarModoSeguro();
                  }
                }}
                className="flex-1 bg-[#D4AF37] text-black font-bold py-3 rounded-xl hover:bg-[#F4E5B8] transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Emergência */}
      {mostrarModalEmergencia && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-6 max-w-md w-full border-2 border-red-500">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
              <h3 className="text-white font-bold text-xl">Emergência</h3>
            </div>
            <p className="text-gray-300 mb-6">
              Escolha uma opção de ajuda imediata:
            </p>
            <div className="space-y-3">
              <button
                onClick={() => ligarNumero('190')}
                className="w-full bg-red-600 text-white font-bold py-4 rounded-xl hover:bg-red-700 transition-colors flex items-center justify-center gap-3"
              >
                <Phone className="w-5 h-5" />
                Ligar 190 - Polícia Militar
              </button>
              <button
                onClick={() => ligarNumero('180')}
                className="w-full bg-red-600 text-white font-bold py-4 rounded-xl hover:bg-red-700 transition-colors flex items-center justify-center gap-3"
              >
                <Phone className="w-5 h-5" />
                Ligar 180 - Central da Mulher
              </button>
              <button
                onClick={() => {
                  enviarAlerta();
                  setMostrarModalEmergencia(false);
                }}
                className="w-full bg-[#D4AF37] text-black font-bold py-4 rounded-xl hover:bg-[#F4E5B8] transition-colors"
              >
                Enviar Alerta para Contato
              </button>
              <button
                onClick={() => setMostrarModalEmergencia(false)}
                className="w-full bg-gray-700 text-white font-bold py-3 rounded-xl hover:bg-gray-600 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <Navbar />
    </div>
  );
}
