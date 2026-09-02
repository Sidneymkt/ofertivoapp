import { Helmet } from 'react-helmet-async';
import { API_CONFIG } from '@/lib/config';

interface SEOHeadProps {
  title: string;
  description: string;
  image?: string;
  type?: 'website' | 'article' | 'profile';
  url?: string;
  siteName?: string;
  locale?: string;
  twitterHandle?: string;
  fbAppId?: string;
}

// Default OG image - should be 1200x630
const DEFAULT_OG_IMAGE = "https://storage.googleapis.com/gpt-engineer-file-uploads/JPKEQ3Sg09UQwFg2Zlg1WtYkX6o2/social-images/social-1762531660055-Posts Ofertivo Instagranm_20251107_111948_0000.png";

// Helper to ensure absolute URL
const getAbsoluteUrl = (path?: string): string => {
  if (!path) return '';
  
  // Already absolute URL
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // Supabase storage URL pattern
  if (path.startsWith('/storage/')) {
    return `${window.location.origin}${path}`;
  }
  
  // Relative path
  if (path.startsWith('/')) {
    return `${window.location.origin}${path}`;
  }
  
  return path;
};

// Get current page URL
const getCurrentUrl = (customUrl?: string): string => {
  if (customUrl) {
    if (customUrl.startsWith('http')) return customUrl;
    return `${window.location.origin}${customUrl}`;
  }
  return window.location.href;
};

export const SEOHead = ({ 
  title, 
  description, 
  image,
  type = 'website',
  url,
  siteName = 'Ofertivo',
  locale = 'pt_BR',
  twitterHandle = '@ofertivo',
  fbAppId,
}: SEOHeadProps) => {
  const fullTitle = `${title} | ${siteName}`;
  const currentUrl = getCurrentUrl(url);
  
  // Use provided image or fallback to default
  const ogImage = image ? getAbsoluteUrl(image) : DEFAULT_OG_IMAGE;
  
  // Truncate description to 160 chars for SEO
  const metaDescription = description.length > 160 
    ? description.substring(0, 157) + '...' 
    : description;

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={metaDescription} />
      
      {/* Canonical URL */}
      <link rel="canonical" href={currentUrl} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:secure_url" content={ogImage} />
      <meta property="og:image:type" content="image/jpeg" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={title} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content={locale} />
      {fbAppId && <meta property="fb:app_id" content={fbAppId} />}
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={currentUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:image:alt" content={title} />
      <meta name="twitter:site" content={twitterHandle} />
      <meta name="twitter:creator" content={twitterHandle} />
      
      {/* WhatsApp specific */}
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
    </Helmet>
  );
};
