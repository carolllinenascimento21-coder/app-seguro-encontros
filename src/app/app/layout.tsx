'use client'

import OnboardingGuard from '@/components/custom/onboarding-guard'

export default function AppLayout({ children }) {
  return (
    <OnboardingGuard>
      {children}
    </OnboardingGuard>
  )
}
