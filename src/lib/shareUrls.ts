// Custom domain for the app
const APP_BASE_URL = 'https://ofertivoapp.com';
// Supabase URL for Edge Function (OG image generation for crawlers)
const SUPABASE_FUNCTIONS_URL = 'https://wogenchxhjipmhfojker.supabase.co/functions/v1';

export type ShareableContentType = 'offer' | 'raffle' | 'crowdfunding' | 'user' | 'business' | 'business-slug' | 'post';

/**
 * Generates a shareable URL that routes through the Edge Function for social media crawlers.
 * This ensures Open Graph meta tags (including images) are properly served to crawlers.
 * Human users are automatically redirected to the actual app URL.
 */
export function getShareableUrl(type: ShareableContentType, id: string): string {
  const path = getPathForType(type, id);
  // Use Edge Function URL for social sharing - crawlers get meta tags, humans get redirected
  return `${SUPABASE_FUNCTIONS_URL}/og-image?path=${encodeURIComponent(path)}`;
}

/**
 * Gets the direct app URL (for internal navigation, not for sharing)
 */
export function getDirectUrl(type: ShareableContentType, id: string): string {
  return `${APP_BASE_URL}${getPathForType(type, id)}`;
}

/**
 * Gets the app base URL
 */
export function getAppBaseUrl(): string {
  return APP_BASE_URL;
}

function getPathForType(type: ShareableContentType, id: string): string {
  switch (type) {
    case 'offer':
      return `/ofertas/${id}`;
    case 'raffle':
      return `/sorteios/${id}`;
    case 'crowdfunding':
      return `/vaquinhas/${id}`;
    case 'user':
      return `/usuario/${id}`;
    case 'business':
      return `/anunciante/${id}`;
    case 'business-slug':
      return `/loja/${id}`;
    case 'post':
      return `/comunidade?post=${id}`;
    default:
      return '/';
  }
}

/**
 * Extracts content type and ID from a URL path
 */
export function parseShareablePath(path: string): { type: ShareableContentType; id: string } | null {
  const patterns: { regex: RegExp; type: ShareableContentType }[] = [
    { regex: /^\/ofertas\/([a-f0-9-]+)$/i, type: 'offer' },
    { regex: /^\/sorteios\/([a-f0-9-]+)$/i, type: 'raffle' },
    { regex: /^\/vaquinhas\/([a-f0-9-]+)$/i, type: 'crowdfunding' },
    { regex: /^\/usuario\/([a-f0-9-]+)$/i, type: 'user' },
    { regex: /^\/anunciante\/([a-f0-9-]+)$/i, type: 'business' },
    { regex: /^\/comunidade\?post=([a-f0-9-]+)$/i, type: 'post' }
  ];

  for (const pattern of patterns) {
    const match = path.match(pattern.regex);
    if (match) {
      return { type: pattern.type, id: match[1] };
    }
  }

  return null;
}
