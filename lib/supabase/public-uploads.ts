// Helpers for admin uploads to the public buckets (magazine, promotions).
// Those files are served straight from Supabase to every visitor, so they must be
// small and cacheable or they burn through the egress quota.

// Seconds browsers/CDN may cache a public file. uploadToSignedUrl sends
// "max-age=undefined" when this is not passed, which disables caching.
export const PUBLIC_CACHE_CONTROL = "604800"; // 7 days

// Longest side in px. Magazine pages render at most ~600px wide (x2 for retina).
const MAX_DIMENSION = 2000;
const WEBP_QUALITY = 0.82;
// Formats the browser can't (or shouldn't) re-encode: animated GIF, SVG, HEIC.
const SKIP_TYPES = new Set(["image/gif", "image/svg+xml", "image/heic", "image/heif"]);

/**
 * Resizes and re-encodes an image to WebP in the browser. Returns the original
 * file for PDFs, unsupported formats, decode failures, or when the result
 * wouldn't be smaller.
 */
export async function compressImageForUpload(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || SKIP_TYPES.has(file.type)) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close();
      return file;
    }
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", WEBP_QUALITY)
    );
    // Some browsers fall back to PNG when WebP encoding is unsupported.
    if (!blob || blob.type !== "image/webp" || blob.size >= file.size) return file;

    // Keep the original extension in the name so "1.jpg" and "1.png" in the same
    // batch don't both become "1.webp" (the second would fail as "already exists").
    const extMatch = file.name.match(/\.([^/.]+)$/);
    const baseName = (extMatch ? file.name.slice(0, -extMatch[0].length) : file.name) || "imagen";
    const suffix = extMatch ? `-${extMatch[1].toLowerCase()}` : "";
    return new File([blob], `${baseName}${suffix}.webp`, {
      type: "image/webp",
      lastModified: file.lastModified,
    });
  } catch {
    return file;
  }
}

/**
 * Compresses files one at a time so dozens of phone photos don't exhaust memory.
 * `onProgress` receives how many files are done, for the upload UI.
 */
export async function compressImagesForUpload(
  files: File[],
  onProgress?: (done: number) => void
): Promise<File[]> {
  const result: File[] = [];
  for (const file of files) {
    result.push(await compressImageForUpload(file));
    onProgress?.(result.length);
  }
  return result;
}
