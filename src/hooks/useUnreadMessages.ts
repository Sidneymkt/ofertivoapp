import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useUnreadMessages = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const [unreadCount, setUnreadCount] = useState(0);
  const channelInstanceId = useRef(crypto.randomUUID());

  useEffect(() => {
    if (!userId) {
      setUnreadCount(0);
      return;
    }

    const loadUnreadCount = async () => {
      try {
        // Buscar chats onde o usuário é participante (como user_id ou target_user_id)
        const { data: userChats } = await supabase
          .from('chats')
          .select('id')
          .or(`user_id.eq.${userId},target_user_id.eq.${userId}`);

        // Buscar chats de negócios do usuário
        const { data: businessData } = await supabase
          .from('businesses')
          .select('id')
          .eq('owner_id', userId)
          .limit(1)
          .maybeSingle();

        let allChatIds: string[] = [];

        // Adicionar chats de usuário
        if (userChats && userChats.length > 0) {
          allChatIds = [...userChats.map(c => c.id)];
        }

        // Adicionar chats de negócio
        if (businessData) {
          const { data: businessChats } = await supabase
            .from('chats')
            .select('id')
            .eq('business_id', businessData.id);

          if (businessChats && businessChats.length > 0) {
            allChatIds = [...allChatIds, ...businessChats.map(c => c.id)];
          }
        }

        if (allChatIds.length === 0) {
          setUnreadCount(0);
          return;
        }

        // Contar mensagens não lidas onde o usuário NÃO é o remetente
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .in('chat_id', allChatIds)
          .eq('read', false)
          .neq('sender_id', userId);

        setUnreadCount(count || 0);
      } catch (error) {
        console.error('Error loading unread count:', error);
      }
    };

    loadUnreadCount();

    // Subscrever a novas mensagens em tempo real
    const channel = supabase
      .channel(`unread-messages-count-${userId}-${channelInstanceId.current}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        () => {
          loadUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { unreadCount };
};
