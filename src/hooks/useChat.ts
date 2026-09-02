import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface Chat {
  id: string;
  user_id: string;
  business_id: string | null;
  target_user_id: string | null;
  offer_id: string | null;
  created_at: string;
  updated_at: string;
  last_message?: string;
  unread_count?: number;
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  sender_type: 'user' | 'business';
  message: string;
  created_at: string;
  read: boolean;
}

export const useChat = (businessId?: string, offerId?: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  // Criar ou buscar chat com business
  const getOrCreateChat = async (targetBusinessId: string, targetOfferId?: string) => {
    if (!user) return null;
    
    if (!targetBusinessId || targetBusinessId.trim() === '') {
      toast({
        title: 'Erro',
        description: 'ID de negócio inválido',
        variant: 'destructive'
      });
      return null;
    }

    try {
      let query = supabase
        .from('chats')
        .select('*')
        .eq('user_id', user.id)
        .eq('business_id', targetBusinessId)
        .is('target_user_id', null);
      
      if (targetOfferId) {
        query = query.eq('offer_id', targetOfferId);
      } else {
        query = query.is('offer_id', null);
      }
      
      const { data: existingChat, error: fetchError } = await query.maybeSingle();

      if (fetchError) throw fetchError;

      if (existingChat) {
        setCurrentChat(existingChat);
        return existingChat;
      }

      const { data: newChat, error: createError } = await supabase
        .from('chats')
        .insert({
          user_id: user.id,
          business_id: targetBusinessId,
          target_user_id: null,
          offer_id: targetOfferId || null
        })
        .select()
        .single();

      if (createError) throw createError;

      setCurrentChat(newChat);
      return newChat;
    } catch (error: any) {
      console.error('Error getting or creating chat:', error);
      toast({
        title: 'Erro ao iniciar conversa',
        description: error.message,
        variant: 'destructive'
      });
      return null;
    }
  };

  // Criar ou buscar chat com outro usuário
  const getOrCreateUserChat = async (targetUserId: string) => {
    if (!user) return null;
    
    if (!targetUserId || targetUserId.trim() === '') {
      toast({
        title: 'Erro',
        description: 'ID de usuário inválido',
        variant: 'destructive'
      });
      return null;
    }

    if (targetUserId === user.id) {
      toast({
        title: 'Erro',
        description: 'Você não pode conversar consigo mesmo',
        variant: 'destructive'
      });
      return null;
    }

    try {
      // Buscar chat existente (em ambas as direções)
      const { data: existingChats, error: fetchError } = await supabase
        .from('chats')
        .select('*')
        .is('business_id', null)
        .or(`and(user_id.eq.${user.id},target_user_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},target_user_id.eq.${user.id})`);

      if (fetchError) throw fetchError;

      if (existingChats && existingChats.length > 0) {
        setCurrentChat(existingChats[0]);
        return existingChats[0];
      }

      // Criar novo chat
      const { data: newChat, error: createError } = await supabase
        .from('chats')
        .insert({
          user_id: user.id,
          business_id: null,
          target_user_id: targetUserId,
          offer_id: null
        })
        .select()
        .single();

      if (createError) throw createError;

      setCurrentChat(newChat);
      return newChat;
    } catch (error: any) {
      console.error('Error getting or creating user chat:', error);
      toast({
        title: 'Erro ao iniciar conversa',
        description: error.message,
        variant: 'destructive'
      });
      return null;
    }
  };

  // Carregar mensagens do chat
  const loadMessages = useCallback(async (chatId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages((data || []) as Message[]);
    } catch (error: any) {
      console.error('Error loading messages:', error);
      toast({
        title: 'Erro ao carregar mensagens',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Enviar mensagem
  const sendMessage = async (chatId: string, message: string, senderType: 'user' | 'business') => {
    if (!user || !message.trim()) return false;

    try {
      // Get chat details to know who to notify
      const { data: chat } = await supabase
        .from('chats')
        .select('user_id, business_id, target_user_id, businesses(name, owner_id)')
        .eq('id', chatId)
        .single();

      // Send message
      const { data: newMessage, error } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          sender_id: user.id,
          sender_type: senderType,
          message: message.trim()
        })
        .select()
        .single();

      if (error) throw error;

      // Update chat updated_at timestamp
      await supabase
        .from('chats')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', chatId);

      // Adicionar mensagem ao estado local imediatamente
      if (newMessage) {
        setMessages(prev => [...prev, newMessage as Message]);
      }

      // Create notification for the recipient
      if (chat) {
        let recipientId: string | null = null;
        
        if (senderType === 'user') {
          // User sending to business - notify business owner
          recipientId = (chat.businesses as any)?.owner_id;
        } else if (senderType === 'business') {
          // Business sending to user - notify the chat user
          recipientId = chat.user_id;
        }

        // For user-to-user chats
        if (!chat.business_id && chat.target_user_id) {
          recipientId = chat.user_id === user.id ? chat.target_user_id : chat.user_id;
        }

        if (recipientId && recipientId !== user.id) {
          await supabase
            .from('notifications')
            .insert({
              user_id: recipientId,
              type: 'new_message',
              title: 'Nova Mensagem',
              message: senderType === 'user' 
                ? `Você recebeu uma nova mensagem de um cliente` 
                : `Você recebeu uma nova mensagem de ${(chat.businesses as any)?.name || 'um negócio'}`,
              metadata: { chat_id: chatId },
              related_id: chatId,
            });
        }
      }

      return true;
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: 'Erro ao enviar mensagem',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    }
  };

  // Marcar mensagens como lidas
  const markAsRead = async (chatId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('messages')
        .update({ read: true })
        .eq('chat_id', chatId)
        .neq('sender_id', user.id);

      if (error) throw error;
    } catch (error: any) {
      console.error('Error marking messages as read:', error);
    }
  };

  // Carregar lista de chats (para anunciantes)
  const loadChats = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Primeiro, buscar o business_id do usuário
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (businessError) {
        console.error('Error loading business:', businessError);
        setChats([]);
        return;
      }

      if (!businessData) {
        setChats([]);
        return;
      }

      // Agora buscar os chats desse negócio
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('business_id', businessData.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      setChats(data || []);
    } catch (error: any) {
      console.error('Error loading chats:', error);
      toast({
        title: 'Erro ao carregar conversas',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Subscrever a atualizações em tempo real para mensagens do chat atual
  useEffect(() => {
    if (!currentChat) return;

    const channel = supabase
      .channel(`chat-messages:${currentChat.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${currentChat.id}`
        },
        (payload) => {
          const newMessage = payload.new as Message;
          // Evitar duplicação - só adiciona se a mensagem não foi enviada por este usuário
          // (mensagens do próprio usuário já são adicionadas em sendMessage)
          if (newMessage.sender_id !== user?.id) {
            setMessages((prev) => {
              // Verificar se a mensagem já existe
              if (prev.some(m => m.id === newMessage.id)) {
                return prev;
              }
              return [...prev, newMessage];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentChat?.id, user?.id]);

  return {
    chats,
    currentChat,
    messages,
    loading,
    setCurrentChat,
    getOrCreateChat,
    getOrCreateUserChat,
    loadMessages,
    sendMessage,
    markAsRead,
    loadChats
  };
};
