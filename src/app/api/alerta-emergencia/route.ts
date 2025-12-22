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

    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: 'Localização não informada' },
        { status: 400 }
      )
    }

    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')

    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Usuária inválida' },
        { status: 401 }
      )
    }

    const { data: contatos, error: contatosError } = await supabase
      .from('contatos_emergencia')
      .select('telefone')
      .eq('user_id', user.id)

    if (contatosError || !contatos || contatos.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum contato de emergência cadastrado' },
        { status: 400 }
      )
    }

    // ✅ TEMPLATE STRING CORRETA
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
