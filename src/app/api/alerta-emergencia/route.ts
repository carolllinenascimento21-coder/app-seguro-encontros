import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import twilio from 'twilio'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
)

export async function POST(req: Request) {
  try {
    const { latitude, longitude } = await req.json()

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return NextResponse.json(
        { error: 'Localização inválida' },
        { status: 400 }
      )
    }

    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token não enviado' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')

    // ✅ VALIDA USUÁRIA PELO TOKEN (ADMIN)
    const { data: userData, error: userError } =
      await supabase.auth.getUser(token)

    if (userError || !userData?.user) {
      return NextResponse.json(
        { error: 'Usuária não autenticada' },
        { status: 401 }
      )
    }

    const userId = userData.user.id

    // ⚠️ CONFIRME O NOME REAL DA TABELA
    const { data: contatos, error: contatosError } = await supabase
      .from('emergency_contacts')
      .select('telefone')
      .eq('user_id', userId)
      .eq('ativo', true)

    if (contatosError || !contatos || contatos.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum contato de emergência ativo' },
        { status: 400 }
      )
    }

    const mensagem = `🚨 ALERTA DE EMERGÊNCIA 🚨
Estou em risco e preciso de ajuda.

📍 Minha localização:
https://maps.google.com/?q=${latitude},${longitude}`

    for (const contato of contatos) {
      await twilioClient.messages.create({
        body: mensagem,
        from: process.env.TWILIO_PHONE_NUMBER!,
        to: contato.telefone
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro alerta emergência:', error)
    return NextResponse.json(
      { error: 'Erro interno ao enviar alerta' },
      { status: 500 }
    )
  }
}
