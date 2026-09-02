import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

/**
 * For business owners: subscribe to the business presence channel and return
 * the set of consumer user IDs currently online on any of the business's pages
 * (profile, offers, etc). Powers the "online now" indicator on the nearby
 * customers radar so anunciantes can prioritize live, engaged consumers.
 */
export const useBusinessOnlineUsers = (businessId: string | null | undefined) => {
  const { user } = useAuth();
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!businessId || !user) {
      setOnlineUserIds(new Set());
      return;
    }

    const channel = supabase.channel(`business-presence-${businessId}`, {
      config: {
        presence: { key: user.id },
      },
    });

    const syncOnline = () => {
      const state = channel.presenceState() as Record<string, Array<{ user_id?: string }>>;
      const ids = new Set<string>();
      Object.entries(state).forEach(([key, metas]) => {
        if (key === user.id) return; // skip business owner itself
        metas.forEach((m) => {
          if (m?.user_id && m.user_id !== user.id) ids.add(m.user_id);
        });
        // fallback: if no user_id meta, use the presence key
        if (key !== user.id && (!metas || metas.length === 0)) ids.add(key);
        if (key !== user.id) ids.add(key);
      });
      setOnlineUserIds(ids);
    };

    channel
      .on('presence', { event: 'sync' }, syncOnline)
      .on('presence', { event: 'join' }, syncOnline)
      .on('presence', { event: 'leave' }, syncOnline)
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track owner presence too so the channel stays alive
          await channel.track({
            user_id: user.id,
            owner: true,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [businessId, user?.id]);

  return onlineUserIds;
};
