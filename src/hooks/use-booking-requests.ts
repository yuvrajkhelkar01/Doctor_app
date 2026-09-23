import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'

import type { BookingRequest } from '@/lib/booking'
import { supabase } from '@/lib/supabase'

type Result = {
  requests: BookingRequest[]
  error: string
}

// Loads the doctor's waiting booking requests, soonest preferred time first.
// Refetches when the screen comes back into focus.
export function useBookingRequests(enabled: boolean) {
  const [result, setResult] = useState<Result | null>(null)
  const [version, setVersion] = useState(0)

  useFocusEffect(
    useCallback(() => {
      if (!enabled) return

      let cancelled = false
      supabase
        .from('booking_requests')
        .select('id, full_name, mobile_number, preferred_at, note, created_at')
        .eq('status', 'pending')
        .order('preferred_at')
        .then(({ data, error }) => {
          if (cancelled) return
          setResult({ requests: data ?? [], error: error?.message ?? '' })
        })

      return () => {
        cancelled = true
      }
      // version is a refetch trigger (see reload)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled, version]),
  )

  const reload = useCallback(() => setVersion((value) => value + 1), [])

  return {
    requests: result?.requests ?? [],
    loading: enabled && !result,
    error: result?.error ?? '',
    reload,
  }
}
