import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)

    const nome = searchParams.get("nome")?.toLowerCase() || ""
    const cidade = searchParams.get("cidade")?.toLowerCase() || ""

    if (!nome && !cidade) {
      return NextResponse.json({ error: "Parâmetros vazios" }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let query = supabase
      .from("male_profiles")
      .select("*")
      .eq("is_active", true)

    if (nome) {
      query = query.ilike("normalized_name", `%${nome}%`)
    }

    if (cidade) {
      query = query.ilike("normalized_city", `%${cidade}%`)
    }

    const { data, error } = await query.limit(50)

    if (error) {
      console.error("Erro Supabase:", error)
      return NextResponse.json(
        { error: "Erro na consulta ao banco" },
        { status: 500 }
      )
    }

    return NextResponse.json({ results: data ?? [] })

  } catch (err) {
    console.error("Erro interno API busca:", err)
    return NextResponse.json(
      { error: "Erro interno na busca" },
      { status: 500 }
    )
  }
}
