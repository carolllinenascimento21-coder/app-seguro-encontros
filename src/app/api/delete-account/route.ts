import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

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

  const { error: updateError } = await supabaseAdmin
    .from('profiles')
    .update({
      name: null,
      nome: null,
      email: null,
      telefone: null,
      age: null,
      city: null,
      state: null,
      profilePhoto: null,
      gender: 'female',
      selfie_url: null,
      is_active: false,
      deleted_at: new Date().toISOString(),
      selfie_verified: false,
      onboarding_completed: false,
    })
    .eq('id', userId)

  if (updateError) {
    return NextResponse.json(
      { error: 'Failed to anonymize profile.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
