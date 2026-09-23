import type { ImagePickerAsset } from 'expo-image-picker'
import { createURL } from 'expo-linking'

import { CASE_PHOTOS_BUCKET } from '@/lib/patients'
import { readImage } from '@/lib/read-image'
import { supabase } from '@/lib/supabase'

export const AVATARS_BUCKET = 'avatars'

// Every function returns an error message, or '' on success.

type ProfileDetails = {
  firstName: string
  lastName: string
  mobileNumber: string
  specialization: string
  licenseNumber: string
}

export async function updateProfile(userId: string, details: ProfileDetails) {
  const { error } = await supabase
    .from('doctor_profiles')
    .update({
      first_name: details.firstName,
      last_name: details.lastName,
      mobile_number: details.mobileNumber,
      specialization: details.specialization || null,
      license_number: details.licenseNumber || null,
    })
    .eq('id', userId)
  return error?.message ?? ''
}

const extensions: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/heic': 'heic',
  'image/webp': 'webp',
}

// Uploads a new profile photo to the doctor's folder, points the profile at it,
// then removes the previous photo. A fresh file name each time means no stale cached image.
export async function uploadProfilePhoto(userId: string, photo: ImagePickerAsset) {
  const contentType = photo.mimeType ?? 'image/jpeg'
  const path = `${userId}/avatar-${Date.now()}.${extensions[contentType] ?? 'jpg'}`

  const { error: uploadError } = await supabase.storage
    .from(AVATARS_BUCKET)
    .upload(path, await readImage(photo), { contentType })
  if (uploadError) return `Couldn't upload the photo: ${uploadError.message}`

  const { data } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(path)
  const { error } = await supabase.from('doctor_profiles').update({ profile_photo_url: data.publicUrl }).eq('id', userId)
  if (error) {
    await supabase.storage.from(AVATARS_BUCKET).remove([path])
    return error.message
  }

  await removeFolder(AVATARS_BUCKET, userId, path)
  return ''
}

export async function removeProfilePhoto(userId: string) {
  const { error } = await supabase.from('doctor_profiles').update({ profile_photo_url: null }).eq('id', userId)
  if (error) return error.message
  await removeFolder(AVATARS_BUCKET, userId)
  return ''
}

// Checks the doctor's current password by signing in with it again
async function verifyPassword(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  return error ? 'Your current password is incorrect.' : ''
}

export async function changePassword(email: string, currentPassword: string, newPassword: string) {
  const wrongPassword = await verifyPassword(email, currentPassword)
  if (wrongPassword) return wrongPassword

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  return error?.message ?? ''
}

// Starts an email change. Supabase emails confirmation links, and the login switches to the new
// address once they're opened. The account itself (its id) doesn't change, so all patients,
// visits and appointments stay with it.
export async function changeEmail(currentEmail: string, password: string, newEmail: string) {
  const wrongPassword = await verifyPassword(currentEmail, password)
  if (wrongPassword) return wrongPassword

  const { error } = await supabase.auth.updateUser({ email: newEmail }, { emailRedirectTo: createURL('/account') })
  return error?.message ?? ''
}

// Permanently deletes the account and all its data, then signs out
export async function deleteAccount(userId: string, email: string, password: string) {
  const wrongPassword = await verifyPassword(email, password)
  if (wrongPassword) return wrongPassword

  // Storage files aren't removed by the database cascade, so clear them first
  await removeFolder(CASE_PHOTOS_BUCKET, userId)
  await removeFolder(AVATARS_BUCKET, userId)

  const { error } = await supabase.rpc('delete_account')
  if (error) return error.message

  // The session belongs to a user that no longer exists; clear it locally
  await supabase.auth.signOut({ scope: 'local' })
  return ''
}

// Removes every file in the doctor's folder of a bucket, except `keep`
async function removeFolder(bucket: string, userId: string, keep?: string) {
  const { data } = await supabase.storage.from(bucket).list(userId, { limit: 1000 })
  const paths = (data ?? []).map((file) => `${userId}/${file.name}`).filter((path) => path !== keep)
  if (paths.length) await supabase.storage.from(bucket).remove(paths)
}
