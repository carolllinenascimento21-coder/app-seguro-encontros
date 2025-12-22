'use client'

import { useEffect, useState } from 'react'
import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs'
import {
  AlertTriangle,
  Phone,
  Shield,
  MapPin,
  Check,
  X,
} from 'lucide-react'

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
        setAlertError('Permissão de localização negada')
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
        throw new Error('Sessão expirada. Faça login novamente.')
      }

      const res = await fetch('/api/alerta-emergencia', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ latitude, longitude }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao enviar alerta')
      }

      alert('🚨 Alerta enviado com sucesso')
      setShowEmergencyModal(false)
    } catch (err: any) {
      setAlertError(err.message)
    } finally {
      setSendingAlert(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white px-4 py-10">
      <div className="max-w-md mx-auto space-y-6">

        {/* HEADER */}
        <div className="border border-green-600 rounded-2xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-green-500 font-bold">
            <Shield />
            Modo Encontro Seguro
          </div>
          <p className="text-sm text-gray-400">
            Sua localização será enviada aos contatos se você estiver em risco
          </p>
        </div>

        {/* LOCALIZAÇÃO */}
        {latitude && longitude && (
          <div className="border border-gray-700 rounded-xl p-4 flex items-center gap-2 text-sm">
            <MapPin className="text-[#D4AF37]" />
            {latitude.toFixed(5)}, {longitude.toFixed(5)}
          </div>
        )}

        {/* BOTÕES */}
        <button
          onClick={() => setShowEmergencyModal(true)}
          className="w-full bg-red-600 py-4 rounded-xl font-bold flex items-center justify-center gap-2"
        >
          <AlertTriangle />
          ESTOU EM RISCO
        </button>

        <button className="w-full bg-green-600 py-4 rounded-xl font-bold flex items-center justify-center gap-2">
          <Check />
          Estou bem
        </button>
      </div>

      {/* MODAL EMERGÊNCIA */}
      {showEmergencyModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 border border-red-600 rounded-2xl p-6 w-full max-w-sm space-y-4">

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
              className="w-full bg-red-600 py-3 rounded-xl font-bold flex items-center justify-center gap-2"
            >
              <Phone size={18} />
              Ligar 190 (Polícia)
            </a>

            <button
              onClick={enviarAlerta}
              disabled={sendingAlert}
              className="w-full bg-yellow-400 text-black py-3 rounded-xl font-bold disabled:opacity-50"
            >
              {sendingAlert ? 'Enviando alerta...' : 'Enviar alerta para contatos'}
            </button>

            <button
              onClick={() => setShowEmergencyModal(false)}
              className="w-full text-gray-400 flex items-center justify-center gap-2"
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
