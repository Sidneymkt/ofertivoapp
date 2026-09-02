import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Ticket, Search, Filter, Check, X, Eye, Users, Calendar, Trophy, Coins } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { RaffleParticipantsViewer } from '@/components/RaffleParticipantsViewer';

interface Raffle {
  id: string;
  title: string;
  prize: string;
  entry_cost: number;
  current_participants: number;
  max_participants: number | null;
  start_date: string;
  end_date: string;
  is_active: boolean;
  winner_id: string | null;
  created_at: string;
  business: {
    id: string;
    name: string;
  };
  winner?: {
    full_name: string;
  };
}

export const AdminRaffleManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showParticipants, setShowParticipants] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Check admin status first
  const { data: adminCheck, isLoading: adminLoading } = useQuery({
    queryKey: ['admin-check'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('check_admin_status', {
        check_user_id: (await supabase.auth.getUser()).data.user?.id
      });
      
      if (error) throw error;
      return data?.[0] || null;
    },
  });

  const { data: raffles, isLoading, error } = useQuery({
    queryKey: ['admin-raffles', searchTerm, statusFilter],
    queryFn: async () => {
      const { data: raffles, error } = await supabase
        .from('raffles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get business and winner info separately
      const rafflesWithDetails = await Promise.all(
        (raffles || []).map(async (raffle) => {
          const [businessData, winnerData] = await Promise.all([
            supabase
              .from('businesses')
              .select('id, name')
              .eq('id', raffle.business_id)
              .single(),
            raffle.winner_id ? supabase
              .from('profiles')
              .select('full_name')
              .eq('user_id', raffle.winner_id)
              .single() : Promise.resolve({ data: null })
          ]);

          return {
            ...raffle,
            business: businessData.data,
            winner: winnerData.data
          };
        })
      );

      // Apply filters after getting data
      let filteredRaffles = rafflesWithDetails;

      if (searchTerm) {
        filteredRaffles = filteredRaffles.filter(raffle => 
          raffle.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          raffle.prize.toLowerCase().includes(searchTerm.toLowerCase()) ||
          raffle.business?.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      if (statusFilter === 'active') {
        filteredRaffles = filteredRaffles.filter(r => r.is_active && !r.winner_id);
      } else if (statusFilter === 'finished') {
        filteredRaffles = filteredRaffles.filter(r => r.winner_id);
      } else if (statusFilter === 'inactive') {
        filteredRaffles = filteredRaffles.filter(r => !r.is_active);
      }

      return filteredRaffles;
    },
  });

  const toggleRaffleStatus = useMutation({
    mutationFn: async ({ raffleId, isActive }: { raffleId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('raffles')
        .update({ is_active: !isActive })
        .eq('id', raffleId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-raffles'] });
      toast.success('Status do sorteio atualizado com sucesso');
    },
    onError: (error) => {
      console.error('Error updating raffle status:', error);
      toast.error('Erro ao atualizar status do sorteio');
    }
  });

  const conductRaffle = useMutation({
    mutationFn: async (raffleId: string) => {
      const { data, error } = await supabase.rpc('conduct_raffle', {
        raffle_id_param: raffleId
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['admin-raffles'] });
      if (result?.success) {
        toast.success('Sorteio realizado com sucesso!');
      } else {
        toast.error(result?.message || 'Erro ao realizar sorteio');
      }
    },
    onError: (error) => {
      console.error('Error conducting raffle:', error);
      toast.error('Erro ao realizar sorteio');
    }
  });

  const handleToggleStatus = (raffle: Raffle) => {
    toggleRaffleStatus.mutate({
      raffleId: raffle.id,
      isActive: raffle.is_active
    });
  };

  const handleConductRaffle = (raffle: Raffle) => {
    conductRaffle.mutate(raffle.id);
  };

  const isRaffleExpired = (endDate: string) => {
    return new Date(endDate) < new Date();
  };

  const canConductRaffle = (raffle: Raffle) => {
    return raffle.is_active && !raffle.winner_id && raffle.current_participants > 0;
  };

  const filteredRaffles = raffles || [];

  if (adminLoading) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Verificando permissões...</p>
      </div>
    );
  }

  if (!adminCheck?.is_active) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive">Acesso negado. Você não tem permissão de administrador.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5" />
            Gestão de Sorteios
          </CardTitle>
          <CardDescription>
            Aprove, monitore e gerencie todos os sorteios da plataforma
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar sorteios ou negócios..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Ativos</SelectItem>
                  <SelectItem value="finished">Finalizados</SelectItem>
                  <SelectItem value="inactive">Inativos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Carregando sorteios...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-destructive">Erro ao carregar sorteios: {error.message}</p>
              <p className="text-sm text-muted-foreground mt-2">
                Verifique suas permissões de administrador
              </p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Sorteio</TableHead>
                    <TableHead className="min-w-[150px] hidden md:table-cell">Negócio</TableHead>
                    <TableHead className="min-w-[120px] hidden sm:table-cell">Prêmio</TableHead>
                    <TableHead className="min-w-[80px] hidden lg:table-cell">Custo</TableHead>
                    <TableHead className="min-w-[100px] hidden sm:table-cell">Participantes</TableHead>
                    <TableHead className="min-w-[120px] hidden lg:table-cell">Período</TableHead>
                    <TableHead className="min-w-[100px] hidden xl:table-cell">Ganhador</TableHead>
                    <TableHead className="min-w-[80px]">Status</TableHead>
                    <TableHead className="min-w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRaffles.map((raffle) => (
                    <TableRow key={raffle.id}>
                      <TableCell className="min-w-[200px]">
                        <div>
                          <p className="font-medium line-clamp-2">{raffle.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(raffle.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                          </p>
                          <div className="md:hidden mt-1">
                            <p className="text-xs text-muted-foreground line-clamp-1">{raffle.business.name}</p>
                          </div>
                          <div className="sm:hidden mt-1 text-xs text-muted-foreground line-clamp-1">
                            {raffle.prize}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <p className="font-medium line-clamp-1">{raffle.business.name}</p>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex items-center gap-1">
                          <Trophy className="h-4 w-4 text-yellow-500" />
                          <span className="line-clamp-1">{raffle.prize}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex items-center gap-1">
                          <Coins className="h-4 w-4 text-yellow-500" />
                          {raffle.entry_cost} pts
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          {raffle.current_participants}
                          {raffle.max_participants && `/${raffle.max_participants}`}
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="space-y-1 text-sm">
                          <p>{format(new Date(raffle.start_date), 'dd/MM/yyyy', { locale: ptBR })}</p>
                          <p className={isRaffleExpired(raffle.end_date) ? 'text-destructive' : 'text-muted-foreground'}>
                            {format(new Date(raffle.end_date), 'dd/MM/yyyy', { locale: ptBR })}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
        {raffle.winner_id ? (
          <Badge variant="default">
            {raffle.winner?.full_name || 'Ganhador'}
          </Badge>
        ) : (
          <span className="text-muted-foreground">Pendente</span>
        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          !raffle.is_active ? 'destructive' :
                          raffle.winner_id ? 'secondary' :
                          isRaffleExpired(raffle.end_date) ? 'secondary' : 'default'
                        } className="text-xs">
                          {!raffle.is_active ? 'Inativo' :
                           raffle.winner_id ? 'Finalizado' :
                           isRaffleExpired(raffle.end_date) ? 'Expirado' : 'Ativo'}
                        </Badge>
                        <div className="sm:hidden mt-1 text-xs text-muted-foreground">
                          {raffle.entry_cost} pts • {raffle.current_participants} participantes
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 sm:gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowParticipants(raffle.id)}
                            className="p-2"
                            title="Ver participantes"
                          >
                            <Users className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`/sorteios/${raffle.id}`, '_blank')}
                            className="p-2"
                            title="Visualizar sorteio"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          {canConductRaffle(raffle) && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="default" size="sm" className="p-2" title="Realizar sorteio">
                                  <Trophy className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="max-w-md mx-4">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-lg">Realizar Sorteio</AlertDialogTitle>
                                  <AlertDialogDescription className="text-sm">
                                    Tem certeza que deseja realizar o sorteio "{raffle.title}"? 
                                    Esta ação não pode ser desfeita e um ganhador será escolhido aleatoriamente.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                                  <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleConductRaffle(raffle)}
                                    className="w-full sm:w-auto"
                                  >
                                    Realizar Sorteio
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                          
                          {!raffle.winner_id && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant={raffle.is_active ? 'destructive' : 'default'}
                                  size="sm"
                                  className="p-2"
                                  title={raffle.is_active ? 'Desativar sorteio' : 'Ativar sorteio'}
                                >
                                  {raffle.is_active ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="max-w-md mx-4">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-lg">
                                    {raffle.is_active ? 'Desativar' : 'Ativar'} Sorteio
                                  </AlertDialogTitle>
                                  <AlertDialogDescription className="text-sm">
                                    Tem certeza que deseja {raffle.is_active ? 'desativar' : 'ativar'} o sorteio "{raffle.title}"?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                                  <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleToggleStatus(raffle)}
                                    className="w-full sm:w-auto"
                                  >
                                    {raffle.is_active ? 'Desativar' : 'Ativar'}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {filteredRaffles.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Nenhum sorteio encontrado</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {showParticipants && (
        <Dialog open={!!showParticipants} onOpenChange={(open) => !open && setShowParticipants(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Participantes e Números da Sorte</DialogTitle>
              <DialogDescription>
                Visualização completa e transparente dos participantes
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto">
              <RaffleParticipantsViewer
                raffleId={showParticipants}
                raffleName={raffles?.find((r: any) => r.id === showParticipants)?.title || 'Sorteio'}
                isBusinessOwner={true}
                canDeleteParticipants={true}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};