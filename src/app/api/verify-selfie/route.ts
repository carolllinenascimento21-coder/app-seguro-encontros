import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const ACCEPTED_MIME = ['jpeg', 'jpg', 'png']

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies })

  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  let image: unknown
  try {
    ({ image } = await req.json())
  } catch (error) {
    return NextResponse.json({ error: 'Requisição inválida' }, { status: 400 })
  }

  if (typeof image !== 'string' || !image.startsWith('data:image/')) {
    return NextResponse.json({ error: 'Imagem da selfie ausente ou inválida' }, { status: 400 })
  }

  const match = image.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/)
  if (!match) {
    return NextResponse.json({ error: 'Formato de imagem não suportado' }, { status: 400 })
  }

  const extension = match[1]
  if (!ACCEPTED_MIME.includes(extension)) {
    return NextResponse.json({ error: 'Formato de imagem rejeitado' }, { status: 415 })
  }

  const buffer = Buffer.from(match[2], 'base64')
  if (buffer.byteLength < 10_000) {
    return NextResponse.json({ error: 'Selfie muito pequena ou inválida' }, { status: 422 })
  }

  const fileName = `${Date.now()}.${extension === 'jpg' ? 'jpeg' : extension}`
  const filePath = `${session.user.id}/${fileName}`

  const { error: uploadError } = await supabaseAdmin.storage
    .from('selfie-verifications')
    .upload(filePath, buffer, {
      contentType: `image/${extension === 'jpg' ? 'jpeg' : extension}`,
      upsert: false,
    })

  if (uploadError) {
    return NextResponse.json({ error: 'Falha ao armazenar selfie' }, { status: 500 })
  }

  // TODO: substituir esta aprovação direta por uma validação real (ex: IA/biometria)
  const { error: updateError } = await supabaseAdmin
    .from('profiles')
    .update({ selfie_verified: true, selfie_verified_at: new Date().toISOString() })
    .eq('id', session.user.id)

  if (updateError) {
    return NextResponse.json({ error: 'Falha ao atualizar status de verificação' }, { status: 500 })
  }

  return NextResponse.json({ status: 'verified', path: filePath })
}
