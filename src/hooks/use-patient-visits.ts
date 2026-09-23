import { useEffect, useState } from 'react'

import type { Database } from '@/lib/database.types'
import { supabase } from '@/lib/supabase'

export type Visit = Pick<Database['public']['Tables']['visits']['Row'], 'id' | 'visited_at'>

type Result = {
  patientId: string
  visits: Visit[]
  error: string
}

// Loads a patient's visit history, newest first
export function usePatientVisits(patientId: string | undefined) {
  const [result, setResult] = useState<Result | null>(null)

  useEffect(() => {
    if (!patientId) return

    let cancelled = false
    supabase
      .from('visits')
      .select('id, visited_at')
      .eq('patient_id', patientId)
      .order('visited_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return
        setResult({ patientId, visits: data ?? [], error: error?.message ?? '' })
      })

    return () => {
      cancelled = true
    }
  }, [patientId])

  // Ignore a result that belongs to a previously opened patient
  const current = patientId && result?.patientId === patientId ? result : null

  return {
    visits: current?.visits ?? [],
    loading: !!patientId && !current,
    error: current?.error ?? '',
  }
}
