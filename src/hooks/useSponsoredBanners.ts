import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface SponsoredBanner {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  cta_label: string | null;
  internal_link: string | null;
  external_link: string | null;
  priority: number;
  is_active: boolean;
  starts_at: string;
  ends_at: string | null;
  target_city: string | null;
  target_neighborhood: string | null;
  target_category: string | null;
  target_user_type: string | null;
  business_id: string | null;
  views_count: number;
  clicks_count: number;
  created_at: string;
  updated_at: string;
}

export function useSponsoredBanners(filters?: { category?: string; city?: string }) {
  const [banners, setBanners] = useState<SponsoredBanner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const nowIso = new Date().toISOString();
      let query = supabase
        .from('sponsored_banners' as any)
        .select('*')
        .eq('is_active', true)
        .lte('starts_at', nowIso)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(10);

      const { data, error } = await query;
      if (cancelled) return;
      if (error) {
        console.warn('[useSponsoredBanners]', error.message);
        setBanners([]);
      } else {
        const norm = (s: string) =>
          s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
        const rows = ((data || []) as any as SponsoredBanner[]).filter((b) => {
          if (b.ends_at && new Date(b.ends_at) <= new Date()) return false;
          if (filters?.category && b.target_category && norm(b.target_category) !== norm(filters.category)) return false;
          if (filters?.city && b.target_city && norm(b.target_city) !== norm(filters.city)) return false;
          return true;
        });
        setBanners(rows);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [filters?.category, filters?.city]);

  const trackView = async (id: string) => {
    try {
      await supabase.rpc('increment_banner_view' as any, { banner_id: id });
    } catch {}
  };
  const trackClick = async (id: string) => {
    try {
      await supabase.rpc('increment_banner_click' as any, { banner_id: id });
    } catch {}
  };

  return { banners, loading, trackView, trackClick };
}
