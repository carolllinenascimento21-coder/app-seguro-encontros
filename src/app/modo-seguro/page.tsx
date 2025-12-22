'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Check } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function ModoSeguroPage() {
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  // ✅ LOCALIZAÇÃO SOMENTE NO CLIENTE
  useEffect(() => {
    if (!navigator.geolocation) return

    navigator.geolocation.getCurrentPosition(
      pos => {
        setLatitude(pos.coords.latitude)
        setLongitude(pos.coords.longitude)
      },
      err => {
        console.error('Erro localização', err)
      }
    )
  }, [])

  // ✅ ALERTA SÓ DISPARA NO CLICK
  const enviarAlerta = async () => {
    if (latitude === null || longitude === null) {
      alert('Localização não disponível')
      return
    }

    setLoading(true)

    const session = localStorage.getItem('sb-access-token')
    if (!session) {
      alert('Usuária não autenticada')
      setLoading(false)
      return
    }

    const res = await fetch('/api/alerta-emergencia', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session}`
      },
      body: JSON.stringify({ latitude, longitude })
    })

    setLoading(false)

    if (!res.ok) {
      const error = await res.json()
      alert(error.error || 'Erro ao enviar alerta')
      return
    }

    alert('🚨 Alerta enviado com sucesso!')
  }

  return (
    <div className="min-h-screen bg-black text-white px-4 py-10">
      <div className="max-w-md mx-auto space-y-6">

        <div className="border border-green-600 rounded-xl p-6">
          <h1 className="text-xl font-bold text-green-500 mb-2">
            Modo Encontro Seguro
          </h1>

          <p className="text-sm text-gray-400">
            Sua localização será enviada aos contatos de emergência se você estiver em risco.
          </p>

          {latitude && longitude && (
            <p className="text-xs text-gray-500 mt-3">
              📍 {latitude.toFixed(5)}, {longitude.toFixed(5)}
            </p>
          )}
        </div>

        <button
          onClick={enviarAlerta}
          disabled={loading}
          className="w-full bg-red-600 hover:bg-red-700 transition text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2"
        >
          <AlertTriangle size={20} />
          {loading ? 'Enviando...' : 'ESTOU EM RISCO'}
        </button>

        <button className="w-full bg-green-600 text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2">
          <Check size={18} />
          Estou bem
        </button>

      </div>
    </div>
  )
}
