import { useEffect, useState } from 'react'

import { supabase } from '@/lib/supabase'
import { startOfDay } from '@/utils/dates'

type Result = {
  month: number
  // Local midnight timestamp of each day → number of appointments that day
  counts: Record<number, number>
  error: string
}

// Counts the doctor's appointments (except cancelled ones) on each day of a month.
// `month` is the month's first day at local midnight as a timestamp; nothing loads while `enabled` is false.
export function useMonthAppointmentCounts(month: number, enabled: boolean) {
  const [result, setResult] = useState<Result | null>(null)

  useEffect(() => {
    if (!enabled) return

    const start = new Date(month)
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1)

    let cancelled = false
    supabase
      .from('appointments')
      .select('appointment_date')
      .gte('appointment_date', start.toISOString())
      .lt('appointment_date', end.toISOString())
      .neq('status', 'cancelled')
      .then(({ data, error }) => {
        if (cancelled) return
        const counts: Record<number, number> = {}
        for (const { appointment_date } of data ?? []) {
          const day = startOfDay(new Date(appointment_date)).getTime()
          counts[day] = (counts[day] ?? 0) + 1
        }
        setResult({ month, counts, error: error?.message ?? '' })
      })

    return () => {
      cancelled = true
    }
  }, [month, enabled])

  // Ignore a result that belongs to a previously shown month
  const current = result?.month === month ? result : null

  return {
    counts: current?.counts ?? {},
    loading: enabled && !current,
    error: current?.error ?? '',
  }
}
