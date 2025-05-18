import sharp from 'sharp'

export const MAX_IMAGE_BYTES = 3 * 1024 * 1024 // 3MB

export async function optimizeImage(buffer: Buffer, maxBytes: number = MAX_IMAGE_BYTES): Promise<Buffer> {
  let quality = 80
  let output = await sharp(buffer)
    .resize(768, 768, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality })
    .toBuffer()

  while (output.byteLength > maxBytes && quality > 40) {
    quality -= 10
    output = await sharp(buffer)
      .resize(768, 768, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality })
      .toBuffer()
  }

  return output
}
