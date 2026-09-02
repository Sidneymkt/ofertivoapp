import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { updateAppBadge, areNotificationsAllowed } from './useNotificationPreferences';
import { playMessageSound, playNotificationSound } from '@/lib/notificationSound';

/**
 * Unified badge manager that aggregates counts from:
 * - Unread messages
 * - Unread notifications (offers, raffles, promotions, checkins)
 * And syncs with the PWA App Badging API.
 */
export const useUnifiedBadge = () => {
  const { user } = useAuth();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const totalBadge = unreadMessages + unreadNotifications;

  // Sync badge to OS
  const syncBadge = useCallback((count: number) => {
    if (areNotificationsAllowed()) {
      updateAppBadge(count);
    }
  }, []);

  // Fetch unread messages count
  const fetchUnreadMessages = useCallback(async () => {
    if (!user) return 0;

    try {
      const { data: userChats } = await supabase
        .from('chats')
        .select('id')
        .or(`user_id.eq.${user.id},target_user_id.eq.${user.id}`);

      const { data: businessData } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      let allChatIds: string[] = [];
      if (userChats?.length) {
        allChatIds = userChats.map(c => c.id);
      }
      if (businessData) {
        const { data: businessChats } = await supabase
          .from('chats')
          .select('id')
          .eq('business_id', businessData.id);
        if (businessChats?.length) {
          allChatIds = [...allChatIds, ...businessChats.map(c => c.id)];
        }
      }

      if (allChatIds.length === 0) return 0;

      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .in('chat_id', allChatIds)
        .eq('read', false)
        .neq('sender_id', user.id);

      return count || 0;
    } catch {
      return 0;
    }
  }, [user]);

  // Fetch unread notifications count
  const fetchUnreadNotifications = useCallback(async () => {
    if (!user) return 0;

    try {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      return count || 0;
    } catch {
      return 0;
    }
  }, [user]);

  // Refresh all counts
  const refreshBadge = useCallback(async () => {
    const [msgs, notifs] = await Promise.all([
      fetchUnreadMessages(),
      fetchUnreadNotifications(),
    ]);
    setUnreadMessages(msgs);
    setUnreadNotifications(notifs);
    syncBadge(msgs + notifs);
  }, [fetchUnreadMessages, fetchUnreadNotifications, syncBadge]);

  // Clear badge when app becomes visible
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && user) {
        refreshBadge();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [user, refreshBadge]);

  // Initial load + real-time subscriptions
  useEffect(() => {
    if (!user) {
      setUnreadMessages(0);
      setUnreadNotifications(0);
      syncBadge(0);
      return;
    }

    refreshBadge();

    // Subscribe to messages changes
    const msgChannel = supabase
      .channel('unified-badge-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const newMsg = payload.new as any;
        // Play sound only for messages not sent by current user
        if (newMsg.sender_id !== user.id) {
          playMessageSound();
        }
        fetchUnreadMessages().then(count => {
          setUnreadMessages(count);
          setUnreadNotifications(prev => {
            syncBadge(count + prev);
            return prev;
          });
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, () => {
        fetchUnreadMessages().then(count => {
          setUnreadMessages(count);
          setUnreadNotifications(prev => {
            syncBadge(count + prev);
            return prev;
          });
        });
      })
      .subscribe();

    // Subscribe to notifications changes (Pesca Digital, ofertas, sorteios, etc.)
    const notifChannel = supabase
      .channel('unified-badge-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        // Play sound for new notifications (Pesca Digital, etc.)
        playNotificationSound();
        fetchUnreadNotifications().then(count => {
          setUnreadNotifications(count);
          setUnreadMessages(prev => {
            syncBadge(prev + count);
            return prev;
          });
        });
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        fetchUnreadNotifications().then(count => {
          setUnreadNotifications(count);
          setUnreadMessages(prev => {
            syncBadge(prev + count);
            return prev;
          });
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(notifChannel);
    };
  }, [user?.id]);

  return {
    totalBadge,
    unreadMessages,
    unreadNotifications,
    refreshBadge,
  };
};
