import { NextResponse } from 'next/server'

import { createServerClient } from '@/lib/supabase/server'

type ProfileAccessRow = {
  has_active_plan: boolean | null
  free_queries_used: number | null
}

const PROFILE_ACCESS_FIELDS = 'has_active_plan, free_queries_used'

export async function POST() {
  try {
    const supabase = await createServerClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      if (userError) {
        console.error('can-query auth error', userError)
      }
      return NextResponse.json({ allowed: false, reason: 'not_logged' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(PROFILE_ACCESS_FIELDS)
      .eq('id', user.id)
      .maybeSingle<ProfileAccessRow>()

    if (profileError || !profile) {
      if (profileError) {
        console.error('can-query profile error', profileError)
      }
      return NextResponse.json({ allowed: false, reason: 'PROFILE_NOT_FOUND' }, { status: 404 })
    }

    if (profile.has_active_plan === true) {
      return NextResponse.json({ allowed: true })
    }

    const freeQueriesUsed = profile.free_queries_used ?? 0

    if (freeQueriesUsed >= 3) {
      return NextResponse.json({ allowed: false, reason: 'PAYWALL' })
    }

    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({ free_queries_used: freeQueriesUsed + 1 })
      .eq('id', user.id)
      .eq('free_queries_used', profile.free_queries_used)
      .select(PROFILE_ACCESS_FIELDS)
      .maybeSingle<ProfileAccessRow>()

    if (updateError) {
      console.error('can-query increment error', updateError)
      return NextResponse.json({ allowed: false, reason: 'ACCESS_CHECK_FAILED' }, { status: 500 })
    }

    if (!updatedProfile) {
      const { data: latestProfile, error: latestProfileError } = await supabase
        .from('profiles')
        .select(PROFILE_ACCESS_FIELDS)
        .eq('id', user.id)
        .maybeSingle<ProfileAccessRow>()

      if (latestProfileError || !latestProfile) {
        if (latestProfileError) {
          console.error('can-query re-read error', latestProfileError)
        }
        return NextResponse.json({ allowed: false, reason: 'ACCESS_CHECK_FAILED' }, { status: 500 })
      }

      if (latestProfile.has_active_plan === true) {
        return NextResponse.json({ allowed: true })
      }

      return NextResponse.json({ allowed: (latestProfile.free_queries_used ?? 0) <= 3 })
    }

    return NextResponse.json({ allowed: true })
  } catch (error) {
    console.error('can-query error', error)
    return NextResponse.json({ allowed: false, reason: 'ACCESS_CHECK_FAILED' }, { status: 500 })
  }
}
