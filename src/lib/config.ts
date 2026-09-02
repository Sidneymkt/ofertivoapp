
// API Configuration for external services

export const API_CONFIG = {
  // Mapbox Configuration - Keys moved to Supabase secrets for security
  MAPBOX: {
    ACCESS_TOKEN: '', // Now retrieved from Supabase secrets
    STYLE: 'mapbox://styles/mapbox/light-v11',
    DEFAULT_CENTER: [-60.0261, -3.1190], // Manaus coordinates
    DEFAULT_ZOOM: 12
  },

  // Google Gemini AI Configuration - Keys moved to Supabase secrets for security
  GEMINI: {
    API_KEY: '', // Now retrieved from Supabase secrets
    MODEL: 'gemini-pro'
  },

  // Google Maps Configuration
  GOOGLE_MAPS: {
    API_KEY: '', // Retrieved from Supabase secrets
    DEFAULT_LOCATION: {
      lat: -3.1190275,
      lng: -60.0217314
    },
    DEFAULT_CITY: 'Manaus, AM, Brasil'
  },

  // Supabase Configuration
  SUPABASE: {
    URL: 'https://wogenchxhjipmhfojker.supabase.co',
    ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvZ2VuY2h4aGppcG1oZm9qa2VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0NzE4NjcsImV4cCI6MjA2NzA0Nzg2N30.sAqsfjAnYFK4sUNWRpKoPC0pkog5kEUS8SEeTV5g_oU'
  },

  // App Configuration
  APP: {
    NAME: 'Ofertivo',
    VERSION: '1.0.0',
    OFFICIAL_DOMAIN: 'https://ofertivoapp.com',
    FB_APP_ID: '', // Configure aqui o ID real do app do Facebook, se houver
    DEFAULT_POINTS_PER_CHECKIN: 50,
    DEFAULT_POINTS_PER_SHARE: 25,
    DEFAULT_POINTS_PER_REVIEW: 30,
    DEFAULT_POINTS_PER_SIGNUP: 100,
    POINTS_TO_CURRENCY_RATE: 0.01, // 100 pontos = R$ 1,00
    REFERRAL_COMMISSION_RATE: 0.25, // 25% de comissão no período de lançamento
  }
}

// Get the base URL for sharing - uses custom domain if configured
export const getAppBaseUrl = () => {
  return API_CONFIG.APP.OFFICIAL_DOMAIN || window.location.origin;
}

// Validation functions for API keys
export const validateApiKeys = () => {
  const missingKeys = []
  
  if (!API_CONFIG.MAPBOX.ACCESS_TOKEN || API_CONFIG.MAPBOX.ACCESS_TOKEN === 'YOUR_MAPBOX_ACCESS_TOKEN') {
    missingKeys.push('VITE_MAPBOX_ACCESS_TOKEN')
  }
  
  if (!API_CONFIG.GEMINI.API_KEY || API_CONFIG.GEMINI.API_KEY === 'YOUR_GEMINI_API_KEY') {
    missingKeys.push('VITE_GEMINI_API_KEY')
  }
  
  if (!API_CONFIG.SUPABASE.URL || API_CONFIG.SUPABASE.URL === 'YOUR_SUPABASE_URL') {
    missingKeys.push('VITE_SUPABASE_URL')
  }
  
  if (!API_CONFIG.SUPABASE.ANON_KEY || API_CONFIG.SUPABASE.ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
    missingKeys.push('VITE_SUPABASE_ANON_KEY')
  }
  
  return {
    isValid: missingKeys.length === 0,
    missingKeys
  }
}
