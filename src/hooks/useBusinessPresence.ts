import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

/**
 * Tracks a consumer's presence on a business channel.
 * The business dashboard listens to the same channel to count online users.
 */
export const useBusinessPresence = (businessId: string | null | undefined) => {
  const { user } = useAuth();

  useEffect(() => {
    if (!businessId || !user) return;

    const channel = supabase.channel(`business-presence-${businessId}`, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          user_id: user.id,
          online_at: new Date().toISOString(),
        });
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [businessId, user?.id]);
};
