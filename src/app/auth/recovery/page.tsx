import Link from 'next/link'

type RecoveryPageProps = {
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>
}

function first(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value[0]
  }

  return value
}

export default async function RecoveryBridgePage({ searchParams }: RecoveryPageProps) {
  const resolvedSearchParams =
    searchParams && typeof searchParams === 'object' && 'then' in searchParams
      ? await searchParams
      : searchParams ?? {}

  const code = first(resolvedSearchParams.code)
  const tokenHash = first(resolvedSearchParams.token_hash) ?? first(resolvedSearchParams.token)
  const type = first(resolvedSearchParams.type)
  const error = first(resolvedSearchParams.error)
  const errorDescription = first(resolvedSearchParams.error_description)
  const errorCode = first(resolvedSearchParams.error_code)

  const hasRecoveryPayload = Boolean(code || (tokenHash && type === 'recovery'))

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <section className="w-full max-w-sm space-y-4 rounded-2xl border border-[#D4AF37] p-8">
        <h1 className="text-2xl font-bold text-center text-white">Recuperar senha</h1>

        {error ? (
          <div className="rounded-md border border-red-700 bg-red-950/60 px-4 py-2 text-sm text-red-200 text-center">
            {errorDescription || 'Este link é inválido ou expirou. Solicite uma nova recuperação de senha.'}
          </div>
        ) : null}

        {!error && !hasRecoveryPayload ? (
          <div className="rounded-md border border-red-700 bg-red-950/60 px-4 py-2 text-sm text-red-200 text-center">
            Link de recuperação inválido. Solicite uma nova recuperação de senha.
          </div>
        ) : null}

        {hasRecoveryPayload && !error ? (
          <>
            <p className="text-sm text-gray-300 text-center">
              Para sua segurança, confirme para continuar a redefinição de senha.
            </p>

            <form action="/auth/recovery/complete" method="get" className="space-y-3">
              {code ? <input type="hidden" name="code" value={code} /> : null}
              {tokenHash ? <input type="hidden" name="token_hash" value={tokenHash} /> : null}
              {type ? <input type="hidden" name="type" value={type} /> : null}
              {errorDescription ? (
                <input type="hidden" name="error_description" value={errorDescription} />
              ) : null}
              {errorCode ? <input type="hidden" name="error_code" value={errorCode} /> : null}

              <button
                type="submit"
                className="w-full rounded-xl bg-[#D4AF37] py-3 font-semibold text-black transition hover:bg-[#c9a634]"
              >
                Continuar redefinição
              </button>
            </form>
          </>
        ) : null}

        <p className="text-center text-sm text-gray-400">
          <Link href="/esqueci-senha" className="font-semibold text-[#D4AF37] hover:underline">
            Solicitar novo link
          </Link>
        </p>
      </section>
    </main>
  )
}
