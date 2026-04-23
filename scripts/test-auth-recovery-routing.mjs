#!/usr/bin/env node

const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000'

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

async function getRedirect(path) {
  const response = await fetch(`${baseUrl}${path}`, { redirect: 'manual' })
  const location = response.headers.get('location')

  assert(
    response.status >= 300 && response.status < 400,
    `Esperado redirect (${path}), recebido status ${response.status}`
  )

  assert(location, `Esperado header location em ${path}`)

  return new URL(location, baseUrl)
}

async function run() {
  const providerParams =
    'error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired'

  const recoveryFromCallback = await getRedirect(
    `/auth/callback?next=%2Fupdate-password&${providerParams}`
  )

  assert(
    recoveryFromCallback.pathname === '/update-password',
    `Callback recovery deveria redirecionar para /update-password, recebido ${recoveryFromCallback.pathname}`
  )

  assert(
    recoveryFromCallback.searchParams.get('error') === 'access_denied',
    'Callback recovery deveria preservar query param error'
  )

  const regularCallbackError = await getRedirect(`/auth/callback?next=%2Fhome&${providerParams}`)

  assert(
    regularCallbackError.pathname === '/login',
    `Callback regular deveria redirecionar para /login, recebido ${regularCallbackError.pathname}`
  )

  assert(
    regularCallbackError.searchParams.get('next') === '/home',
    'Callback regular deveria preservar query param next'
  )

  const recoveryRouteError = await getRedirect(`/auth/recovery/complete?${providerParams}`)

  assert(
    recoveryRouteError.pathname === '/update-password',
    `/auth/recovery/complete deveria redirecionar para /update-password, recebido ${recoveryRouteError.pathname}`
  )

  assert(
    recoveryRouteError.searchParams.get('error_code') === 'otp_expired',
    '/auth/recovery/complete deveria preservar query param error_code'
  )

  console.log('✅ Smoke test de roteamento auth recovery passou.')
}

run().catch((error) => {
  console.error('❌ Falha no smoke test de roteamento auth recovery:')
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
