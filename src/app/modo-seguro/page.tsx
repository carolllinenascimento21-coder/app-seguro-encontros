'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Phone, Check, X } from 'lucide-react'

export default function ModoSeguroPage() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)

  const [showEmergencyModal, setShowEmergencyModal] = useState(false)
  const [sendingAlert, setSendingAlert] = useState(false)
  const [alertError, setAlertError] = useState<string | null>(null)
  const [alertSuccess, setAlertSuccess] = useState(false)

  // 📍 Captura localização
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      () => setLocation(null)
    )
  }, [])

  // 🚨 Enviar alerta
  const sendEmergencyAlert = async () => {
    if (!location) {
      setAlertError('Localização não disponível')
      return
    }

    try {
      setSendingAlert(true)
      setAlertError(null)

      const res = await fetch('/api/alerta-emergencia', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude: location.lat,
          longitude: location.lng,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Falha ao enviar alerta')
      }

      setAlertSuccess(true)
    } catch (err: any) {
      setAlertError(err.message)
    } finally {
      setSendingAlert(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white px-4 py-8">

      {/* STATUS */}
      <div className="border border-green-600 rounded-xl p-4 mb-6">
        <p className="text-green-500 font-semibold">
          Modo Encontro Seguro Ativo
        </p>
        {location && (
          <p className="text-sm text-gray-400 mt-1">
            📍 {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
          </p>
        )}
      </div>

      {/* BOTÕES PRINCIPAIS */}
      <div className="space-y-4">
        <button
          onClick={() => setShowEmergencyModal(true)}
          className="w-full bg-red-600 py-4 rounded-xl font-bold flex items-center justify-center gap-2"
        >
          <AlertTriangle />
          ESTOU EM RISCO
        </button>

        <button
          className="w-full bg-green-600 py-3 rounded-xl font-bold flex items-center justify-center gap-2"
        >
          <Check />
          Estou bem
        </button>
      </div>

      {/* MODAL DE EMERGÊNCIA */}
      {showEmergencyModal && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center px-4">
          <div className="bg-gray-900 border border-red-600 rounded-2xl p-6 w-full max-w-sm space-y-4">

            <h2 className="text-xl font-bold text-red-500 flex items-center gap-2">
              <AlertTriangle />
              Emergência
            </h2>

            <p className="text-sm text-gray-300">
              Escolha uma ação imediata:
            </p>

            {/* ERRO */}
            {alertError && (
              <div className="bg-red-500/10 border border-red-500 text-red-400 p-3 rounded-lg text-sm">
                {alertError}
              </div>
            )}

            {/* SUCESSO */}
            {alertSuccess && (
              <div className="bg-green-500/10 border border-green-500 text-green-400 p-3 rounded-lg text-sm">
                Alerta enviado com sucesso aos seus contatos.
              </div>
            )}

            {/* BOTÕES */}
            <div className="space-y-2">
              <button
                onClick={() => window.location.href = 'tel:190'}
                className="w-full bg-red-600 py-3 rounded-xl flex items-center justify-center gap-2 font-bold"
              >
                <Phone />
                Ligar 190 (Polícia)
              </button>

              <button
                onClick={sendEmergencyAlert}
                disabled={sendingAlert}
                className="w-full bg-yellow-400 text-black py-3 rounded-xl font-bold"
              >
                {sendingAlert ? 'Enviando alerta...' : 'Enviar alerta para contatos'}
              </button>

              <button
                onClick={() => {
                  setShowEmergencyModal(false)
                  setAlertError(null)
                  setAlertSuccess(false)
                }}
                className="w-full bg-gray-700 py-2 rounded-xl flex items-center justify-center gap-2"
              >
                <X />
                Cancelar
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
