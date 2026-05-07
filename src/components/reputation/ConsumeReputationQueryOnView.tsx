'use client'

import { useEffect, useRef } from 'react'

type Props = {
  userId: string
}

export function ConsumeReputationQueryOnView({ userId }: Props) {
  const consumedRef = useRef(false)

  useEffect(() => {
    if (consumedRef.current) return
    consumedRef.current = true

    void fetch('/api/consume-query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ userId }),
    }).catch((error) => {
      console.error('Erro ao registrar consulta gratuita de reputação', error)
    })
  }, [userId])

  return null
}
