export type PlanId =
  | 'free'
  | 'premium_monthly'
  | 'premium_yearly'
  | 'premium_plus'
  | string // fallback defensivo

export type Feature =
  | 'CONSULT_BASIC'            // ver tela / início
  | 'VIEW_RESULT_SUMMARY'      // ver resumo do resultado
  | 'VIEW_RESULT_FULL'         // ver detalhes completos
  | 'UNLIMITED_SEARCH'         // sem limites
  | 'ADVANCED_ANALYSIS'        // plus
  | 'RISK_MAP'                 // plus
  | 'PRIORITY_SUPPORT'         // plus (opcional)

export type ProfileAccess = {
  has_active_plan?: boolean | null
  current_plan_id?: PlanId | null
  // opcional: credits, etc.
}

export function normalizePlan(profile: ProfileAccess): PlanId {
  if (!profile?.has_active_plan) return 'free'
  const p = profile.current_plan_id ?? 'free'
  return p
}

export function canAccessFeature(profile: ProfileAccess, feature: Feature): boolean {
  const plan = normalizePlan(profile)

  // Regras globais
  if (feature === 'CONSULT_BASIC') return true
  if (feature === 'VIEW_RESULT_SUMMARY') return true

  // Premium (mensal/anual) e Plus
  const isPremium =
    plan === 'premium_monthly' ||
    plan === 'premium_yearly' ||
    plan === 'premium_plus'

  const isPlus = plan === 'premium_plus'

  switch (feature) {
    case 'VIEW_RESULT_FULL':
      return isPremium

    case 'UNLIMITED_SEARCH':
      return isPremium

    case 'ADVANCED_ANALYSIS':
      return isPlus

    case 'RISK_MAP':
      return isPlus

    case 'PRIORITY_SUPPORT':
      return isPlus

    default:
      return false
  }
}
