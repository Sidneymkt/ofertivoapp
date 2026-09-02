import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';

interface Notification {
  id: string;
  title: string;
  description: string;
  time: string;
  type: 'offer' | 'raffle' | 'business' | 'system';
  isRead: boolean;
}

export const NotificationsBell = () => {
  const { userProfile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      title: userProfile?.user_type === 'business' ? 'Nova oferta publicada' : 'Nova oferta próxima',
      description: userProfile?.user_type === 'business' 
        ? 'Sua oferta "Desconto 50%" foi publicada com sucesso' 
        : 'Hamburgueria do João tem 50% de desconto',
      time: '5 min',
      type: userProfile?.user_type === 'business' ? 'business' : 'offer',
      isRead: false
    },
    {
      id: '2',
      title: userProfile?.user_type === 'business' ? 'Novo cliente' : 'Sorteio disponível',
      description: userProfile?.user_type === 'business'
        ? 'Maria Silva resgatou sua oferta'
        : 'Participe do sorteio de R$ 500 em compras',
      time: '1h',
      type: userProfile?.user_type === 'business' ? 'business' : 'raffle',
      isRead: false
    },
    {
      id: '3',
      title: 'Sistema',
      description: 'Bem-vindo ao Ofertivo! Complete seu perfil para ganhar 100 pontos',
      time: '2h',
      type: 'system',
      isRead: true
    }
  ]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, isRead: true } : n)
    );
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'offer':
        return '🔥';
      case 'raffle':
        return '🎁';
      case 'business':
        return '💼';
      default:
        return '📢';
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 text-xs p-0 flex items-center justify-center"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-80">
        <div className="p-3 border-b">
          <h4 className="font-semibold">Notificações</h4>
          {unreadCount > 0 && (
            <p className="text-sm text-muted-foreground">
              {unreadCount} nova{unreadCount > 1 ? 's' : ''} notificaç{unreadCount > 1 ? 'ões' : 'ão'}
            </p>
          )}
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          {notifications.length > 0 ? (
            notifications.map((notification) => (
              <DropdownMenuItem 
                key={notification.id} 
                className="p-0"
                onSelect={() => markAsRead(notification.id)}
              >
                <Card className={`w-full border-0 shadow-none ${!notification.isRead ? 'bg-muted/30' : ''}`}>
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                      <div className="flex-1 space-y-1">
                        <p className={`text-sm font-medium ${!notification.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {notification.title}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {notification.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {notification.time} atrás
                        </p>
                      </div>
                      {!notification.isRead && (
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </DropdownMenuItem>
            ))
          ) : (
            <div className="p-6 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma notificação</p>
            </div>
          )}
        </div>
        
        {notifications.length > 0 && (
          <div className="p-2 border-t">
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full text-sm"
              onClick={() => setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))}
            >
              Marcar todas como lidas
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};