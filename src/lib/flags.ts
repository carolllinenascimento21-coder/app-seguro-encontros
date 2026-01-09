export type FlagOption = {
  slug: string
  label: string
}

const createLookup = (options: FlagOption[]) => {
  const bySlug = new Map<string, FlagOption>()
  const byLabel = new Map<string, FlagOption>()

  options.forEach((option) => {
    bySlug.set(option.slug.toLowerCase(), option)
    byLabel.set(option.label.toLowerCase(), option)
  })

  return { bySlug, byLabel }
}

export const GREEN_FLAGS: FlagOption[] = [
  { slug: 'comunicacao_clara', label: 'Comunicação clara' },
  { slug: 'escuta_ativa', label: 'Escuta ativa' },
  { slug: 'respeita_limites', label: 'Respeita limites' },
  { slug: 'controle_emocional', label: 'Controle emocional' },
  { slug: 'empatia', label: 'Empatia' },
  { slug: 'maturidade_emocional', label: 'Maturidade emocional' },
  { slug: 'assume_erros', label: 'Assume erros' },
  { slug: 'cumpre_combinados', label: 'Cumpre combinados' },
  { slug: 'transparencia', label: 'Transparência' },
  { slug: 'coerencia', label: 'Coerência' },
  { slug: 'nao_faz_jogos', label: 'Não faz jogos' },
  { slug: 'responsavel', label: 'Responsável' },
  { slug: 'respeitoso', label: 'Respeitoso' },
  { slug: 'confiavel', label: 'Confiável' },
  { slug: 'postura_protetiva_saudavel', label: 'Postura protetiva saudável' },
]

export const RED_FLAGS: FlagOption[] = [
  { slug: 'mentiras_constantes', label: 'Mentiras constantes' },
  { slug: 'manipulacao_emocional', label: 'Manipulação emocional' },
  { slug: 'desrespeito', label: 'Desrespeito' },
  { slug: 'agressividade', label: 'Agressividade' },
  { slug: 'falta_de_respeito', label: 'Falta de respeito' },
  { slug: 'imaturidade_emocional', label: 'Imaturidade emocional' },
  { slug: 'traicao', label: 'Traição' },
  { slug: 'golpe_amoroso', label: 'Golpe amoroso' },
  { slug: 'stalking', label: 'Stalking' },
  { slug: 'comportamento_abusivo', label: 'Comportamento abusivo' },
  { slug: 'liso', label: 'Liso' },
]

const positiveLookup = createLookup(GREEN_FLAGS)
const negativeLookup = createLookup(RED_FLAGS)

const normalizeFlags = (
  flags: string[] | undefined,
  lookup: ReturnType<typeof createLookup>
) => {
  const unique = new Set<string>()

  if (!flags) {
    return [] as string[]
  }

  flags.forEach((flag) => {
    if (typeof flag !== 'string') {
      return
    }

    const trimmed = flag.trim()
    if (!trimmed) {
      return
    }

    const key = trimmed.toLowerCase()
    const bySlug = lookup.bySlug.get(key)
    const byLabel = lookup.byLabel.get(key)
    const selected = bySlug ?? byLabel

    if (selected) {
      unique.add(selected.slug)
    }
  })

  return Array.from(unique)
}

const getFlagLabel = (flag: string, lookup: ReturnType<typeof createLookup>) => {
  const trimmed = flag.trim()
  if (!trimmed) {
    return ''
  }

  const key = trimmed.toLowerCase()
  const option = lookup.bySlug.get(key) ?? lookup.byLabel.get(key)

  return option?.label ?? trimmed.replace(/_/g, ' ')
}

export const normalizePositiveFlags = (flags?: string[]) =>
  normalizeFlags(flags, positiveLookup)

export const normalizeNegativeFlags = (flags?: string[]) =>
  normalizeFlags(flags, negativeLookup)

export const getPositiveFlagLabel = (flag: string) =>
  getFlagLabel(flag, positiveLookup)

export const getNegativeFlagLabel = (flag: string) =>
  getFlagLabel(flag, negativeLookup)
