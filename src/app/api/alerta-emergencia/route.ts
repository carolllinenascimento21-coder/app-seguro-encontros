import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import twilio from 'twilio'

export async function POST(req: Request) {
  try {
    const { latitude, longitude } = await req.json()

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return NextResponse.json(
        { error: 'Localização inválida' },
        { status: 400 }
      )
    }

    // ✅ Supabase Server Client (App Router correto)
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

    // ✅ Usuária autenticada pela sessão
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Usuária não autenticada' },
        { status: 401 }
      )
    }

    // ⚠️ Confirme o nome da tabela e colunas
    const { data: contatos, error: contatosError } = await supabase
      .from('emergency_contacts')
      .select('telefone')
      .eq('user_id', user.id)
      .eq('ativo', true)

    if (contatosError) {
      console.error('Erro ao buscar contatos:', contatosError)
      return NextResponse.json(
        { error: 'Erro ao buscar contatos de emergência' },
        { status: 500 }
      )
    }

    if (!contatos || contatos.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum contato de emergência ativo' },
        { status: 400 }
      )
    }

    // ✅ Twilio Client
    const twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    )

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
    console.error('ERRO ALERTA EMERGÊNCIA:', error)
    return NextResponse.json(
      { error: 'Erro interno ao enviar alerta' },
      { status: 500 }
    )
  }
}
