'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'

export default function SelfieOnboardingPage() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [stream, setStream] = useState<MediaStream | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  // 🎥 ABRE A CÂMERA
  useEffect(() => {
    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
        })

        setStream(mediaStream)

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
        }
      } catch {
        setError('Não foi possível acessar a câmera.')
      }
    }

    startCamera()

    return () => {
      stream?.getTracks().forEach(track => track.stop())
    }
  }, [])

  // 📸 CAPTURA + UPLOAD
  const captureAndUpload = async () => {
    if (!videoRef.current || !canvasRef.current) return

    setUploading(true)
    setError('')

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    ctx?.drawImage(video, 0, 0, canvas.width, canvas.height)

    // 🔑 CONVERTE PARA BLOB
    canvas.toBlob(async blob => {
      if (!blob) {
        setError('Erro ao capturar imagem.')
        setUploading(false)
        return
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setError('Usuária não autenticada.')
        setUploading(false)
        return
      }

      // 🔑 CONVERTE PARA FILE (OBRIGATÓRIO)
      const file = new File([blob], 'selfie.jpg', {
        type: 'image/jpeg',
      })

      const filePath = `${user.id}/selfie.jpg`

      const { error: uploadError } = await supabase.storage
        .from('selfies')
        .upload(filePath, file, {
          contentType: 'image/jpeg',
          upsert: false, // 🚨 ESSENCIAL
        })

      if (uploadError) {
        console.error(uploadError)
        setError('Erro ao enviar selfie.')
        setUploading(false)
        return
      }

      const { data } = supabase.storage
        .from('selfies')
        .getPublicUrl(filePath)

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          selfie_url: data.publicUrl,
          selfie_verified: false,
        })
        .eq('id', user.id)

      if (profileError) {
        setError('Erro ao salvar selfie.')
        setUploading(false)
        return
      }

      setUploading(false)
      router.replace('/verification-pending')
    }, 'image/jpeg')
  }

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-md space-y-6 text-center">
        <h1 className="text-3xl font-bold">Envie sua selfie</h1>

        {error && <p className="text-red-500">{error}</p>}

        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="rounded-xl border border-[#D4AF37]"
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
