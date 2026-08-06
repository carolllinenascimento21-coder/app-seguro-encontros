import { useCallback, useRef, useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition'

import { Button } from '../components/Button'
import { Card } from '../components/Card'

function appendTranscript(currentText: string, transcript: string) {
  const current = currentText.trimEnd()
  const spokenText = transcript.trim()

  if (!spokenText) return currentText
  if (!current) return spokenText

  const separator = /[.!?…,:;]$/.test(current) ? ' ' : '. '
  return `${current}${separator}${spokenText}`
}

export function AvaliarScreen() {
  const [profileId, setProfileId] = useState('')
  const [comment, setComment] = useState('')
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'recording' | 'processing'>('idle')
  const [voiceMessage, setVoiceMessage] = useState('')
  const screenFocusedRef = useRef(true)
  const operationInProgressRef = useRef(false)
  const receivedResultRef = useRef(false)
  const stoppedByUserRef = useRef(false)
  const hadErrorRef = useRef(false)

  useSpeechRecognitionEvent('result', (event) => {
    if (!screenFocusedRef.current || receivedResultRef.current) return
    const transcript = event.results[0]?.transcript?.trim()
    if (!transcript) return
    receivedResultRef.current = true
    setComment((current) => appendTranscript(current, transcript))
  })

  useSpeechRecognitionEvent('error', (event) => {
    operationInProgressRef.current = false
    if (!screenFocusedRef.current || event.error === 'aborted') return
    hadErrorRef.current = true
    setVoiceStatus('idle')
    if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
      setVoiceMessage('Permissão de microfone negada.')
    } else if (event.error === 'audio-capture') {
      setVoiceMessage('Não foi possível acessar o microfone.')
    } else {
      setVoiceMessage('Não foi possível reconhecer a fala. Tente novamente.')
    }
  })

  useSpeechRecognitionEvent('end', () => {
    operationInProgressRef.current = false
    if (!screenFocusedRef.current) return
    setVoiceStatus('idle')
    if (!receivedResultRef.current && !stoppedByUserRef.current && !hadErrorRef.current) {
      setVoiceMessage('Não foi possível reconhecer a fala. Tente novamente.')
    }
  })

  useFocusEffect(
    useCallback(() => {
      screenFocusedRef.current = true
      setVoiceStatus('idle')

      return () => {
        screenFocusedRef.current = false
        operationInProgressRef.current = false
        ExpoSpeechRecognitionModule.abort()
      }
    }, [])
  )

  async function toggleVoiceRecognition() {
    if (voiceStatus === 'recording') {
      stoppedByUserRef.current = true
      setVoiceStatus('processing')
      ExpoSpeechRecognitionModule.stop()
      return
    }

    if (voiceStatus !== 'idle' || operationInProgressRef.current) return

    operationInProgressRef.current = true
    setVoiceStatus('processing')

    try {
      if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
        operationInProgressRef.current = false
        setVoiceStatus('idle')
        setVoiceMessage('Este dispositivo não possui serviço de reconhecimento de voz.')
        return
      }

      const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync()
      if (!screenFocusedRef.current || !operationInProgressRef.current) return

      if (!permission.granted) {
        operationInProgressRef.current = false
        setVoiceStatus('idle')
        setVoiceMessage('Permissão de microfone negada.')
        return
      }

      receivedResultRef.current = false
      stoppedByUserRef.current = false
      hadErrorRef.current = false
      setVoiceMessage('')
      setVoiceStatus('recording')
      ExpoSpeechRecognitionModule.start({
        lang: 'pt-BR',
        interimResults: false,
        continuous: false,
      })
    } catch {
      operationInProgressRef.current = false
      setVoiceStatus('idle')
      setVoiceMessage('Não foi possível acessar o microfone.')
    }
  }

  function handleSubmit() {
    Alert.alert(
      'Estrutura pronta',
      'A integração de envio pode ser conectada à rota existente de avaliações sem alterar o backend.'
    )
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card>
        <Text style={styles.title}>Nova avaliação</Text>
        <Text style={styles.help}>Tela preparada para integração com fluxo de envio de avaliações.</Text>

        <TextInput
          onChangeText={setProfileId}
          placeholder="ID do perfil avaliado"
          style={styles.input}
          value={profileId}
        />

        <TextInput
          multiline
          numberOfLines={4}
          onChangeText={setComment}
          placeholder="Relato"
          style={[styles.input, styles.multiline]}
          value={comment}
        />

        <View style={styles.voiceRow}>
          <Pressable
            accessibilityLabel={
              voiceStatus === 'recording' ? 'Parar gravação' : 'Transcrever relato por voz'
            }
            accessibilityRole="button"
            accessibilityState={{ disabled: voiceStatus === 'processing' }}
            disabled={voiceStatus === 'processing'}
            onPress={toggleVoiceRecognition}
            style={({ pressed }) => [
              styles.voiceButton,
              voiceStatus === 'recording' && styles.voiceButtonRecording,
              pressed && styles.voiceButtonPressed,
            ]}
          >
            <Text style={styles.voiceIcon}>{voiceStatus === 'recording' ? '■' : '🎙️'}</Text>
            <Text style={styles.voiceButtonText}>
              {voiceStatus === 'recording'
                ? 'Gravando...'
                : voiceStatus === 'processing'
                  ? 'Transcrevendo...'
                  : 'Falar relato'}
            </Text>
          </Pressable>
          {voiceMessage ? <Text style={styles.voiceMessage}>{voiceMessage}</Text> : null}
        </View>

        <Button title="Enviar avaliação" onPress={handleSubmit} disabled={!profileId || !comment} />
      </Card>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8fafc',
    flexGrow: 1,
    padding: 16,
  },
  title: {
    color: '#101828',
    fontSize: 20,
    fontWeight: '700',
  },
  help: {
    color: '#475467',
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    borderColor: '#d0d5dd',
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  multiline: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  voiceRow: {
    alignItems: 'flex-start',
    gap: 6,
  },
  voiceButton: {
    alignItems: 'center',
    backgroundColor: '#101010',
    borderColor: '#D4AF37',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  voiceButtonRecording: {
    backgroundColor: '#332B12',
  },
  voiceButtonPressed: {
    opacity: 0.75,
  },
  voiceButtonText: {
    color: '#D4AF37',
    fontSize: 14,
    fontWeight: '600',
  },
  voiceIcon: {
    color: '#D4AF37',
    fontSize: 16,
  },
  voiceMessage: {
    color: '#8A5D00',
    fontSize: 12,
  },
})
