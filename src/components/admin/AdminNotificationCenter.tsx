import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Bell, Send, Plus, Users, Building2, Calendar, MessageSquare } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CreateNotificationData {
  title: string;
  message: string;
  type: string;
  target_audience: 'all' | 'consumers' | 'businesses';
}

export const AdminNotificationCenter = () => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [notificationData, setNotificationData] = useState<CreateNotificationData>({
    title: '',
    message: '',
    type: 'announcement',
    target_audience: 'all'
  });
  const queryClient = useQueryClient();

  const { data: recentNotifications, isLoading } = useQuery({
    queryKey: ['admin-notifications'],
    queryFn: async () => {
      const { data: notifications, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Get user names separately
      const notificationsWithNames = await Promise.all(
        (notifications || []).map(async (notification) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', notification.user_id)
            .single();

          return {
            ...notification,
            profiles: profile
          };
        })
      );

      return notificationsWithNames;
    },
  });

  const { data: notificationStats } = useQuery({
    queryKey: ['notification-stats'],
    queryFn: async () => {
      const [
        totalNotifications,
        todayNotifications,
        readNotifications,
        unreadNotifications
      ] = await Promise.all([
        supabase.from('notifications').select('*', { count: 'exact', head: true }),
        supabase.from('notifications').select('*', { count: 'exact', head: true })
          .gte('created_at', new Date().toDateString()),
        supabase.from('notifications').select('*', { count: 'exact', head: true })
          .eq('is_read', true),
        supabase.from('notifications').select('*', { count: 'exact', head: true })
          .eq('is_read', false)
      ]);

      return {
        total: totalNotifications.count || 0,
        today: todayNotifications.count || 0,
        read: readNotifications.count || 0,
        unread: unreadNotifications.count || 0
      };
    }
  });

  const createBulkNotification = useMutation({
    mutationFn: async (data: CreateNotificationData) => {
      // Get target users based on audience selection
      let userQuery = supabase.from('profiles').select('user_id');
      
      if (data.target_audience === 'consumers') {
        userQuery = userQuery.eq('user_type', 'consumer');
      } else if (data.target_audience === 'businesses') {
        userQuery = userQuery.eq('user_type', 'business');
      }

      const { data: users, error: userError } = await userQuery;
      if (userError) throw userError;

      if (!users || users.length === 0) {
        throw new Error('Nenhum usuário encontrado para o público-alvo selecionado');
      }

      // Create notifications for all target users
      const notifications = users.map(user => ({
        user_id: user.user_id,
        title: data.title,
        message: data.message,
        type: data.type,
        metadata: { 
          source: 'admin',
          target_audience: data.target_audience
        }
      }));

      const { error } = await supabase
        .from('notifications')
        .insert(notifications);

      if (error) throw error;

      return { count: notifications.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-stats'] });
      toast.success(`Notificação enviada para ${result.count} usuários`);
      setIsCreateOpen(false);
      setNotificationData({
        title: '',
        message: '',
        type: 'announcement',
        target_audience: 'all'
      });
    },
    onError: (error) => {
      console.error('Error creating notification:', error);
      toast.error('Erro ao enviar notificação');
    }
  });

  const handleCreateNotification = () => {
    if (!notificationData.title || !notificationData.message) {
      toast.error('Título e mensagem são obrigatórios');
      return;
    }

    createBulkNotification.mutate(notificationData);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="min-w-0 flex-1">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Bell className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <span className="truncate">Central de Notificações</span>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Crie e gerencie notificações globais e segmentadas
              </CardDescription>
            </div>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="truncate">Nova Notificação</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                  <DialogTitle>Criar Nova Notificação</DialogTitle>
                  <DialogDescription>
                    Envie uma notificação para usuários da plataforma
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Título</Label>
                    <Input
                      id="title"
                      value={notificationData.title}
                      onChange={(e) => setNotificationData(prev => ({
                        ...prev,
                        title: e.target.value
                      }))}
                      placeholder="Digite o título da notificação"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">Mensagem</Label>
                    <Textarea
                      id="message"
                      value={notificationData.message}
                      onChange={(e) => setNotificationData(prev => ({
                        ...prev,
                        message: e.target.value
                      }))}
                      placeholder="Digite a mensagem da notificação"
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="type">Tipo</Label>
                      <Select
                        value={notificationData.type}
                        onValueChange={(value) => setNotificationData(prev => ({
                          ...prev,
                          type: value
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="announcement">Anúncio</SelectItem>
                          <SelectItem value="system">Sistema</SelectItem>
                          <SelectItem value="promotion">Promoção</SelectItem>
                          <SelectItem value="update">Atualização</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="audience">Público-alvo</Label>
                      <Select
                        value={notificationData.target_audience}
                        onValueChange={(value: 'all' | 'consumers' | 'businesses') => 
                          setNotificationData(prev => ({
                            ...prev,
                            target_audience: value
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os usuários</SelectItem>
                          <SelectItem value="consumers">Apenas consumidores</SelectItem>
                          <SelectItem value="businesses">Apenas negócios</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleCreateNotification}
                    disabled={createBulkNotification.isPending}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {createBulkNotification.isPending ? 'Enviando...' : 'Enviar'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6">
          {notificationStats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
              <Card>
                <CardContent className="p-3 sm:p-4 lg:p-6">
                  <div className="flex items-center space-x-2">
                    <MessageSquare className="h-4 w-4 text-primary flex-shrink-0" />
                    <h3 className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Total</h3>
                  </div>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold">{notificationStats.total}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3 sm:p-4 lg:p-6">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-blue-500 flex-shrink-0" />
                    <h3 className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Hoje</h3>
                  </div>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-500">{notificationStats.today}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3 sm:p-4 lg:p-6">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <h3 className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Lidas</h3>
                  </div>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-500">{notificationStats.read}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3 sm:p-4 lg:p-6">
                  <div className="flex items-center space-x-2">
                    <Bell className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                    <h3 className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Não lidas</h3>
                  </div>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-yellow-500">{notificationStats.unread}</p>
                </CardContent>
              </Card>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Notificações Recentes</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Histórico de notificações enviadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-4">
                  <p className="text-muted-foreground text-sm">Carregando notificações...</p>
                </div>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table className="min-w-full">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[200px]">Título</TableHead>
                          <TableHead className="min-w-[120px] hidden sm:table-cell">Usuário</TableHead>
                          <TableHead className="min-w-[80px] hidden md:table-cell">Tipo</TableHead>
                          <TableHead className="min-w-[80px] hidden lg:table-cell">Status</TableHead>
                          <TableHead className="min-w-[140px] hidden lg:table-cell">Enviado em</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentNotifications?.slice(0, 20).map((notification) => (
                          <TableRow key={notification.id}>
                            <TableCell>
                              <div className="min-w-0">
                                <p className="font-medium line-clamp-1 text-sm">{notification.title}</p>
                                <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                                  {notification.message}
                                </p>
                                <div className="sm:hidden mt-2 flex flex-wrap gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {notification.type === 'announcement' ? 'Anúncio' :
                                     notification.type === 'system' ? 'Sistema' :
                                     notification.type === 'promotion' ? 'Promoção' :
                                     notification.type === 'update' ? 'Atualização' : notification.type}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(notification.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                                  </span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <p className="font-medium text-sm truncate">
                                {notification.profiles?.full_name || 'Usuário removido'}
                              </p>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <Badge variant="outline" className="text-xs">
                                {notification.type === 'announcement' ? 'Anúncio' :
                                 notification.type === 'system' ? 'Sistema' :
                                 notification.type === 'promotion' ? 'Promoção' :
                                 notification.type === 'update' ? 'Atualização' : notification.type}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              <Badge variant={notification.is_read ? 'default' : 'secondary'} className="text-xs">
                                {notification.is_read ? 'Lida' : 'Não lida'}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <span className="text-sm">
                                  {format(new Date(notification.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {recentNotifications?.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8">
                              <p className="text-muted-foreground text-sm">Nenhuma notificação encontrada</p>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
};