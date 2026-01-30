import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

import OnboardingGuard from '@/components/custom/onboarding-guard'
import HeaderCredits from '@/components/HeaderCredits'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Confia+ | Segurança em Encontros',
  description:
    'Plataforma premium para compartilhar experiências de encontros de forma segura e anônima',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <OnboardingGuard>
          <div className="fixed top-4 right-4 z-50">
            <HeaderCredits />
          </div>

          {children}
        </OnboardingGuard>
      </body>
    </html>
  )
}
