'use client'

import { useEffect, useState } from 'react'
import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs'
import { AlertTriangle, Phone, X } from 'lucide-react'

export default function ModoSeguroPage() {
  const supabase = createBrowserSupabaseClient()

  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)

  const [showEmergencyModal, setShowEmergencyModal] = useState(false)
  const [sendingAlert, setSendingAlert] = useState(false)
  const [alertError, setAlertError] = useState<string | null>(null)

  // 📍 Captura localização
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLatitude(pos.coords.latitude)
        setLongitude(pos.coords.longitude)
      },
      err => {
        console.error(err)
        setAlertError('Não foi possível obter localização')
      }
    )
  }, [])

  // 🚨 Enviar alerta
  const enviarAlerta = async () => {
    setSendingAlert(true)
    setAlertError(null)

    try {
      if (latitude === null || longitude === null) {
        throw new Error('Localização indisponível')
      }

      const {
        data: { session }
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('Usuária não autenticada')
      }

      const res = await fetch('/api/alerta-emergencia', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          latitude: Number(latitude),
          longitude: Number(longitude)
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Falha ao enviar alerta')
      }

      alert('🚨 Alerta enviado com sucesso!')
      setShowEmergencyModal(false)
    } catch (err: any) {
      setAlertError(err.message)
    } finally {
      setSendingAlert(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center text-white px-4">
      <div className="w-full max-w-md space-y-6">

        {/* STATUS */}
        <div className="border border-green-600 rounded-xl p-4 text-center">
          <p className="text-green-500 font-semibold">
            Modo Encontro Seguro Ativo
          </p>
          {latitude && longitude && (
            <p className="text-sm text-gray-400 mt-2">
              📍 {latitude.toFixed(5)}, {longitude.toFixed(5)}
            </p>
          )}
        </div>

        {/* BOTÃO RISCO */}
        <button
          onClick={() => setShowEmergencyModal(true)}
          className="w-full bg-red-600 hover:bg-red-700 transition py-4 rounded-xl font-bold flex items-center justify-center gap-2"
        >
          <AlertTriangle />
          ESTOU EM RISCO
        </button>

        {/* MODAL EMERGÊNCIA */}
        {showEmergencyModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-gray-900 border border-red-600 rounded-xl p-6 w-full max-w-sm space-y-4">

              <div className="flex items-center gap-2 text-red-500 font-bold">
                <AlertTriangle />
                Emergência
              </div>

              {alertError && (
                <div className="bg-red-500/10 border border-red-500 text-red-400 p-2 rounded text-sm">
                  {alertError}
                </div>
              )}

              <button
                onClick={() => window.location.href = 'tel:190'}
                className="w-full bg-red-600 py-3 rounded-lg font-bold flex items-center justify-center gap-2"
              >
                <Phone />
                Ligar 190 (Polícia)
              </button>

              <button
                disabled={sendingAlert}
                onClick={enviarAlerta}
                className="w-full bg-yellow-400 text-black py-3 rounded-lg font-bold disabled:opacity-50"
              >
                {sendingAlert ? 'Enviando alerta...' : 'Enviar alerta para contatos'}
              </button>

              <button
                onClick={() => setShowEmergencyModal(false)}
                className="w-full border border-gray-600 py-2 rounded-lg flex items-center justify-center gap-1"
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
