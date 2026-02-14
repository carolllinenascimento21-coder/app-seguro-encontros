import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const {
      nome,
      cidade,
      relato,
      comportamento,
      seguranca_emocional,
      respeito,
      carater,
      confianca,
      flags_positive,
      flags_negative,
      anonimo
    } = body

    const cookieStore = cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {}
        }
      }
    )

    // 🔐 Pega usuária logada
    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Usuária não autenticada' },
        { status: 401 }
      )
    }

    // 🔎 Normalização obrigatória
    const normalizedName = normalize(nome)
    const normalizedCity = normalize(cidade)
    const searchText = `${normalizedName} ${normalizedCity}`

    // 🔍 Verifica se já existe perfil
    let { data: existingProfile } = await supabase
      .from('male_profiles')
      .select('id')
      .eq('normalized_name', normalizedName)
      .eq('normalized_city', normalizedCity)
      .single()

    let maleProfileId = existingProfile?.id

    // 🆕 Se não existir → cria
    if (!maleProfileId) {
      const { data: newProfile, error: profileError } =
        await supabase
          .from('male_profiles')
          .insert({
            name: nome,
            normalized_name: normalizedName,
            normalized_city: normalizedCity,
            search_text: searchText,
            is_active: true,
            created_by: user.id
          })
          .select()
          .single()

      if (profileError) {
        return NextResponse.json(
          { error: 'Erro ao criar perfil avaliado', detail: profileError.message },
          { status: 500 }
        )
      }

      maleProfileId = newProfile.id
    }

    // 📝 Cria avaliação
    const { error: avaliacaoError } =
      await supabase
        .from('avaliacoes')
        .insert({
          autor_id: user.id,
          male_profile_id: maleProfileId,
          relato,
          comportamento,
          seguranca_emocional,
          respeito,
          carater,
          confianca,
          flags_positive,
          flags_negative,
          is_anonymous: anonimo ?? false
        })

    if (avaliacaoError) {
      return NextResponse.json(
        { error: 'Erro ao criar avaliação', detail: avaliacaoError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
