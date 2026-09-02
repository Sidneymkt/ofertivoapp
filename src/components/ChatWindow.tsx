import { useState, useEffect, useRef } from 'react';
import { X, Send, Tag, Gift, Users, Heart, ExternalLink } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { useChat } from '@/hooks/useChat';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useIsMobile } from '@/hooks/use-mobile';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

interface ChatWindowProps {
  businessId?: string;
  targetUserId?: string;
  offerId?: string;
  businessName: string;
  businessAvatarUrl?: string | null;
  onClose: () => void;
  inline?: boolean;
}

// Parse message for embedded links
export const parseMessageContent = (message: string) => {
  const linkPattern = /\[\[(offer|raffle|post|crowdfunding):([a-f0-9-]+):([^\]]+)\]\]/gi;
  const parts: Array<{ type: 'text' | 'link'; content: string; linkType?: string; linkId?: string; linkTitle?: string }> = [];
  
  let lastIndex = 0;
  let match;
  
  while ((match = linkPattern.exec(message)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: message.slice(lastIndex, match.index) });
    }
    
    parts.push({
      type: 'link',
      content: match[3],
      linkType: match[1],
      linkId: match[2],
      linkTitle: match[3]
    });
    
    lastIndex = match.index + match[0].length;
  }
  
  if (lastIndex < message.length) {
    parts.push({ type: 'text', content: message.slice(lastIndex) });
  }
  
  return parts.length > 0 ? parts : [{ type: 'text' as const, content: message }];
};

// Strip link markers for preview text
export const stripLinkMarkers = (message: string) => {
  return message
    .replace(/\[\[(offer|raffle|post|crowdfunding):([a-f0-9-]+):([^\]]+)\]\]/gi, '📎 $3')
    .trim();
};

