import { useCallback, useEffect, useState } from 'react'

import { getBookedSlots, type BookedSlot } from '@/lib/appointments'

// Loads the appointments already on the calendar between `from` and `to` (both timestamps),
// so a new booking can be checked for clashes. Pass nulls to skip loading.
export function useBookedSlots(from: number | null, to: number | null) {
  const [slots, setSlots] = useState<BookedSlot[]>([])
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (from === null || to === null) return

    let cancelled = false
    getBookedSlots(new Date(from), new Date(to)).then((result) => {
      if (cancelled) return
      setSlots(result.slots)
      setError(result.error)
    })

    return () => {
      cancelled = true
    }
  }, [from, to, version])

  // Refetch, e.g. after booking one of the requests, so the next one sees the new appointment
  const reload = useCallback(() => setVersion((value) => value + 1), [])

  return { slots, error, reload }
}
