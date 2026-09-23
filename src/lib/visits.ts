import { supabase } from '@/lib/supabase'

// Records a visit for one of the signed-in doctor's patients.
// doctor_id is filled in by the database (auth.uid()), and RLS rejects patients that belong to another doctor.
// Returns an error message, or '' on success.
export async function addVisit(patientId: string, visitedAt: Date) {
  const { error } = await supabase.from('visits').insert({
    patient_id: patientId,
    visited_at: visitedAt.toISOString(),
  })
  return error?.message ?? ''
}
