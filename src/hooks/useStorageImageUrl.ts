import { useEffect, useState } from 'react';
import { getStorageImageUrl } from '@/lib/storageImages';

export const useStorageImageUrl = (source?: string | null) => {
  const [url, setUrl] = useState<string | null>(() => source || null);
  const [isLoading, setIsLoading] = useState(Boolean(source));
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    setHasError(false);
    if (!source) {
      setUrl(null);
      setIsLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setIsLoading(true);
    getStorageImageUrl(source)
      .then((resolvedUrl) => {
        if (cancelled) return;
        setUrl(resolvedUrl);
        setHasError(!resolvedUrl);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.warn('[StorageImage] Failed to resolve image:', error);
        setUrl(null);
        setHasError(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [source]);

  const handleError = () => {
    setUrl(null);
    setHasError(true);
    setIsLoading(false);
  };

  return { url, isLoading, hasError, handleError };
};