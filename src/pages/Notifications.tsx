import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Navigation } from '@/components/ui/navigation';
import { BottomNavigation } from '@/components/ui/bottom-navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bell, 
  CheckCheck, 
  Filter, 
  ArrowLeft,
  MoreHorizontal,
  Check,
  X 
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const Notifications = () => {
  const { isAuthenticated, userProfile } = useAuth();
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getNotificationIcon,
    getRelativeTime,
  } = useNotifications();

  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b sticky top-0 bg-background/95 backdrop-blur-sm z-50">
          <div className="container mx-auto px-4 py-4">
            <Navigation />
          </div>
        </header>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-3xl font-bold mb-4">Faça login para ver suas notificações</h1>
          <p className="text-muted-foreground mb-8">Entre na sua conta para acompanhar suas notificações.</p>
        </div>
      </div>
    );
  }

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.is_read)
    : notifications;

  const getNotificationRoute = (notification: any) => {
    const { type, related_id } = notification;
    const isBusiness = userProfile?.user_type === 'business';
    
    switch (type) {
      case 'new_offer':
        return `/ofertas/${related_id}`;
      case 'new_review':
      case 'new_follower':
        return `/anunciante/dashboard`;
      case 'checkin_success':
        return `/pontos`;
      case 'customer_checkin':
        return `/anunciante/ofertas`;
      case 'new_raffle':
        return `/sorteios`;
      case 'raffle_participation':
        return `/anunciante/sorteios`;
      case 'points_earned':
        return `/pontos`;
      case 'new_message':
        return isBusiness ? '/anunciante/mensagens' : '/mensagens';
      default:
        return '/';
    }
  };

  const handleNotificationClick = (notificationId: string, isRead: boolean) => {
    if (!isRead) {
      markAsRead(notificationId);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur-sm z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild>
                <Link to="/">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
              <div className="flex items-center gap-2">
                <Bell className="h-6 w-6" />
                <h1 className="text-2xl font-bold">Notificações</h1>
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="rounded-full">
                    {unreadCount}
                  </Badge>
                )}
              </div>
            </div>
            
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={markAllAsRead}
                className="gap-2"
              >
                <CheckCheck className="h-4 w-4" />
                Marcar todas como lidas
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 pb-20">
        {/* Filter Tabs */}
        <Tabs value={filter} onValueChange={(value) => setFilter(value as 'all' | 'unread')} className="mb-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="all" className="gap-2">
              <Filter className="h-4 w-4" />
              Todas ({notifications.length})
            </TabsTrigger>
            <TabsTrigger value="unread" className="gap-2">
              <Bell className="h-4 w-4" />
              Não lidas ({unreadCount})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Notifications List */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Carregando notificações...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {filter === 'unread' ? 'Nenhuma notificação não lida' : 'Nenhuma notificação'}
            </h3>
            <p className="text-muted-foreground">
              {filter === 'unread' 
                ? 'Todas as suas notificações foram lidas.' 
                : 'Você receberá notificações sobre ofertas, sorteios e mais.'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notification) => (
              <Card
                key={notification.id}
                className={cn(
                  "cursor-pointer transition-colors hover:bg-muted/50",
                  !notification.is_read && "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                )}
              >
                <CardContent className="p-4">
                  <Link
                    to={getNotificationRoute(notification)}
                    onClick={() => handleNotificationClick(notification.id, notification.is_read)}
                    className="block"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 text-2xl">
                        {getNotificationIcon(notification.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className={cn(
                            "font-medium text-sm",
                            !notification.is_read && "font-semibold"
                          )}>
                            {notification.title}
                          </h3>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {getRelativeTime(notification.created_at)}
                            </span>
                            {!notification.is_read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full" />
                            )}
                          </div>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-2">
                          {notification.message}
                        </p>
                        
                        {/* Metadata display */}
                        {notification.metadata && Object.keys(notification.metadata).length > 0 && (
                          <div className="flex gap-2 mt-2">
                            {notification.metadata.business_name && (
                              <Badge variant="outline" className="text-xs">
                                {notification.metadata.business_name}
                              </Badge>
                            )}
                            {notification.metadata.points_awarded && (
                              <Badge variant="secondary" className="text-xs">
                                +{notification.metadata.points_awarded} pontos
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={(e) => e.preventDefault()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {!notification.is_read && (
                            <DropdownMenuItem onClick={() => markAsRead(notification.id)}>
                              <Check className="h-4 w-4 mr-2" />
                              Marcar como lida
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => deleteNotification(notification.id)}
                            className="text-red-600"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
};

export default Notifications;