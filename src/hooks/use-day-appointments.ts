import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'

import { supabase } from '@/lib/supabase'

export type DayAppointment = {
  id: string
  appointment_date: string
  duration_minutes: number
  patient_id: string
  patients: { first_name: string; last_name: string | null } | null
}

type Result = {
  day: number
  appointments: DayAppointment[]
  error: string
}

// Loads the doctor's appointments (except cancelled ones) that start on the given local day,
// with each patient's name. `day` is the day's local midnight as a timestamp.
// Refetches when the screen comes back into focus, e.g. after deleting a patient elsewhere.
export function useDayAppointments(day: number) {
  const [result, setResult] = useState<Result | null>(null)
  const [version, setVersion] = useState(0)

  useFocusEffect(
    useCallback(() => {
      const start = new Date(day)
      const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1)

      let cancelled = false
      supabase
        .from('appointments')
        .select('id, appointment_date, duration_minutes, patient_id, patients(first_name, last_name)')
        .gte('appointment_date', start.toISOString())
        .lt('appointment_date', end.toISOString())
        .neq('status', 'cancelled')
        .order('appointment_date')
        .then(({ data, error }) => {
          if (cancelled) return
          setResult({ day, appointments: data ?? [], error: error?.message ?? '' })
        })

      return () => {
        cancelled = true
      }
      // version is a refetch trigger (see reload)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [day, version]),
  )

  // Refetch, e.g. after scheduling; the current appointments stay on screen meanwhile
  const reload = useCallback(() => setVersion((value) => value + 1), [])

  // Ignore a result that belongs to a previously shown day
  const current = result?.day === day ? result : null

  return {
    appointments: current?.appointments ?? [],
    loading: !current,
    error: current?.error ?? '',
    reload,
  }
}
