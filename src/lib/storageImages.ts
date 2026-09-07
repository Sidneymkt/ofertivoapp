import { supabase } from '@/integrations/supabase/client';

const STORAGE_BUCKETS = ['avatars', 'user-covers', 'business-covers', 'business-logos'] as const;

type StorageImageLocation = {
  bucket: string;
  path: string;
};

export const getStorageImageLocation = (value?: string | null): StorageImageLocation | null => {
  if (!value || value.startsWith('blob:') || value.startsWith('data:')) return null;

  let pathname = value;
  try {
    pathname = new URL(value).pathname;
  } catch {
    pathname = value.split('?')[0];
  }

  const decodedPathname = decodeURIComponent(pathname);
  for (const bucket of STORAGE_BUCKETS) {
    const marker = `/${bucket}/`;
    const markerIndex = decodedPathname.indexOf(marker);
    if (markerIndex >= 0) {
      const path = decodedPathname.slice(markerIndex + marker.length).replace(/^\/+/, '');
      return path ? { bucket, path } : null;
    }

    if (decodedPathname.startsWith(`${bucket}/`)) {
      return { bucket, path: decodedPathname.slice(bucket.length + 1) };
    }
  }

  return null;
};

export const getStorageImageUrl = async (value?: string | null): Promise<string | null> => {
  if (!value) return null;

  const location = getStorageImageLocation(value);
  if (!location) return value;

  const { data, error } = await supabase.storage
    .from(location.bucket)
    .createSignedUrl(location.path, 60 * 60);

  if (error) {
    console.warn('[StorageImage] Could not create temporary image URL:', error.message);
    return null;
  }

  return data.signedUrl;
};

export const removeStorageImage = async (value?: string | null) => {
  const location = getStorageImageLocation(value);
  if (!location) return;

  const { error } = await supabase.storage.from(location.bucket).remove([location.path]);
  if (error) {
    console.warn('[StorageImage] Could not remove previous image:', error.message);
  }
};