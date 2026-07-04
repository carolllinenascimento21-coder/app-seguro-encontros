import { redirect } from 'next/navigation'
import OnboardingPage from './onboarding/page'

type RootPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

const OAUTH_CALLBACK_PARAMS = new Set([
  'code',
  'error',
  'access_token',
  'refresh_token',
])

export default async function RootPage({ searchParams }: RootPageProps) {
  const params = (await searchParams) ?? {}
  const hasOAuthCallback = Array.from(OAUTH_CALLBACK_PARAMS).some((key) => params[key])

  if (hasOAuthCallback) {
    const callbackParams = new URLSearchParams()

    Object.entries(params).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((item) => callbackParams.append(key, item))
        return
      }

      if (value) {
        callbackParams.set(key, value)
      }
    })

    if (!callbackParams.has('next')) {
      callbackParams.set('next', '/home')
    }

    redirect(`/auth/callback?${callbackParams.toString()}`)
  }

  return <OnboardingPage />
}
