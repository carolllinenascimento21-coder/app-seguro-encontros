import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import OnboardingGuard from '@/components/custom/onboarding-guard'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Confia+ | Segurança em Encontros',
  description: 'Plataforma premium para compartilhar experiências de encontros de forma segura e anônima',
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <OnboardingGuard>{children}</OnboardingGuard>
      </body>
    </html>
  )
}
