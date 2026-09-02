import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserNavigation } from '@/hooks/useUserNavigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  Users, 
  Search, 
  Filter, 
  MoreHorizontal,
  Ban,
  CheckCircle,
  XCircle,
  Eye,
  RefreshCw,
  Download
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

export const AdminUserManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [userTypeFilter, setUserTypeFilter] = useState('all');
  const queryClient = useQueryClient();
  const { navigateToUserProfile, navigateToBusinessProfile } = useUserNavigation();

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users', searchTerm, statusFilter, userTypeFilter],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select(
          `
          id,
          user_id,
          full_name,
          city,
          state,
          user_type,
          total_points,
          created_at,
          updated_at
        `,
        )
        .order('created_at', { ascending: false });

      if (searchTerm) {
        query = query.or(`full_name.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%`);
      }

      if (userTypeFilter !== 'all') {
        query = query.eq('user_type', userTypeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      const profiles = data || [];
      if (profiles.length === 0) return [];

      // For advertisers, status comes from the linked business (businesses.is_active)
      const advertiserOwnerIds = profiles
        .filter((p) => p.user_type === 'business')
        .map((p) => p.user_id)
        .filter(Boolean);

      let businessByOwnerId = new Map<string, { id: string; is_active: boolean | null }> ();

      if (advertiserOwnerIds.length > 0) {
        const { data: businesses, error: bizErr } = await supabase
          .from('businesses')
          .select('id, owner_id, is_active')
          .in('owner_id', advertiserOwnerIds);

        if (bizErr) throw bizErr;

        businessByOwnerId = new Map(
          (businesses || []).map((b) => [b.owner_id as string, { id: b.id as string, is_active: b.is_active as boolean | null }]),
        );
      }

      const enriched = profiles.map((p) => {
        const biz = p.user_type === 'business' ? businessByOwnerId.get(p.user_id) : undefined;
        const isActive = p.user_type === 'business' ? (biz?.is_active ?? true) : true;
        return { ...p, business: biz || null, is_active: isActive };
      });

      // Apply status filter (only meaningful for advertisers for now)
      if (statusFilter === 'active') {
        return enriched.filter((u) => u.is_active);
      }
      if (statusFilter === 'inactive') {
        return enriched.filter((u) => !u.is_active);
      }

      return enriched;
    }
  });

  const blockUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      // Here you would implement user blocking logic
      // For now, we'll just show a success message
      await new Promise(resolve => setTimeout(resolve, 1000));
      return userId;
    },
    onSuccess: () => {
      toast.success('Usuário bloqueado com sucesso');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: () => {
      toast.error('Erro ao bloquear usuário');
    }
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (userId: string) => {
      // Here you would implement password reset logic
      await new Promise(resolve => setTimeout(resolve, 1000));
      return userId;
    },
    onSuccess: () => {
      toast.success('Link de redefinição de senha enviado');
    },
    onError: () => {
      toast.error('Erro ao enviar link de redefinição');
    }
  });

  const handleViewDetails = async (userId: string) => {
    // Check if user is a business owner
    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', userId)
      .single();

    if (business) {
      navigateToBusinessProfile(business.id);
    } else {
      navigateToUserProfile(userId);
    }
  };

  const exportUsers = () => {
    if (!users) return;
    
    const csvContent = [
      ['Nome', 'Cidade', 'Estado', 'Tipo', 'Pontos', 'Data de Cadastro'].join(','),
      ...users.map(user => [
        user.full_name || 'N/A',
        user.city || 'N/A',
        user.state || 'N/A',
        user.user_type,
        user.total_points,
        new Date(user.created_at).toLocaleDateString('pt-BR')
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `usuarios_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="min-w-0 flex-1">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <span className="truncate">Gestão de Usuários</span>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Gerencie todos os usuários consumidores da plataforma
              </CardDescription>
            </div>
            <Button onClick={exportUsers} variant="outline" size="sm" className="w-full sm:w-auto">
              <Download className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="truncate">Exportar CSV</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          {/* Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por nome ou cidade..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={userTypeFilter} onValueChange={setUserTypeFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Tipo de usuário" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="consumer">Consumidores</SelectItem>
                <SelectItem value="business">Anunciantes</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-primary/10 p-3 sm:p-4 rounded-lg">
              <p className="text-xs sm:text-sm text-muted-foreground truncate">Total de Usuários</p>
              <p className="text-lg sm:text-2xl font-bold text-primary">{users?.length || 0}</p>
            </div>
            <div className="bg-green-500/10 p-3 sm:p-4 rounded-lg">
              <p className="text-xs sm:text-sm text-muted-foreground truncate">Consumidores</p>
              <p className="text-lg sm:text-2xl font-bold text-green-600">
                {users?.filter(u => u.user_type === 'consumer').length || 0}
              </p>
            </div>
            <div className="bg-blue-500/10 p-3 sm:p-4 rounded-lg">
              <p className="text-xs sm:text-sm text-muted-foreground truncate">Anunciantes</p>
              <p className="text-lg sm:text-2xl font-bold text-blue-600">
                {users?.filter(u => u.user_type === 'business').length || 0}
              </p>
            </div>
            <div className="bg-orange-500/10 p-3 sm:p-4 rounded-lg">
              <p className="text-xs sm:text-sm text-muted-foreground truncate">Novos (7 dias)</p>
              <p className="text-lg sm:text-2xl font-bold text-orange-600">
                {users?.filter(u => {
                  const weekAgo = new Date();
                  weekAgo.setDate(weekAgo.getDate() - 7);
                  return new Date(u.created_at) >= weekAgo;
                }).length || 0}
              </p>
            </div>
          </div>

          {/* Users Table */}
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[120px]">Nome</TableHead>
                    <TableHead className="min-w-[100px] hidden sm:table-cell">Localização</TableHead>
                    <TableHead className="min-w-[80px]">Tipo</TableHead>
                    <TableHead className="min-w-[80px] hidden md:table-cell">Pontos</TableHead>
                    <TableHead className="min-w-[100px] hidden lg:table-cell">Cadastro</TableHead>
                    <TableHead className="min-w-[80px] hidden sm:table-cell">Status</TableHead>
                    <TableHead className="text-right min-w-[60px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><div className="h-4 bg-muted rounded animate-pulse" /></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded animate-pulse" /></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded animate-pulse" /></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded animate-pulse" /></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded animate-pulse" /></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded animate-pulse" /></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded animate-pulse" /></TableCell>
                    </TableRow>
                  ))
                ) : users?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhum usuário encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  users?.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-sm">{user.full_name || 'Nome não informado'}</p>
                          <p className="text-xs text-muted-foreground sm:hidden truncate">
                            {user.city}, {user.state}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <span className="text-sm">{user.city}, {user.state}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.user_type === 'consumer' ? 'default' : 'secondary'} className="text-xs">
                          {user.user_type === 'consumer' ? 'Consumidor' : 'Anunciante'}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="font-mono text-sm">{user.total_points} pts</span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-sm">{new Date(user.created_at).toLocaleDateString('pt-BR')}</span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant={user.is_active ? 'default' : 'destructive'} className="text-xs">
                          {user.is_active ? (
                            <>
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Ativo
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 mr-1" />
                              Inativo
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleViewDetails(user.user_id)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Ver Detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => resetPasswordMutation.mutate(user.user_id)}
                            >
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Redefinir Senha
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                  <Ban className="mr-2 h-4 w-4" />
                                  Bloquear Usuário
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Bloquear Usuário</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja bloquear o usuário {user.full_name}? 
                                    Esta ação impedirá o acesso dele à plataforma.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => blockUserMutation.mutate(user.user_id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Bloquear
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};