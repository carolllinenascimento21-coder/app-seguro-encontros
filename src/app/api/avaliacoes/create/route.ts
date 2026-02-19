import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

function normalize(text: string) {
  return text
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

const getString = (value: unknown) =>
  typeof value === 'string' ? value.trim() : ''

const getStringArray = (value: unknown) => {
  if (!Array.isArray(value)) return [] as string[]
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
      { error: 'Sessão expirada.' },
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

  const flags_positive = getStringArray(body.greenFlags)
  const flags_negative = getStringArray(body.redFlags)

  const comportamento = Number(body.comportamento ?? 0)
  const seguranca_emocional = Number(body.seguranca_emocional ?? 0)
  const respeito = Number(body.respeito ?? 0)
  const carater = Number(body.carater ?? 0)
  const confianca = Number(body.confianca ?? 0)

  if (!nome) {
    return NextResponse.json(
      { error: 'Nome é obrigatório.' },
      { status: 400 }
    )
  }

  const normalizedName = normalize(nome)
  const normalizedCity = cidade ? normalize(cidade) : ''

  // 🔎 BUSCA PERFIL EXISTENTE
  const { data: existing } = await supabase
    .from('male_profiles')
    .select('id')
    .eq('normalized_name', normalizedName)
    .eq('normalized_city', normalizedCity)
    .maybeSingle()

  let maleProfileId = existing?.id ?? null

  // ➕ CRIA PERFIL SE NÃO EXISTIR
  if (!maleProfileId) {
    const { data: inserted, error } = await supabase
      .from('male_profiles')
      .insert({
        display_name: nome,                // 🔥 obrigatório
        cidade: cidade || null,
        normalized_name: normalizedName,
        normalized_city: normalizedCity,
        created_by: user.id,
      })
      .select('id')
      .single()

    if (error || !inserted) {
      console.error(error)
      return NextResponse.json(
        { error: error?.message ?? 'Erro ao criar perfil.' },
        { status: 400 }
      )
    }

    maleProfileId = inserted.id
  }

  // ➕ CRIA AVALIAÇÃO
  const { data: avaliacao, error: avaliacaoError } =
    await supabase
      .from('avaliacoes')
      .insert({
        male_profile_id: maleProfileId,
        contato: contato || null,
        relato: relato || null,
        anonimo,
        comportamento,
        seguranca_emocional,
        respeito,
        carater,
        confianca,
        flags_positive,
        flags_negative,
        autora_id: user.id, // ✅ sua tabela usa autora_id
      })
      .select('id')
      .single()

  if (avaliacaoError) {
    console.error(avaliacaoError)
    return NextResponse.json(
      { error: avaliacaoError.message },
      { status: 400 }
    )
  }

  return NextResponse.json({
    ok: true,
    male_profile_id: maleProfileId,
    avaliacao_id: avaliacao.id,
  })
}
