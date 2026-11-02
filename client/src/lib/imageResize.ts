const IMAGE_EXTENSIONS = /\.(jpe?g|jfif|pjpeg|pjp|png|webp|gif|bmp|avif|heic|heif|tiff?|ico)$/i;

/** True for pictures even when the device does not report a type (common for some phones and Windows). */
export const looksLikeImage = (file: File) => file.type.startsWith('image/') || IMAGE_EXTENSIONS.test(file.name);

const UNREADABLE = 'This picture type cannot be read by your browser (for example HEIC from some iPhones). Please save or export it as JPG or PNG and try again.';

async function decode(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; release: () => void }> {
  // createImageBitmap reads more formats than an img tag and also applies the phone's rotation.
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() };
    } catch {
      /* fall through to the img tag */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error(UNREADABLE));
      i.src = url;
    });
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, release: () => URL.revokeObjectURL(url) };
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
}

const toBlob = (canvas: HTMLCanvasElement, quality: number) => new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', quality));

/**
 * Turns any picture into a JPEG that is small enough to upload. Transparent areas become white (a plain
 * conversion would turn them black), huge phone photos are shrunk, and the quality is lowered step by
 * step until the file fits the upload limit.
 */
export async function resizeImage(file: File, maxSide = 1600, limitBytes = 3_200_000): Promise<Blob> {
  const pic = await decode(file);
  try {
    if (!pic.width || !pic.height) throw new Error(UNREADABLE);
    let blob: Blob | null = null;
    for (const [side, quality] of [[maxSide, 0.86], [maxSide, 0.72], [1280, 0.68], [1024, 0.6]] as const) {
      const scale = Math.min(1, side / Math.max(pic.width, pic.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(pic.width * scale));
      canvas.height = Math.max(1, Math.round(pic.height * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Your browser could not prepare this picture. Please try another browser.');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(pic.source, 0, 0, canvas.width, canvas.height);
      blob = await toBlob(canvas, quality);
      if (blob && blob.size <= limitBytes) return blob;
    }
    if (blob) return blob;
    throw new Error('The picture could not be prepared. Please try a different one.');
  } finally {
    pic.release();
  }
}
