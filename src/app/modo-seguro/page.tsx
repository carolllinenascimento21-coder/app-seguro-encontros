'use client';

import { useState, useEffect } from 'react';
import {
  Shield,
  MapPin,
  Clock,
  AlertTriangle,
  Phone,
  Check,
  X
} from 'lucide-react';
import Navbar from '@/components/custom/navbar';

export default function ModoEncontroSeguro() {
  const [modoAtivo, setModoAtivo] = useState(false);
  const [localizacao, setLocalizacao] = useState<{ lat: number; lng: number } | null>(null);
  const [tempoSelecionado, setTempoSelecionado] = useState(30);
  const [tempoRestante, setTempoRestante] = useState<number | null>(null);
  const [mostrarModalEmergencia, setMostrarModalEmergencia] = useState(false);
  const [permissaoLocalizacao, setPermissaoLocalizacao] =
    useState<'concedida' | 'negada' | 'pendente'>('pendente');

  /* =========================
     LOCALIZAÇÃO
  ========================== */
  const obterLocalizacao = () => {
    if (!('geolocation' in navigator)) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocalizacao({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
        setPermissaoLocalizacao('concedida');
      },
      () => setPermissaoLocalizacao('negada'),
      { enableHighAccuracy: true }
    );
  };

  useEffect(() => {
    if (modoAtivo) {
      obterLocalizacao();
      const intervalo = setInterval(obterLocalizacao, 5 * 60 * 1000);
      return () => clearInterval(intervalo);
    }
  }, [modoAtivo]);

  /* =========================
     TIMER DE SEGURANÇA
  ========================== */
  useEffect(() => {
    if (!modoAtivo || tempoRestante === null) return;

    if (tempoRestante <= 0) {
      enviarAlerta('tempo_esgotado');
      setTempoRestante(null);
      return;
    }

    const timer = setInterval(
      () => setTempoRestante((t) => (t ? t - 1 : null)),
      60000
    );

    return () => clearInterval(timer);
  }, [tempoRestante, modoAtivo]);

  /* =========================
     AÇÕES
  ========================== */
  const ativarModoSeguro = () => {
    setModoAtivo(true);
    setTempoRestante(tempoSelecionado);
    obterLocalizacao();
  };

  const desativarModoSeguro = () => {
    setModoAtivo(false);
    setTempoRestante(null);
  };

  const confirmarSeguranca = () => {
    setTempoRestante(tempoSelecionado);
  };

  /* =========================
     ALERTA BACKEND
  ========================== */
  const enviarAlerta = async (tipo: 'manual' | 'tempo_esgotado') => {
    if (!localizacao) return;

    try {
      await fetch('/api/alerta-emergencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: localizacao.lat,
          longitude: localizacao.lng,
          tipo
        })
      });
    } catch (e) {
      console.error('Erro ao enviar alerta', e);
    }
  };

  const ligarNumero = (numero: string) => {
    window.location.href = `tel:${numero}`;
  };

  /* =========================
     UI
  ========================== */
  return (
    <div className="min-h-screen bg-black pb-20">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#D4AF37]/20 to-transparent p-6">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-8 h-8 text-[#D4AF37]" />
          <h1 className="text-2xl font-bold text-white">
            Modo Encontro Seguro
          </h1>
        </div>
        <p className="text-gray-400 text-sm">
          Compartilhamento automático de localização e alerta de emergência
        </p>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* STATUS */}
        <div
          className={`rounded-2xl p-6 border-2 ${
            modoAtivo
              ? 'bg-green-500/10 border-green-500'
              : 'bg-gray-800/50 border-gray-700'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-white font-semibold">
              {modoAtivo ? 'Modo Seguro Ativo' : 'Modo Seguro Inativo'}
            </span>
          </div>

          {modoAtivo && tempoRestante !== null && (
            <div className="bg-black/30 rounded-xl p-4 mb-4">
              <Clock className="text-[#D4AF37] mb-1" />
              <div className="text-3xl font-bold text-[#D4AF37]">
                {tempoRestante} min
              </div>
            </div>
          )}

          {!modoAtivo ? (
            <button
              onClick={ativarModoSeguro}
              className="w-full bg-[#D4AF37] text-black font-bold py-4 rounded-xl"
            >
              Ativar Modo Seguro
            </button>
          ) : (
            <div className="space-y-3">
              <button
                onClick={confirmarSeguranca}
                className="w-full bg-green-600 py-3 rounded-xl text-white flex items-center justify-center gap-2"
              >
                <Check /> Estou Bem
              </button>
              <button
                onClick={desativarModoSeguro}
                className="w-full bg-gray-700 py-3 rounded-xl text-white"
              >
                Desativar
              </button>
            </div>
          )}
        </div>

        {/* LOCALIZAÇÃO */}
        {modoAtivo && (
          <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
            <h2 className="text-white font-semibold mb-2 flex gap-2">
              <MapPin className="text-[#D4AF37]" /> Localização
            </h2>
            {localizacao ? (
              <p className="text-gray-300 text-sm">
                {localizacao.lat.toFixed(5)}, {localizacao.lng.toFixed(5)}
              </p>
            ) : (
              <p className="text-gray-400 text-sm">
                Aguardando permissão…
              </p>
            )}
          </div>
        )}

        {/* EMERGÊNCIA */}
        <button
          onClick={() => setMostrarModalEmergencia(true)}
          className="w-full bg-red-600 py-6 rounded-2xl text-white font-bold flex items-center justify-center gap-3"
        >
          <AlertTriangle /> ESTOU EM RISCO
        </button>
      </div>

      {/* MODAL EMERGÊNCIA */}
      {mostrarModalEmergencia && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md border-2 border-red-500 space-y-3">
            <h3 className="text-white font-bold text-xl flex gap-2">
              <AlertTriangle className="text-red-500" /> Emergência
            </h3>

            <button
              onClick={() => ligarNumero('190')}
              className="w-full bg-red-600 py-3 rounded-xl text-white flex justify-center gap-2"
            >
              <Phone /> Ligar 190
            </button>

            <button
              onClick={async () => {
                await enviarAlerta('manual');
                setMostrarModalEmergencia(false);
              }}
              className="w-full bg-[#D4AF37] py-3 rounded-xl text-black font-bold"
            >
              Enviar Alerta
            </button>

            <button
              onClick={() => setMostrarModalEmergencia(false)}
              className="w-full bg-gray-700 py-3 rounded-xl text-white"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <Navbar />
    </div>
  );
}
