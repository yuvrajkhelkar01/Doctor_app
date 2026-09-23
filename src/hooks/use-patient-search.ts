import { useEffect, useState } from 'react'

import type { Database } from '@/lib/database.types'
import { supabase } from '@/lib/supabase'

type Patient = Database['public']['Tables']['patients']['Row']
export type PatientSummary = Pick<Patient, 'id' | 'first_name' | 'last_name' | 'mobile_number'>

type Result = {
  term: string
  patients: PatientSummary[]
  error: string
}

// Searches the signed-in doctor's patients (RLS limits rows to their own) by name or phone number
export function usePatientSearch(query: string) {
  // Drop characters that are special in PostgREST filters and LIKE patterns
  const term = query.replace(/[%_*,()"\\]/g, ' ').replace(/\s+/g, ' ').trim()
  const [result, setResult] = useState<Result | null>(null)

  useEffect(() => {
    if (!term) return

    let cancelled = false
    // Wait for a pause in typing before querying
    const timer = setTimeout(() => {
      const filters = [`first_name.ilike.%${term}%`, `last_name.ilike.%${term}%`]
      // Phone numbers are stored as digits with a dial code, e.g. +919876543210
      const digits = term.replace(/\D/g, '')
      if (digits.length >= 3) filters.push(`mobile_number.ilike.%${digits}%`)

      supabase
        .from('patients')
        .select('id, first_name, last_name, mobile_number')
        .or(filters.join(','))
        .order('first_name')
        .limit(20)
        .then(({ data, error }) => {
          if (cancelled) return
          setResult({ term, patients: data ?? [], error: error?.message ?? '' })
        })
    }, 300)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [term])

  // Ignore a result that belongs to an earlier search
  const current = term && result?.term === term ? result : null

  return {
    patients: current?.patients ?? [],
    loading: !!term && !current,
    error: current?.error ?? '',
  }
}
