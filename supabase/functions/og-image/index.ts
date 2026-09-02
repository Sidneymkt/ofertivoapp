import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

const DEFAULT_IMAGE = "https://wogenchxhjipmhfojker.supabase.co/storage/v1/object/public/offer-images/ofertivo-social-share.png";
const STORAGE_BASE_URL = "https://wogenchxhjipmhfojker.supabase.co/storage/v1/object/public";
const SITE_NAME = "Ofertivo";
const BASE_URL = "https://ofertivoapp.com";
const FB_APP_ID = ""; // Configure se tiver um Facebook App ID

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PageData {
  title: string;
  description: string;
  image: string;
  type: string;
  url: string;
}

/**
 * Ensures an image URL is absolute and accessible
 */
function ensureAbsoluteImageUrl(imageUrl: string | null | undefined): string {
  if (!imageUrl) return DEFAULT_IMAGE;
  
  // Already absolute URL
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  
  // Relative path starting with /
  if (imageUrl.startsWith('/')) {
    return `${STORAGE_BASE_URL}${imageUrl}`;
  }
  
  // Assume it's a storage path
  return `${STORAGE_BASE_URL}/${imageUrl}`;
}

async function getOfferData(offerId: string): Promise<PageData | null> {
  const { data: offer, error } = await supabase
    .from('offers')
    .select(`
      id,
      title,
      description,
      image_url,
      image_urls,
      discounted_price,
      original_price,
      businesses!inner(name)
    `)
    .eq('id', offerId)
    .single();

  if (error || !offer) {
    console.error('Error fetching offer:', error);
    return null;
  }

  // Get the primary image - prioritize image_urls array
  let image = DEFAULT_IMAGE;
  if (offer.image_urls && Array.isArray(offer.image_urls) && offer.image_urls.length > 0) {
    image = ensureAbsoluteImageUrl(offer.image_urls[0] as string);
  } else if (offer.image_url) {
    image = ensureAbsoluteImageUrl(offer.image_url);
  }

  const discount = offer.original_price > 0 
    ? Math.round(((offer.original_price - offer.discounted_price) / offer.original_price) * 100)
    : 0;

  const businessName = (offer.businesses as any)?.name || 'Ofertivo';

  return {
    title: `${offer.title} - ${discount}% OFF`,
    description: offer.description || `Aproveite esta oferta incrível em ${businessName}!`,
    image,
    type: 'article',
    url: `${BASE_URL}/ofertas/${offerId}`
  };
}

async function getRaffleData(raffleId: string): Promise<PageData | null> {
  const { data: raffle, error } = await supabase
    .from('raffles')
    .select(`
      id,
      title,
      description,
      prize,
      image_url,
      businesses!inner(name)
    `)
    .eq('id', raffleId)
    .single();

  if (error || !raffle) {
    console.error('Error fetching raffle:', error);
    return null;
  }

  const businessName = (raffle.businesses as any)?.name || 'Ofertivo';

  return {
    title: `Sorteio: ${raffle.title}`,
    description: raffle.description || `Concorra ao prêmio: ${raffle.prize} em ${businessName}!`,
    image: ensureAbsoluteImageUrl(raffle.image_url),
    type: 'article',
    url: `${BASE_URL}/sorteios/${raffleId}`
  };
}

async function getCampaignData(campaignId: string): Promise<PageData | null> {
  const { data: campaign, error } = await supabase
    .from('crowdfunding_campaigns')
    .select('*')
    .eq('id', campaignId)
    .single();

  if (error || !campaign) {
    console.error('Error fetching campaign:', error);
    return null;
  }

  const progress = campaign.goal_points > 0 
    ? Math.round((campaign.current_points / campaign.goal_points) * 100)
    : 0;

  return {
    title: `Vaquinha: ${campaign.title}`,
    description: campaign.description || `Ajude esta campanha! Já arrecadamos ${progress}% da meta.`,
    image: ensureAbsoluteImageUrl(campaign.image_url),
    type: 'article',
    url: `${BASE_URL}/vaquinhas/${campaignId}`
  };
}

async function getUserProfileData(userId: string): Promise<PageData | null> {
  // SECURITY: profiles are private per RLS. Do NOT leak full_name, bio,
  // total_points, avatar or cover. Return only a generic share card.
  return {
    title: 'Perfil no Ofertivo',
    description: 'Confira este perfil na comunidade Ofertivo.',
    image: DEFAULT_IMAGE,
    type: 'profile',
    url: `${BASE_URL}/usuario/${userId}`
  };
}

