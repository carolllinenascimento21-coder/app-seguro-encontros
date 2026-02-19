import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

const getString = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
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
    (msg.includes('does not exist') && msg.includes(column))
  )
}

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies })

  const { data: { session }, error: authError } = await supabase.auth.getSession()
  const user = session?.user ?? null

  if (authError || !user) {
    return NextResponse.json({ error: 'Sessão expirada. Faça login novamente.' }, { status: 401 })
  }

  const body = await request.json()

  const nome = getString(body.nome ?? body.name)
  const cidade = getString(body.cidade ?? body.city)
  const contato = getString(body.contato ?? body.telefone ?? body.phone)
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

  // =========================================================
  // 1) ACHAR / CRIAR male_profile_id (ALINHADO AO SCHEMA)
  // - male_profiles.display_name é NOT NULL (print)
  // - autora_id / cidade podem existir ou não (fallback)
  // =========================================================

  let maleProfileId: string | null = null

  // Tenta dedupe por display_name + cidade (se cidade existir)
  // (se cidade não existir no schema cache, cai no fallback)
  const lookup1 = await supabase
    .from('male_profiles')
    .select('id')
    .ilike('display_name', nome)
    .eq('cidade', cidade || '')
    .maybeSingle()

  if (!lookup1.error) {
    maleProfileId = lookup1.data?.id ?? null
  } else {
    // Se a coluna cidade não existir, tenta sem cidade
    const lookup2 = await supabase
      .from('male_profiles')
      .select('id')
      .ilike('display_name', nome)
      .maybeSingle()

    if (lookup2.error) {
      console.error('[api/avaliacoes/create] Erro ao buscar perfil:', lookup2.error)
      return NextResponse.json({ error: 'Erro ao criar ou localizar perfil avaliado.' }, { status: 400 })
    }

    maleProfileId = lookup2.data?.id ?? null
  }

  if (!maleProfileId) {
    // Monta insert base SEMPRE com display_name (NOT NULL)
    // (nome/telefone/cidade/autora_id: tenta e faz fallback se não existir)
    const baseInsert: Record<string, any> = {
      display_name: nome,   // <- crucial para não violar NOT NULL
      nome: nome,
      telefone: contato || null,
      cidade: cidade || null,
      autora_id: user.id,
    }

    // 1ª tentativa: com tudo
    let insert = await supabase
      .from('male_profiles')
      .insert(baseInsert)
      .select('id')
      .single()

    // fallback se autora_id não existir
    if (insert.error && isMissingColumnError(insert.error, 'autora_id')) {
      const { autora_id, ...withoutAutora } = baseInsert
      insert = await supabase
        .from('male_profiles')
        .insert(withoutAutora)
        .select('id')
        .single()
    }

    // fallback se cidade não existir
    if (insert.error && isMissingColumnError(insert.error, 'cidade')) {
      const { cidade: _cidade, ...withoutCidade } = baseInsert
      insert = await supabase
        .from('male_profiles')
        .insert(withoutCidade)
        .select('id')
        .single()
    }

    // fallback se telefone não existir
    if (insert.error && isMissingColumnError(insert.error, 'telefone')) {
      const { telefone, ...withoutTelefone } = baseInsert
      insert = await supabase
        .from('male_profiles')
        .insert(withoutTelefone)
        .select('id')
        .single()
    }

    // Se ainda falhar, loga e retorna
    if (insert.error || !insert.data) {
      console.error('[api/avaliacoes/create] Erro ao inserir male_profiles:', insert.error)
      return NextResponse.json(
        { error: insert.error?.message ?? 'Erro ao criar perfil avaliado.' },
        { status: 400 }
      )
    }

    maleProfileId = insert.data.id
  }

  // =========================================================
  // 2) INSERIR AVALIACAO (alinhado ao schema: autor_id)
  // =========================================================
  const avaliacaoPayload: Record<string, any> = {
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
    autor_id: user.id, // <- pelo seu print existe autor_id
  }

  // tenta inserir com flags_positive/flags_negative;
  // se schema antigo não tiver, tenta fallback para "flags" (unificado)
  let insertA = await supabase
    .from('avaliacoes')
    .insert(avaliacaoPayload)
    .select('id')
    .single()

  if (insertA.error && (isMissingColumnError(insertA.error, 'flags_positive') || isMissingColumnError(insertA.error, 'flags_negative'))) {
    const { flags_positive: _fp, flags_negative: _fn, ...rest } = avaliacaoPayload
    insertA = await supabase
      .from('avaliacoes')
      .insert({
        ...rest,
        flags: [...flags_positive, ...flags_negative],
      })
      .select('id')
      .single()
  }

  if (insertA.error || !insertA.data) {
    console.error('[api/avaliacoes/create] Erro ao inserir avaliação:', insertA.error)
    return NextResponse.json(
      { error: insertA.error?.message ?? 'Erro ao publicar avaliação.' },
      { status: 400 }
    )
  }

  return NextResponse.json({
    ok: true,
    male_profile_id: maleProfileId,
    avaliacao_id: insertA.data.id,
  })
}
