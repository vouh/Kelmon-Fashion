import { createClient } from "@/lib/supabase/client";

/**
 * Image uploads to Supabase Storage.
 *
 * Uploads go straight from the browser to Storage — no bytes pass through a
 * Next.js route — and authorisation is the bucket's RLS policies reading the
 * Firebase token, exactly as for table writes. See the storage section of
 * supabase/migrations/0003_firebase_auth.sql for who may write where.
 *
 * The limits below mirror the buckets' own `file_size_limit` and
 * `allowed_mime_types`. Checking client-side too is not a security measure —
 * Storage rejects an oversized or wrong-typed object regardless — it just turns
 * a generic server error into a message naming the file.
 */

export const BUCKETS = {
  productImages: "product-images",
  dealImages: "deal-images",
  avatars: "avatars",
} as const;

export type Bucket = (typeof BUCKETS)[keyof typeof BUCKETS];

const MAX_BYTES: Record<Bucket, number> = {
  "product-images": 5 * 1024 * 1024,
  "deal-images": 5 * 1024 * 1024,
  avatars: 2 * 1024 * 1024,
};

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];

/** A filename-safe extension, from the MIME type first and the name second. */
function extensionFor(file: File): string {
  const fromType = file.type.split("/")[1];
  if (fromType && /^[a-z0-9]+$/i.test(fromType)) {
    return fromType === "jpeg" ? "jpg" : fromType.toLowerCase();
  }
  const fromName = file.name.split(".").pop();
  return fromName && /^[a-z0-9]+$/i.test(fromName) ? fromName.toLowerCase() : "jpg";
}

/** Collision-proof without needing to read the bucket first. */
function uniqueName(file: File): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extensionFor(file)}`;
}

function assertUploadable(file: File, bucket: Bucket): void {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(`${file.name} is not a supported image (JPEG, PNG, WebP, AVIF or GIF).`);
  }
  const max = MAX_BYTES[bucket];
  if (file.size > max) {
    throw new Error(`${file.name} is larger than ${Math.round(max / 1024 / 1024)}MB.`);
  }
}

/** The public URL for an object. Every Kelmon bucket is public-read. */
export function publicUrl(bucket: Bucket, path: string): string {
  return createClient().storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

/**
 * Uploads one file and returns its public URL.
 *
 * `cacheControl` is a year because the path carries a timestamp, so an object is
 * never rewritten — a changed image is a new path.
 */
export async function uploadTo(bucket: Bucket, path: string, file: File): Promise<string> {
  assertUploadable(file, bucket);

  const { error } = await createClient()
    .storage.from(bucket)
    .upload(path, file, { cacheControl: "31536000", upsert: false });

  if (error) throw new Error(error.message);
  return publicUrl(bucket, path);
}

/** Product photos, foldered by slug so a product's images stay together. */
export function uploadProductImage(file: File, slug: string): Promise<string> {
  return uploadTo(BUCKETS.productImages, `${slug || "product"}/${uniqueName(file)}`, file);
}

export function uploadDealImage(file: File): Promise<string> {
  return uploadTo(BUCKETS.dealImages, uniqueName(file), file);
}

/**
 * Avatars. The UID folder is not cosmetic — the bucket's policy compares the
 * first path segment against the caller's UID, so an upload anywhere else is
 * rejected.
 */
export function uploadAvatar(file: File, uid: string): Promise<string> {
  if (!uid) throw new Error("You must be signed in to change your photo.");
  return uploadTo(BUCKETS.avatars, `${uid}/${uniqueName(file)}`, file);
}

/** Uploads several files in sequence, so the first error names its own file. */
export async function uploadAll(
  files: Iterable<File>,
  upload: (file: File) => Promise<string>
): Promise<string[]> {
  const urls: string[] = [];
  for (const file of files) {
    urls.push(await upload(file));
  }
  return urls;
}

/**
 * Deletes an object given the public URL stored on the row.
 *
 * A public URL looks like
 * `https://<ref>.supabase.co/storage/v1/object/public/<bucket>/<path>`, so the
 * bucket and path can be recovered from it. Returns false for anything that is
 * not one of ours — an externally hosted image is nothing to delete.
 */
export async function deleteByPublicUrl(url: string): Promise<boolean> {
  const marker = "/storage/v1/object/public/";
  const index = url.indexOf(marker);
  if (index === -1) return false;

  const [bucket, ...rest] = url.slice(index + marker.length).split("/");
  const path = rest.join("/");
  if (!bucket || !path) return false;

  const { error } = await createClient().storage.from(bucket).remove([decodeURIComponent(path)]);
  if (error) throw new Error(error.message);
  return true;
}
