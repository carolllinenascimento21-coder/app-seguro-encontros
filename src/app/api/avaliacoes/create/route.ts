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

const getString = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

const getStringArray = (value: unknown) => {
  if (!Array.isArray(value)) return [] as string[]
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
}

function isMissingColumnError(err: any, column: string) {
  const msg = String(err?.message ?? '')
  return (
    msg.includes(`Could not find the '${column}' column`) ||
    msg.includes(`column "${column}" does not exist`) ||
    msg.includes(`does not exist`) && msg.includes(column)
  )
}

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies })

  const {
    data: { session },
    error: authError,
  } = await supabase.auth.getSession()

  const user = session?.user ?? null

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Sessão expirada. Faça login novamente.' },
      { status: 401 }
    )
  }

  const body = await request.json()

  const nome = getString(body.nome ?? body.name)
  const cidade = getString(body.cidade ?? body.city)
  const contato = getString(body.contato)
  const relato = getString(body.relato)
  const anonimo = Boolean(body.anonimo)

  const notas = {
    comportamento: Number(body?.notas?.comportamento ?? body.comportamento ?? 0),
    seguranca_emocional: Number(body?.notas?.seguranca_emocional ?? body.seguranca_emocional ?? 0),
    respeito: Number(body?.notas?.respeito ?? body.respeito ?? 0),
    carater: Number(body?.notas?.carater ?? body.carater ?? 0),
    confianca: Number(body?.notas?.confianca ?? body.confianca ?? 0),
  }

  const flags_positive = getStringArray(body.flags_positive ?? body.is_positive ?? body.greenFlags)
  const flags_negative = getStringArray(body.flags_negative ?? body.is_negative ?? body.redFlags)

  if (!nome) {
    return NextResponse.json({ error: 'Nome é obrigatório.' }, { status: 400 })
  }
  // cidade pode ser opcional se sua tabela não tiver a coluna/fluxo ainda
  // mas usaremos para melhorar dedupe quando existir
  const normalizedName = normalize(nome)
  const normalizedCity = cidade ? normalize(cidade) : ''

  // 1) Tenta localizar perfil existente
  let maleProfileId: string | null = null

  // Preferência: lookup por normalized_* (geralmente existe)
  const lookup = await supabase
    .from('male_profiles')
    .select('id')
    .eq('normalized_name', normalizedName)
    .eq('normalized_city', normalizedCity || normalizedCity) // se vazio, ainda funciona se você usar "" no banco
    .maybeSingle()

  if (lookup.error) {
    // fallback: se normalized_city não existir ou der problema no cache, tenta só normalized_name
    const lookup2 = await supabase
      .from('male_profiles')
      .select('id')
      .eq('normalized_name', normalizedName)
      .maybeSingle()

    if (lookup2.error) {
      console.error('[api/avaliacoes/create] Erro ao buscar perfil:', lookup2.error)
      return NextResponse.json(
        { error: 'Erro ao criar ou localizar perfil avaliado.' },
        { status: 400 }
      )
    }

    maleProfileId = lookup2.data?.id ?? null
  } else {
    maleProfileId = lookup.data?.id ?? null
  }

  // 2) Se não existir, cria perfil (SEM enviar normalized_* para não quebrar GENERATED ALWAYS)
  if (!maleProfileId) {
    // Tenta inserir com { nome, cidade, created_by }
    // Se 'cidade' não existir no schema, retry sem cidade
    const insertTry1 = await supabase
      .from('male_profiles')
      .insert({
        nome,
        cidade: cidade || null,
        created_by: user.id,
      })
      .select('id')
      .single()

    if (insertTry1.error) {
      // Se coluna cidade não existe, retry
      if (isMissingColumnError(insertTry1.error, 'cidade')) {
        const insertTry2 = await supabase
          .from('male_profiles')
          .insert({
            nome,
            created_by: user.id,
          })
          .select('id')
          .single()

        if (insertTry2.error || !insertTry2.data) {
          console.error('[api/avaliacoes/create] Erro ao inserir perfil (sem cidade):', insertTry2.error)
          return NextResponse.json(
            { error: insertTry2.error?.message ?? 'Erro ao criar perfil avaliado.' },
            { status: 400 }
          )
        }

        maleProfileId = insertTry2.data.id
      } else {
        // Se a coluna 'nome' não existir, aqui você precisa ajustar o schema (ou mudar o insert).
        console.error('[api/avaliacoes/create] Erro ao inserir perfil:', insertTry1.error)
        return NextResponse.json(
          { error: insertTry1.error?.message ?? 'Erro ao criar perfil avaliado.' },
          { status: 400 }
        )
      }
    } else {
      maleProfileId = insertTry1.data.id
    }
  }

  if (!maleProfileId) {
    return NextResponse.json({ error: 'Erro ao criar perfil avaliado.' }, { status: 400 })
  }

  // 3) Cria avaliação
  const avaliacaoPayload = {
    male_profile_id: maleProfileId,
    contato: contato || null,
    relato: relato || null,
    anonimo,
    comportamento: notas.comportamento,
    seguranca_emocional: notas.seguranca_emocional,
    respeito: notas.respeito,
    carater: notas.carater,
    confianca: notas.confianca,
    flags_positive,
    flags_negative,
  }

  // tenta author_id, fallback autor_id
  const insertA1 = await supabase
    .from('avaliacoes')
    .insert({ ...avaliacaoPayload, author_id: user.id })
    .select('id')
    .single()

  if (insertA1.error) {
    const shouldRetryWithAutorId = /author_id/i.test(insertA1.error.message)

    if (!shouldRetryWithAutorId) {
      console.error('[api/avaliacoes/create] Erro ao inserir avaliação (author_id):', insertA1.error)
      return NextResponse.json(
        { error: insertA1.error.message ?? 'Erro ao publicar avaliação.' },
        { status: 400 }
      )
    }

    const insertA2 = await supabase
      .from('avaliacoes')
      .insert({ ...avaliacaoPayload, autor_id: user.id })
      .select('id')
      .single()

    if (insertA2.error || !insertA2.data) {
      console.error('[api/avaliacoes/create] Erro ao inserir avaliação (autor_id):', insertA2.error)
      return NextResponse.json(
        { error: insertA2.error?.message ?? 'Erro ao publicar avaliação.' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      ok: true,
      male_profile_id: maleProfileId,
      avaliacao_id: insertA2.data.id,
    })
  }

  return NextResponse.json({
    ok: true,
    male_profile_id: maleProfileId,
    avaliacao_id: insertA1.data.id,
  })
}
