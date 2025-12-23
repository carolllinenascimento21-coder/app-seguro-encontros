'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function VerificacaoSelfiePage() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then(stream => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      })
      .catch(() => {
        setError('Não foi possível acessar a câmera')
      })
  }, [])

  const captureSelfie = async () => {
    if (!videoRef.current || !canvasRef.current) return

    setLoading(true)
    setError(null)

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx?.drawImage(video, 0, 0)

    const image = canvas.toDataURL('image/jpeg', 0.8)

    const res = await fetch('/api/verify-selfie', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Erro ao validar selfie')
      setLoading(false)
      return
    }

    router.replace('/home')
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="max-w-sm w-full space-y-4 border border-[#D4AF37] p-6 rounded-xl">
        <h1 className="text-xl font-bold text-center text-[#D4AF37]">
          Verificação de Selfie
        </h1>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full rounded-lg"
        />

        <canvas ref={canvasRef} className="hidden" />

        <button
          onClick={captureSelfie}
          disabled={loading}
          className="w-full bg-[#D4AF37] text-black py-3 rounded-lg font-semibold"
        >
          {loading ? 'Verificando...' : 'Capturar e enviar selfie'}
        </button>
      </div>
    </div>
  )
}
