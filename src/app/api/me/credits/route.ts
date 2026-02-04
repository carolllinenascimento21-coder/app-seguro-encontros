import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // ⚠️ NÃO tenta autenticar aqui
  // Créditos são buscados via RLS no client

  const { data, error } = await supabase
    .from("user_credits")
    .select("balance")
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ credits: 0 }, { status: 200 });
  }

  return NextResponse.json({ credits: data?.balance ?? 0 }, { status: 200 });
}
