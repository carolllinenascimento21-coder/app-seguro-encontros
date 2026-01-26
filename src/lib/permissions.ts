export type PlanId =
  | 'free'
  | 'premium_monthly'
  | 'premium_yearly'
  | 'premium_plus'
  | string // fallback defensivo

export type Feature =
  | 'CONSULT_BASIC'            // pode entrar na tela
  | 'VIEW_RESULT_PREVIEW'      // teaser / resultado limitado
  | 'VIEW_RESULT_FULL'         // resultado completo
  | 'UNLIMITED_SEARCH'         // buscas ilimitadas
  | 'ADVANCED_ANALYSIS'        // análises profundas (Plus)
  | 'RISK_MAP'                 // mapa de risco (Plus)
  | 'PRIORITY_SUPPORT'         // Plus (opcional)

export type ProfileAccess = {
  has_active_plan?: boolean | null
  current_plan_id?: PlanId | null
  free_search_used?: boolean | null // 🔒 controla 1ª consulta gratuita
}

export function normalizePlan(profile?: ProfileAccess): PlanId {
  if (!profile?.has_active_plan) return 'free'
  return profile.current_plan_id ?? 'free'
}

export function canAccessFeature(
  profile: ProfileAccess | null,
  feature: Feature
): boolean {
  const plan = normalizePlan(profile ?? {})

  /* -------------------------
   * REGRAS GLOBAIS
   * ------------------------- */

  // Todo mundo pode acessar a tela
  if (feature === 'CONSULT_BASIC') return true

  // Preview SEMPRE liberado (serve para gerar desejo)
  if (feature === 'VIEW_RESULT_PREVIEW') return true

  /* -------------------------
   * FREE (TRAVADO)
   * ------------------------- */
  if (plan === 'free') {
    switch (feature) {
      case 'VIEW_RESULT_FULL':
        return false

      case 'UNLIMITED_SEARCH':
        return false

      case 'ADVANCED_ANALYSIS':
      case 'RISK_MAP':
      case 'PRIORITY_SUPPORT':
        return false

      default:
        return false
    }
  }

  /* -------------------------
   * PREMIUM (Mensal / Anual)
   * ------------------------- */
  const isPremium =
    plan === 'premium_monthly' ||
    plan === 'premium_yearly'

  if (isPremium) {
    switch (feature) {
      case 'VIEW_RESULT_FULL':
      case 'UNLIMITED_SEARCH':
        return true

      case 'ADVANCED_ANALYSIS':
      case 'RISK_MAP':
      case 'PRIORITY_SUPPORT':
        return false

      default:
        return true
    }
  }

  /* -------------------------
   * PREMIUM PLUS
   * ------------------------- */
  if (plan === 'premium_plus') {
    return true
  }

  return false
}
