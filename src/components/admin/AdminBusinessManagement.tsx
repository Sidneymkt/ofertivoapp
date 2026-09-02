import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Building2, Search, Filter, Eye, Users, TrendingUp, Calendar, MoreVertical, Trash2, Power, ToggleLeft, ToggleRight, CreditCard, MessageSquare } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useUserNavigation } from '@/hooks/useUserNavigation';
import { AdminManageSubscriptionDialog } from './AdminManageSubscriptionDialog';
interface Business {
  id: string;
  name: string;
  category: string;
  email: string;
  phone: string;
  is_active: boolean;
  created_at: string;
  owner_id: string;
  total_offers?: number;
  total_checkins?: number;
  owner_profile?: {
    full_name: string;
    phone: string;
  };
  business_subscriptions?: Array<{
    status: string;
    subscription_plans?: {
      name: string;
    };
  }>;
}

export const AdminBusinessManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [businessToDelete, setBusinessToDelete] = useState<Business | null>(null);
  const [managingBusiness, setManagingBusiness] = useState<Business | null>(null);
  const queryClient = useQueryClient();
  const { navigateToBusinessProfile } = useUserNavigation();

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

  const { data: businesses, isLoading, error } = useQuery({
    queryKey: ['admin-businesses', searchTerm, statusFilter],
    queryFn: async () => {
      console.log('Fetching businesses...');
      
      try {
        // Try optimized query with joins first (now that we have foreign keys)
        let query = supabase
          .from('businesses')
          .select(`
            *,
            business_subscriptions(
              status,
              subscription_plans(name)
            )
          `)
          .order('created_at', { ascending: false });

        if (searchTerm) {
          query = query.ilike('name', `%${searchTerm}%`);
        }

        if (statusFilter !== 'all') {
          query = query.eq('is_active', statusFilter === 'active');
        }

        const { data: businessData, error: businessError } = await query;
        
        if (businessError) {
          console.error('Join query failed, falling back to separate queries:', businessError);
          throw businessError;
        }

        if (!businessData || businessData.length === 0) {
          return [];
        }

        // Get additional stats and owner info for each business
        const businessesWithStats = await Promise.all(
          businessData.map(async (business) => {
            try {
              const [offersData, checkinsData, ownerData] = await Promise.all([
                supabase
                  .from('offers')
                  .select('id')
                  .eq('business_id', business.id),
                supabase
                  .from('offer_checkins')
                  .select('id')
                  .eq('business_id', business.id),
                supabase
                  .from('profiles')
                  .select('full_name, phone')
                  .eq('user_id', business.owner_id)
                  .maybeSingle()
              ]);

              return {
                ...business,
                total_offers: offersData.data?.length || 0,
                total_checkins: checkinsData.data?.length || 0,
                owner_profile: ownerData.data || null
              };
            } catch (err) {
              console.error('Error fetching stats for business:', business.id, err);
              return {
                ...business,
                total_offers: 0,
                total_checkins: 0,
                owner_profile: null
              };
            }
          })
        );

        console.log('Final businesses with stats (optimized):', businessesWithStats);
        return businessesWithStats;
        
      } catch (error) {
        console.error('Optimized query failed, trying fallback approach:', error);
        
        // Fallback: separate queries without joins
        let businessQuery = supabase
          .from('businesses')
          .select('*')
          .order('created_at', { ascending: false });

        if (searchTerm) {
          businessQuery = businessQuery.ilike('name', `%${searchTerm}%`);
        }

        if (statusFilter !== 'all') {
          businessQuery = businessQuery.eq('is_active', statusFilter === 'active');
        }

        const { data: businessData, error: businessError } = await businessQuery;
        
        if (businessError) {
          console.error('Fallback business query error:', businessError);
          throw businessError;
        }

        if (!businessData || businessData.length === 0) {
          return [];
        }

        // Get additional stats, subscriptions, and owner info for each business
        const businessesWithStats = await Promise.all(
          businessData.map(async (business) => {
            try {
              const [offersData, checkinsData, ownerData, subscriptionData] = await Promise.all([
                supabase
                  .from('offers')
                  .select('id')
                  .eq('business_id', business.id),
                supabase
                  .from('offer_checkins')
                  .select('id')
                  .eq('business_id', business.id),
                supabase
                  .from('profiles')
                  .select('full_name, phone')
                  .eq('user_id', business.owner_id)
                  .maybeSingle(),
                supabase
                  .from('business_subscriptions')
                  .select(`
                    status,
                    subscription_plans!inner(name)
                  `)
                  .eq('business_id', business.id)
                  .order('created_at', { ascending: false })
                  .limit(1)
                  .maybeSingle()
              ]);

              return {
                ...business,
                total_offers: offersData.data?.length || 0,
                total_checkins: checkinsData.data?.length || 0,
                owner_profile: ownerData.data || null,
                business_subscriptions: subscriptionData.data ? [subscriptionData.data] : []
              };
            } catch (err) {
              console.error('Error fetching stats for business:', business.id, err);
              return {
                ...business,
                total_offers: 0,
                total_checkins: 0,
                owner_profile: null,
                business_subscriptions: []
              };
            }
          })
        );

        console.log('Final businesses with stats (fallback):', businessesWithStats);
        return businessesWithStats;
      }
    },
    retry: 2,
    retryDelay: 1000,
  });

  const toggleBusinessStatus = useMutation({
    mutationFn: async ({ businessId, isActive }: { businessId: string; isActive: boolean }) => {
      const nextActive = !isActive;

      const { data, error } = await supabase.functions.invoke('admin-set-business-status', {
        body: { businessId, isActive: nextActive },
      });

      if (error) {
        console.error('[AdminBusinessManagement] Edge function error:', error);
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Falha ao atualizar status');
      }

      return data.business as { id: string; is_active: boolean };
    },
    onSuccess: (updated) => {
      // Always update the item in place - never remove from list
      // This ensures businesses remain visible when toggling status
      queryClient.setQueryData(
        ['admin-businesses', searchTerm, statusFilter],
        (old: Business[] | undefined) => {
          if (!old) return old;
          // Simply update the is_active flag without removing
          return old.map((b) => (b.id === updated.id ? { ...b, is_active: updated.is_active } : b));
        },
      );

      // Keep any other cached variants in sync as well
      queryClient.setQueriesData(
        { queryKey: ['admin-businesses'] },
        (old: unknown) => {
          if (!Array.isArray(old)) return old;
          return (old as Business[]).map((b) => (b.id === updated.id ? { ...b, is_active: updated.is_active } : b));
        },
      );

      // Also refresh the users tab (it shows advertiser status)
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });

      toast.success(updated.is_active 
        ? '✅ Anunciante reativado! Agora pode criar ofertas e sorteios.' 
        : '⛔ Anunciante desativado. Ele ainda aparece na lista para reativação.');
    },
    onError: (error: any) => {
      console.error('Error updating business status:', error);
      toast.error(error?.message || 'Erro ao atualizar status do anunciante');
    },
  });

  const deleteBusiness = useMutation({
    mutationFn: async (businessId: string) => {
      // Delete related data first (in order of dependencies)
      const deleteOperations = [
        supabase.from('offer_checkins').delete().eq('business_id', businessId),
        supabase.from('checkin_validations').delete().eq('business_id', businessId),
        supabase.from('qr_codes').delete().eq('business_id', businessId),
        supabase.from('manual_checkin_codes').delete().eq('business_id', businessId),
        supabase.from('reviews').delete().eq('business_id', businessId),
        supabase.from('business_reviews').delete().eq('business_id', businessId),
        supabase.from('follows').delete().eq('business_id', businessId),
        supabase.from('chats').delete().eq('business_id', businessId),
        supabase.from('business_analytics').delete().eq('business_id', businessId),
        supabase.from('raffle_entries').delete().in('raffle_id', 
          (await supabase.from('raffles').select('id').eq('business_id', businessId)).data?.map(r => r.id) || []
        ),
        supabase.from('raffles').delete().eq('business_id', businessId),
        supabase.from('favorites').delete().in('offer_id',
          (await supabase.from('offers').select('id').eq('business_id', businessId)).data?.map(o => o.id) || []
        ),
        supabase.from('offer_likes').delete().in('offer_id',
          (await supabase.from('offers').select('id').eq('business_id', businessId)).data?.map(o => o.id) || []
        ),
        supabase.from('offer_views').delete().in('offer_id',
          (await supabase.from('offers').select('id').eq('business_id', businessId)).data?.map(o => o.id) || []
        ),
        supabase.from('offers').delete().eq('business_id', businessId),
        supabase.from('business_subscriptions').delete().eq('business_id', businessId),
        supabase.from('transactions').delete().eq('business_id', businessId),
        supabase.from('addresses').delete().eq('business_id', businessId),
        supabase.from('business_dashboard_access').delete().eq('business_id', businessId),
        supabase.from('business_achievements').delete().eq('business_id', businessId),
        supabase.from('support_tickets').delete().eq('business_id', businessId),
      ];
      
      await Promise.allSettled(deleteOperations);
      
      // Finally delete the business
      const { error } = await supabase
        .from('businesses')
        .delete()
        .eq('id', businessId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-businesses'] });
      toast.success('Anunciante excluído com sucesso');
      setBusinessToDelete(null);
    },
    onError: (error) => {
      console.error('Error deleting business:', error);
      toast.error('Erro ao excluir anunciante. Verifique se há dados relacionados.');
    }
  });

  const handleToggleStatus = (business: Business) => {
    toggleBusinessStatus.mutate({
      businessId: business.id,
      isActive: business.is_active
    });
  };

  const handleDeleteBusiness = (business: Business) => {
    setBusinessToDelete(business);
  };

  const confirmDeleteBusiness = () => {
    if (businessToDelete) {
      deleteBusiness.mutate(businessToDelete.id);
    }
  };


  const filteredBusinesses = (businesses || []).filter((b: any) => {
    if (statusFilter === 'no_plan') {
      return !b.business_subscriptions?.length || !b.business_subscriptions[0]?.subscription_plans?.name;
    }
    if (statusFilter === 'expired') {
      const sub = b.business_subscriptions?.[0];
      return sub && sub.status !== 'active';
    }
    return true;
  });

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
            <Building2 className="h-5 w-5" />
            Gestão de Anunciantes
          </CardTitle>
          <CardDescription>
            Gerencie todos os negócios e anunciantes da plataforma
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar por nome do negócio..."
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
                  <SelectItem value="inactive">Inativos</SelectItem>
                  <SelectItem value="no_plan">Sem assinatura</SelectItem>
                  <SelectItem value="expired">Plano expirado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Carregando negócios...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-destructive">Erro ao carregar negócios: {error.message}</p>
              <p className="text-sm text-muted-foreground mt-2">
                Verifique suas permissões de administrador
              </p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Negócio</TableHead>
                    <TableHead className="min-w-[180px] hidden md:table-cell">Proprietário</TableHead>
                    <TableHead className="min-w-[120px] hidden lg:table-cell">Categoria</TableHead>
                    <TableHead className="min-w-[100px]">Plano</TableHead>
                    <TableHead className="min-w-[80px] hidden sm:table-cell">Ofertas</TableHead>
                    <TableHead className="min-w-[80px] hidden sm:table-cell">Check-ins</TableHead>
                    <TableHead className="min-w-[80px]">Status</TableHead>
                    <TableHead className="min-w-[100px] hidden lg:table-cell">Criado em</TableHead>
                    <TableHead className="min-w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBusinesses.map((business) => (
                    <TableRow 
                      key={business.id}
                      className="cursor-pointer"
                      onClick={() => navigateToBusinessProfile(business.id)}
                    >
                      <TableCell className="min-w-[200px]">
                        <div>
                          <p className="font-medium line-clamp-1">{business.name}</p>
                          <p className="text-sm text-muted-foreground line-clamp-1">{business.email}</p>
                          <div className="md:hidden mt-1 space-y-1">
                            <p className="text-xs text-muted-foreground">
                              {business.owner_profile?.full_name || 'Nome não informado'}
                            </p>
                            <div className="lg:hidden">
                              <Badge variant="outline" className="text-xs">{business.category}</Badge>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div>
                          <p className="font-medium line-clamp-1">
                            {business.owner_profile?.full_name || 'Nome não informado'}
                          </p>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {business.owner_profile?.phone || 'Telefone não informado'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Badge variant="outline">{business.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={business.business_subscriptions?.[0]?.status === 'active' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {business.business_subscriptions?.[0]?.subscription_plans?.name || 'Sem assinatura'}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{business.total_offers}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{business.total_checkins}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={business.is_active ? 'default' : 'destructive'} className="text-xs">
                          {business.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                        <div className="sm:hidden mt-1 text-xs text-muted-foreground">
                          {business.total_offers} ofertas • {business.total_checkins} check-ins
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{format(new Date(business.created_at), 'dd/MM/yyyy', { locale: ptBR })}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 sm:gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(`/negocio/${business.id}`, '_blank');
                            }}
                            className="p-2"
                            title="Ver perfil"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            variant={business.is_active ? "outline" : "default"}
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleStatus(business);
                            }}
                            className={`p-2 ${business.is_active 
                              ? 'hover:bg-destructive/10 hover:text-destructive hover:border-destructive' 
                              : 'bg-green-600 hover:bg-green-700 text-white'}`}
                            title={business.is_active ? 'Desativar anunciante' : 'Reativar anunciante'}
                            disabled={toggleBusinessStatus.isPending}
                          >
                            {business.is_active 
                              ? <ToggleRight className="h-4 w-4" /> 
                              : <ToggleLeft className="h-4 w-4" />}
                          </Button>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="p-2"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenuItem onClick={() => setManagingBusiness(business)}>
                                <CreditCard className="h-4 w-4 mr-2" />
                                Gerenciar Plano
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleToggleStatus(business)}>
                                <Power className="h-4 w-4 mr-2" />
                                {business.is_active ? 'Desativar' : 'Ativar'}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleDeleteBusiness(business)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir Anunciante
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {filteredBusinesses.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Nenhum negócio encontrado</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!businessToDelete} onOpenChange={() => setBusinessToDelete(null)}>
        <AlertDialogContent className="max-w-md mx-4">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg text-destructive">
              Excluir Anunciante
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Tem certeza que deseja excluir o anunciante "{businessToDelete?.name}"?
              <br /><br />
              <strong className="text-destructive">Esta ação é irreversível.</strong> Todos os dados relacionados serão excluídos, incluindo:
              <ul className="list-disc list-inside mt-2 text-xs">
                <li>Ofertas e check-ins</li>
                <li>Sorteios e participações</li>
                <li>Avaliações e seguidores</li>
                <li>Assinaturas e transações</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteBusiness}
              className="w-full sm:w-auto bg-destructive hover:bg-destructive/90"
              disabled={deleteBusiness.isPending}
            >
              {deleteBusiness.isPending ? 'Excluindo...' : 'Excluir Permanentemente'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Manage Subscription Dialog */}
      <AdminManageSubscriptionDialog
        open={!!managingBusiness}
        onOpenChange={(open) => { if (!open) setManagingBusiness(null); }}
        business={managingBusiness}
      />
    </div>
  );
};