import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function GET() {
  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // Em route handlers, geralmente não precisa setar cookies,
          // mas deixamos aqui por compatibilidade.
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Se não estiver logada, não quebra: devolve 0 créditos.
  if (!user) {
    return NextResponse.json({ credits: 0 }, { status: 200 });
  }

  // Ajuste para a sua tabela real de créditos:
  // - se for `user_credits` com `user_id` e `balance`, ok.
  const { data, error } = await supabase
    .from("user_credits")
    .select("balance")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    // Não derruba a UI por causa disso.
    return NextResponse.json({ credits: 0 }, { status: 200 });
  }

  return NextResponse.json({ credits: data?.balance ?? 0 }, { status: 200 });
}
