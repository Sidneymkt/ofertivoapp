import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Bell, Gift, Star, Users, Trophy } from 'lucide-react';

const NotificationDemo = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const createTestNotification = async (type: string, title: string, message: string, metadata = {}) => {
    if (!user) {
      toast({
        title: 'Erro',
        description: 'Você precisa estar logado para testar notificações.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase.rpc('create_notification', {
        p_user_id: user.id,
        p_title: title,
        p_message: message,
        p_type: type,
        p_metadata: metadata,
      });

      if (error) throw error;

      toast({
        title: 'Notificação criada!',
        description: 'Verifique o sino de notificações na navegação.',
      });
    } catch (error) {
      console.error('Erro ao criar notificação:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar a notificação de teste.',
        variant: 'destructive',
      });
    }
  };

  const testNotifications = [
    {
      type: 'new_offer',
      title: 'Nova Oferta Disponível! 🔥',
      message: 'Hamburgueria do João criou uma nova oferta: Combo Duplo com 30% OFF',
      metadata: { business_name: 'Hamburgueria do João', offer_title: 'Combo Duplo com 30% OFF' },
      icon: Gift,
      color: 'bg-orange-500',
    },
    {
      type: 'new_review',
      title: 'Nova Avaliação Recebida! ⭐',
      message: 'Maria Silva avaliou seu negócio com 5 estrelas',
      metadata: { rating: 5, reviewer_name: 'Maria Silva' },
      icon: Star,
      color: 'bg-yellow-500',
    },
    {
      type: 'new_follower',
      title: 'Novo Seguidor! 👥',
      message: 'Carlos começou a seguir seu negócio',
      metadata: { follower_name: 'Carlos', business_name: 'Seu Negócio' },
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      type: 'checkin_success',
      title: 'Check-in Realizado! 🎉',
      message: 'Você ganhou 50 pontos no check-in em Pizzaria Central',
      metadata: { points_awarded: 50, business_name: 'Pizzaria Central' },
      icon: Trophy,
      color: 'bg-green-500',
    },
    {
      type: 'new_raffle',
      title: 'Novo Sorteio Disponível! 🎁',
      message: 'Loja da Esquina criou um novo sorteio: iPhone 15 Pro',
      metadata: { business_name: 'Loja da Esquina', raffle_title: 'iPhone 15 Pro', entry_cost: 100 },
      icon: Gift,
      color: 'bg-purple-500',
    },
  ];

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Demo de Notificações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Faça login para testar o sistema de notificações.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Demo de Notificações
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Teste os diferentes tipos de notificações do sistema. As notificações aparecerão no sino na navegação superior.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {testNotifications.map((notification, index) => (
          <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${notification.color}`}>
                <notification.icon className="h-4 w-4 text-white" />
              </div>
              <div>
                <h4 className="font-medium text-sm">{notification.title}</h4>
                <p className="text-xs text-muted-foreground">{notification.message}</p>
                <div className="flex gap-1 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {notification.type}
                  </Badge>
                </div>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() =>
                createTestNotification(
                  notification.type,
                  notification.title,
                  notification.message,
                  notification.metadata
                )
              }
            >
              Criar
            </Button>
          </div>
        ))}
        
        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground mb-2">
            ℹ️ Dica: As notificações aparecem em tempo real e ficam armazenadas para consulta posterior.
          </p>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              testNotifications.forEach((notification, index) => {
                setTimeout(() => {
                  createTestNotification(
                    notification.type,
                    notification.title,
                    notification.message,
                    notification.metadata
                  );
                }, index * 1000);
              });
            }}
          >
            Criar Todas as Notificações
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default NotificationDemo;