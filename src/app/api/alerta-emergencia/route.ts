import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import twilio from 'twilio'
import { getMissingSupabaseEnvDetails, getSupabaseServiceEnv } from '@/lib/env'

export async function POST(req: Request) {
  try {
    const { latitude, longitude } = await req.json()

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return NextResponse.json(
        { error: 'Localização inválida' },
        { status: 400 }
      )
    }

    let supabaseEnv
    try {
      supabaseEnv = getSupabaseServiceEnv('api/alerta-emergencia')
    } catch (error) {
      const envError = getMissingSupabaseEnvDetails(error)
      if (envError) {
        console.error(envError.message)
        return NextResponse.json({ error: envError.message }, { status: envError.status })
      }
      throw error
    }

    if (!supabaseEnv) {
      return NextResponse.json(
        { error: 'Supabase admin não configurado' },
        { status: 503 }
      )
    }

    // ✅ Supabase Server Client (App Router correto)
    const supabase = createServerClient(supabaseEnv.url, supabaseEnv.serviceRoleKey, {
      cookies: {
        getAll: () => cookies().getAll(),
        setAll: () => {},
      },
    })

    const {
      data: { session },
      error: sessionError
    } = await supabase.auth.getSession()

    if (sessionError && sessionError.code !== 'AuthSessionMissingError') {
      return NextResponse.json(
        { error: 'Erro ao carregar sessão' },
        { status: 401 }
      )
    }

    if (!session) {
      return NextResponse.json(
        { error: 'Usuária não autenticada' },
        { status: 401 }
      )
    }

    // ✅ Usuária autenticada pela sessão
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError?.code === 'AuthSessionMissingError' || authError || !user) {
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
    const twilioAccount = process.env.TWILIO_ACCOUNT_SID
    const twilioToken = process.env.TWILIO_AUTH_TOKEN
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER

    if (!twilioAccount || !twilioToken || !twilioPhone) {
      console.error('Twilio não configurado para envio de alertas')
      return NextResponse.json(
        { error: 'Serviço de alerta indisponível' },
        { status: 503 }
      )
    }

    const twilioClient = twilio(twilioAccount, twilioToken)

    const mensagem = `🚨 ALERTA DE EMERGÊNCIA 🚨
Estou em risco e preciso de ajuda.

📍 Minha localização:
https://maps.google.com/?q=${latitude},${longitude}`

    for (const contato of contatos) {
      await twilioClient.messages.create({
        body: mensagem,
        from: twilioPhone,
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
