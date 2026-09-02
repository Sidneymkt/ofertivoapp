import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/** True when the SECURITY DEFINER RPC `get_engaged_users_addresses` is missing or unauthorized. */
const isRpcMissingError = (err: any): boolean => {
  if (!err) return false;
  const code = String(err.code || '');
  const msg = String(err.message || '').toLowerCase();
  return (
    code === 'PGRST202' ||
    code === '42883' ||
    code === '42501' ||
    msg.includes('could not find the function') ||
    msg.includes('function public.get_engaged_users_addresses') ||
    msg.includes('does not exist') ||
    msg.includes('permission denied')
  );
};

export interface EngagedUser {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  locationSource: 'checkin' | 'address' | 'offer_proximity' | 'business_fallback' | null;
  actions: EngagementAction[];
  lastActionAt: string;
  totalInteractions: number;
  hotScore: number; // 0-100 purchase probability
  hotLevel: 'cold' | 'warm' | 'hot' | 'fire'; // visual classification
}

export interface EngagementAction {
  type: 'follow' | 'favorite' | 'checkin' | 'like' | 'raffle' | 'view';
  label: string;
  date: string;
  offerId?: string;
  offerTitle?: string;
}

/**
 * Apply privacy jitter: random offset of 100-300m to protect user's exact location.
 * Uses a deterministic seed from userId so position stays stable across renders.
 */
const applyPrivacyJitter = (lat: number, lng: number, userId: string, source: 'checkin' | 'address' | 'offer_proximity' | 'business_fallback' | null): { lat: number; lng: number } => {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0;
  }
  const hash2 = ((hash << 13) ^ hash) | 0;

  const angle = ((hash >>> 0) % 3600) / 3600 * 2 * Math.PI;
  // Minimal jitter to preserve neighborhood accuracy:
  // Address (registered): 20-60m — mantém o bairro exato do cadastro.
  // Checkin GPS: 40-120m — pequeno desvio para privacidade sem sair da quadra.
  // Address: 20-60m (preserves exact neighborhood)
  // Checkin GPS: 40-120m (small privacy offset)
  // Offer proximity: 150-400m (spread users around offer)
  // Business fallback: 200-800m (spread around business so they don't stack)
  const ranges: Record<string, [number, number]> = {
    address: [20, 60],
    checkin: [40, 120],
    offer_proximity: [150, 400],
    business_fallback: [200, 800],
  };
  const [minDist, maxDist] = ranges[source || 'checkin'] || [40, 120];
  const distMeters = minDist + ((hash2 >>> 0) % (maxDist - minDist));

  const latOffset = (distMeters / 111320) * Math.cos(angle);
  const lngOffset = (distMeters / (111320 * Math.cos(lat * Math.PI / 180))) * Math.sin(angle);

  return { lat: lat + latOffset, lng: lng + lngOffset };
};

/**
 * Validate coordinates are within reasonable Brazil bounds and not obviously wrong (0,0 or city-center defaults).
 */
const isValidCoordinate = (lat: number, lng: number): boolean => {
  // Must be within Brazil bounds
  if (lat < -34 || lat > 6 || lng < -74 || lng > -34) return false;
  // Reject 0,0 or very close to it
  if (Math.abs(lat) < 0.1 && Math.abs(lng) < 0.1) return false;
  return true;
};

/**
 * Calculate Hot Score (0-100) based on:
 * - Interaction type weight (checkin=25, favorite=20, follow=15, like=10, raffle=18, view=5)
 * - Recency bonus (interactions in last 7 days worth more)
 * - Frequency bonus (more interactions = higher score)
 * - Diversity bonus (multiple interaction types = higher engagement)
 */
const calculateHotScore = (actions: EngagementAction[]): { score: number; level: 'cold' | 'warm' | 'hot' | 'fire' } => {
  if (actions.length === 0) return { score: 0, level: 'cold' };

  const TYPE_WEIGHTS: Record<string, number> = {
    checkin: 25,
    favorite: 20,
    raffle: 18,
    follow: 15,
    like: 10,
    view: 5,
  };

  const now = Date.now();
  const DAY_MS = 86400000;
  let rawScore = 0;

  actions.forEach(action => {
    const weight = TYPE_WEIGHTS[action.type] || 5;
    const ageMs = now - new Date(action.date).getTime();
    const ageDays = ageMs / DAY_MS;
    
    // Recency multiplier: last 24h = 2x, last 7d = 1.5x, last 30d = 1x, older = 0.5x
    let recencyMultiplier = 0.5;
    if (ageDays <= 1) recencyMultiplier = 2.0;
    else if (ageDays <= 7) recencyMultiplier = 1.5;
    else if (ageDays <= 30) recencyMultiplier = 1.0;
    
    rawScore += weight * recencyMultiplier;
  });

  // Frequency bonus: cap at 10 interactions
  const frequencyBonus = Math.min(actions.length, 10) * 2;
  
  // Diversity bonus: more unique action types = more engaged
  const uniqueTypes = new Set(actions.map(a => a.type)).size;
  const diversityBonus = uniqueTypes * 5;

  rawScore += frequencyBonus + diversityBonus;

  // Normalize to 0-100
  const score = Math.min(100, Math.round(rawScore));

  let level: 'cold' | 'warm' | 'hot' | 'fire';
  if (score >= 75) level = 'fire';
  else if (score >= 50) level = 'hot';
  else if (score >= 25) level = 'warm';
  else level = 'cold';

  return { score, level };
};

