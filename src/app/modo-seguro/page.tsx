'use client'

import { useEffect, useState } from 'react'
import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs'
import { ShieldAlert, Phone, XCircle } from 'lucide-react'

type Location = {
  lat: number
  lng: number
}

export default function ModoSeguroPage() {
  const supabase = createBrowserSupabaseClient()

  const [location, setLocation] = useState<Location | null>(null)
  const [showEmergencyModal, setShowEmergencyModal] = useState(false)
  const [sendingAlert, setSendingAlert] = useState(false)
  const [alertError, setAlertError] = useState<string | null>(null)
  const [alertSuccess, setAlertSuccess] = useState(false)

  /* =========================
     GEOLOCALIZAÇÃO
  ========================== */
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        })
      },
      () => {
        setAlertError('Não foi possível obter localização')
      },
      { enableHighAccuracy: true }
    )
  }, [])

  /* =========================
     ENVIAR ALERTA
  ========================== */
  const sendEmergencyAlert = async () => {
    if (!location) {
      setAlertError('Localização não disponível')
      return
    }

    try {
      setSendingAlert(true)
      setAlertError(null)

      // 🔑 Token da usuária
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('Usuária não autenticada')
      }

      const res = await fetch('/api/alerta-emergencia', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          latitude: location.lat,
          longitude: location.lng,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao enviar alerta')
      }

      setAlertSuccess(true)
      setShowEmergencyModal(false)
    } catch (err: any) {
      setAlertError(err.message)
    } finally {
      setSendingAlert(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">

        {/* CARD PRINCIPAL */}
        <div className="border border-green-600 rounded-2xl p-4">
          <h1 className="text-green-500 font-bold text-lg flex items-center gap-2">
            <ShieldAlert size={18} />
            Modo Encontro Seguro
          </h1>

          <p className="text-sm text-gray-400 mt-2">
            Sua localização será enviada aos contatos de emergência se você estiver em risco.
          </p>

          {location && (
            <p className="text-xs text-gray-500 mt-2">
              {location.lat}, {location.lng}
            </p>
          )}
        </div>

        {/* BOTÕES */}
        <button
          onClick={() => setShowEmergencyModal(true)}
          className="w-full bg-red-600 py-3 rounded-xl font-bold"
        >
          🚨 ESTOU EM RISCO
        </button>

        <button
          className="w-full bg-green-600 py-3 rounded-xl font-bold text-black"
        >
          ✓ Estou bem
        </button>

        {/* ERRO */}
        {alertError && (
          <p className="text-red-500 text-sm text-center">{alertError}</p>
        )}

        {/* MODAL EMERGÊNCIA */}
        {showEmergencyModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-[#0b1220] border border-red-600 rounded-2xl p-5 w-80 space-y-4">

              <h2 className="text-red-500 font-bold text-lg flex items-center gap-2">
                <ShieldAlert size={18} />
                Emergência
              </h2>

              <p className="text-sm text-gray-400">
                Escolha uma ação imediata:
              </p>

              {/* LIGAR POLÍCIA */}
              <a
                href="tel:190"
                className="w-full flex items-center justify-center gap-2 bg-red-600 py-3 rounded-xl font-bold"
              >
                <Phone size={16} />
                Ligar 190 (Polícia)
              </a>

              {/* ENVIAR ALERTA */}
              <button
                onClick={sendEmergencyAlert}
                disabled={sendingAlert}
                className="w-full bg-yellow-400 py-3 rounded-xl font-bold text-black disabled:opacity-50"
              >
                {sendingAlert ? 'Enviando alerta...' : 'Enviar alerta para contatos'}
              </button>

              {/* CANCELAR */}
              <button
                onClick={() => setShowEmergencyModal(false)}
                className="w-full flex items-center justify-center gap-2 border border-gray-600 py-2 rounded-xl"
              >
                <XCircle size={16} />
                Cancelar
              </button>

            </div>
          </div>
        )}

        {/* SUCESSO */}
        {alertSuccess && (
          <p className="text-green-500 text-center text-sm">
            Alerta enviado com sucesso 🚨
          </p>
        )}
      </div>
    </div>
  )
}
