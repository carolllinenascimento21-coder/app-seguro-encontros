'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type UserInfo = {
  id: string
  email: string | null
}

export default function OnboardingSelfiePage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [user, setUser] = useState<UserInfo | null>(null)
  const [loadingUser, setLoadingUser] = useState(true)

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user: authenticatedUser },
      } = await supabase.auth.getUser()

      setUser(authenticatedUser ? { id: authenticatedUser.id, email: authenticatedUser.email } : null)
      setLoadingUser(false)
    }

    loadUser()
  }, [])

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile && !selectedFile.type.startsWith('image/')) {
      setError('Envie uma imagem válida (jpeg ou png).')
      setFile(null)
      return
    }

    setError('')
    setFile(selectedFile ?? null)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!user) {
      setError('Você precisa estar autenticada para enviar a selfie.')
      return
    }

    if (!file) {
      setError('Envie uma selfie para continuar.')
      return
    }

    setIsUploading(true)
    setError('')

    const fileExt = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const filePath = `${user.id}/${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('selfie-verifications')
      .upload(filePath, file, { upsert: true })

    if (uploadError) {
      setError('Não foi possível salvar sua selfie. Tente novamente.')
      setIsUploading(false)
      return
    }

    const selfieUrl =
      supabase.storage.from('selfie-verifications').getPublicUrl(filePath).data.publicUrl || filePath

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email,
        selfie_url: selfieUrl,
        selfie_verified: false,
      })

    if (profileError) {
      setError('Não foi possível atualizar seu perfil. Tente novamente.')
      setIsUploading(false)
      return
    }

    router.push('/verification-pending')
    setIsUploading(false)
  }

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Carregando...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-[#D4AF37]">Envie sua selfie</h1>
          <p className="text-sm text-gray-300">
            Para sua segurança, precisamos da sua selfie antes de continuar. O envio não aprova sua verificação automaticamente.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 bg-[#0A0A0A] border border-[#D4AF37]/30 rounded-2xl p-6 shadow-xl">
          <div className="space-y-2">
            <Label htmlFor="selfie">Selecione uma foto nítida do seu rosto</Label>
            <Input
              id="selfie"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={isUploading}
            />
            <p className="text-xs text-gray-400">Formatos aceitos: jpg, jpeg ou png.</p>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <Button type="submit" className="w-full" disabled={isUploading}>
            {isUploading ? 'Enviando selfie...' : 'Enviar selfie e continuar'}
          </Button>
        </form>
      </div>
    </div>
  )
}
