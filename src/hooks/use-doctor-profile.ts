import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'

import type { Database } from '@/lib/database.types'
import { supabase } from '@/lib/supabase'

export type DoctorProfile = Database['public']['Tables']['doctor_profiles']['Row']

type Result = {
  userId: string
  profile: DoctorProfile | null
  error: string
}

// Loads the signed-in doctor's row from doctor_profiles (created by the sign-up trigger).
// Refetches when the screen comes back into focus, e.g. after editing the profile.
export function useDoctorProfile(userId: string | undefined) {
  const [result, setResult] = useState<Result | null>(null)
  const [version, setVersion] = useState(0)

  useFocusEffect(
    useCallback(() => {
      if (!userId) return

      let cancelled = false
      supabase
        .from('doctor_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
        .then(({ data, error }) => {
          if (cancelled) return
          setResult({
            userId,
            profile: data,
            error: error?.message ?? (data ? '' : 'No doctor profile found for this account.'),
          })
        })

      return () => {
        cancelled = true
      }
      // version is a refetch trigger (see reload)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, version]),
  )

  // Refetch, e.g. after saving; the current profile stays on screen meanwhile
  const reload = useCallback(() => setVersion((value) => value + 1), [])

  // Ignore a result that belongs to a previous user
  const current = userId && result?.userId === userId ? result : null

  return {
    profile: current?.profile ?? null,
    loading: !!userId && !current,
    error: current?.error ?? '',
    reload,
  }
}
