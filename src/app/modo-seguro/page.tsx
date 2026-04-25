'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, PhoneCall, X } from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabase'

const supabase = createSupabaseClient()

type EmergencyContact = {
  id: string
  nome: string | null
  telefone: string | null
  ativo: boolean | null
}

function normalizePhoneForWhatsApp(phone: string | null | undefined) {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  return digits.length >= 10 ? digits : null
}

function getValidEmergencyTargets(contacts: EmergencyContact[]) {
  return contacts
    .map((contact) => ({
      phone: normalizePhoneForWhatsApp(contact.telefone),
      nome: contact.nome?.trim() || 'contato de confiança',
    }))
    .filter((contact): contact is { phone: string; nome: string } => Boolean(contact.phone))
    .slice(0, 3)
}

export default function ModoSeguroPage() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [contacts, setContacts] = useState<EmergencyContact[]>([])
  const [showEmergencyModal, setShowEmergencyModal] = useState(false)
  const [sendingAlert, setSendingAlert] = useState(false)
  const [alertError, setAlertError] = useState<string | null>(null)
  const [alertSuccess, setAlertSuccess] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      if (!supabase) {
        setAlertError('Serviço indisponível no momento. Tente novamente em instantes.')
        return
      }

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session?.user) {
        const { data } = await supabase
          .from('emergency_contacts')
          .select('id,nome,telefone,ativo')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })

        setContacts((data || []).filter((contact) => contact.ativo !== false))
      }

      if (!navigator.geolocation) {
        setAlertError('Geolocalização não suportada neste dispositivo.')
        return
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          })
        },
        () => {
          setAlertError('Não foi possível obter a localização.')
        }
      )
    }

    load()
  }, [])

  const openEmergencyModal = () => {
    if (sendingAlert) {
      return
    }

    setAlertError(null)
    setAlertSuccess(null)
    setShowEmergencyModal(true)
  }

  const closeEmergencyModal = () => {
    if (sendingAlert) {
      return
    }

    setShowEmergencyModal(false)
  }

  const sendEmergencyAlert = async () => {
    if (sendingAlert) {
      return
    }

    try {
      setSendingAlert(true)
      setAlertError(null)
      setAlertSuccess(null)

      if (!supabase) {
        setAlertError('Serviço indisponível no momento. Tente novamente em instantes.')
        return
      }

      if (!coords) {
        setAlertError('Localização indisponível. Ative o GPS e tente novamente.')
        return
      }

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        setAlertError('Usuária não autenticada. Faça login novamente para reenviar o alerta.')
        return
      }

      const validPhones = getValidEmergencyTargets(contacts)

      if (validPhones.length === 0) {
        setAlertError('Cadastre ao menos 1 contato com telefone válido no seu perfil.')
        return
      }

      const primaryContact = validPhones[0]!

      const mapsGoogle = `https://maps.google.com/?q=${coords.lat},${coords.lng}`
      const mensagem =
        `Oi ${primaryContact.nome}, preciso de ajuda agora.\n` +
        `📍 ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}\n` +
        `Mapa: ${mapsGoogle}\n` +
        `https://www.confiamais.net/modo-seguro`

      const primaryPhone = primaryContact.phone
      const encodedText = encodeURIComponent(mensagem)
      const deepLink = `whatsapp://send?phone=${primaryPhone}&text=${encodedText}`
      const fallbackLink = `https://wa.me/${primaryPhone}?text=${encodedText}`

      window.location.href = deepLink
      setTimeout(() => {
        window.open(fallbackLink, '_blank', 'noopener,noreferrer')
      }, 800)

      const remaining = validPhones.length - 1
      setAlertSuccess(
        remaining > 0
          ? `WhatsApp aberto para o primeiro contato. Reenvie para avisar os outros ${remaining} contato(s).`
          : 'WhatsApp aberto com sua mensagem de localização.'
      )

      setShowEmergencyModal(false)
    } catch {
      setAlertError('Erro inesperado ao enviar alerta. Verifique sua conexão e tente novamente.')
    } finally {
      setSendingAlert(false)
    }
  }

  const callEmergencyContact = () => {
    const validPhones = getValidEmergencyTargets(contacts)
    if (validPhones.length === 0) {
      setAlertError('Cadastre ao menos 1 contato com telefone válido no seu perfil.')
      return
    }

    window.location.href = `tel:${validPhones[0]!.phone}`
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 text-white">
      <div className="max-w-md w-full space-y-4">
        <div className="border border-green-600 rounded-xl p-4 text-center">
          <h1 className="text-green-500 font-bold text-lg">Modo Encontro Seguro</h1>
          <p className="text-sm text-gray-400 mt-1">
            Sua localização será enviada aos contatos se você estiver em risco.
          </p>

          {coords && (
            <p className="mt-2 text-xs text-gray-500">
              📍 {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
            </p>
          )}
        </div>

        {alertSuccess && (
          <div className="bg-green-900/40 text-green-300 text-sm p-3 rounded-lg">{alertSuccess}</div>
        )}

        {alertError && !showEmergencyModal && (
          <div className="bg-red-900/40 text-red-300 text-sm p-3 rounded-lg">
            {alertError} Toque em “🚨 ESTOU EM RISCO” para tentar novamente.
          </div>
        )}

        <button
          disabled={sendingAlert}
          onClick={openEmergencyModal}
          className="w-full bg-red-600 hover:bg-red-700 py-3 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sendingAlert ? 'Enviando alerta...' : '🚨 ESTOU EM RISCO'}
        </button>

        {showEmergencyModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-[#0b1220] border border-red-600 rounded-2xl p-6 w-full max-w-sm space-y-4">
              <div className="flex items-center gap-2 text-red-500 font-bold">
                <AlertTriangle />
                Emergência
              </div>

              <p className="text-sm text-gray-200">Isso vai alertar seus contatos. Confirmar?</p>

              {alertError && (
                <div className="bg-red-900/40 text-red-300 text-sm p-2 rounded">
                  {alertError}
                  <div className="mt-1">Toque em “Tentar novamente”.</div>
                </div>
              )}

              <a
                href="tel:190"
                className="w-full bg-red-600 text-center py-3 rounded-lg flex items-center justify-center gap-2 font-bold"
              >
                <PhoneCall size={16} />
                Ligar 190 (Polícia)
              </a>

              <button
                type="button"
                disabled={sendingAlert}
                onClick={callEmergencyContact}
                className="w-full bg-[#172036] hover:bg-[#1d2945] text-white py-3 rounded-lg flex items-center justify-center gap-2 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Ligar Contato Emergência
              </button>

              <button
                disabled={sendingAlert}
                onClick={sendEmergencyAlert}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sendingAlert ? 'Abrindo WhatsApp...' : 'Mensagem Contato Emergência'}
              </button>

              <button
                disabled={sendingAlert}
                onClick={closeEmergencyModal}
                className="w-full border border-gray-600 py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <X size={16} />
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
