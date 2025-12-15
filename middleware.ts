const { data: profile, error: profileError } = await supabase
  .from('profiles')
  .select('selfie_verified')
  .eq('id', session.user.id)
  .single();

let selfieVerified = profile?.selfie_verified ?? false;

if (!profile && !profileError) {
  const { data: created } = await supabase
    .from('profiles')
    .upsert({
      id: session.user.id,
      email: session.user.email,
    })
    .select('selfie_verified')
    .single();

  selfieVerified = created?.selfie_verified ?? false;
}

if (!selfieVerified) {
  const url = req.nextUrl.clone();
  url.pathname = '/verificacao-selfie';
  return NextResponse.redirect(url);
}

