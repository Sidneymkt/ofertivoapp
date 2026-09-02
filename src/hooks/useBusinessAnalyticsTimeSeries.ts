import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type AnalyticsPeriod = 7 | 30 | 90;

export interface AnalyticsDayPoint {
  date: string; // YYYY-MM-DD
  label: string; // dd/MM
  views: number;
  likes: number;
  checkins: number;
  shares: number;
  points: number;
  followers: number;
}

const fmt = (d: Date) => d.toISOString().slice(0, 10);
const labelOf = (d: Date) =>
  `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;

export const useBusinessAnalyticsTimeSeries = (
  businessId: string | null | undefined,
  period: AnalyticsPeriod = 30
) => {
  return useQuery({
    queryKey: ['business-analytics-timeseries', businessId, period],
    enabled: !!businessId,
    staleTime: 60_000,
    queryFn: async (): Promise<AnalyticsDayPoint[]> => {
      if (!businessId) return [];

      const end = new Date();
      end.setHours(23, 59, 59, 999);
      const start = new Date();
      start.setDate(start.getDate() - (period - 1));
      start.setHours(0, 0, 0, 0);

      // Build empty buckets for every day in the range
      const buckets = new Map<string, AnalyticsDayPoint>();
      for (let i = 0; i < period; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        const key = fmt(d);
        buckets.set(key, {
          date: key,
          label: labelOf(d),
          views: 0,
          likes: 0,
          checkins: 0,
          shares: 0,
          points: 0,
          followers: 0,
        });
      }

      const startIso = start.toISOString();
      const endIso = end.toISOString();

      // Get offers for this business to filter dependent tables
      const { data: offers } = await supabase
        .from('offers')
        .select('id')
        .eq('business_id', businessId);
      const offerIds = (offers || []).map((o: { id: string }) => o.id);

      const inc = (date: string, field: keyof AnalyticsDayPoint, by = 1) => {
        const b = buckets.get(date);
        if (!b) return;
        (b[field] as number) = (b[field] as number) + by;
      };

      // Run independent queries in parallel
      const [viewsRes, likesRes, checkinsRes, sharesRes, followsRes] = await Promise.all([
        offerIds.length
          ? supabase
              .from('offer_views' as any)
              .select('created_at')
              .in('offer_id', offerIds)
              .gte('created_at', startIso)
              .lte('created_at', endIso)
          : Promise.resolve({ data: [] as any[] }),
        offerIds.length
          ? supabase
              .from('offer_likes' as any)
              .select('created_at')
              .in('offer_id', offerIds)
              .gte('created_at', startIso)
              .lte('created_at', endIso)
          : Promise.resolve({ data: [] as any[] }),
        supabase
          .from('checkin_validations')
          .select('created_at, points_awarded')
          .eq('business_id', businessId)
          .gte('created_at', startIso)
          .lte('created_at', endIso),
        supabase
          .from('business_analytics')
          .select('created_at, event_type')
          .eq('business_id', businessId)
          .eq('event_type', 'share')
          .gte('created_at', startIso)
          .lte('created_at', endIso),
        supabase
          .from('follows')
          .select('created_at')
          .eq('business_id', businessId)
          .gte('created_at', startIso)
          .lte('created_at', endIso),
      ]);

      (viewsRes.data || []).forEach((r: any) => inc(fmt(new Date(r.created_at)), 'views'));
      (likesRes.data || []).forEach((r: any) => inc(fmt(new Date(r.created_at)), 'likes'));
      (checkinsRes.data || []).forEach((r: any) => {
        const day = fmt(new Date(r.created_at));
        inc(day, 'checkins');
        inc(day, 'points', r.points_awarded || 0);
      });
      (sharesRes.data || []).forEach((r: any) => inc(fmt(new Date(r.created_at)), 'shares'));
      (followsRes.data || []).forEach((r: any) => inc(fmt(new Date(r.created_at)), 'followers'));

      return Array.from(buckets.values());
    },
  });
};
