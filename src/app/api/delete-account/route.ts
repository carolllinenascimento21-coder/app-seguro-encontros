import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { isMissingColumnError } from '@/lib/profile-utils'

const safeDeleteContacts = async (tableName: string, userId: string) => {
  const { error } = await supabaseAdmin
    .from(tableName)
    .delete()
    .eq('user_id', userId)

  if (error && error.code !== '42P01') {
    throw error
  }
}

export async function POST() {
  const supabase = createRouteHandlerClient({ cookies })
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError || !session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const userId = session.user.id

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('selfie_url')
    .eq('id', userId)
    .maybeSingle()

  if (profileError) {
    return NextResponse.json(
      { error: 'Failed to load profile.' },
      { status: 500 }
    )
  }

  if (profile?.selfie_url) {
    const { error: removeError } = await supabaseAdmin.storage
      .from('selfie-verifications')
      .remove([profile.selfie_url])

    if (removeError) {
      return NextResponse.json(
        { error: 'Failed to remove selfie.' },
        { status: 500 }
      )
    }
  }

  try {
    await Promise.all([
      safeDeleteContacts('emergency_contacts', userId),
      safeDeleteContacts('contatos_emergencia', userId),
    ])
  } catch (error) {
    console.error('Failed to remove contacts', error)
    return NextResponse.json(
      { error: 'Failed to remove contacts.' },
      { status: 500 }
    )
  }

  const basePayload = {
    nome: null,
    email: null,
    gender: 'female',
    selfie_url: null,
    deleted_at: new Date().toISOString(),
    selfie_verified: false,
    onboarding_completed: false,
  }

  const optionalFields = new Set(['telefone', 'is_active'])
  const buildPayload = () => ({
    ...basePayload,
    ...(optionalFields.has('telefone') ? { telefone: null } : {}),
    ...(optionalFields.has('is_active') ? { is_active: false } : {}),
  })

  let { error: updateError } = await supabaseAdmin
    .from('profiles')
    .update(buildPayload())
    .eq('id', userId)

  while (updateError) {
    if (isMissingColumnError(updateError, 'telefone')) {
      optionalFields.delete('telefone')
    } else if (isMissingColumnError(updateError, 'is_active')) {
      optionalFields.delete('is_active')
    } else {
      break
    }

    const { error: retryError } = await supabaseAdmin
      .from('profiles')
      .update(buildPayload())
      .eq('id', userId)

    updateError = retryError ?? null
  }

  if (updateError) {
    return NextResponse.json(
      { error: 'Failed to anonymize profile.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
