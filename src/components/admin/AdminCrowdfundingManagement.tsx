import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Heart, Search, CheckCircle, XCircle, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const AdminCrowdfundingManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'expired'>('all');
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'verify' | 'deactivate' | null>(null);
  const queryClient = useQueryClient();

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['admin-crowdfunding', searchTerm, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('crowdfunding_campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }

      if (statusFilter !== 'all') {
        const now = new Date().toISOString();
        if (statusFilter === 'active') {
          query = query.eq('is_active', true).gte('end_date', now);
        } else if (statusFilter === 'completed') {
          query = query.lt('end_date', now);
        } else if (statusFilter === 'expired') {
          query = query.eq('is_active', false);
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      // Get contributions count for each campaign
      const campaignsWithContributions = await Promise.all(
        (data || []).map(async (campaign) => {
          const { count } = await supabase
            .from('campaign_contributions')
            .select('*', { count: 'exact', head: true })
            .eq('campaign_id', campaign.id);

          return {
            ...campaign,
            contributionsCount: count || 0
          };
        })
      );

      return campaignsWithContributions;
    },
  });

  const verifyCampaign = useMutation({
    mutationFn: async (campaignId: string) => {
      const { error } = await supabase
        .from('crowdfunding_campaigns')
        .update({ is_verified: true })
        .eq('id', campaignId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-crowdfunding'] });
      toast.success('Campanha verificada com sucesso');
      setSelectedCampaign(null);
      setActionType(null);
    },
    onError: () => {
      toast.error('Erro ao verificar campanha');
    },
  });

  const toggleCampaignStatus = useMutation({
    mutationFn: async ({ campaignId, isActive }: { campaignId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('crowdfunding_campaigns')
        .update({ is_active: !isActive })
        .eq('id', campaignId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-crowdfunding'] });
      toast.success('Status da campanha atualizado');
      setSelectedCampaign(null);
      setActionType(null);
    },
    onError: () => {
      toast.error('Erro ao atualizar status');
    },
  });

  const getStatusBadge = (campaign: any) => {
    const now = new Date();
    const endDate = new Date(campaign.end_date);
    const progress = (campaign.current_points / campaign.goal_points) * 100;

    if (progress >= 100) {
      return <Badge className="bg-green-500">Concluída</Badge>;
    }
    if (endDate < now) {
      return <Badge variant="secondary">Expirada</Badge>;
    }
    if (!campaign.is_active) {
      return <Badge variant="destructive">Inativa</Badge>;
    }
    return <Badge className="bg-blue-500">Ativa</Badge>;
  };

  const filteredCampaigns = campaigns || [];
  const totalContributions = filteredCampaigns.reduce((sum, c) => sum + (c.contributionsCount || 0), 0);
  const totalPoints = filteredCampaigns.reduce((sum, c) => sum + c.current_points, 0);
  const activeCampaigns = filteredCampaigns.filter(c => {
    const now = new Date();
    const endDate = new Date(c.end_date);
    return c.is_active && endDate >= now;
  }).length;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Campanhas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredCampaigns.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Campanhas Ativas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{activeCampaigns}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Contribuições</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{totalContributions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pontos Arrecadados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{totalPoints.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5" />
                Gerenciar Vaquinhas
              </CardTitle>
              <CardDescription>Monitore e gerencie campanhas de crowdfunding</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar campanhas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('all')}
                size="sm"
              >
                Todas
              </Button>
              <Button
                variant={statusFilter === 'active' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('active')}
                size="sm"
              >
                Ativas
              </Button>
              <Button
                variant={statusFilter === 'completed' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('completed')}
                size="sm"
              >
                Concluídas
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campanha</TableHead>
                  <TableHead className="hidden md:table-cell">Criador</TableHead>
                  <TableHead>Progresso</TableHead>
                  <TableHead className="hidden lg:table-cell">Período</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : filteredCampaigns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">Nenhuma campanha encontrada</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCampaigns.map((campaign) => {
                    const progress = (campaign.current_points / campaign.goal_points) * 100;
                    return (
                      <TableRow key={campaign.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium">{campaign.title}</p>
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {campaign.category}
                            </p>
                            {campaign.is_verified && (
                              <Badge variant="secondary" className="text-xs">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Verificada
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <p className="text-sm text-muted-foreground">Criador #{campaign.creator_id.slice(0, 8)}</p>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span>{campaign.current_points.toLocaleString()}</span>
                              <span className="text-muted-foreground">
                                {campaign.goal_points.toLocaleString()} pts
                              </span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full transition-all"
                                style={{ width: `${Math.min(progress, 100)}%` }}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {progress.toFixed(0)}% • {campaign.contributionsCount || 0} contribuições
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="text-xs space-y-1">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(campaign.start_date), 'dd/MM/yy', { locale: ptBR })}
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(campaign.end_date), 'dd/MM/yy', { locale: ptBR })}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(campaign)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {!campaign.is_verified && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedCampaign(campaign.id);
                                  setActionType('verify');
                                }}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedCampaign(campaign.id);
                                setActionType('deactivate');
                              }}
                            >
                              {campaign.is_active ? (
                                <XCircle className="h-4 w-4 text-destructive" />
                              ) : (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialogs */}
      <AlertDialog open={actionType === 'verify'} onOpenChange={() => setActionType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Verificar Campanha</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja verificar esta campanha? Campanhas verificadas ganham mais visibilidade.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => selectedCampaign && verifyCampaign.mutate(selectedCampaign)}>
              Verificar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={actionType === 'deactivate'} onOpenChange={() => setActionType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alterar Status</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja alterar o status desta campanha?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedCampaign) {
                  const campaign = filteredCampaigns.find(c => c.id === selectedCampaign);
                  if (campaign) {
                    toggleCampaignStatus.mutate({ campaignId: campaign.id, isActive: campaign.is_active });
                  }
                }
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
