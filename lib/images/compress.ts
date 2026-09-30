/**
 * Browser-side product-image normalisation, run before a product photo is uploaded.
 *
 * Every product photo becomes the same 1200px white square, with the original
 * image centred and fitted inside it without cropping or stretching. Re-encoding
 * as WebP usually lands at 60–200 KB, which keeps the shop fast on campus data.
 * Uploaded objects are then served with a one-year Cache-Control
 * (see lib/supabase/storage.ts), so each browser downloads a photo once and
 * reuses it from its HTTP cache on every later visit.
 */

/** Matches the approved Kelmon catalogue images and leaves 5% breathing room. */
const CANVAS_SIZE = 1200;
const PADDING = 60;
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
  const img = await loadImage(file);
  const available = CANVAS_SIZE - PADDING * 2;
  const scale = Math.min(available / img.naturalWidth, available / img.naturalHeight);
  const width = Math.round(img.naturalWidth * scale);
  const height = Math.round(img.naturalHeight * scale);
  const x = Math.round((CANVAS_SIZE - width) / 2);
  const y = Math.round((CANVAS_SIZE - height) / 2);

  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, x, y, width, height);

  // Safari before 17 can't encode WebP and silently hands back a PNG, so check
  // the type that actually came out and fall back to JPEG.
  let blob = await toBlob(canvas, "image/webp", QUALITY);
  if (!blob || blob.type !== "image/webp") {
    blob = await toBlob(canvas, "image/jpeg", QUALITY);
  }
  if (!blob) return file;

  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  const base = file.name.replace(/\.[^.]+$/, "") || "image";
  return new File([blob], `${base}.${ext}`, { type: blob.type, lastModified: Date.now() });
}
