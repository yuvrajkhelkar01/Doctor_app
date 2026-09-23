import { File } from 'expo-file-system'
import type { ImagePickerAsset } from 'expo-image-picker'

// Native: read the picked photo's bytes from the local file
export function readImage(asset: ImagePickerAsset): Promise<ArrayBuffer | Blob> {
  return new File(asset.uri).arrayBuffer()
}
