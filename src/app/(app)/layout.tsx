'use client'

import HeaderCredits from '@/components/HeaderCredits'
import AppNav from '@/components/AppNav'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-black text-white">
      <header className="fixed top-4 right-4 z-50">
        <HeaderCredits />
      </header>

      <AppNav /> {/* aqui entra o link "Planos" */}

      <main className="pt-16">{children}</main>
    </div>
  )
}
