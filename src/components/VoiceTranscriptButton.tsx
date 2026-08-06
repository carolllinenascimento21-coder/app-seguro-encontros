'use client'

import { useEffect, useRef, useState } from 'react'
import { Mic, Square } from 'lucide-react'

type SpeechRecognitionEventLike = Event & {
  results: ArrayLike<{ 0: { transcript: string } }>
}

type SpeechRecognitionErrorEventLike = Event & { error: string }

type SpeechRecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

type SpeechWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor
  webkitSpeechRecognition?: SpeechRecognitionConstructor
}

type VoiceTranscriptButtonProps = {
  onTranscript: (transcript: string) => void
}

export function VoiceTranscriptButton({ onTranscript }: VoiceTranscriptButtonProps) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const mountedRef = useRef(true)
  const receivedResultRef = useRef(false)
  const stoppedByUserRef = useRef(false)
  const hadErrorRef = useRef(false)
  const [status, setStatus] = useState<'idle' | 'recording' | 'processing'>('idle')
  const [message, setMessage] = useState('')

  useEffect(() => {
    return () => {
      mountedRef.current = false
      recognitionRef.current?.abort()
      recognitionRef.current = null
    }
  }, [])

  const showMessage = (text: string) => {
    if (!mountedRef.current) return
    setMessage(text)
    setStatus('idle')
  }

  const stopRecognition = () => {
    if (status !== 'recording' || !recognitionRef.current) return
    stoppedByUserRef.current = true
    setStatus('processing')
    recognitionRef.current.stop()
  }

  const startRecognition = async () => {
    if (status !== 'idle' || recognitionRef.current) return

    setStatus('processing')

    const speechWindow = window as SpeechWindow
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition

    if (!Recognition) {
      showMessage('Seu navegador não oferece transcrição por voz.')
      return
    }

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        showMessage('Não foi possível acessar o microfone.')
        return
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((track) => track.stop())

      if (!mountedRef.current) return

      const recognition = new Recognition()
      recognition.lang = 'pt-BR'
      recognition.continuous = false
      recognition.interimResults = false
      receivedResultRef.current = false
      stoppedByUserRef.current = false
      hadErrorRef.current = false

      recognition.onresult = (event) => {
        const transcript = event.results[0]?.[0]?.transcript?.trim()
        if (!transcript) return
        receivedResultRef.current = true
        onTranscript(transcript)
      }

      recognition.onerror = (event) => {
        hadErrorRef.current = true
        recognitionRef.current = null
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          showMessage('Permissão de microfone negada.')
        } else if (event.error === 'audio-capture') {
          showMessage('Não foi possível acessar o microfone.')
        } else if (event.error !== 'aborted') {
          showMessage('Não foi possível reconhecer a fala. Tente novamente.')
        }
      }

      recognition.onend = () => {
        recognitionRef.current = null
        if (!mountedRef.current) return
        setStatus('idle')
        if (!receivedResultRef.current && !stoppedByUserRef.current && !hadErrorRef.current) {
          setMessage('Não foi possível reconhecer a fala. Tente novamente.')
        }
      }

      recognitionRef.current = recognition
      setMessage('')
      setStatus('recording')
      recognition.start()
    } catch (error) {
      recognitionRef.current = null
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        showMessage('Permissão de microfone negada.')
      } else {
        showMessage('Não foi possível acessar o microfone.')
      }
    }
  }

  const isRecording = status === 'recording'
  const isProcessing = status === 'processing'

  return (
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={isRecording ? stopRecognition : startRecognition}
        disabled={isProcessing}
        aria-label={isRecording ? 'Parar gravação' : 'Transcrever relato por voz'}
        aria-pressed={isRecording}
        className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40 disabled:cursor-wait disabled:opacity-70 ${
          isRecording
            ? 'border-[#D4AF37] bg-[#D4AF37]/15 text-[#F2D675]'
            : 'border-[#D4AF37]/40 bg-black/30 text-[#D4AF37] hover:bg-[#D4AF37]/10'
        }`}
      >
        {isRecording ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-4 w-4" />}
        {isRecording ? 'Gravando...' : isProcessing ? 'Transcrevendo...' : 'Falar relato'}
      </button>
      {message ? <p role="status" className="text-xs text-amber-200/90">{message}</p> : null}
    </div>
  )
}
