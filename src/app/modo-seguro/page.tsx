'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, PhoneCall, X } from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabase'

const supabase = createSupabaseClient()

export default function ModoSeguroPage() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [showEmergencyModal, setShowEmergencyModal] = useState(false)
  const [sendingAlert, setSendingAlert] = useState(false)
  const [alertError, setAlertError] = useState<string | null>(null)

  // 📍 Captura localização
  useEffect(() => {
    if (!navigator.geolocation) {
      setAlertError('Geolocalização não suportada neste dispositivo.')
      return
    }

    navigator.geolocation.getCurrentPosition(
      pos => {
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        })
      },
      () => {
        setAlertError('Não foi possível obter a localização.')
      }
    )
  }, [])

  // 🚨 ENVIO DO ALERTA (VERSÃO CORRETA)
  const sendEmergencyAlert = async () => {
    try {
      setSendingAlert(true)
      setAlertError(null)

      if (!coords) {
        setAlertError('Localização indisponível.')
        return
      }

      // ✅ Verifica sessão (via cookie)
      const {
        data: { session }
      } = await supabase.auth.getSession()

      if (!session?.user) {
        setAlertError('Usuária não autenticada. Faça login novamente.')
        return
      }

      const res = await fetch('/api/alerta-emergencia', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          latitude: coords.lat,
          longitude: coords.lng
        })
      })

      const data = await res.json()

      if (!res.ok) {
        setAlertError(data.error || 'Erro ao enviar alerta.')
        return
      }

      alert('🚨 Alerta enviado com sucesso!')
      setShowEmergencyModal(false)
    } catch (err) {
      setAlertError('Erro inesperado ao enviar alerta.')
    } finally {
      setSendingAlert(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 text-white">
      <div className="max-w-md w-full space-y-4">

        {/* STATUS */}
        <div className="border border-green-600 rounded-xl p-4 text-center">
          <h1 className="text-green-500 font-bold text-lg">
            Modo Encontro Seguro
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Sua localização será enviada aos contatos se você estiver em risco.
          </p>

          {coords && (
            <p className="mt-2 text-xs text-gray-500">
              📍 {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
            </p>
          )}
        </div>

        {/* BOTÃO RISCO */}
        <button
          onClick={() => setShowEmergencyModal(true)}
          className="w-full bg-red-600 hover:bg-red-700 py-3 rounded-xl font-bold"
        >
          🚨 ESTOU EM RISCO
        </button>

        {/* MODAL */}
        {showEmergencyModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-[#0b1220] border border-red-600 rounded-2xl p-6 w-full max-w-sm space-y-4">
              
              <div className="flex items-center gap-2 text-red-500 font-bold">
                <AlertTriangle />
                Emergência
              </div>

              {alertError && (
                <div className="bg-red-900/40 text-red-300 text-sm p-2 rounded">
                  {alertError}
                </div>
              )}

              <a
                href="tel:190"
                className="w-full bg-red-600 text-center py-3 rounded-lg flex items-center justify-center gap-2 font-bold"
              >
                <PhoneCall size={16} />
                Ligar 190 (Polícia)
              </a>

              <button
                disabled={sendingAlert}
                onClick={sendEmergencyAlert}
                className="w-full bg-yellow-400 text-black py-3 rounded-lg font-bold disabled:opacity-50"
              >
                {sendingAlert ? 'Enviando...' : 'Enviar alerta para contatos'}
              </button>

              <button
                onClick={() => setShowEmergencyModal(false)}
                className="w-full border border-gray-600 py-2 rounded-lg flex items-center justify-center gap-2"
              >
                <X size={16} />
                Cancelar
              </button>

            </div>
          </div>
        )}
      </div>
    </div>
  )
}
