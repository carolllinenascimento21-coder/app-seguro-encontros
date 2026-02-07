import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { Star, AlertTriangle, CheckCircle2, ArrowLeft } from 'lucide-react'

import Navbar from '@/components/custom/navbar'
import { canAccessFeature } from '@/lib/permissions'
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'
import { getNegativeFlagLabel, getPositiveFlagLabel } from '@/lib/flags'

interface PageProps {
  params: { id: string }
}

export default async function DetalhesReputacao({ params }: PageProps) {
  const supabase = createServerComponentClient({ cookies })

  /* ────────────────────────────────────────────────
   * 1️⃣ Usuária autenticada
   * ──────────────────────────────────────────────── */
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  /* ────────────────────────────────────────────────
   * 2️⃣ Perfil da usuária
   * ──────────────────────────────────────────────── */
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('has_active_plan, current_plan_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    redirect('/login')
  }

  const isPremium = canAccessFeature(profile, 'VIEW_RESULT_FULL')
  const isFree = !isPremium

  /* ────────────────────────────────────────────────
   * 3️⃣ Buscar reputação agregada (ADMIN)
   * ──────────────────────────────────────────────── */
  const supabaseAdmin = getSupabaseAdminClient()

  if (!supabaseAdmin) {
    redirect('/consultar-reputacao')
  }

  const { data: avaliacao, error } = await supabaseAdmin
    .from('reputacao_agregada')
    .select(`
      male_profile_id,
      display_name,
      city,
      state,
      country,
      total_avaliacoes,
      media_geral,
      confiabilidade_percentual,
      flags_positive,
      flags_negative
    `)
    .eq('male_profile_id', params.id)
    .single()

  if (error || !avaliacao) {
    redirect('/consultar-reputacao')
  }

  const media =
    typeof avaliacao.media_geral === 'number'
      ? avaliacao.media_geral.toFixed(1)
      : '—'

  /* =========================================================
     🔒 FREE → SOMENTE RESUMO
     ========================================================= */
  if (isFree) {
    return (
      <div className="min-h-screen bg-black pb-20">
        <div className="px-4 pt-8 max-w-md mx-auto text-white">
          <a
            href="/consultar-reputacao"
            className="text-gray-400 flex items-center gap-2 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </a>

          <h1 className="text-2xl font-bold mb-1">
            {avaliacao.display_name || 'Nome não informado'}
          </h1>

          {avaliacao.city && (
            <p className="text-gray-400 text-sm mb-4">
              {avaliacao.city}
            </p>
          )}

          <div className="bg-[#1A1A1A] border border-[#D4AF37]/40 rounded-xl p-6 mb-4">
            <div className="flex justify-center items-center gap-2 text-[#D4AF37] mb-2">
              <Star className="w-8 h-8 fill-current" />
              <span className="text-4xl font-bold">{media}</span>
            </div>

            <p className="text-center text-gray-400 text-sm mt-2">
              Este é um resumo público de segurança.
              <br />
              Informações detalhadas são exibidas apenas
              para usuárias verificadas.
            </p>

            <p className="text-center text-[#EFD9A7] text-xs mt-3">
              Mesmo quando o resumo parece neutro,
              sinais importantes podem estar ocultos.
            </p>
          </div>

          <div className="border border-[#D4AF37] rounded-xl p-4 bg-black/40">
            <p className="text-sm text-[#EFD9A7] mb-3">
              Proteja-se antes de se envolver.
              Desbloqueie alertas e informações completas.
            </p>

            <a
              href="/planos"
              className="block text-center bg-[#D4AF37] text-black font-bold py-3 rounded-lg"
            >
              Ativar acesso seguro
            </a>

            <p className="text-xs text-gray-400 mt-2 text-center">
              Pagamento seguro • Cancele quando quiser
            </p>
          </div>
        </div>

        <Navbar />
      </div>
    )
  }

  /* =========================================================
     ⭐ PREMIUM → DETALHE COMPLETO
     ========================================================= */
  return (
    <div className="min-h-screen bg-black pb-20">
      <div className="px-4 pt-8 max-w-md mx-auto text-white">
        <a
          href="/consultar-reputacao"
          className="text-gray-400 flex items-center gap-2 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </a>

        <h1 className="text-2xl font-bold mb-1">
          {avaliacao.display_name || 'Nome não informado'}
        </h1>

        {avaliacao.city && (
          <p className="text-gray-400 text-sm mb-4">
            {avaliacao.city}
          </p>
        )}

        <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl p-6 mb-4">
          <div className="flex justify-center items-center gap-2 text-[#D4AF37] mb-2">
            <Star className="w-8 h-8 fill-current" />
            <span className="text-4xl font-bold">{media}</span>
          </div>

          <p className="text-center text-gray-400 text-sm">
            Média geral das avaliações
          </p>

          <p className="text-center text-xs text-gray-500 mt-2">
            {avaliacao.total_avaliacoes} avaliações •{' '}
            {avaliacao.confiabilidade_percentual}% de confiabilidade
          </p>
        </div>

        {avaliacao.flags_negative?.length > 0 && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4">
            <div className="flex gap-2 text-red-400 font-bold mb-2">
              <AlertTriangle className="w-5 h-5" />
              Pontos de atenção
            </div>
            <div className="flex flex-wrap gap-2">
              {avaliacao.flags_negative.map((f: string, i: number) => (
                <span
                  key={i}
                  className="bg-red-500/20 text-red-300 px-3 py-1 rounded-full text-xs"
                >
                  {getNegativeFlagLabel(f)}
                </span>
              ))}
            </div>
          </div>
        )}

        {avaliacao.flags_positive?.length > 0 && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
            <div className="flex gap-2 text-green-400 font-bold mb-2">
              <CheckCircle2 className="w-5 h-5" />
              Pontos positivos
            </div>
            <div className="flex flex-wrap gap-2">
              {avaliacao.flags_positive.map((f: string, i: number) => (
                <span
                  key={i}
                  className="bg-green-500/20 text-green-300 px-3 py-1 rounded-full text-xs"
                >
                  {getPositiveFlagLabel(f)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <Navbar />
    </div>
  )
}
