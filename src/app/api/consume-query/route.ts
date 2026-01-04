import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies });

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.user) {
    return NextResponse.json(
      { error: 'Usuária não autenticada' },
      { status: 401 }
    );
  }

  let metadata: Record<string, unknown> = {};

  try {
    const body = await req.json();

    if (body && typeof body === 'object' && !Array.isArray(body)) {
      const { userId: _ignoreUserId, ...rest } = body as Record<
        string,
        unknown
      >;
      metadata = rest;
    }
  } catch {
    // Ignora body inválido; o ID autenticado sempre será usado.
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, selfie_verified, onboarding_completed')
    .eq('id', session.user.id)
    .maybeSingle();

  if (profileError) {
    console.error('Erro ao carregar perfil para consume-query:', profileError);
    return NextResponse.json(
      { error: 'Erro ao registrar consumo' },
      { status: 500 }
    );
  }

  if (!profile) {
    return NextResponse.json(
      { error: 'Perfil não encontrado' },
      { status: 404 }
    );
  }

  if (!profile.selfie_verified || !profile.onboarding_completed) {
    return NextResponse.json(
      { error: 'Perfil incompleto para consumo de consulta' },
      { status: 403 }
    );
  }

  return NextResponse.json({
    success: true,
    userId: session.user.id,
    metadata,
  });
}
