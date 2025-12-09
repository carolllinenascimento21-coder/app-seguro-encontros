import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import TermosGuard from '@/components/custom/termos-guard'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Confia+ | Segurança em Encontros',
  description: 'Plataforma premium para compartilhar experiências de encontros de forma segura e anônima',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <TermosGuard>
          {children}
        </TermosGuard>
      </body>
    </html>
  )
}
