import { useEffect, useMemo, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { Chat } from '@/hooks/useChat';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { stripLinkMarkers } from './ChatWindow';
import { Skeleton } from './ui/skeleton';

interface UserChatListProps {
  onChatSelect: (chat: Chat) => void;
}

interface ChatMeta {
  displayName: string;
  avatarUrl?: string | null;
  isBusiness: boolean;
  lastMessage?: string;
  lastAt?: string;
  lastSenderIsMe?: boolean;
  unread: number;
}

export const UserChatList = ({ onChatSelect }: UserChatListProps) => {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [meta, setMeta] = useState<Record<string, ChatMeta>>({});
  const [loading, setLoading] = useState(true);

  const loadAll = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: chatsData } = await supabase
        .from('chats')
        .select('*')
        .or(`user_id.eq.${user.id},target_user_id.eq.${user.id}`)
        .order('updated_at', { ascending: false })
        .limit(100);

      const chatList = chatsData || [];
      setChats(chatList);

      if (!chatList.length) {
        setMeta({});
        return;
      }

      const chatIds = chatList.map(c => c.id);
      const businessIds = Array.from(new Set(chatList.map(c => c.business_id).filter(Boolean))) as string[];
      const otherUserIds = Array.from(new Set(
        chatList
          .map(c => (c.target_user_id === user.id ? c.user_id : c.target_user_id))
          .filter(Boolean)
      )) as string[];

      // Batch fetch in parallel
      const [businessesRes, profilesRes, messagesRes, unreadRes] = await Promise.all([
        businessIds.length
          ? supabase.from('businesses').select('id, name, logo_url').in('id', businessIds)
          : Promise.resolve({ data: [] as any[] }),
        otherUserIds.length
          ? supabase.from('profiles').select('user_id, full_name, avatar_url').in('user_id', otherUserIds)
          : Promise.resolve({ data: [] as any[] }),
        supabase
          .from('messages')
          .select('chat_id, message, created_at, sender_id')
          .in('chat_id', chatIds)
          .order('created_at', { ascending: false })
          .limit(400),
        supabase
          .from('messages')
          .select('chat_id')
          .in('chat_id', chatIds)
          .eq('read', false)
          .neq('sender_id', user.id),
      ]);

      const businessesMap = new Map((businessesRes.data || []).map((b: any) => [b.id, b]));
      const profilesMap = new Map((profilesRes.data || []).map((p: any) => [p.user_id, p]));

      const lastMsgByChat = new Map<string, any>();
      for (const m of messagesRes.data || []) {
        if (!lastMsgByChat.has(m.chat_id)) lastMsgByChat.set(m.chat_id, m);
      }

      const unreadCounts: Record<string, number> = {};
      for (const row of unreadRes.data || []) {
        unreadCounts[row.chat_id] = (unreadCounts[row.chat_id] || 0) + 1;
      }

      const nextMeta: Record<string, ChatMeta> = {};
      for (const chat of chatList) {
        const otherUserId = chat.target_user_id === user.id ? chat.user_id : chat.target_user_id;
        const biz = chat.business_id ? businessesMap.get(chat.business_id) : null;
        const prof = otherUserId ? profilesMap.get(otherUserId) : null;
        const last = lastMsgByChat.get(chat.id);
        nextMeta[chat.id] = {
          displayName: biz?.name || prof?.full_name || 'Usuário',
          avatarUrl: biz?.logo_url || prof?.avatar_url,
          isBusiness: !!biz,
          lastMessage: last?.message ? stripLinkMarkers(last.message) : undefined,
          lastAt: last?.created_at,
          lastSenderIsMe: last?.sender_id === user.id,
          unread: unreadCounts[chat.id] || 0,
        };
      }
      setMeta(nextMeta);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadAll();

    const channel = supabase
      .channel(`user-chats-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => loadAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, () => loadAll())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const sortedChats = useMemo(() => {
    return [...chats].sort((a, b) => {
      const at = meta[a.id]?.lastAt || a.updated_at;
      const bt = meta[b.id]?.lastAt || b.updated_at;
      return new Date(bt).getTime() - new Date(at).getTime();
    });
  }, [chats, meta]);

  if (loading && chats.length === 0) {
    return (
      <div className="space-y-2 p-2">
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
      <div className="p-10 text-center rounded-2xl border border-dashed">
        <MessageSquare className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
        <h3 className="text-base font-semibold mb-1">Nenhuma conversa ainda</h3>
        <p className="text-sm text-muted-foreground">
          Inicie conversas com negócios ou usuários — elas aparecerão aqui.
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-220px)] sm:h-[600px]">
      <ul className="divide-y divide-border/60">
        {sortedChats.map((chat) => {
          const m = meta[chat.id];
          const preview = m?.lastMessage || 'Toque para conversar';
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
                      {m?.displayName || 'Conversa'}
                    </h4>
                    {when && (
                      <span className={`text-[11px] shrink-0 ${m?.unread ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                        {when}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className={`text-xs truncate ${m?.unread ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {m?.lastSenderIsMe ? 'Você: ' : ''}{preview}
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
