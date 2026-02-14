import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'

type RatingsPayload = {
  comportamento: unknown
  seguranca_emocional: unknown
  respeito: unknown
  carater: unknown
  confianca: unknown
}

function stripDiacritics(input: string) {
  return input.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function normalizeKey(value: unknown) {
  if (typeof value !== 'string') return ''
  const raw = value.trim()
  if (!raw) return ''
  const noAccent = stripDiacritics(raw)
  return noAccent
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function safeString(value: unknown) {
  if (typeof value !== 'string') return null
  const t = value.trim()
  return t ? t : null
}

function parseFlags(value: unknown): string[] {
  if (value == null) return []
  if (Array.isArray(value)) {
    return value
      .filter((v): v is string => typeof v === 'string')
      .map((v) => v.trim())
      .filter(Boolean)
  }
  if (typeof value === 'string') {
    const raw = value.trim()
    if (!raw) return []
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        return parsed
          .filter((v): v is string => typeof v === 'string')
          .map((v) => v.trim())
          .filter(Boolean)
      }
    } catch {
      return raw.split(',').map((s) => s.trim()).filter(Boolean)
    }
  }
  return []
}

function toRating(n: unknown) {
  const v = Number(n)
  if (!Number.isFinite(v) || v < 1 || v > 5) return null
  return v
}

function isMissingColumn(err: any, columnName: string) {
  const msg = String(err?.message ?? '').toLowerCase()
  const col = columnName.toLowerCase()
  // cobre: "column ... does not exist" e "Could not find the 'x' column ... in the schema cache"
  return (
    (msg.includes('column') && msg.includes(col) && msg.includes('does not exist')) ||
    (msg.includes('could not find') && msg.includes(col) && msg.includes('schema cache'))
  )
}

function isUniqueViolation(err: any) {
  return err?.code === '23505'
}