async function getBusinessProfileData(businessId: string): Promise<PageData | null> {
  const { data: business, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', businessId)
    .single();

  if (error || !business) {
    console.error('Error fetching business:', error);
    return null;
  }

  const image = ensureAbsoluteImageUrl(business.cover_image_url || business.logo_url);
  const rating = business.average_rating ? `⭐ ${business.average_rating.toFixed(1)}` : '';

  return {
    title: business.name,
    description: business.description || `${rating} • ${business.followers_count || 0} seguidores • ${business.category}`,
    image,
    type: 'profile',
    url: `${BASE_URL}/anunciante/${businessId}`
  };
}

async function getBusinessBySlugData(slug: string): Promise<PageData | null> {
  const { data: business, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (error || !business) {
    console.error('Error fetching business by slug:', error);
    return null;
  }

  const image = ensureAbsoluteImageUrl(business.cover_image_url || business.logo_url);
  const rating = business.average_rating ? `⭐ ${business.average_rating.toFixed(1)}` : '';

  return {
    title: business.name,
    description: business.description || `${rating} • ${business.followers_count || 0} seguidores • ${business.category}`,
    image,
    type: 'profile',
    url: `${BASE_URL}/loja/${slug}`
  };
}

async function getPostData(postId: string): Promise<PageData | null> {
  const { data: post, error } = await supabase
    .from('community_posts')
    .select(`
      id,
      content,
      image_url,
      user_id,
      post_type
    `)
    .eq('id', postId)
    .single();

  if (error || !post) {
    console.error('Error fetching post:', error);
    return null;
  }

  // Get author info
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url')
    .eq('user_id', post.user_id)
    .single();

  const authorName = profile?.full_name || 'Usuário Ofertivo';
  const description = post.content?.substring(0, 150) + (post.content?.length > 150 ? '...' : '') || 'Publicação na comunidade Ofertivo';

  // Prioritize post image, then author avatar
  const image = ensureAbsoluteImageUrl(post.image_url || profile?.avatar_url);

  return {
    title: `${authorName} na Comunidade Ofertivo`,
    description,
    image,
    type: 'article',
    url: `${BASE_URL}/comunidade?post=${postId}`
  };
}

function generateHTML(data: PageData): string {
  const escapedTitle = data.title.replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const escapedDescription = data.description.replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const fullTitle = `${escapedTitle} | ${SITE_NAME}`;
  
  // fb:app_id só é incluído se configurado
  const fbAppIdMeta = FB_APP_ID ? `<meta property="fb:app_id" content="${FB_APP_ID}">` : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- Primary Meta Tags -->
  <title>${fullTitle}</title>
  <meta name="title" content="${fullTitle}">
  <meta name="description" content="${escapedDescription}">
  
  <!-- Open Graph / Facebook / WhatsApp -->
  <meta property="og:type" content="${data.type}">
  <meta property="og:url" content="${data.url}">
  <meta property="og:title" content="${fullTitle}">
  <meta property="og:description" content="${escapedDescription}">
  <meta property="og:image" content="${data.image}">
  <meta property="og:image:secure_url" content="${data.image}">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${escapedTitle}">
  <meta property="og:site_name" content="${SITE_NAME}">
  <meta property="og:locale" content="pt_BR">
  ${fbAppIdMeta}
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="${data.url}">
  <meta name="twitter:title" content="${fullTitle}">
  <meta name="twitter:description" content="${escapedDescription}">
  <meta name="twitter:image" content="${data.image}">
  <meta name="twitter:image:alt" content="${escapedTitle}">
  <meta name="twitter:site" content="@ofertivo">
  
  <!-- LinkedIn -->
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  
  <!-- Redirect to SPA for regular browsers -->
  <script>
    // If not a crawler, redirect to the actual page
    if (typeof window !== 'undefined') {
      window.location.replace('${data.url}');
    }
  </script>
  <noscript>
    <meta http-equiv="refresh" content="0;url=${data.url}">
  </noscript>
</head>
<body>
  <h1>${escapedTitle}</h1>
  <p>${escapedDescription}</p>
  <img src="${data.image}" alt="${escapedTitle}" style="max-width:100%;">
  <p><a href="${data.url}">Ver no Ofertivo</a></p>
</body>
</html>`;
}

function isCrawler(userAgent: string): boolean {
  const crawlerPatterns = [
    'facebookexternalhit',
    'Facebot',
    'WhatsApp',
    'LinkedInBot',
    'Twitterbot',
    'Slackbot',
    'TelegramBot',
    'Discordbot',
    'Pinterest',
    'Googlebot',
    'bingbot',
    'Baiduspider',
    'YandexBot'
  ];
  
  const lowerUA = userAgent.toLowerCase();
  return crawlerPatterns.some(pattern => lowerUA.includes(pattern.toLowerCase()));
}

function parseRoute(path: string): { type: string; id: string } | null {
  // Suporte para rotas em português e inglês
  const patterns = [
    { regex: /^\/ofertas\/([a-f0-9-]+)$/i, type: 'offer' },
    { regex: /^\/offer\/([a-f0-9-]+)$/i, type: 'offer' },
    { regex: /^\/sorteios\/([a-f0-9-]+)$/i, type: 'raffle' },
    { regex: /^\/raffle\/([a-f0-9-]+)$/i, type: 'raffle' },
    { regex: /^\/vaquinhas\/([a-f0-9-]+)$/i, type: 'campaign' },
    { regex: /^\/crowdfunding\/([a-f0-9-]+)$/i, type: 'campaign' },
    { regex: /^\/usuario\/([a-f0-9-]+)$/i, type: 'user' },
    { regex: /^\/user\/([a-f0-9-]+)$/i, type: 'user' },
    { regex: /^\/anunciante\/([a-f0-9-]+)$/i, type: 'business' },
    { regex: /^\/business\/([a-f0-9-]+)$/i, type: 'business' },
    { regex: /^\/loja\/([a-z0-9-]+)$/i, type: 'business-slug' },
    { regex: /^\/comunidade\?post=([a-f0-9-]+)$/i, type: 'post' },
    { regex: /^\/community\?post=([a-f0-9-]+)$/i, type: 'post' },
    { regex: /post=([a-f0-9-]+)/i, type: 'post' }
  ];

  for (const pattern of patterns) {
    const match = path.match(pattern.regex);
    if (match) {
      return { type: pattern.type, id: match[1] };
    }
  }

  return null;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.searchParams.get('path') || '/';
  const userAgent = req.headers.get('user-agent') || '';

  console.log(`OG Image request - Path: ${path}, UA: ${userAgent.substring(0, 100)}`);

  // Check if this is a crawler - always return HTML with meta tags for crawlers
  const isCrawlerRequest = isCrawler(userAgent);
  
  if (!isCrawlerRequest) {
    // Redirect normal users to the SPA
    return new Response(null, {
      status: 302,
      headers: { 
        ...corsHeaders,
        'Location': `${BASE_URL}${path}` 
      }
    });
  }

  // Parse the route
  const route = parseRoute(path);
  
  if (!route) {
    // Return default meta for unknown routes
    const defaultData: PageData = {
      title: 'Ofertivo - Ofertas e Promoções Locais',
      description: 'Descubra ofertas incríveis perto de você! O Ofertivo conecta você às melhores promoções locais.',
      image: DEFAULT_IMAGE,
      type: 'website',
      url: BASE_URL
    };
    
    return new Response(generateHTML(defaultData), {
      headers: { 
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8' 
      }
    });
  }

  // Fetch data based on route type
  let pageData: PageData | null = null;

  switch (route.type) {
    case 'offer':
      pageData = await getOfferData(route.id);
      break;
    case 'raffle':
      pageData = await getRaffleData(route.id);
      break;
    case 'campaign':
      pageData = await getCampaignData(route.id);
      break;
    case 'user':
      pageData = await getUserProfileData(route.id);
      break;
    case 'business':
      pageData = await getBusinessProfileData(route.id);
      break;
    case 'business-slug':
      pageData = await getBusinessBySlugData(route.id);
      break;
    case 'post':
      pageData = await getPostData(route.id);
      break;
  }

  if (!pageData) {
    // Fallback to default if data not found
    pageData = {
      title: 'Ofertivo - Ofertas e Promoções Locais',
      description: 'Descubra ofertas incríveis perto de você!',
      image: DEFAULT_IMAGE,
      type: 'website',
      url: `${BASE_URL}${path}`
    };
  }

  console.log(`Returning OG data for ${route.type}/${route.id}:`, pageData.title, pageData.image);

  return new Response(generateHTML(pageData), {
    headers: { 
      ...corsHeaders,
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    }
  });
});
