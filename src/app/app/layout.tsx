'use client'

import OnboardingGuard from '@/components/custom/onboarding-guard'
import HeaderCredits from '@/components/HeaderCredits'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <OnboardingGuard>
      <div className="fixed top-4 right-4 z-50">
        <HeaderCredits />
      </div>

      {children}
    </OnboardingGuard>
  )
}