export async function POST(req: Request) {
  const logPrefix = '[api/avaliacoes/create]'
  const startedAt = Date.now()

  try {
    const supabaseAdmin = getSupabaseAdminClient()
    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, message: 'Supabase admin não configurado' },
        { status: 503 }
      )
    }

    // Auth via cookies (importante para autor_id não ficar null)
    const supabase = createRouteHandlerClient({ cookies })
    const { data: auth, error: authError } = await supabase.auth.getUser()
    const user = auth?.user

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: 'Usuária não autenticada' },
        { status: 401 }
      )
    }

    let payload: Record<string, unknown>
    try {
      payload = (await req.json()) as Record<string, unknown>
    } catch {
      return NextResponse.json(
        { success: false, message: 'Payload inválido' },
        { status: 400 }
      )
    }

    // --------- SUPORTA 2 MODOS ---------
    // Modo A (cria ou encontra perfil): envia nome + cidade
    // Modo B (avalia perfil existente): envia male_profile_id
    const male_profile_id =
      typeof payload.male_profile_id === 'string' && payload.male_profile_id.trim()
        ? payload.male_profile_id.trim()
        : null

    const nome = typeof payload.nome === 'string' ? payload.nome.trim() : ''
    const cidade = typeof payload.cidade === 'string' ? payload.cidade.trim() : ''

    let maleProfileId: string | null = male_profile_id

    // Se não veio male_profile_id, então estamos no /avaliar (criar/encontrar perfil)
    if (!maleProfileId) {
      if (!nome || !cidade) {
        return NextResponse.json(
          { success: false, message: 'Nome e cidade são obrigatórios' },
          { status: 400 }
        )
      }

      const normalizedName = normalizeKey(nome)
      const normalizedCity = normalizeKey(cidade)

      if (!normalizedName || !normalizedCity) {
        return NextResponse.json(
          { success: false, message: 'Nome/cidade inválidos após normalização' },
          { status: 400 }
        )
      }

      // 1) tenta achar
      const { data: existingProfile, error: findError } = await supabaseAdmin
        .from('male_profiles')
        .select('id')
        .eq('normalized_name', normalizedName)
        .eq('normalized_city', normalizedCity)
        .limit(1)
        .maybeSingle()

      if (findError) {
        console.error(`${logPrefix} male_profile_lookup_error`, findError)
        return NextResponse.json(
          { success: false, message: `Erro ao validar perfil avaliado: ${findError.message}` },
          { status: 500 }
        )
      }

      maleProfileId = (existingProfile?.id as string) ?? null

      // 2) se não existir, cria
      if (!maleProfileId) {
        const { data: created, error: createErr } = await supabaseAdmin
          .from('male_profiles')
          .insert({
            display_name: nome,
            city: cidade,
            is_active: true,
            // se suas colunas normalized_* existirem e NÃO tiver trigger preenchendo:
            normalized_name: normalizedName,
            normalized_city: normalizedCity,
          })
          .select('id')
          .single()

        if (createErr) {
          // se já existe por unique constraint, re-busca
          if (isUniqueViolation(createErr)) {
            const { data: again, error: againErr } = await supabaseAdmin
              .from('male_profiles')
              .select('id')
              .eq('normalized_name', normalizedName)
              .eq('normalized_city', normalizedCity)
              .limit(1)
              .single()

            if (againErr) {
              console.error(`${logPrefix} male_profile_relookup_error`, againErr)
              return NextResponse.json(
                { success: false, message: `Erro ao recuperar perfil após conflito: ${againErr.message}` },
                { status: 500 }
              )
            }
            maleProfileId = again.id as string
          } else {
            console.error(`${logPrefix} male_profile_insert_error`, createErr)
            return NextResponse.json(
              { success: false, message: `Erro ao criar perfil avaliado: ${createErr.message}` },
              { status: 500 }
            )
          }
        } else {
          maleProfileId = created.id as string
        }
      }
    }

    // --------- RATINGS ---------
    const ratings = payload.ratings as RatingsPayload
    if (!ratings || typeof ratings !== 'object') {
      return NextResponse.json(
        { success: false, message: 'Avaliações por critério são obrigatórias' },
        { status: 400 }
      )
    }

    const ratingMap = {
      comportamento: toRating(ratings.comportamento),
      seguranca_emocional: toRating(ratings.seguranca_emocional),
      respeito: toRating(ratings.respeito),
      carater: toRating(ratings.carater),
      confianca: toRating(ratings.confianca),
    }

    if (Object.values(ratingMap).some((v) => v == null)) {
      return NextResponse.json(
        { success: false, message: 'Avaliações devem ser de 1 a 5' },
        { status: 400 }
      )
    }

    const flagsPositive = parseFlags(payload.greenFlags ?? payload.flags_positive)
    const flagsNegative = parseFlags(payload.redFlags ?? payload.flags_negative)

    const contato = safeString(payload.contato)
    const notas = safeString(payload.descricao ?? payload.relato)
    const isAnonymous = Boolean(payload.anonimo ?? payload.is_anonymous)

    // ✅ IMPORTANTE:
    // "publicação anônima" = não exibir autora publicamente,
    // MAS SEMPRE gravar autor_id internamente para auditoria/Minhas Avaliações.
    const baseAvaliacaoRow: Record<string, any> = {
      male_profile_id: maleProfileId,
      autor_id: user.id,
      is_anonymous: isAnonymous,
      publica: true,
      contato,
      notas,
      flags_positive: flagsPositive,
      flags_negative: flagsNegative,
      ...ratingMap,
    }

    // Insere usando autor_id (se der erro de coluna inexistente, tenta autora_id)
    let avaliacaoId: string | null = null

    {
      const { data, error } = await supabaseAdmin
        .from('avaliacoes')
        .insert(baseAvaliacaoRow)
        .select('id')
        .single()

      if (!error && data?.id) {
        avaliacaoId = data.id as string
      } else if (error && isMissingColumn(error, 'autor_id')) {
        // fallback raro: seu schema usa autora_id em vez de autor_id
        const { data: data2, error: error2 } = await supabaseAdmin
          .from('avaliacoes')
          .insert({
            ...baseAvaliacaoRow,
            autora_id: user.id,
          })
          .select('id')
          .single()

        if (error2 || !data2?.id) {
          console.error(`${logPrefix} avaliacao_insert_error_fallback`, error2)
          return NextResponse.json(
            { success: false, message: error2?.message ?? 'Erro ao publicar avaliação' },
            { status: 500 }
          )
        }
        avaliacaoId = data2.id as string
      } else if (error) {
        // Se o erro for "autora_id não existe", significa que alguma parte do seu front
        // está tentando escrever autora_id diretamente (não deveria). Aqui a API não usa.
        console.error(`${logPrefix} avaliacao_insert_error`, error)
        return NextResponse.json(
          { success: false, message: error.message ?? 'Erro ao publicar avaliação' },
          { status: 500 }
        )
      }
    }

    console.info(logPrefix, 'OK', {
      elapsedMs: Date.now() - startedAt,
      maleProfileId,
      avaliacaoId,
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Avaliação publicada com sucesso',
        id: avaliacaoId,
        male_profile_id: maleProfileId,
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('[api/avaliacoes/create] unexpected_error', err)
    return NextResponse.json(
      {
        success: false,
        message: err instanceof Error ? err.message : 'Erro inesperado no servidor',
      },
      { status: 500 }
    )
  }
}
