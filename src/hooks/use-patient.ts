import { useEffect, useState } from 'react'

import type { Database } from '@/lib/database.types'
import { supabase } from '@/lib/supabase'

export type Patient = Database['public']['Tables']['patients']['Row']

type Result = {
  id: string
  patient: Patient | null
  error: string
}

// Loads one patient
export function usePatient(id: string | undefined) {
  const [result, setResult] = useState<Result | null>(null)

  useEffect(() => {
    if (!id) return

    let cancelled = false
    const load = async () => {
      const { data, error } = await supabase.from('patients').select('*').eq('id', id).maybeSingle()
      if (cancelled) return
      if (error || !data) setResult({ id, patient: null, error: error?.message ?? 'Patient not found.' })
      else setResult({ id, patient: data, error: '' })
    }
    load()

    return () => {
      cancelled = true
    }
  }, [id])

  // Ignore a result that belongs to a previously opened patient
  const current = id && result?.id === id ? result : null

  return {
    patient: current?.patient ?? null,
    loading: !!id && !current,
    error: current?.error ?? '',
  }
}
