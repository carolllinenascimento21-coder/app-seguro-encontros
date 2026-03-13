import { NextResponse } from 'next/server'

const DEPRECATION_MESSAGE =
  'Endpoint descontinuado. Use /api/avaliacoes/create para publicar avaliações.'

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      message: DEPRECATION_MESSAGE,
    },
    { status: 410 }
  )
}
