import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function POST() {
  try {
    // ✅ Supabase Server Client (App Router moderno)
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll: () => cookies().getAll(),
          setAll: () => {}
        }
      }
    )

    // ✅ Usuária autenticada via cookie
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const filePath = `${user.id}/selfie.jpg`

    // ✅ Baixa a selfie do bucket privado
    const { data: file, error: downloadError } = await supabase.storage
      .from('selfie-verifications')
      .download(filePath)

    if (downloadError || !file) {
      return NextResponse.json(
        { error: 'Selfie não encontrada. Envie novamente.' },
        { status: 400 }
      )
    }

    // ✅ Validação mínima (Nível 1 – simples)
    const buffer = Buffer.from(await file.arrayBuffer())

    if (buffer.byteLength < 10_000) {
      return NextResponse.json(
        { error: 'Selfie inválida ou muito pequena.' },
        { status: 422 }
      )
    }

    // 🔒 Aqui entra IA futuramente (Google Vision, etc.)

    // ✅ Marca perfil como verificado
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        selfie_verified: true,
        selfie_verified_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      return NextResponse.json(
        { error: 'Falha ao atualizar status de verificação.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      status: 'verified'
    })

  } catch (error) {
    console.error('Erro verify-selfie:', error)
    return NextResponse.json(
      { error: 'Erro interno ao verificar selfie.' },
      { status: 500 }
    )
  }
}
