import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import twilio from 'twilio'

export async function POST(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { latitude, longitude, tipo } = await req.json()

    if (!latitude || !longitude) {
      return NextResponse.json({ error: 'Localização inválida' }, { status: 400 })
    }

    // Buscar contatos ativos
    const { data: contatos, error } = await supabase
      .from('contatos_emergencia')
      .select('nome, telefone')
      .eq('user_id', user.id)
      .eq('ativo', true)

    if (error || !contatos || contatos.length === 0) {
      return NextResponse.json({ error: 'Nenhum contato ativo encontrado' }, { status: 400 })
    }

    // Twilio
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    )

    const mensagem = `
🚨 ALERTA DE SEGURANÇA 🚨

Uma pessoa que confia em você acionou o MODO ENCONTRO SEGURO.

📍 Localização:
https://maps.google.com/?q=${latitude},${longitude}

⚠️ Tipo: ${tipo === 'manual' ? 'Emergência Manual' : 'Tempo Expirado'}
`

    for (const contato of contatos) {
      await client.messages.create({
        from: process.env.TWILIO_PHONE_NUMBER!,
        to: contato.telefone,
        body: mensagem
      })
    }

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('Erro alerta emergência:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
