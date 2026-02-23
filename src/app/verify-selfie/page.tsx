import { redirect } from 'next/navigation'

type VerifySelfiePageProps = {
  searchParams?: {
    next?: string
  }
}

export default function VerifySelfiePage({ searchParams }: VerifySelfiePageProps) {
  const next = searchParams?.next
  const target = next ? `/verificacao-selfie?next=${encodeURIComponent(next)}` : '/verificacao-selfie'

  redirect(target)
}
