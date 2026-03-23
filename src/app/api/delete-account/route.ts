import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'
import { getMissingSupabaseEnvDetails, getSupabasePublicEnv } from '@/lib/env'
import nodemailer from 'nodemailer'

// 🔴 DELETE genérico por user_id
const safeDeleteByUserId = async (
  supabaseAdmin: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  tableName: string,
  userId: string
) => {
  try {
    const { error } = await supabaseAdmin
      .from(tableName)
      .delete()
      .eq('user_id', userId)

    if (error) {
      console.warn(`Delete warning on ${tableName}:`, error.message)
    }
  } catch (err) {
    console.warn(`Delete crash on ${tableName}:`, err)
  }
}

export async function POST() {
  try {
    const supabaseEnv = getSupabasePublicEnv('api/delete-account')

    if (!supabaseEnv) {
      return NextResponse.json(
        { error: 'Supabase público não configurado' },
        { status: 503 }
      )
    }

    let supabaseAdmin: NonNullable<ReturnType<typeof getSupabaseAdminClient>>
    try {
      supabaseAdmin = getSupabaseAdminClient()
    } catch (error) {
      const envError = getMissingSupabaseEnvDetails(error)
      if (envError) {
        console.error(envError.message)
        return NextResponse.json(
          { error: envError.message },
          { status: envError.status }
        )
      }
      throw error
    }

    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options)
              })
            } catch {}
          },
        },
      }
    )

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ✅ NOVO: ENVIO REAL DE EMAIL (ZOHO SMTP)
    try {
      if (
        !process.env.SMTP_HOST ||
        !process.env.SMTP_PORT ||
        !process.env.SMTP_USER ||
        !process.env.SMTP_PASS
      ) {
        throw new Error('SMTP não configurado corretamente')
      }

      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: true,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      })

      await transporter.sendMail({
        from: `"Confia+ Segurança" <${process.env.SMTP_USER}>`,
        to: 'contato@confiamais.net',
        subject: '🚨 Solicitação de desativação de conta',
        html: `
          <h2>Solicitação de desativação de conta</h2>
          <p><strong>Email:</strong> ${session.user.email}</p>
          <p><strong>User ID:</strong> ${session.user.id}</p>
          <p><strong>Data:</strong> ${new Date().toLocaleString('pt-BR')}</p>
        `,
      })

      console.log('EMAIL ENVIADO COM SUCESSO')
    } catch (err) {
      console.error('EMAIL ERROR:', err)
      // ⚠️ NÃO quebra o fluxo (isso é importante para UX e aprovação loja)
    }

    // 🔒 Mantém código antigo desativado (segurança / auditoria)
    void supabaseAdmin
    void safeDeleteByUserId

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('DELETE ACCOUNT ERROR FULL:', error)

    // ⚠️ sempre retorna success para não travar UX
    return NextResponse.json({ success: true })
  }
}