// Inline link component for consumer view - clickable card
const InlineLinkCard = ({ type, id, title, isOwn }: { type: string; id: string; title: string; isOwn: boolean }) => {
  const typeConfig: Record<string, { icon: React.ReactNode; label: string; color: string; ownColor: string; route: string }> = {
    offer: { 
      icon: <Tag className="w-3.5 h-3.5" />, 
      label: 'Oferta', 
      color: 'bg-primary/10 border-primary/30 hover:bg-primary/20', 
      ownColor: 'bg-primary-foreground/10 border-primary-foreground/30 hover:bg-primary-foreground/20',
      route: '/ofertas/' 
    },
    raffle: { 
      icon: <Gift className="w-3.5 h-3.5" />, 
      label: 'Sorteio', 
      color: 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20', 
      ownColor: 'bg-primary-foreground/10 border-primary-foreground/30 hover:bg-primary-foreground/20',
      route: '/sorteios/' 
    },
    post: { 
      icon: <Users className="w-3.5 h-3.5" />, 
      label: 'Post', 
      color: 'bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/20', 
      ownColor: 'bg-primary-foreground/10 border-primary-foreground/30 hover:bg-primary-foreground/20',
      route: '/comunidade?post=' 
    },
    crowdfunding: { 
      icon: <Heart className="w-3.5 h-3.5" />, 
      label: 'Vaquinha', 
      color: 'bg-rose-500/10 border-rose-500/30 hover:bg-rose-500/20', 
      ownColor: 'bg-primary-foreground/10 border-primary-foreground/30 hover:bg-primary-foreground/20',
      route: '/vaquinhas/' 
    }
  };

  const config = typeConfig[type] || typeConfig.offer;

  return (
    <Link
      to={`${config.route}${id}`}
      className={`mt-2 flex items-center gap-2.5 p-2.5 rounded-xl border transition-all group ${isOwn ? config.ownColor : config.color}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isOwn ? 'bg-primary-foreground/20' : 'bg-primary/15'}`}>
        {config.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-[10px] font-medium ${isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
          {config.label}
        </p>
        <p className={`text-xs font-semibold truncate ${isOwn ? 'text-primary-foreground' : 'text-foreground'}`}>
          {title}
        </p>
      </div>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${isOwn ? 'bg-primary-foreground/20' : 'bg-primary/10'}`}>
        <ExternalLink className={`w-3.5 h-3.5 ${isOwn ? 'text-primary-foreground/80' : 'text-primary'} group-hover:scale-110 transition-transform`} />
      </div>
    </Link>
  );
};

export const ChatWindow = ({ businessId, targetUserId, offerId, businessName, businessAvatarUrl, onClose, inline = false }: ChatWindowProps) => {
  const { user } = useAuth();
  const { currentChat, messages, loading, getOrCreateChat, getOrCreateUserChat, loadMessages, sendMessage, markAsRead, setCurrentChat } = useChat();
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    const initChat = async () => {
      let chat;
      if (targetUserId) {
        chat = await getOrCreateUserChat(targetUserId);
      } else if (businessId) {
        chat = await getOrCreateChat(businessId, offerId);
      }
      if (chat) {
        await loadMessages(chat.id);
        await markAsRead(chat.id);
      }
    };

    initChat();
    
    return () => {
      setCurrentChat(null);
    };
  }, [businessId, targetUserId, offerId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!currentChat || !messageText.trim() || sending) return;

    setSending(true);
    const success = await sendMessage(currentChat.id, messageText, 'user');
    if (success) {
      setMessageText('');
    }
    setSending(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const chatContent = (
    <>
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
            <p className="text-muted-foreground text-xs mt-1">Inicie a conversa!</p>
          </div>
        )}
        
        {messages.map((message) => {
          const isOwn = message.sender_id === user?.id;
          const parsedContent = parseMessageContent(message.message);
          
          return (
            <div
              key={message.id}
              className={`mb-3 sm:mb-4 flex ${isOwn ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3 ${
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
                      <InlineLinkCard
                        key={idx}
                        type={part.linkType!}
                        id={part.linkId!}
                        title={part.linkTitle!}
                        isOwn={isOwn}
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

      {/* Input */}
      <div className="p-3 sm:p-4 border-t bg-muted/30">
        <div className="flex gap-2">
          <Input
            placeholder="Digite sua mensagem..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={!currentChat || sending}
            className="rounded-full text-sm"
          />
          <Button 
            onClick={handleSend} 
            disabled={!currentChat || !messageText.trim() || sending}
            size="icon"
            className="rounded-full h-10 w-10 flex-shrink-0"
            aria-label="Enviar mensagem"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  );

  // Inline mode: render as a card within the page
  if (inline) {
    return (
      <Card className="h-[calc(100vh-180px)] sm:h-[600px] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-3 sm:p-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Avatar className="h-10 w-10 shrink-0 ring-1 ring-border">
                <AvatarImage src={businessAvatarUrl || undefined} alt={businessName} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {(businessName || '?')[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm sm:text-base truncate">{businessName || 'Conversa'}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Chat em tempo real</p>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px] shrink-0">
              💬 Chat
            </Badge>
          </div>
        </div>
        {chatContent}
      </Card>
    );
  }

  if (isMobile) {
    return (
      <Sheet open={true} onOpenChange={onClose}>
        <SheetContent side="bottom" className="h-[90vh] p-0 flex flex-col rounded-t-3xl">
          <SheetHeader className="p-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 shrink-0 ring-1 ring-border">
                <AvatarImage src={businessAvatarUrl || undefined} alt={businessName} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {(businessName || '?')[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 text-left">
                <SheetTitle className="truncate">{businessName}</SheetTitle>
                <p className="text-xs text-muted-foreground">Chat em tempo real</p>
              </div>
            </div>
          </SheetHeader>
          {chatContent}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 h-[500px] bg-background border rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="h-9 w-9 shrink-0 ring-1 ring-border">
            <AvatarImage src={businessAvatarUrl || undefined} alt={businessName} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {(businessName || '?')[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h3 className="font-semibold truncate">{businessName}</h3>
            <p className="text-xs text-muted-foreground">Chat em tempo real</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full" aria-label="Fechar chat">
          <X className="h-4 w-4" />
        </Button>
      </div>
      {chatContent}
    </div>
  );
};
