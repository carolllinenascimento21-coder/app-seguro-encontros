import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

type Body = {
  // dados do homem (quando for criar novo perfil)
  nome?: string | null; // vindo do client
  cidade?: string | null;
  estado?: string | null;
  country?: string | null;
  context?: string | null;

  // quando for avaliar perfil existente
  male_profile_id?: string | null;

  // avaliação
  comportamento: number;
  seguranca_emocional: number;
  respeito: number;
  carater: number;
  confianca: number;
  relato?: string | null;
  flags_positive?: string[];
  flags_negative?: string[];

  // checkbox de anonimato
  anonima?: boolean;
  publica?: boolean;
};

function getBearer(req: Request) {
  const h = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!h) return null;
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1] ?? null;
}

export async function POST(req: Request) {
  try {
    const cookieStore = cookies();
    const bearer = getBearer(req);

    // 1) Cria cliente Supabase priorizando bearer token (corrige teu 401)
    const supabase = bearer
      ? createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            global: {
              headers: {
                Authorization: `Bearer ${bearer}`,
              },
            },
          }
        )
      : createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            cookies: {
              getAll() {
                return cookieStore.getAll();
              },
              setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value, options }) => {
                  cookieStore.set(name, value, options);
                });
              },
            },
          }
        );

    // 2) Auth
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = userData.user.id;

    // 3) Body
    const body = (await req.json()) as Body;

    // validação mínima
    if (!body || typeof body.comportamento !== 'number') {
      return NextResponse.json({ error: 'Payload inválido' }, { status: 400 });
    }

    // 4) Resolve male_profile_id
    let maleProfileId = body.male_profile_id ?? null;

    if (!maleProfileId) {
      const displayName = (body.nome ?? '').trim();
      const city = (body.cidade ?? '').trim();

      if (!displayName) {
        return NextResponse.json({ error: 'Nome do avaliado é obrigatório' }, { status: 400 });
      }

      // IMPORTANTE:
      // Não inserir normalized_name / normalized_city / search_text
      // (no teu banco eles parecem ser gerados e dão erro se tentar setar)
      const { data: mp, error: mpErr } = await supabase
        .from('male_profiles')
        .insert({
          display_name: displayName,
          city: city || null,
          state: body.estado || null,
          country: body.country || 'BR',
          created_by: userId,
          context: body.context || null,
          is_active: true,
        })
        .select('id')
        .single();

      if (mpErr || !mp?.id) {
        return NextResponse.json(
          { error: 'Erro ao criar perfil avaliado', details: mpErr?.message ?? mpErr },
          { status: 500 }
        );
      }

      maleProfileId = mp.id;
    }

    // 5) Cria avaliação
    const flagsPos = Array.isArray(body.flags_positive) ? body.flags_positive : [];
    const flagsNeg = Array.isArray(body.flags_negative) ? body.flags_negative : [];

    const { data: av, error: avErr } = await supabase
      .from('avaliacoes')
      .insert({
        autor_id: userId,
        male_profile_id: maleProfileId,
        comportamento: body.comportamento,
        seguranca_emocional: body.seguranca_emocional,
        respeito: body.respeito,
        carater: body.carater,
        confianca: body.confianca,
        relato: body.relato ?? null,
        flags_positive: flagsPos,
        flags_negative: flagsNeg,
        anonima: !!body.anonima,
        publica: body.publica ?? true,
      })
      .select('id, male_profile_id')
      .single();

    if (avErr) {
      return NextResponse.json(
        { error: 'Erro ao publicar avaliação', details: avErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, avaliacao: av });
  } catch (e: any) {
    return NextResponse.json(
      { error: 'Internal Server Error', details: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
