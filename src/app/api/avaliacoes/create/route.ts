import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

function getString(value: unknown) {
  if (typeof value !== 'string') return ''
  return value.trim()
}

function getStringArray(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.filter((v): v is string => typeof v === 'string')
}

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.user) {
    return NextResponse.json(
      { error: 'Sessão expirada. Faça login novamente.' },
      { status: 401 }
    )
  }

  const user = session.user
  const body = await request.json()

  const nome = getString(body.nome ?? body.name)
  const cidade = getString(body.cidade)
  const contato = getString(body.contato)
  const relato = getString(body.relato)
  const anonimo = Boolean(body.anonimo)

  if (!nome || !cidade) {
    return NextResponse.json(
      { error: 'Nome e cidade são obrigatórios.' },
      { status: 400 }
    )
  }

  // 🔎 Buscar perfil existente usando name + cidade
  const { data: existingProfile } = await supabase
    .from('male_profiles')
    .select('id')
    .eq('name', nome)
    .eq('cidade', cidade)
    .maybeSingle()

  let maleProfileId = existingProfile?.id ?? null

  // 🆕 Criar perfil se não existir
  if (!maleProfileId) {
    const { data: insertedProfile, error } = await supabase
      .from('male_profiles')
      .insert({
        name: nome,
        cidade: cidade,
        created_by: user.id,
      })
      .select('id')
      .single()

    if (error || !insertedProfile) {
      return NextResponse.json(
        { error: error?.message ?? 'Erro ao criar perfil.' },
        { status: 400 }
      )
    }

    maleProfileId = insertedProfile.id
  }

  // ⭐ Criar avaliação
  const { data: avaliacao, error: avaliacaoError } = await supabase
    .from('avaliacoes')
    .insert({
      male_profile_id: maleProfileId,
      contato: contato || null,
      relato: relato || null,
      anonimo,
      comportamento: Number(body.comportamento ?? 0),
      seguranca_emocional: Number(body.seguranca_emocional ?? 0),
      respeito: Number(body.respeito ?? 0),
      carater: Number(body.carater ?? 0),
      confianca: Number(body.confianca ?? 0),
      flags_positive: getStringArray(body.greenFlags),
      flags_negative: getStringArray(body.redFlags),
      autor_id: user.id,
    })
    .select('id')
    .single()

  if (avaliacaoError || !avaliacao) {
    return NextResponse.json(
      { error: avaliacaoError?.message ?? 'Erro ao publicar avaliação.' },
      { status: 400 }
    )
  }

  return NextResponse.json({
    ok: true,
    male_profile_id: maleProfileId,
    avaliacao_id: avaliacao.id,
  })
}
