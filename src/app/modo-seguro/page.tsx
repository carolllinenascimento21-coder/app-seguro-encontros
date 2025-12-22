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

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLatitude(pos.coords.latitude)
        setLongitude(pos.coords.longitude)
      },
      () => {
        setAlertError('Não foi possível obter localização')
      }
    )
  }, [])

  async function enviarAlerta() {
    setSendingAlert(true)
    setAlertError(null)

    try {
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
          latitude,
          longitude,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao enviar alerta')
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
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <button
        onClick={() => setShowEmergencyModal(true)}
        className="bg-red-600 px-6 py-3 rounded-xl font-bold"
      >
        🚨 ESTOU EM RISCO
      </button>

      {showEmergencyModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-red-600 rounded-2xl p-6 w-80 space-y-4">
            <div className="flex items-center gap-2 text-red-500 font-bold">
              <AlertTriangle />
              Emergência
            </div>

            {alertError && (
              <div className="bg-red-900/40 text-red-400 text-sm p-2 rounded">
                {alertError}
              </div>
            )}

            <a
              href="tel:190"
              className="flex items-center justify-center gap-2 bg-red-600 py-3 rounded-xl font-bold"
            >
              <Phone size={18} />
              Ligar 190 (Polícia)
            </a>

            <button
              onClick={enviarAlerta}
              disabled={sendingAlert}
              className="w-full bg-yellow-400 text-black font-bold py-3 rounded-xl disabled:opacity-50"
            >
              {sendingAlert ? 'Enviando alerta...' : 'Enviar alerta para contatos'}
            </button>

            <button
              onClick={() => setShowEmergencyModal(false)}
              className="w-full flex items-center justify-center gap-2 text-gray-400"
            >
              <X size={16} />
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
