import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

const getString = (value: unknown) =>
  typeof value === 'string' ? value.trim() : ''

const getStringArray = (value: unknown) => {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
}

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json(
      { error: 'Sessão expirada. Faça login novamente.' },
      { status: 401 }
    )
  }

  const user = session.user
  const body = await request.json()

  const nome = getString(body.nome ?? body.name)
  const cidade = getString(body.cidade ?? body.city)
  const contato = getString(body.contato)
  const relato = getString(body.relato)
  const anonimo = Boolean(body.anonimo)

  if (!nome) {
    return NextResponse.json(
      { error: 'Nome é obrigatório.' },
      { status: 400 }
    )
  }

  // 🔹 1. Busca perfil existente pelo nome + cidade
  const { data: existingProfile } = await supabase
    .from('male_profiles')
    .select('id')
    .eq('nome', nome)
    .eq('cidade', cidade || null)
    .maybeSingle()

  let maleProfileId = existingProfile?.id ?? null

  // 🔹 2. Se não existir, cria perfil corretamente
  if (!maleProfileId) {
    const { data: newProfile, error: profileError } = await supabase
      .from('male_profiles')
      .insert({
        nome,
        cidade: cidade || null,
        display_name: nome,      // 🔥 ESSENCIAL (campo NOT NULL)
        autora_id: user.id       // 🔥 coluna correta do seu banco
      })
      .select('id')
      .single()

    if (profileError || !newProfile) {
      console.error('Erro ao criar perfil:', profileError)
      return NextResponse.json(
        { error: profileError?.message ?? 'Erro ao criar perfil.' },
        { status: 400 }
      )
    }

    maleProfileId = newProfile.id
  }

  // 🔹 3. Cria avaliação
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
      flags_positive: getStringArray(body.flags_positive ?? body.greenFlags),
      flags_negative: getStringArray(body.flags_negative ?? body.redFlags),
      autora_id: user.id
    })
    .select('id')
    .single()

  if (avaliacaoError || !avaliacao) {
    console.error('Erro ao criar avaliação:', avaliacaoError)
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
