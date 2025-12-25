'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'

export default function SelfieOnboardingPage() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  // 🎥 ABRE A CÂMERA (FORMA SEGURA)
  useEffect(() => {
    let mediaStream: MediaStream

    const startCamera = async () => {
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
        })

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
          await videoRef.current.play()
        }
      } catch {
        setError('Não foi possível acessar a câmera.')
      }
    }

    startCamera()

    return () => {
      mediaStream?.getTracks().forEach(track => track.stop())
    }
  }, [])

  // 📸 CAPTURA + UPLOAD (ROBUSTO)
  const captureAndUpload = async () => {
    if (!videoRef.current || !canvasRef.current) return

    // ⛔ garante que o vídeo carregou
    if (videoRef.current.videoWidth === 0) {
      setError('Câmera ainda não está pronta. Aguarde um instante.')
      return
    }

    setUploading(true)
    setError('')

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')!

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    const blob = await new Promise<Blob | null>(resolve =>
      canvas.toBlob(resolve, 'image/jpeg', 0.9)
    )

    if (!blob) {
      setError('Erro ao capturar imagem.')
      setUploading(false)
      return
    }

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    const user = session?.user

    if (sessionError || !user) {
      console.error(sessionError)
      setError('Usuária não autenticada.')
      setUploading(false)
      return
    }

    const filePath = `${user.id}/selfie.jpg`

    // ✅ UPLOAD CORRETO
    const { error: uploadError } = await supabase.storage
      .from('selfie-verifications')
      .upload(filePath, blob, {
        contentType: 'image/jpeg',
        upsert: true, // ✅ ESSENCIAL
      })

    if (uploadError) {
      console.error(uploadError)
      setError(uploadError.message || 'Erro ao enviar selfie.')
      setUploading(false)
      return
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        selfie_url: filePath,
        selfie_verified: false,
        onboarding_completed: false,
      })
      .eq('id', user.id)

    if (profileError) {
      setError('Erro ao salvar selfie.')
      setUploading(false)
      return
    }

    setUploading(false)
    router.replace('/verification-pending')
  }

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-md space-y-6 text-center">
        <h1 className="text-3xl font-bold">Envie sua selfie</h1>

        {error && <p className="text-red-500">{error}</p>}

        <video
          ref={videoRef}
          playsInline
          muted
          className="rounded-xl border border-[#D4AF37] mx-auto"
        />

        <canvas ref={canvasRef} className="hidden" />

        <Button
          onClick={captureAndUpload}
          disabled={uploading}
          className="w-full bg-[#D4AF37] text-black"
        >
          {uploading ? 'Enviando...' : 'Capturar selfie'}
        </Button>
      </div>
    </main>
  )
}
