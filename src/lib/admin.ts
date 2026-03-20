export function isAdminEmail(email?: string | null) {
  const admins = [
    'contato@confiamais.com.br',
    'suporte@confiamais.com.br',
  ]

  return !!email && admins.includes(email.toLowerCase())
}
