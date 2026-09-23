import { Platform } from 'react-native'

import { supabase } from '@/lib/supabase'

export type BookingRequest = {
  id: string
  full_name: string
  mobile_number: string
  preferred_at: string
  note: string | null
  created_at: string
}

export type BookingFormDoctor = {
  firstName: string
  lastName: string | null
  specialization: string | null
}

// Where the public booking form lives. Set EXPO_PUBLIC_WEB_URL to the address the web build is
// hosted at; on web we can fall back to whatever address the app is already open on.
export function bookingFormUrl(token: string) {
  const configured = process.env.EXPO_PUBLIC_WEB_URL?.replace(/\/$/, '')
  const base = configured || (Platform.OS === 'web' ? window.location.origin : '')
  // Without both halves the link would lead nowhere, so don't build one at all
  return base && token ? `${base}/book/${token}` : ''
}

// Replaces the doctor's booking token, which stops the old link working.
// Returns the new token, or '' if it failed.
export async function regenerateBookingToken() {
  const { data, error } = await supabase.rpc('regenerate_booking_token')
  if (error || !data) return ''
  return data
}

// Public: who the form belongs to. `doctor` is null for an unknown or replaced token;
// `error` is set instead when the request itself failed, e.g. the database isn't set up.
export async function getBookingFormDoctor(token: string): Promise<{ doctor: BookingFormDoctor | null; error: string }> {
  const { data, error } = await supabase.rpc('booking_form_doctor', { token })
  if (error) return { doctor: null, error: error.message }

  const row = data?.[0]
  if (!row) return { doctor: null, error: '' }
  return {
    doctor: { firstName: row.first_name, lastName: row.last_name, specialization: row.specialization },
    error: '',
  }
}

// Public: sends a booking request. Returns an error message, or '' on success.
export async function submitBookingRequest(
  token: string,
  fullName: string,
  mobileNumber: string,
  preferredAt: Date,
  note: string,
) {
  const { data, error } = await supabase.rpc('submit_booking_request', {
    token,
    full_name: fullName,
    mobile_number: mobileNumber,
    preferred_at: preferredAt.toISOString(),
    note: note || null,
  })
  if (error) return error.message
  if (!data) return 'This booking link is no longer valid. Please ask the clinic for a new one.'
  return ''
}

// Turns a request into a real appointment: finds or creates the patient, books the time,
// and marks the request accepted. Returns an error message, or '' on success.
export async function acceptBookingRequest(
  request: BookingRequest,
  doctorId: string,
  start: Date,
  durationMinutes: number,
) {
  const { data: existing } = await supabase
    .from('patients')
    .select('id')
    .eq('mobile_number', request.mobile_number)
    .limit(1)
    .maybeSingle()

  let patientId = existing?.id
  if (!patientId) {
    const [firstName, ...rest] = request.full_name.split(' ')
    const { data: created, error } = await supabase
      .from('patients')
      .insert({
        doctor_id: doctorId,
        first_name: firstName,
        last_name: rest.join(' ') || null,
        mobile_number: request.mobile_number,
        // Patients need a case study; the request's note is the closest thing we have so far
        case_notes: request.note || 'Booked through the online form.',
      })
      .select('id')
      .single()
    if (error || !created) return error?.message ?? "Couldn't create the patient."
    patientId = created.id
  }

  const { error: appointmentError } = await supabase.from('appointments').insert({
    doctor_id: doctorId,
    patient_id: patientId,
    appointment_date: start.toISOString(),
    duration_minutes: durationMinutes,
    notes: request.note,
  })
  if (appointmentError) return appointmentError.message

  const { error } = await supabase
    .from('booking_requests')
    .update({ status: 'accepted', patient_id: patientId })
    .eq('id', request.id)
  return error?.message ?? ''
}

export async function declineBookingRequest(id: string) {
  const { error } = await supabase.from('booking_requests').update({ status: 'declined' }).eq('id', id)
  return error?.message ?? ''
}
