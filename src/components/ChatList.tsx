import { useEffect, useMemo, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { useChat, Chat } from '@/hooks/useChat';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { stripLinkMarkers } from './ChatWindow';
import { Skeleton } from './ui/skeleton';

interface ChatListProps {
  onChatSelect: (chat: Chat) => void;
}

interface ChatMeta {
  displayName: string;
  avatarUrl?: string | null;
  lastMessage?: string;
  lastAt?: string;
  lastFromBusiness?: boolean;
  unread: number;
}

export const ChatList = ({ onChatSelect }: ChatListProps) => {
  const { chats, loading, loadChats } = useChat();
  const [meta, setMeta] = useState<Record<string, ChatMeta>>({});

  useEffect(() => {
    loadChats();

    const channel = supabase
      .channel('business-chat-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, () => loadChats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => loadChats())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!chats.length) {
      setMeta({});
      return;
    }
    let cancelled = false;

    (async () => {
      const chatIds = chats.map(c => c.id);
      const userIds = Array.from(new Set(chats.map(c => c.user_id).filter(Boolean))) as string[];

      const [profilesRes, messagesRes, unreadRes] = await Promise.all([
        userIds.length
          ? supabase.from('profiles').select('user_id, full_name, avatar_url').in('user_id', userIds)
          : Promise.resolve({ data: [] as any[] }),
        supabase
          .from('messages')
          .select('chat_id, message, created_at, sender_type')
          .in('chat_id', chatIds)
          .order('created_at', { ascending: false })
          .limit(400),
        supabase
          .from('messages')
          .select('chat_id')
          .in('chat_id', chatIds)
          .eq('read', false)
          .neq('sender_type', 'business'),
      ]);

      const profilesMap = new Map<string, any>((profilesRes.data || []).map((p: any) => [p.user_id, p]));
      const lastByChat = new Map<string, any>();
      for (const m of messagesRes.data || []) {
        if (!lastByChat.has(m.chat_id)) lastByChat.set(m.chat_id, m);
      }
      const unread: Record<string, number> = {};
      for (const row of unreadRes.data || []) {
        unread[row.chat_id] = (unread[row.chat_id] || 0) + 1;
      }

      if (cancelled) return;

      const next: Record<string, ChatMeta> = {};
      for (const chat of chats) {
        const prof = profilesMap.get(chat.user_id);
        const last = lastByChat.get(chat.id);
        next[chat.id] = {
          displayName: prof?.full_name || 'Cliente',
          avatarUrl: prof?.avatar_url,
          lastMessage: last?.message ? stripLinkMarkers(last.message) : undefined,
          lastAt: last?.created_at,
          lastFromBusiness: last?.sender_type === 'business',
          unread: unread[chat.id] || 0,
        };
      }
      setMeta(next);
    })();

    return () => {
      cancelled = true;
    };
  }, [chats]);

  const sortedChats = useMemo(() => {
    return [...chats].sort((a, b) => {
      const at = meta[a.id]?.lastAt || a.updated_at;
      const bt = meta[b.id]?.lastAt || b.updated_at;
      return new Date(bt).getTime() - new Date(at).getTime();
    });
  }, [chats, meta]);

  if (loading && chats.length === 0) {
    return (
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-2xl">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (chats.length === 0) {
    return (
      <div className="p-8 text-center rounded-2xl border border-dashed">
        <MessageSquare className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
        <h3 className="text-base font-semibold mb-1">Nenhuma conversa ainda</h3>
        <p className="text-sm text-muted-foreground">
          Quando clientes iniciarem conversas, elas aparecerão aqui.
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px] sm:h-[600px]">
      <ul className="divide-y divide-border/60">
        {sortedChats.map((chat) => {
          const m = meta[chat.id];
          const preview = m?.lastMessage || 'Toque para responder';
          const when = m?.lastAt
            ? formatDistanceToNow(new Date(m.lastAt), { locale: ptBR, addSuffix: false })
            : '';
          return (
            <li key={chat.id}>
              <button
                type="button"
                onClick={() => onChatSelect(chat)}
                className="w-full text-left flex items-center gap-3 px-3 py-3 hover:bg-accent/60 active:bg-accent transition-colors rounded-xl"
              >
                <Avatar className="h-12 w-12 shrink-0 ring-1 ring-border">
                  <AvatarImage src={m?.avatarUrl || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {(m?.displayName || '?')[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className={`text-sm truncate ${m?.unread ? 'font-bold' : 'font-semibold'}`}>
                      {m?.displayName || 'Cliente'}
                    </h4>
                    {when && (
                      <span className={`text-[11px] shrink-0 ${m?.unread ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                        {when}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className={`text-xs truncate ${m?.unread ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {m?.lastFromBusiness ? 'Você: ' : ''}{preview}
                    </p>
                    {m?.unread ? (
                      <span className="bg-primary text-primary-foreground text-[10px] font-bold min-w-5 h-5 px-1.5 rounded-full grid place-items-center shrink-0">
                        {m.unread > 99 ? '99+' : m.unread}
                      </span>
                    ) : null}
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </ScrollArea>
  );
};
