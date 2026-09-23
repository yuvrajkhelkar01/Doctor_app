// Date helpers for calendars. All work in the device's local time zone.

export function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

// Local midnight at the end of the day, i.e. the start of the next one
export function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
}

export function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function addMonths(date: Date, count: number) {
  return new Date(date.getFullYear(), date.getMonth() + count, 1)
}

// The month's days laid out in weeks starting on Sunday; null fills the gap before the 1st
export function monthCells(month: Date) {
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const cells: (Date | null)[] = Array.from({ length: month.getDay() }, () => null)
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(new Date(month.getFullYear(), month.getMonth(), day))
  }
  return cells
}

// Always 12-hour, e.g. "4:30 PM"
export function formatTime(date: Date) {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

// e.g. "Tue, Sep 22, 2026 · 4:30 PM"
export function formatDateTime(date: Date) {
  const datePart = date.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  return `${datePart} · ${formatTime(date)}`
}

// The date with minutes rounded down to a multiple of 5 and seconds cleared, to match the time picker
export function roundDownToFiveMinutes(date: Date) {
  const rounded = new Date(date)
  rounded.setMinutes(Math.floor(date.getMinutes() / 5) * 5, 0, 0)
  return rounded
}
