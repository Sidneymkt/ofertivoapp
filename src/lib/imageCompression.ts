/**
 * Browser image compression using Canvas.
 * Reduces upload size dramatically (often 70-90%) while preserving visual quality.
 *
 * Strategy:
 * - Resize so largest dimension <= maxDimension
 * - Re-encode as JPEG/WebP at given quality
 * - Skips compression for SVG/GIF (animations/vectors) and very small files
 */

export interface CompressOptions {
  maxDimension?: number;
  quality?: number;
  mimeType?: 'image/jpeg' | 'image/webp';
  minBytesToCompress?: number;
}

const DEFAULTS: Required<CompressOptions> = {
  maxDimension: 1600,
  quality: 0.82,
  mimeType: 'image/jpeg',
  minBytesToCompress: 150 * 1024, // skip if already under 150 KB
};

const loadImage = (file: Blob): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });

/**
 * Compress an image File. Returns a new File (or the original if compression is skipped or counterproductive).
 */
export async function compressImage(file: File, opts: CompressOptions = {}): Promise<File> {
  const o = { ...DEFAULTS, ...opts };

  // Skip non-images, SVG, GIF (animated), and tiny files
  if (!file.type.startsWith('image/')) return file;
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') return file;
  if (file.size <= o.minBytesToCompress) return file;

  try {
    const img = await loadImage(file);
    const { width: w, height: h } = img;
    const maxSide = Math.max(w, h);
    const scale = maxSide > o.maxDimension ? o.maxDimension / maxSide : 1;
    const targetW = Math.round(w * scale);
    const targetH = Math.round(h * scale);

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, targetW, targetH);

    const blob: Blob | null = await new Promise((res) =>
      canvas.toBlob((b) => res(b), o.mimeType, o.quality)
    );
    if (!blob || blob.size >= file.size) return file; // don't upload bigger

    const ext = o.mimeType === 'image/webp' ? 'webp' : 'jpg';
    const baseName = file.name.replace(/\.[^.]+$/, '') || 'image';
    return new File([blob], `${baseName}.${ext}`, {
      type: o.mimeType,
      lastModified: Date.now(),
    });
  } catch (err) {
    console.warn('[compressImage] fallback to original:', err);
    return file;
  }
}

/**
 * Convenience presets per upload type.
 */
export const compressForOffer = (f: File) => compressImage(f, { maxDimension: 1600, quality: 0.82 });
export const compressForCover = (f: File) => compressImage(f, { maxDimension: 1920, quality: 0.85 });
export const compressForAvatar = (f: File) => compressImage(f, { maxDimension: 600, quality: 0.85 });
export const compressForLogo = (f: File) => compressImage(f, { maxDimension: 512, quality: 0.9 });
export const compressForCommunity = (f: File) => compressImage(f, { maxDimension: 1400, quality: 0.82 });
