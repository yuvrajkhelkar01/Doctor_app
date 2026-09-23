import type { ImagePickerAsset } from 'expo-image-picker'

// Web: expo-file-system isn't available, but the picker hands back the browser File
export async function readImage(asset: ImagePickerAsset): Promise<ArrayBuffer | Blob> {
  if (asset.file) return asset.file
  const response = await fetch(asset.uri)
  return response.blob()
}
