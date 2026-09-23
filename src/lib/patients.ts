import type { ImagePickerAsset } from 'expo-image-picker'

import { readImage } from '@/lib/read-image'
import { supabase } from '@/lib/supabase'

export const CASE_PHOTOS_BUCKET = 'case-photos'

type NewPatient = {
  doctorId: string
  firstName: string
  mobileNumber: string
  caseNotes: string
  casePhoto: ImagePickerAsset | null
}

const extensions: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/heic': 'heic',
  'image/webp': 'webp',
}

// Uploads the case photo (if any) to the doctor's folder, then creates the patient row.
// Returns an error message, or '' on success.
export async function addPatient({ doctorId, firstName, mobileNumber, caseNotes, casePhoto }: NewPatient) {
  let casePhotoPath: string | null = null

  if (casePhoto) {
    const contentType = casePhoto.mimeType ?? 'image/jpeg'
    const extension = extensions[contentType] ?? 'jpg'
    // Storage policies only allow paths that start with the doctor's own id
    casePhotoPath = `${doctorId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extension}`

    const { error } = await supabase.storage
      .from(CASE_PHOTOS_BUCKET)
      .upload(casePhotoPath, await readImage(casePhoto), { contentType })
    if (error) return `Couldn't upload the case photo: ${error.message}`
  }

  const { error } = await supabase.from('patients').insert({
    doctor_id: doctorId,
    first_name: firstName,
    mobile_number: mobileNumber,
    case_notes: caseNotes || null,
    case_photo_path: casePhotoPath,
  })

  if (error) {
    // Don't leave an orphaned photo behind
    if (casePhotoPath) await supabase.storage.from(CASE_PHOTOS_BUCKET).remove([casePhotoPath])
    return error.message
  }
  return ''
}

// Deletes a patient. Their visits and appointments go with them (on delete cascade);
// the case photo, if any, is removed from storage afterwards. Returns an error message, or '' on success.
export async function deletePatient(id: string) {
  const { data } = await supabase.from('patients').select('case_photo_path').eq('id', id).maybeSingle()

  const { error } = await supabase.from('patients').delete().eq('id', id)
  if (error) return error.message

  if (data?.case_photo_path) await supabase.storage.from(CASE_PHOTOS_BUCKET).remove([data.case_photo_path])
  return ''
}
