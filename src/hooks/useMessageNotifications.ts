import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { updateAppBadge } from './useNotificationPreferences';
import { playMessageSound } from '@/lib/notificationSound';

// Get notification preferences from localStorage
const getNotificationPreferences = () => {
  try {
    const stored = localStorage.getItem('ofertivo_notification_preferences');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error reading notification preferences:', error);
  }
  return { soundEnabled: true, messagesSound: true, browserNotifications: true };
};

export const useMessageNotifications = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [hasPermission, setHasPermission] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Check notification permission (don't auto-request, let user enable via settings)
  useEffect(() => {
    if ('Notification' in window) {
      setHasPermission(Notification.permission === 'granted');
    }
  }, []);

  // Monitor new messages
  useEffect(() => {
    if (!user) return;

    const setupMessageListener = async () => {
      // Get user's chats
      const { data: userChats } = await supabase
        .from('chats')
        .select('id')
        .or(`user_id.eq.${user.id},target_user_id.eq.${user.id}`);

      // Get business chats if user owns a business
      const { data: businessData } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      let allChatIds: string[] = [];

      if (userChats && userChats.length > 0) {
        allChatIds = userChats.map(c => c.id);
      }

      if (businessData) {
        const { data: businessChats } = await supabase
          .from('chats')
          .select('id')
          .eq('business_id', businessData.id);

        if (businessChats && businessChats.length > 0) {
          allChatIds = [...allChatIds, ...businessChats.map(c => c.id)];
        }
      }

      if (allChatIds.length === 0) return;

      // Get initial unread count
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .in('chat_id', allChatIds)
        .eq('read', false)
        .neq('sender_id', user.id);
      
      const initialCount = count || 0;
      setUnreadCount(initialCount);
      updateAppBadge(initialCount);

      // Subscribe to new messages
      const channel = supabase
        .channel('message-notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `sender_id=neq.${user.id}`,
          },
          async (payload) => {
            const newMessage = payload.new as any;
            
            // Check if message is in one of user's chats
            if (!allChatIds.includes(newMessage.chat_id)) return;

            // Update unread count and badge
            setUnreadCount(prev => {
              const newCount = prev + 1;
              updateAppBadge(newCount);
              return newCount;
            });

            // Get preferences
            const prefs = getNotificationPreferences();

            // Get sender info
            let senderName = 'Alguém';
            if (newMessage.sender_type === 'user') {
              const { data: profile } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('user_id', newMessage.sender_id)
                .single();
              senderName = profile?.full_name || 'Usuário';
            } else if (newMessage.sender_type === 'business') {
              const { data: chat } = await supabase
                .from('chats')
                .select('business_id')
                .eq('id', newMessage.chat_id)
                .single();
              
              if (chat?.business_id) {
                const { data: business } = await supabase
                  .from('businesses')
                  .select('name')
                  .eq('id', chat.business_id)
                  .single();
                senderName = business?.name || 'Negócio';
              }
            }

            // Play notification sound if enabled
            if (prefs.soundEnabled && prefs.messagesSound) {
              await playMessageSound();
            }

            // Show toast notification
            toast({
              title: `💬 Nova mensagem de ${senderName}`,
              description: newMessage.message.length > 50 
                ? newMessage.message.substring(0, 50) + '...' 
                : newMessage.message,
              duration: 5000,
            });

            // Show browser notification if enabled
            if (hasPermission && prefs.browserNotifications && 'Notification' in window) {
              new Notification(`Nova mensagem de ${senderName}`, {
                body: newMessage.message,
                icon: '/logo-ofertivo.png',
                tag: newMessage.chat_id,
                requireInteraction: false,
              });
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages',
          },
          async () => {
            // Recalculate unread count when messages are marked as read
            const { count } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .in('chat_id', allChatIds)
              .eq('read', false)
              .neq('sender_id', user.id);
            
            const newCount = count || 0;
            setUnreadCount(newCount);
            updateAppBadge(newCount);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupMessageListener();
  }, [user, hasPermission, toast]);

  // Function to clear badge when user reads messages
  const clearBadge = () => {
    setUnreadCount(0);
    updateAppBadge(0);
  };

  return { hasPermission, unreadCount, clearBadge };
};
