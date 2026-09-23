import { supabase } from '@/lib/supabase'

// An appointment as the clash check needs it: when it starts, how long it runs, and who it's with
export type BookedSlot = {
  id: string
  appointment_date: string
  duration_minutes: number
  patients: { first_name: string; last_name: string | null } | null
}

// The longest appointment that can be booked (see DurationPicker). One that starts this far
// before a window can still run into it, so range queries look back by this much.
const LONGEST_APPOINTMENT_MINUTES = 60

type NewAppointment = {
  doctorId: string
  patientId: string
  start: Date
  durationMinutes: number
  notes: string
}

// Schedules an appointment for one of the doctor's patients.
// Returns an error message, or '' on success.
export async function addAppointment({ doctorId, patientId, start, durationMinutes, notes }: NewAppointment) {
  const { error } = await supabase.from('appointments').insert({
    doctor_id: doctorId,
    patient_id: patientId,
    appointment_date: start.toISOString(),
    duration_minutes: durationMinutes,
    notes: notes || null,
  })
  return error?.message ?? ''
}

// Moves an appointment to a new start time and length. Returns an error message, or '' on success.
export async function rescheduleAppointment(id: string, start: Date, durationMinutes: number) {
  const { error } = await supabase
    .from('appointments')
    .update({ appointment_date: start.toISOString(), duration_minutes: durationMinutes })
    .eq('id', id)
  return error?.message ?? ''
}

// Permanently removes an appointment. Returns an error message, or '' on success.
export async function deleteAppointment(id: string) {
  const { error } = await supabase.from('appointments').delete().eq('id', id)
  return error?.message ?? ''
}

// The doctor's appointments (except cancelled ones) that could run inside the given window,
// used to spot clashes. Returns an error message in `error`, or '' on success.
export async function getBookedSlots(from: Date, to: Date): Promise<{ slots: BookedSlot[]; error: string }> {
  const lookback = new Date(from.getTime() - LONGEST_APPOINTMENT_MINUTES * 60 * 1000)
  const { data, error } = await supabase
    .from('appointments')
    .select('id, appointment_date, duration_minutes, patients(first_name, last_name)')
    .gte('appointment_date', lookback.toISOString())
    .lte('appointment_date', to.toISOString())
    .neq('status', 'cancelled')
    .order('appointment_date')
  return { slots: data ?? [], error: error?.message ?? '' }
}

// The booked appointments a block starting at `start` for `durationMinutes` would run into.
// Appointments that merely touch end-to-start don't count as a clash.
export function clashingSlots(slots: BookedSlot[], start: Date, durationMinutes: number) {
  const blockStart = start.getTime()
  const blockEnd = blockStart + durationMinutes * 60 * 1000
  return slots.filter((slot) => {
    const slotStart = new Date(slot.appointment_date).getTime()
    const slotEnd = slotStart + slot.duration_minutes * 60 * 1000
    return slotStart < blockEnd && slotEnd > blockStart
  })
}

// "Ravi Kumar" from a booked slot, or a stand-in when the patient didn't come back with it
export function slotPatientName(slot: BookedSlot) {
  const name = [slot.patients?.first_name, slot.patients?.last_name].filter(Boolean).join(' ')
  return name || 'another patient'
}
