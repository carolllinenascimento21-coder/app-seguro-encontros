'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Camera, CheckCircle, XCircle, RotateCcw, ArrowLeft } from 'lucide-react'

export default function VerificacaoSelfiePage() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'success' | 'failed'>('idle')
  const [tentativas, setTentativas] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')
  const [cadastroData, setCadastroData] = useState<any>(null)

  useEffect(() => {
    // Recupera dados do cadastro
    const data = localStorage.getItem('cadastro_temp')
    if (!data) {
      router.push('/cadastro')
      return
    }
    setCadastroData(JSON.parse(data))
  }, [router])

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false
      })
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (error) {
      alert('Não foi possível acessar a câmera. Verifique as permissões.')
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
  }

  const captureSelfie = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height)
        const imageData = canvas.toDataURL('image/jpeg', 0.8)
        setCapturedImage(imageData)
        stopCamera()
      }
    }
  }

  const verifySelfie = async () => {
    setIsVerifying(true)
    setVerificationStatus('idle')

    // Simula verificação de liveness (em produção, usar API real)
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Simulação de verificação com 70% de chance de sucesso
    const isValid = Math.random() > 0.3

    if (isValid) {
      setVerificationStatus('success')
      
      // Salva perfil no localStorage (em produção, usar banco de dados)
      const perfil = {
        id: Date.now().toString(),
        nome: cadastroData.nome,
        email: cadastroData.email,
        dataCadastro: cadastroData.dataCadastro,
        statusSelfie: 'aprovada',
        fotoVerificacao: capturedImage
      }

      localStorage.setItem('usuario_perfil', JSON.stringify(perfil))
      localStorage.removeItem('cadastro_temp')

      // Redireciona para home após 2 segundos
      setTimeout(() => {
        router.push('/home')
      }, 2000)
    } else {
      const novasTentativas = tentativas + 1
      setTentativas(novasTentativas)
      setVerificationStatus('failed')
      setErrorMessage('Selfie inválida. Tente novamente em um ambiente com boa iluminação.')

      if (novasTentativas >= 3) {
        setErrorMessage('Você atingiu o limite de 3 tentativas. Tente novamente mais tarde.')
        setTimeout(() => {
          router.push('/cadastro')
        }, 3000)
      }
    }

    setIsVerifying(false)
  }

  const retryCapture = () => {
    setCapturedImage(null)
    setVerificationStatus('idle')
    setErrorMessage('')
    startCamera()
  }

  useEffect(() => {
    startCamera()
    return () => stopCamera()
  }, [])

  return (
    <div className="min-h-screen bg-[#000000] flex flex-col px-4 py-8 relative overflow-hidden">
      {/* Efeito de brilho dourado de fundo */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(212,175,55,0.1)_0%,_transparent_70%)]"></div>
      
      {/* Pontos dourados flutuantes */}
      <div className="absolute inset-0">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-[#D4AF37] rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              opacity: Math.random() * 0.5 + 0.3
            }}
          />
        ))}
      </div>

      {/* Conteúdo principal */}
      <div className="relative z-10 w-full max-w-md mx-auto">
        {/* Botão voltar */}
        <Button
          onClick={() => {
            stopCamera()
            router.back()
          }}
          variant="ghost"
          className="text-[#D4AF37] hover:text-[#EFD9A7] hover:bg-[#D4AF37]/10 mb-6"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Voltar
        </Button>

        {/* Título */}
        <div className="text-center mb-8">
          <h1 className="text-[#D4AF37] text-3xl font-bold mb-2">
            Verificação de Identidade
          </h1>
          <p className="text-[#EFD9A7] text-sm">
            Tire uma selfie para verificar sua identidade
          </p>
          <p className="text-[#999999] text-xs mt-2">
            Tentativa {tentativas + 1} de 3
          </p>
        </div>

        {/* Card de verificação */}
        <div className="bg-[#0A0A0A] border-2 border-[#D4AF37] rounded-3xl p-6 shadow-2xl">
          {/* Área da câmera/foto */}
          <div className="relative aspect-[3/4] bg-[#000000] rounded-2xl overflow-hidden mb-6">
            {!capturedImage ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {/* Guia de posicionamento */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-64 h-80 border-4 border-[#D4AF37] rounded-full opacity-50"></div>
                </div>
              </>
            ) : (
              <img
                src={capturedImage}
                alt="Selfie capturada"
                className="w-full h-full object-cover"
              />
            )}

            {/* Status de verificação */}
            {verificationStatus === 'success' && (
              <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                <div className="bg-green-500 rounded-full p-4">
                  <CheckCircle className="w-16 h-16 text-white" />
                </div>
              </div>
            )}

            {verificationStatus === 'failed' && (
              <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                <div className="bg-red-500 rounded-full p-4">
                  <XCircle className="w-16 h-16 text-white" />
                </div>
              </div>
            )}
          </div>

          {/* Canvas oculto para captura */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Instruções */}
          <div className="bg-[#D4AF37]/10 border border-[#D4AF37] rounded-xl p-4 mb-6">
            <p className="text-[#EFD9A7] text-sm text-center">
              {!capturedImage ? (
                <>
                  Posicione seu rosto dentro do círculo e certifique-se de estar em um ambiente bem iluminado
                </>
              ) : (
                <>
                  Revise sua foto antes de continuar
                </>
              )}
            </p>
          </div>

          {/* Mensagem de erro */}
          {errorMessage && (
            <div className="bg-red-500/10 border border-red-500 rounded-xl p-4 mb-6">
              <p className="text-red-400 text-sm text-center">
                {errorMessage}
              </p>
            </div>
          )}

          {/* Mensagem de sucesso */}
          {verificationStatus === 'success' && (
            <div className="bg-green-500/10 border border-green-500 rounded-xl p-4 mb-6">
              <p className="text-green-400 text-sm text-center font-semibold">
                ✓ Selfie aprovada! Redirecionando...
              </p>
            </div>
          )}

          {/* Botões de ação */}
          <div className="space-y-3">
            {!capturedImage ? (
              <Button
                onClick={captureSelfie}
                disabled={!stream}
                className="w-full bg-[#D4AF37] hover:bg-[#EFD9A7] text-[#000000] font-bold py-6 px-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 text-lg flex items-center justify-center gap-3"
              >
                <Camera className="w-6 h-6" />
                Capturar Selfie
              </Button>
            ) : (
              <>
                {verificationStatus === 'idle' && (
                  <>
                    <Button
                      onClick={verifySelfie}
                      disabled={isVerifying || tentativas >= 3}
                      className="w-full bg-[#D4AF37] hover:bg-[#EFD9A7] text-[#000000] font-bold py-6 px-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 text-lg flex items-center justify-center gap-3"
                    >
                      {isVerifying ? (
                        <>
                          <div className="w-5 h-5 border-2 border-[#000000] border-t-transparent rounded-full animate-spin"></div>
                          Verificando...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-6 h-6" />
                          Confirmar e Verificar
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={retryCapture}
                      disabled={isVerifying}
                      variant="outline"
                      className="w-full border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/10 font-bold py-6 px-8 rounded-2xl transition-all duration-300 text-lg flex items-center justify-center gap-3"
                    >
                      <RotateCcw className="w-6 h-6" />
                      Tirar Outra Foto
                    </Button>
                  </>
                )}

                {verificationStatus === 'failed' && tentativas < 3 && (
                  <Button
                    onClick={retryCapture}
                    className="w-full bg-[#D4AF37] hover:bg-[#EFD9A7] text-[#000000] font-bold py-6 px-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 text-lg flex items-center justify-center gap-3"
                  >
                    <RotateCcw className="w-6 h-6" />
                    Tentar Novamente
                  </Button>
                )}
              </>
            )}
          </div>

          {/* Dicas de segurança */}
          <div className="mt-6 space-y-2">
            <p className="text-[#999999] text-xs text-center font-semibold">
              Dicas para uma boa selfie:
            </p>
            <ul className="text-[#999999] text-xs space-y-1">
              <li>• Ambiente bem iluminado</li>
              <li>• Rosto centralizado e visível</li>
              <li>• Sem óculos escuros ou máscaras</li>
              <li>• Não use foto de tela ou impressa</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