export const useNearbyEngagedUsers = (businessId: string | null) => {
  const queryClient = useQueryClient();
  const [rpcMissing, setRpcMissing] = useState(false);

  const query = useQuery({
    queryKey: ['nearby-engaged-users', businessId],
    queryFn: async (): Promise<EngagedUser[]> => {
      if (!businessId) return [];

      const userMap = new Map<string, EngagedUser>();

      const getOrCreate = (userId: string): EngagedUser => {
        if (!userMap.has(userId)) {
          userMap.set(userId, {
            userId,
            fullName: '',
            avatarUrl: null,
            latitude: null,
            longitude: null,
            locationSource: null,
            actions: [],
            lastActionAt: '',
            totalInteractions: 0,
            hotScore: 0,
            hotLevel: 'cold',
          });
        }
        return userMap.get(userId)!;
      };

      // 1. Followers
      const { data: followers } = await supabase
        .from('follows')
        .select('user_id, created_at')
        .eq('business_id', businessId);

      (followers || []).forEach(f => {
        const u = getOrCreate(f.user_id);
        u.actions.push({ type: 'follow', label: 'Seguidor', date: f.created_at });
      });

      // 2. Get offer IDs for this business
      const { data: offers } = await supabase
        .from('offers')
        .select('id, title')
        .eq('business_id', businessId);

      const offerIds = (offers || []).map(o => o.id);
      const offerMap = new Map<string, string>((offers || []).map(o => [o.id, o.title]));

      if (offerIds.length > 0) {
        // 3. Favorites (use offer coordinates as location proxy)
        const { data: favs } = await supabase
          .from('favorites')
          .select('user_id, offer_id, created_at')
          .in('offer_id', offerIds);

        (favs || []).forEach(f => {
          const u = getOrCreate(f.user_id);
          u.actions.push({
            type: 'favorite',
            label: 'Favoritou oferta',
            date: f.created_at,
            offerId: f.offer_id,
            offerTitle: offerMap.get(f.offer_id),
          });
        });

        // 4. Likes
        const { data: likes } = await supabase
          .from('offer_likes')
          .select('user_id, offer_id, created_at')
          .in('offer_id', offerIds);

        (likes || []).forEach(l => {
          const u = getOrCreate(l.user_id);
          u.actions.push({
            type: 'like',
            label: 'Curtiu oferta',
            date: l.created_at,
            offerId: l.offer_id,
            offerTitle: offerMap.get(l.offer_id),
          });
        });

        // 4b. Offer views
        const { data: views } = await supabase
          .from('offer_views')
          .select('user_id, offer_id, created_at')
          .in('offer_id', offerIds)
          .order('created_at', { ascending: false });

        (views || []).forEach(v => {
          const u = getOrCreate(v.user_id);
          u.actions.push({
            type: 'view',
            label: 'Visualizou oferta',
            date: v.created_at,
            offerId: v.offer_id,
            offerTitle: offerMap.get(v.offer_id),
          });
        });
      }

      // 5. Check-ins (register the action; GPS is used later ONLY if the user has no registered address)
      const { data: checkins } = await supabase
        .from('offer_checkins')
        .select('user_id, offer_id, created_at, location_latitude, location_longitude')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      const checkinGpsMap = new Map<string, { lat: number; lng: number }>();
      (checkins || []).forEach(c => {
        const u = getOrCreate(c.user_id);
        u.actions.push({
          type: 'checkin',
          label: 'Fez check-in',
          date: c.created_at,
          offerId: c.offer_id,
          offerTitle: offerMap.get(c.offer_id),
        });
        if (
          c.location_latitude &&
          c.location_longitude &&
          !checkinGpsMap.has(c.user_id) &&
          isValidCoordinate(c.location_latitude, c.location_longitude)
        ) {
          checkinGpsMap.set(c.user_id, { lat: c.location_latitude, lng: c.location_longitude });
        }
      });

      // 5b. checkin_validations as extra source of GPS (only if we still don't have one for the user)
      const { data: validations } = await supabase
        .from('checkin_validations')
        .select('user_id, offer_id, created_at, location_latitude, location_longitude')
        .eq('business_id', businessId)
        .not('location_latitude', 'is', null)
        .not('location_longitude', 'is', null)
        .order('created_at', { ascending: false });

      (validations || []).forEach(v => {
        if (
          userMap.has(v.user_id) &&
          !checkinGpsMap.has(v.user_id) &&
          v.location_latitude &&
          v.location_longitude &&
          isValidCoordinate(v.location_latitude, v.location_longitude)
        ) {
          checkinGpsMap.set(v.user_id, { lat: v.location_latitude, lng: v.location_longitude });
        }
      });

      // 6. Raffle participations
      const raffleIdsResult = await supabase
        .from('raffles')
        .select('id')
        .eq('business_id', businessId);
      const raffleIds = raffleIdsResult.data?.map(r => r.id) || [];

      if (raffleIds.length > 0) {
        const { data: mainRaffleEntries } = await supabase
          .from('raffle_entries')
          .select('user_id, created_at')
          .in('raffle_id', raffleIds);

        (mainRaffleEntries || []).forEach(r => {
          const u = getOrCreate(r.user_id);
          u.actions.push({
            type: 'raffle',
            label: 'Participou de sorteio',
            date: r.created_at || new Date().toISOString(),
          });
        });

        const { data: autoRaffleEntries } = await supabase
          .from('automatic_raffle_participations')
          .select('user_id, created_at, trigger_action')
          .in('raffle_id', raffleIds);

        (autoRaffleEntries || []).forEach(r => {
          const u = getOrCreate(r.user_id);
          const alreadyHasRaffle = u.actions.some(a => a.type === 'raffle' && a.date === (r.created_at || ''));
          if (!alreadyHasRaffle) {
            u.actions.push({
              type: 'raffle',
              label: 'Participou de sorteio (automático)',
              date: r.created_at || new Date().toISOString(),
            });
          }
        });
      }

      // Enrich with profile data
      const userIds = Array.from(userMap.keys());
      if (userIds.length === 0) return [];

      const allProfiles: any[] = [];
      for (let i = 0; i < userIds.length; i += 50) {
        const batch = userIds.slice(i, i + 50);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url, city, state')
          .in('user_id', batch);
        if (profiles) allProfiles.push(...profiles);
      }

      allProfiles.forEach(p => {
        const u = userMap.get(p.user_id);
        if (u) {
          u.fullName = p.full_name || 'Usuário';
          u.avatarUrl = p.avatar_url;
        }
      });

      // PRIMARY location source: registered address (guarantees correct neighborhood).
      // Fallback: checkin GPS captured at time of visit.
      const allUserIds = Array.from(userMap.keys());
      const addressMap = new Map<string, { latitude: number; longitude: number }>();

      // Use SECURITY DEFINER RPC to bypass RLS (business owner can see engaged users' addresses).
      const { data: engagedAddresses, error: addrErr } = await (supabase as any).rpc(
        'get_engaged_users_addresses',
        { _business_id: businessId }
      );
      const rpcFailed = !!addrErr && isRpcMissingError(addrErr);
      if (addrErr) console.warn('[useNearbyEngagedUsers] rpc error', addrErr);
      setRpcMissing(rpcFailed);
      if (rpcFailed) {
        throw new Error(
          'RADAR_RPC_MISSING: A função get_engaged_users_addresses não está disponível no banco. Peça ao administrador para aplicá-la para exibir a localização correta dos clientes.'
        );
      }

      (engagedAddresses || []).forEach((a: any) => {
        const lat = Number(a.latitude);
        const lng = Number(a.longitude);
        if (isValidCoordinate(lat, lng) && !addressMap.has(a.user_id)) {
          addressMap.set(a.user_id, { latitude: lat, longitude: lng });
        }
      });

      // Fallback: also try direct read (works for the caller's own address if they're engaged too).
      for (let i = 0; i < allUserIds.length; i += 50) {
        const batch = allUserIds.slice(i, i + 50).filter(id => !addressMap.has(id));
        if (batch.length === 0) continue;
        const { data: addresses } = await supabase
          .from('addresses')
          .select('user_id, latitude, longitude, is_default')
          .in('user_id', batch)
          .eq('is_active', true)
          .not('latitude', 'is', null)
          .not('longitude', 'is', null)
          .order('is_default', { ascending: false });

        (addresses || []).forEach(a => {
          if (!addressMap.has(a.user_id)) {
            const lat = Number(a.latitude);
            const lng = Number(a.longitude);
            if (isValidCoordinate(lat, lng)) {
              addressMap.set(a.user_id, { latitude: lat, longitude: lng });
            }
          }
        });
      }


      // Fetch offer coordinates as fallback location (for users without address/checkin GPS)
      const offerCoordsMap = new Map<string, { lat: number; lng: number }>();
      if (offerIds.length > 0) {
        const { data: offerCoords } = await supabase
          .from('offers')
          .select('id, latitude, longitude')
          .in('id', offerIds)
          .not('latitude', 'is', null)
          .not('longitude', 'is', null);
        (offerCoords || []).forEach(o => {
          if (o.latitude && o.longitude && isValidCoordinate(Number(o.latitude), Number(o.longitude))) {
            offerCoordsMap.set(o.id, { lat: Number(o.latitude), lng: Number(o.longitude) });
          }
        });
      }

      // Fetch business coordinates as last-resort fallback
      let businessCoords: { lat: number; lng: number } | null = null;
      const { data: bizData } = await supabase
        .from('businesses')
        .select('latitude, longitude')
        .eq('id', businessId)
        .maybeSingle();
      if (bizData?.latitude && bizData?.longitude && isValidCoordinate(Number(bizData.latitude), Number(bizData.longitude))) {
        businessCoords = { lat: Number(bizData.latitude), lng: Number(bizData.longitude) };
      }

      userMap.forEach(u => {
        // Priority 1: registered address (most accurate neighborhood)
        const addr = addressMap.get(u.userId);
        if (addr) {
          u.latitude = addr.latitude;
          u.longitude = addr.longitude;
          u.locationSource = 'address';
          return;
        }
        // Priority 2: check-in GPS (real presence at some point)
        const gps = checkinGpsMap.get(u.userId);
        if (gps) {
          u.latitude = gps.lat;
          u.longitude = gps.lng;
          u.locationSource = 'checkin';
          return;
        }
        // Priority 3: offer coordinates from user's most recent offer interaction
        const offerAction = u.actions.find(a => a.offerId && offerCoordsMap.has(a.offerId));
        if (offerAction?.offerId) {
          const coords = offerCoordsMap.get(offerAction.offerId)!;
          u.latitude = coords.lat;
          u.longitude = coords.lng;
          u.locationSource = 'offer_proximity';
          return;
        }
        // Priority 4: business location (last resort so user still appears)
        if (businessCoords) {
          u.latitude = businessCoords.lat;
          u.longitude = businessCoords.lng;
          u.locationSource = 'business_fallback';
        }
      });

      // Apply minimal privacy jitter (stays in the same block/neighborhood).
      userMap.forEach(u => {
        if (u.latitude !== null && u.longitude !== null) {
          if (!isValidCoordinate(u.latitude, u.longitude)) {
            u.latitude = null;
            u.longitude = null;
            u.locationSource = null;
            return;
          }
          const jittered = applyPrivacyJitter(u.latitude, u.longitude, u.userId, u.locationSource);
          u.latitude = jittered.lat;
          u.longitude = jittered.lng;
        }
      });

      // Calculate Hot Score and totals
      const result = Array.from(userMap.values()).map(u => {
        u.totalInteractions = u.actions.length;
        u.actions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        u.lastActionAt = u.actions[0]?.date || '';
        
        const { score, level } = calculateHotScore(u.actions);
        u.hotScore = score;
        u.hotLevel = level;
        
        return u;
      });

      // Sort by hot score (most likely to buy first)
      result.sort((a, b) => b.hotScore - a.hotScore);

      return result;
    },
    enabled: !!businessId,
    staleTime: 2 * 60 * 1000,
  });

  // Real-time subscriptions
  useEffect(() => {
    if (!businessId) return;

    const channel = supabase
      .channel(`nearby-users-${businessId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'follows', filter: `business_id=eq.${businessId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['nearby-engaged-users', businessId] });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'offer_checkins', filter: `business_id=eq.${businessId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['nearby-engaged-users', businessId] });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'offer_likes' }, () => {
        queryClient.invalidateQueries({ queryKey: ['nearby-engaged-users', businessId] });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'favorites' }, () => {
        queryClient.invalidateQueries({ queryKey: ['nearby-engaged-users', businessId] });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'offer_views' }, () => {
        queryClient.invalidateQueries({ queryKey: ['nearby-engaged-users', businessId] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [businessId, queryClient]);

  return Object.assign(query, { rpcMissing });
};
