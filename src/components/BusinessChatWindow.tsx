import { useState, useEffect, useRef } from 'react';
import { Send, Link2, Tag, Gift, Users, Heart } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { useChat, Chat } from '@/hooks/useChat';
import { useAuth } from '@/hooks/useAuth';
import { useBusiness } from '@/hooks/useBusiness';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { MessageLinkSelector, MessageLinkPreview, SelectedLink } from './MessageLinkSelector';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

interface BusinessChatWindowProps {
  chat: Chat;
}

// Parse message for embedded links
const parseMessageContent = (message: string) => {
  // Pattern: [[type:id:title]]
  const linkPattern = /\[\[(offer|raffle|post|crowdfunding):([a-f0-9-]+):([^\]]+)\]\]/gi;
  const parts: Array<{ type: 'text' | 'link'; content: string; linkType?: string; linkId?: string; linkTitle?: string }> = [];
  
  let lastIndex = 0;
  let match;
  
  while ((match = linkPattern.exec(message)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: message.slice(lastIndex, match.index) });
    }
    
    // Add the link
    parts.push({
      type: 'link',
      content: match[3], // title
      linkType: match[1],
      linkId: match[2],
      linkTitle: match[3]
    });
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < message.length) {
    parts.push({ type: 'text', content: message.slice(lastIndex) });
  }
  
  return parts.length > 0 ? parts : [{ type: 'text' as const, content: message }];
};

// Inline link component
const InlineLink = ({ type, id, title }: { type: string; id: string; title: string }) => {
  const typeIcons: Record<string, React.ReactNode> = {
    offer: <Tag className="w-3 h-3" />,
    raffle: <Gift className="w-3 h-3" />,
    post: <Users className="w-3 h-3" />,
    crowdfunding: <Heart className="w-3 h-3" />
  };

  const typeColors: Record<string, string> = {
    offer: 'bg-primary/20 text-primary border-primary/30',
    raffle: 'bg-blue-500/20 text-blue-600 border-blue-500/30',
    post: 'bg-purple-500/20 text-purple-600 border-purple-500/30',
    crowdfunding: 'bg-rose-500/20 text-rose-600 border-rose-500/30'
  };

  const routes: Record<string, string> = {
    offer: '/ofertas/',
    raffle: '/sorteios/',
    post: '/comunidade?post=',
    crowdfunding: '/vaquinhas/'
  };

  return (
    <a
      href={`${routes[type]}${id}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[11px] font-medium hover:opacity-80 transition-opacity ${typeColors[type] || 'bg-muted'}`}
    >
      {typeIcons[type]}
      <span className="max-w-[120px] truncate">{title}</span>
    </a>
  );
};

export const BusinessChatWindow = ({ chat }: BusinessChatWindowProps) => {
  const { user } = useAuth();
  const { business } = useBusiness();
  const { messages, loading, loadMessages, sendMessage, markAsRead, setCurrentChat } = useChat();
  const [messageText, setMessageText] = useState('');
  const [userName, setUserName] = useState('Usuário');
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [selectedLink, setSelectedLink] = useState<SelectedLink | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chat) {
      setCurrentChat(chat);
      loadMessages(chat.id);
      markAsRead(chat.id);

      const loadUserInfo = async () => {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('user_id', chat.user_id)
          .single();

        if (data?.full_name) setUserName(data.full_name);
        setUserAvatar(data?.avatar_url ?? null);
      };

      loadUserInfo();
    }
  }, [chat?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!messageText.trim() && !selectedLink) return;
    if (sending) return;

    setSending(true);
    
    // Build message with embedded link
    let finalMessage = messageText.trim();
    if (selectedLink) {
      const linkMarker = `[[${selectedLink.type}:${selectedLink.id}:${selectedLink.title}]]`;
      finalMessage = finalMessage ? `${finalMessage}\n\n${linkMarker}` : linkMarker;
    }
    
    const success = await sendMessage(chat.id, finalMessage, 'business');
    if (success) {
      setMessageText('');
      setSelectedLink(null);
    }
    setSending(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card className="h-[500px] sm:h-[600px] flex flex-col">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-10 w-10 shrink-0 ring-1 ring-border">
              <AvatarImage src={userAvatar || undefined} alt={userName} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {(userName || '?')[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm sm:text-base truncate">{userName}</h3>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                {chat.offer_id ? 'Chat sobre uma oferta' : 'Conversa geral'}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] shrink-0">
            💬 Empresa
          </Badge>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-3 sm:p-4">
        {loading && messages.length === 0 && (
          <p className="text-center text-muted-foreground text-sm">Carregando mensagens...</p>
        )}
        
        {!loading && messages.length === 0 && (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
              <Send className="w-6 h-6 text-primary" />
            </div>
            <p className="text-muted-foreground text-sm">Nenhuma mensagem ainda</p>
            <p className="text-muted-foreground text-xs mt-1">Envie uma oferta ou sorteio para iniciar!</p>
          </div>
        )}
        
        {messages.map((message) => {
          const isOwn = message.sender_type === 'business';
          const parsedContent = parseMessageContent(message.message);
          
          return (
            <div
              key={message.id}
              className={`mb-3 sm:mb-4 flex ${isOwn ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3 sm:p-4 ${
                  isOwn
                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                    : 'bg-muted rounded-bl-sm'
                }`}
              >
                <div className="text-xs sm:text-sm break-words space-y-1">
                  {parsedContent.map((part, idx) => (
                    part.type === 'text' ? (
                      <span key={idx}>{part.content}</span>
                    ) : (
                      <InlineLink
                        key={idx}
                        type={part.linkType!}
                        id={part.linkId!}
                        title={part.linkTitle!}
                      />
                    )
                  ))}
                </div>
                <p className={`text-[10px] sm:text-xs mt-1.5 ${isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                  {format(new Date(message.created_at), 'HH:mm', { locale: ptBR })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* Selected link preview */}
      {selectedLink && (
        <div className="px-3 sm:px-4 pt-2">
          <MessageLinkPreview link={selectedLink} onRemove={() => setSelectedLink(null)} />
        </div>
      )}

      {/* Input */}
      <div className="p-3 sm:p-4 border-t bg-muted/30">
        <div className="flex gap-2">
          {business && (
            <MessageLinkSelector
              businessId={business.id}
              onSelectLink={setSelectedLink}
              trigger={
                <Button 
                  type="button" 
                  variant="outline" 
                  size="icon"
                  className="flex-shrink-0 h-10 w-10"
                >
                  <Link2 className="h-4 w-4" />
                </Button>
              }
            />
          )}
          <Input
            placeholder="Digite sua resposta..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={sending}
            className="text-sm"
          />
          <Button 
            onClick={handleSend} 
            disabled={(!messageText.trim() && !selectedLink) || sending}
            size="icon"
            className="flex-shrink-0 h-10 w-10"
            aria-label="Enviar mensagem"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 text-center">
          💡 Use o botão <Link2 className="w-3 h-3 inline" /> para anexar ofertas, sorteios ou posts
        </p>
      </div>
    </Card>
  );
};
