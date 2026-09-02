import React, { useState, useEffect } from 'react';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Navigation } from '@/components/ui/navigation';
import { BottomNavigation } from '@/components/ui/bottom-navigation';
import { UserChatList } from '@/components/UserChatList';
import { ChatWindow } from '@/components/ChatWindow';
import { useAuth } from '@/hooks/useAuth';
import { Chat } from '@/hooks/useChat';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';

const UserMessages = () => {
  const { isAuthenticated, user } = useAuth();
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [chatPartnerName, setChatPartnerName] = useState('');
  const [chatPartnerAvatar, setChatPartnerAvatar] = useState<string | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    const loadPartnerInfo = async () => {
      if (!selectedChat || !user) return;

      if (selectedChat.business_id) {
        const { data } = await supabase
          .from('businesses')
          .select('name, logo_url')
          .eq('id', selectedChat.business_id)
          .single();
        setChatPartnerName(data?.name || 'Negócio');
        setChatPartnerAvatar(data?.logo_url ?? null);
      } else {
        const otherUserId = selectedChat.target_user_id === user.id
          ? selectedChat.user_id
          : selectedChat.target_user_id;
        if (otherUserId) {
          const { data } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('user_id', otherUserId)
            .single();
          setChatPartnerName(data?.full_name || 'Usuário');
          setChatPartnerAvatar(data?.avatar_url ?? null);
        }
      }
    };
    loadPartnerInfo();
  }, [selectedChat, user]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b sticky top-0 bg-background/95 backdrop-blur-sm z-50">
          <div className="container mx-auto px-4 py-4">
            <Navigation />
          </div>
        </header>
        <div className="container mx-auto px-4 py-16 text-center">
          <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4">Faça login para ver suas mensagens</h1>
          <p className="text-muted-foreground mb-8">Entre na sua conta para acessar suas conversas.</p>
          <Button asChild>
            <Link to="/login">Fazer Login</Link>
          </Button>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  // Mobile: show either list or chat, not both
  if (isMobile) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b sticky top-0 bg-background/95 backdrop-blur-sm z-50">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" asChild className="h-9 w-9">
                <Link to={selectedChat ? '#' : '/perfil'} onClick={selectedChat ? (e) => { e.preventDefault(); setSelectedChat(null); setChatPartnerName(''); setChatPartnerAvatar(null); } : undefined}>
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <MessageSquare className="h-5 w-5 shrink-0" />
                <h1 className="text-lg font-bold truncate">
                  {selectedChat ? chatPartnerName : 'Mensagens'}
                </h1>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 flex flex-col">
          {selectedChat ? (
            <div className="flex-1 flex flex-col">
              <ChatWindow
                businessId={selectedChat.business_id || undefined}
                targetUserId={selectedChat.target_user_id || undefined}
                offerId={selectedChat.offer_id || undefined}
                businessName={chatPartnerName}
                businessAvatarUrl={chatPartnerAvatar}
                onClose={() => { setSelectedChat(null); setChatPartnerName(''); setChatPartnerAvatar(null); }}
                inline
              />
            </div>
          ) : (
            <div className="flex-1 px-4 py-4 pb-24">
              <UserChatList onChatSelect={setSelectedChat} />
            </div>
          )}
        </div>

        <BottomNavigation />
      </div>
    );
  }

  // Desktop: side by side
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur-sm z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/perfil">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-6 w-6" />
              <h1 className="text-2xl font-bold">Mensagens</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-1">
            <h2 className="text-lg font-semibold mb-4">Conversas</h2>
            <UserChatList onChatSelect={setSelectedChat} />
          </div>

          <div className="col-span-2">
            {selectedChat ? (
              <ChatWindow
                businessId={selectedChat.business_id || undefined}
                targetUserId={selectedChat.target_user_id || undefined}
                offerId={selectedChat.offer_id || undefined}
                businessName={chatPartnerName}
                businessAvatarUrl={chatPartnerAvatar}
                onClose={() => { setSelectedChat(null); setChatPartnerAvatar(null); }}
                inline
              />
            ) : (
              <div className="flex items-center justify-center h-[600px] bg-muted/30 rounded-lg border border-dashed">
                <div className="text-center">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Selecione uma conversa para visualizar</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserMessages;
