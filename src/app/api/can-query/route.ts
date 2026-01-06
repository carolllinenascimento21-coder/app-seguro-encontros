import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST() {
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

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('selfie_verified, onboarding_completed')
    .eq('id', session.user.id)
    .maybeSingle();

  if (profileError) {
    console.error('Erro ao buscar perfil para can-query:', profileError);
    return NextResponse.json(
      { error: 'Erro ao validar permissões' },
      { status: 500 }
    );
  }

  const selfieVerified = Boolean(profile?.selfie_verified);
  const onboardingCompleted = Boolean(profile?.onboarding_completed);
  const allowed = selfieVerified && onboardingCompleted;

  return NextResponse.json({
    allowed,
    reason: allowed
      ? null
      : 'Perfil incompleto ou selfie não verificada',
  });
}
