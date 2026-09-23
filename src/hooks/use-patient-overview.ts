import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'

import { supabase } from '@/lib/supabase'

export type PatientOverview = {
  id: string
  first_name: string
  last_name: string | null
  mobile_number: string | null
  visit_count: number
  last_visit_at: string | null
}

type Result = {
  patients: PatientOverview[]
  error: string
}

// Loads all of the doctor's patients with their visit count and last visit, sorted by name.
// Refetches whenever the screen comes back into focus, e.g. after clocking a patient in.
export function usePatientOverview(enabled: boolean) {
  const [result, setResult] = useState<Result | null>(null)
  const [version, setVersion] = useState(0)

  useFocusEffect(
    useCallback(() => {
      if (!enabled) return

      let cancelled = false
      supabase
        .from('patient_overview')
        .select('id, first_name, last_name, mobile_number, visit_count, last_visit_at')
        .order('first_name')
        .order('last_name')
        .then(({ data, error }) => {
          if (cancelled) return
          // View columns are typed as nullable; id and first_name always come from patients
          const patients = (data ?? []).map((row) => ({
            id: row.id ?? '',
            first_name: row.first_name ?? '',
            last_name: row.last_name,
            mobile_number: row.mobile_number,
            visit_count: row.visit_count ?? 0,
            last_visit_at: row.last_visit_at,
          }))
          setResult({ patients, error: error?.message ?? '' })
        })

      return () => {
        cancelled = true
      }
      // version is a refetch trigger (see reload)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled, version]),
  )

  // Refetch, e.g. after deleting a patient; the current list stays on screen meanwhile
  const reload = useCallback(() => setVersion((value) => value + 1), [])

  return {
    patients: result?.patients ?? [],
    loading: enabled && !result,
    error: result?.error ?? '',
    reload,
  }
}
