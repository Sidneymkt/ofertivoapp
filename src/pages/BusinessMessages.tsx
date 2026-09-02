import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { ChatList } from '@/components/ChatList';
import { BusinessChatWindow } from '@/components/BusinessChatWindow';
import { Chat } from '@/hooks/useChat';
import { Card } from '@/components/ui/card';
import { BackButton } from '@/components/BackButton';

const BusinessMessages = () => {
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);

  return (
    <div className="min-h-screen bg-background py-4 sm:py-8 mb-20 sm:mb-6">
      <div className="container mx-auto px-4 max-w-6xl">
        <BackButton />
        
        <div className="flex items-center gap-3 mb-6 sm:mb-8">
          <MessageSquare className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Mensagens</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Gerencie suas conversas com clientes</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Lista de conversas */}
          <div className="lg:col-span-1">
            <Card className="p-3 sm:p-4">
              <h2 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Conversas</h2>
              <ChatList onChatSelect={setSelectedChat} />
            </Card>
          </div>

          {/* Área de chat */}
          <div className="lg:col-span-2">
            {selectedChat ? (
              <BusinessChatWindow chat={selectedChat} />
            ) : (
              <Card className="p-6 h-[500px] sm:h-[600px] flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-base sm:text-lg font-semibold mb-2">Selecione uma conversa</h3>
                  <p className="text-sm sm:text-base text-muted-foreground px-4">
                    Escolha uma conversa da lista ao lado para visualizar as mensagens
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusinessMessages;
