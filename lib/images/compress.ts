/**
 * Browser-side image compression, run before a product photo is uploaded.
 *
 * A phone photo is typically 3–8 MB at 4000px; a product card needs a few
 * hundred pixels. Downscaling to MAX_EDGE and re-encoding as WebP usually
 * lands at 60–200 KB, which is what makes the shop fast on campus data.
 * Uploaded objects are then served with a one-year Cache-Control
 * (see lib/supabase/storage.ts), so each browser downloads a photo once and
 * reuses it from its HTTP cache on every later visit.
 */

/** Sharp on the largest product view (a ~450px-wide square at 2x density) with headroom. */
const MAX_EDGE = 1200;
const QUALITY = 0.82;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`${file.name} could not be read as an image.`));
    };
    img.src = url;
  });
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function compressImage(file: File): Promise<File> {
  // Animated GIFs would lose their animation on a canvas; leave them alone.
  if (file.type === "image/gif") return file;

  const img = await loadImage(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.round(img.naturalWidth * scale);
  const height = Math.round(img.naturalHeight * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(img, 0, 0, width, height);

  // Safari before 17 can't encode WebP and silently hands back a PNG, so check
  // the type that actually came out and fall back to JPEG.
  let blob = await toBlob(canvas, "image/webp", QUALITY);
  if (!blob || blob.type !== "image/webp") {
    blob = await toBlob(canvas, "image/jpeg", QUALITY);
  }
  // Never upload something bigger than the original.
  if (!blob || blob.size >= file.size) return file;

  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  const base = file.name.replace(/\.[^.]+$/, "") || "image";
  return new File([blob], `${base}.${ext}`, { type: blob.type, lastModified: Date.now() });
}
