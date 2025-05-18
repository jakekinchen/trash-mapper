export const MAX_IMAGE_BYTES = 3 * 1024 * 1024 // 3MB

export async function compressImageFile(file: File, maxBytes: number = MAX_IMAGE_BYTES): Promise<File> {
  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement('canvas')
  const scale = Math.min(1, 768 / Math.max(bitmap.width, bitmap.height))
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas not supported')
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

  let quality = 0.8
  let blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', quality))
  if (!blob) throw new Error('Compression failed')

  while (blob.size > maxBytes && quality > 0.4) {
    quality -= 0.1
    blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', quality))
    if (!blob) throw new Error('Compression failed')
  }

  return new File([blob], file.name.replace(/\.[^.]+$/, '.webp'), { type: 'image/webp' })
}
