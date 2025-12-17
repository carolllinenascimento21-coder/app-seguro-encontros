'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'

export default function SelfieOnboardingPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const handleUpload = async () => {
    if (!file) {
      setError('Envie uma selfie para continuar.')
      return
    }

    setError('')
    setUploading(true)

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setError('Não foi possível identificar o usuário autenticado.')
      setUploading(false)
      return
    }

    const fileExt = file.name.split('.').pop()
    const filePath = `${user.id}/${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('selfies')
      .upload(filePath, file, { upsert: true })

    if (uploadError) {
      setError('Falha ao enviar selfie. Tente novamente.')
      setUploading(false)
      return
    }

    const { data: publicUrl } = supabase.storage
      .from('selfies')
      .getPublicUrl(filePath)

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email,
        selfie_url: publicUrl.publicUrl,
        selfie_verified: false,
        onboarding_completed: false,
      })

    if (profileError) {
      setError('Não foi possível registrar a selfie. Tente novamente.')
      setUploading(false)
      return
    }

    setUploading(false)
    router.push('/verification-pending')
  }

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Envie sua selfie</h1>
          <p className="text-muted-foreground">
            Precisamos validar sua identidade para manter a comunidade segura.
          </p>
        </div>

        <div className="p-6 border border-[#D4AF37]/30 rounded-2xl bg-white/5 space-y-4">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full bg-[#D4AF37] text-black"
          >
            {uploading ? 'Enviando...' : 'Enviar selfie'}
          </Button>
        </div>
      </div>
    </main>
  )
}
