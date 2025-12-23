'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'

export default function SelfieOnboardingPage() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 🎥 Abre câmera
  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user' } })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      })
      .catch(() => {
        setError('Não foi possível acessar a câmera.')
      })
  }, [])

  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current) return

    setLoading(true)
    setError('')

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx?.drawImage(video, 0, 0)

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg')
    )

    if (!blob) {
      setError('Falha ao capturar imagem.')
      setLoading(false)
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setError('Usuário não autenticado.')
      setLoading(false)
      return
    }

    const filePath = `${user.id}/selfie.jpg`

    const { error: uploadError } = await supabase.storage
      .from('selfies')
      .upload(filePath, blob, { upsert: true })

    if (uploadError) {
      setError('Erro ao enviar selfie.')
      setLoading(false)
      return
    }

    const { data: publicUrl } = supabase.storage
      .from('selfies')
      .getPublicUrl(filePath)

    await supabase
      .from('profiles')
      .update({
        selfie_url: publicUrl.publicUrl,
        selfie_verified: false,
        onboarding_completed: false,
      })
      .eq('id', user.id)

    setLoading(false)
    router.replace('/verification-pending')
  }

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6">
      <h1 className="text-3xl font-bold mb-4">Envie sua selfie</h1>

      {error && <p className="text-red-400 mb-4">{error}</p>}

      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="rounded-xl border border-[#D4AF37] w-full max-w-sm"
      />

      <canvas ref={canvasRef} className="hidden" />

      <Button
        onClick={handleCapture}
        disabled={loading}
        className="mt-6 bg-[#D4AF37] text-black w-full max-w-sm"
      >
        {loading ? 'Enviando...' : 'Capturar selfie'}
      </Button>
    </main>
  )
}
