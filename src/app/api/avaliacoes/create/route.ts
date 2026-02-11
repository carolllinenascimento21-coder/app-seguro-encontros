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
  // Remove acentos no JS (compatível com "Vítor" => "Vitor")
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
    // aceita JSON string ou "a,b,c"
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

function isColumnNotFound(err: any) {
  const msg = String(err?.message ?? '')
  // PostgREST costuma devolver "column <x> does not exist"
  return msg.toLowerCase().includes('column') && msg.toLowerCase().includes('does not exist')
}

function isUniqueViolation(err: any) {
  // Postgres unique violation code
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

    const nome = typeof payload.nome === 'string' ? payload.nome.trim() : ''
    const cidade = typeof payload.cidade === 'string' ? payload.cidade.trim() : ''
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

    // 1) Buscar male_profile existente (pelo par normalizado)
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

    let maleProfileId: string | null = (existingProfile?.id as string) ?? null

    // 2) Se não existir, tenta INSERT (sem ON CONFLICT). Se der unique violation, re-busca.
    if (!maleProfileId) {
      const { data: created, error: createErr } = await supabaseAdmin
        .from('male_profiles')
        .insert({
          display_name: nome,
          city: cidade, // IMPORTANTE: sua coluna city é NOT NULL
          is_active: true,
        })
        .select('id')
        .single()

      if (createErr) {
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

    // 3) Inserir avaliação (tentando "autora_id" primeiro; se não existir, usa "autor_id")
    let avaliacaoId: string | null = null

    const baseAvaliacaoRow: Record<string, any> = {
      male_profile_id: maleProfileId,
      is_anonymous: isAnonymous,
      publica: true,
      contato,
      notas,
      flags_positive: flagsPositive,
      flags_negative: flagsNegative,
      ...ratingMap,
    }

    // Tentativa A: avaliacoes.autora_id
    {
      const { data, error } = await supabaseAdmin
        .from('avaliacoes')
        .insert({ ...baseAvaliacaoRow, autora_id: user.id })
        .select('id')
        .single()

      if (!error && data?.id) {
        avaliacaoId = data.id as string
      } else if (error && isColumnNotFound(error)) {
        // fallback para autor_id
        const { data: data2, error: error2 } = await supabaseAdmin
          .from('avaliacoes')
          .insert({ ...baseAvaliacaoRow, autor_id: user.id })
          .select('id')
          .single()

        if (error2 || !data2?.id) {
          console.error(`${logPrefix} avaliacao_insert_error`, error2)
          return NextResponse.json(
            { success: false, message: error2?.message ?? 'Erro ao publicar avaliação' },
            { status: 500 }
          )
        }
        avaliacaoId = data2.id as string
      } else if (error) {
        console.error(`${logPrefix} avaliacao_insert_error`, error)
        return NextResponse.json(
          { success: false, message: error.message ?? 'Erro ao publicar avaliação' },
          { status: 500 }
        )
      }
    }

    // 4) Garantir pivot avaliacoes_autoras (resolve seu erro "autora_id null")
    // Se a tabela não existir, não quebra a publicação.
    {
      const { error: pivotErr } = await supabaseAdmin
        .from('avaliacoes_autoras')
        .insert({
          avaliacao_id: avaliacaoId,
          autora_id: user.id,
        })

      if (pivotErr) {
        // se for "relation does not exist" ou similar, ignore; caso contrário, devolve erro
        const msg = String(pivotErr.message ?? '').toLowerCase()
        const ignorable =
          msg.includes('does not exist') ||
          msg.includes('relation') ||
          msg.includes('schema cache')

        if (!ignorable) {
          console.error(`${logPrefix} pivot_insert_error`, pivotErr)
          return NextResponse.json(
            { success: false, message: pivotErr.message ?? 'Erro ao registrar autora da avaliação' },
            { status: 500 }
          )
        }
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
