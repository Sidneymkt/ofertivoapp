import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Gift, Search, Filter, Check, X, Eye, Users, Calendar, Star, Clock, ArrowUp, ArrowDown, Sparkles, TrendingUp, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Offer {
  id: string;
  title: string;
  category: string;
  original_price: number;
  discounted_price: number;
  discount_percentage: number;
  is_active: boolean;
  is_featured: boolean;
  is_featured_recent: boolean;
  featured_order: number;
  featured_at: string | null;
  created_at: string;
  valid_until: string;
  current_uses: number;
  max_uses: number | null;
  views_count: number;
  likes_count: number;
  image_url: string | null;
  business: {
    id: string;
    name: string;
    logo_url?: string | null;
  };
}

export const AdminOfferManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [mainTab, setMainTab] = useState('list');
  const [featuredTab, setFeaturedTab] = useState('featured');
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
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

  const { data: offers, isLoading, error } = useQuery({
    queryKey: ['admin-offers', searchTerm, statusFilter, categoryFilter],
    queryFn: async () => {
      let query = supabase
        .from('offers')
        .select(`
          *,
          businesses(
            id,
            name,
            logo_url
          )
        `)
        .order('created_at', { ascending: false });

      if (searchTerm) {
        query = query.ilike('title', `%${searchTerm}%`);
      }

      if (statusFilter === 'active') {
        query = query.eq('is_active', true);
      } else if (statusFilter === 'inactive') {
        query = query.eq('is_active', false);
      } else if (statusFilter === 'expired') {
        query = query.lt('valid_until', new Date().toISOString());
      }

      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data.map((offer: any) => ({
        ...offer,
        is_active: !!offer.is_active,
        is_featured: !!offer.is_featured,
        is_featured_recent: !!offer.is_featured_recent,
        featured_order: offer.featured_order ?? 0,
        business: offer.businesses
      })) as Offer[];
    },
  });

  // Real-time subscription for offers updates
  useEffect(() => {
    const channel = supabase
      .channel('admin-offers-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'offers'
        },
        (payload) => {
          console.log('Offer updated in real-time:', payload);
          queryClient.invalidateQueries({ queryKey: ['admin-offers'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const { data: categories } = useQuery({
    queryKey: ['offer-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('offers')
        .select('category')
        .not('category', 'is', null);
      
      if (error) throw error;
      
      const uniqueCategories = [...new Set(data.map(item => item.category))];
      return uniqueCategories;
    },
  });

  const toggleOfferStatus = useMutation({
    mutationFn: async ({ offerId, isActive }: { offerId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('offers')
        .update({ is_active: !isActive })
        .eq('id', offerId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-offers'] });
      toast.success('Status da oferta atualizado com sucesso');
    },
    onError: (error) => {
      console.error('Error updating offer status:', error);
      toast.error('Erro ao atualizar status da oferta');
    }
  });

  // Toggle featured status
  const toggleFeatured = useMutation({
    mutationFn: async ({ offerId, isFeatured }: { offerId: string; isFeatured: boolean }) => {
      const nextFeatured = !isFeatured;
      setUpdatingIds(prev => new Set(prev).add(offerId));

      const patch: Record<string, any> = {
        is_featured: nextFeatured,
        featured_at: nextFeatured ? new Date().toISOString() : null,
      };

      // Se marcou como destaque, garantir que a oferta esteja ativa
      if (nextFeatured) {
        patch.is_active = true;
      }

      const { error } = await supabase
        .from('offers')
        .update(patch)
        .eq('id', offerId);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-offers'] });
      toast.success(variables.isFeatured ? 'Oferta removida dos destaques' : 'Oferta adicionada aos destaques');
      setUpdatingIds(prev => {
        const next = new Set(prev);
        next.delete(variables.offerId);
        return next;
      });
    },
    onError: (_, variables) => {
      toast.error('Erro ao atualizar destaque');
      setUpdatingIds(prev => {
        const next = new Set(prev);
        next.delete(variables.offerId);
        return next;
      });
    }
  });

  // Toggle featured recent status
  const toggleFeaturedRecent = useMutation({
    mutationFn: async ({ offerId, isFeaturedRecent }: { offerId: string; isFeaturedRecent: boolean }) => {
      const nextRecent = !isFeaturedRecent;
      setUpdatingIds(prev => new Set(prev).add(offerId));

      const patch: Record<string, any> = {
        is_featured_recent: nextRecent,
      };

      // Se marcou como recente, garantir que a oferta esteja ativa
      if (nextRecent) {
        patch.is_active = true;
      }

      const { error } = await supabase
        .from('offers')
        .update(patch)
        .eq('id', offerId);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-offers'] });
      toast.success(variables.isFeaturedRecent ? 'Oferta removida dos recentes' : 'Oferta adicionada aos recentes');
      setUpdatingIds(prev => {
        const next = new Set(prev);
        next.delete(variables.offerId);
        return next;
      });
    },
    onError: (_, variables) => {
      toast.error('Erro ao atualizar recente');
      setUpdatingIds(prev => {
        const next = new Set(prev);
        next.delete(variables.offerId);
        return next;
      });
    }
  });

  // Update featured order
  const updateOrder = useMutation({
    mutationFn: async ({ offerId, newOrder }: { offerId: string; newOrder: number }) => {
      const { error } = await supabase
        .from('offers')
        .update({ featured_order: newOrder })
        .eq('id', offerId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-offers'] });
      toast.success('Ordem atualizada');
    },
    onError: () => {
      toast.error('Erro ao atualizar ordem');
    }
  });

  const handleToggleStatus = (offer: Offer) => {
    toggleOfferStatus.mutate({
      offerId: offer.id,
      isActive: offer.is_active
    });
  };

  const moveUp = (offer: Offer) => {
    updateOrder.mutate({ offerId: offer.id, newOrder: Math.max(0, (offer.featured_order || 0) - 1) });
  };

  const moveDown = (offer: Offer) => {
    updateOrder.mutate({ offerId: offer.id, newOrder: (offer.featured_order || 0) + 1 });
  };

  const isOfferExpired = (validUntil: string) => {
    return new Date(validUntil) < new Date();
  };

  const filteredOffers = offers || [];
  const activeOffers = filteredOffers.filter(o => o.is_active && !isOfferExpired(o.valid_until));
  const featuredOffers = activeOffers.filter(o => o.is_featured);
  const recentOffers = activeOffers.filter(o => o.is_featured_recent);

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
            <Gift className="h-5 w-5" />
            Gestão de Ofertas
          </CardTitle>
          <CardDescription>
            Monitore, gerencie e destaque ofertas da plataforma
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="list" className="flex items-center gap-2">
                <Gift className="w-4 h-4" />
                Todas Ofertas
              </TabsTrigger>
              <TabsTrigger value="featured" className="flex items-center gap-2">
                <Star className="w-4 h-4" />
                Destaques
              </TabsTrigger>
            </TabsList>

            <TabsContent value="list">
              <div className="flex flex-col gap-4 mb-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Buscar ofertas ou negócios..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-48">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="active">Ativos</SelectItem>
                      <SelectItem value="inactive">Inativos</SelectItem>
                      <SelectItem value="expired">Expirados</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue placeholder="Categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {categories?.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {isLoading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Carregando ofertas...</p>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <p className="text-destructive">Erro ao carregar ofertas: {error.message}</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Verifique suas permissões de administrador
                  </p>
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[200px]">Oferta</TableHead>
                        <TableHead className="min-w-[150px] hidden md:table-cell">Negócio</TableHead>
                        <TableHead className="min-w-[100px] hidden lg:table-cell">Categoria</TableHead>
                        <TableHead className="min-w-[120px] hidden sm:table-cell">Preços</TableHead>
                        <TableHead className="min-w-[80px] hidden xl:table-cell">Desconto</TableHead>
                        <TableHead className="min-w-[80px] hidden sm:table-cell">Usos</TableHead>
                        <TableHead className="min-w-[100px] hidden lg:table-cell">Validade</TableHead>
                        <TableHead className="min-w-[80px]">Status</TableHead>
                        <TableHead className="min-w-[100px]">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOffers.map((offer) => (
                        <TableRow key={offer.id}>
                          <TableCell className="min-w-[200px]">
                            <div>
                              <p className="font-medium line-clamp-2">{offer.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(offer.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                              </p>
                              <div className="flex gap-1 mt-1">
                                {offer.is_featured && (
                                  <Badge variant="default" className="text-xs bg-yellow-500">
                                    <Star className="w-3 h-3 mr-1" />
                                    Destaque
                                  </Badge>
                                )}
                                {offer.is_featured_recent && (
                                  <Badge variant="outline" className="text-xs">
                                    <Clock className="w-3 h-3 mr-1" />
                                    Recente
                                  </Badge>
                                )}
                              </div>
                              <div className="md:hidden mt-1">
                                <p className="text-xs text-muted-foreground line-clamp-1">{offer.business.name}</p>
                              </div>
                              <div className="lg:hidden mt-1">
                                <Badge variant="outline" className="text-xs">{offer.category}</Badge>
                              </div>
                            </div>
                          </TableCell>
                           <TableCell className="hidden md:table-cell">
                             <p className="font-medium line-clamp-1">{offer.business.name}</p>
                           </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <Badge variant="outline">{offer.category}</Badge>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <div className="space-y-1">
                              <p className="text-sm line-through text-muted-foreground">
                                R$ {offer.original_price.toFixed(2)}
                              </p>
                              <p className="font-medium text-primary">
                                R$ {offer.discounted_price.toFixed(2)}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="hidden xl:table-cell">
                            <Badge variant="default">
                              {offer.discount_percentage}% OFF
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              {offer.current_uses}
                              {offer.max_uses && `/${offer.max_uses}`}
                            </div>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className={isOfferExpired(offer.valid_until) ? 'text-destructive' : ''}>
                                {format(new Date(offer.valid_until), 'dd/MM/yyyy', { locale: ptBR })}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {!offer.is_active ? 'Inativo' :
                               isOfferExpired(offer.valid_until) ? 'Expirado' : 'Ativo'}
                            </Badge>
                            <div className="sm:hidden mt-1 text-xs text-muted-foreground">
                              R$ {offer.discounted_price.toFixed(2)} • {offer.current_uses} usos
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 sm:gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(`/ofertas/${offer.id}`, '_blank')}
                                className="p-2"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant={offer.is_active ? 'destructive' : 'default'}
                                    size="sm"
                                    className="p-2"
                                  >
                                    {offer.is_active ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="max-w-md mx-4">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="text-lg">
                                      {offer.is_active ? 'Desativar' : 'Ativar'} Oferta
                                    </AlertDialogTitle>
                                    <AlertDialogDescription className="text-sm">
                                      Tem certeza que deseja {offer.is_active ? 'desativar' : 'ativar'} a oferta "{offer.title}"?
                                      {isOfferExpired(offer.valid_until) && " (Esta oferta está expirada)"}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                                    <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => handleToggleStatus(offer)}
                                      className="w-full sm:w-auto"
                                    >
                                      {offer.is_active ? 'Desativar' : 'Ativar'}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {filteredOffers.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">Nenhuma oferta encontrada</p>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="featured">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-full bg-primary/15">
                        <Star className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{featuredOffers.length}</p>
                        <p className="text-sm text-muted-foreground">Em Destaque</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/20">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-full bg-primary/20">
                        <Clock className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{recentOffers.length}</p>
                        <p className="text-sm text-muted-foreground">Recentes Destacadas</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-full bg-green-500/20">
                        <Sparkles className="w-5 h-5 text-green-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{activeOffers.length}</p>
                        <p className="text-sm text-muted-foreground">Ofertas Ativas</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Tabs value={featuredTab} onValueChange={setFeaturedTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="featured" className="flex items-center gap-2">
                    <Star className="w-4 h-4" />
                    <span className="hidden sm:inline">Destaques</span> ({featuredOffers.length})
                  </TabsTrigger>
                  <TabsTrigger value="recent" className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span className="hidden sm:inline">Recentes</span> ({recentOffers.length})
                  </TabsTrigger>
                  <TabsTrigger value="all" className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    <span className="hidden sm:inline">Todas</span> ({activeOffers.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="featured">
                  {featuredOffers.length === 0 ? (
                    <div className="text-center py-8">
                      <Star className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">Nenhuma oferta em destaque</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Marque ofertas na aba "Todas" para exibi-las em destaque
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-md border overflow-x-auto mt-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Oferta</TableHead>
                            <TableHead className="hidden sm:table-cell">Categoria</TableHead>
                            <TableHead className="hidden sm:table-cell">Desconto</TableHead>
                            <TableHead className="hidden md:table-cell">Views</TableHead>
                            <TableHead className="hidden lg:table-cell">Validade</TableHead>
                            <TableHead>Destaque</TableHead>
                            <TableHead>Recente</TableHead>
                            <TableHead>Ordem</TableHead>
                            <TableHead>Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {featuredOffers.sort((a, b) => (a.featured_order || 0) - (b.featured_order || 0)).map((offer) => (
                            <TableRow key={offer.id}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  {offer.image_url ? (
                                    <img 
                                      src={offer.image_url} 
                                      alt={offer.title}
                                      className="w-12 h-12 rounded-lg object-cover"
                                    />
                                  ) : (
                                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                                      <Sparkles className="w-5 h-5 text-muted-foreground" />
                                    </div>
                                  )}
                                  <div>
                                    <p className="font-medium line-clamp-1">{offer.title}</p>
                                    <p className="text-sm text-muted-foreground">{offer.business?.name}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="hidden sm:table-cell">
                                <Badge variant="outline">{offer.category}</Badge>
                              </TableCell>
                              <TableCell className="hidden sm:table-cell">
                                <Badge variant="default">-{offer.discount_percentage}%</Badge>
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Eye className="w-4 h-4" />
                                  {offer.views_count || 0}
                                </div>
                              </TableCell>
                              <TableCell className="hidden lg:table-cell">
                                <span className="text-sm">
                                  {format(new Date(offer.valid_until), 'dd/MM/yyyy', { locale: ptBR })}
                                </span>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {updatingIds.has(offer.id) ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                  ) : (
                                    <>
                                      <Switch
                                        checked={offer.is_featured}
                                        onCheckedChange={() => toggleFeatured.mutate({ offerId: offer.id, isFeatured: offer.is_featured })}
                                        disabled={updatingIds.has(offer.id)}
                                      />
                                      <Star className={`w-4 h-4 transition-colors ${offer.is_featured ? 'text-primary fill-primary' : 'text-muted-foreground'}`} />
                                    </>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {updatingIds.has(offer.id) ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                  ) : (
                                    <>
                                      <Switch
                                        checked={offer.is_featured_recent}
                                        onCheckedChange={() => toggleFeaturedRecent.mutate({ offerId: offer.id, isFeaturedRecent: offer.is_featured_recent })}
                                        disabled={updatingIds.has(offer.id)}
                                      />
                                      <Clock className={`w-4 h-4 transition-colors ${offer.is_featured_recent ? 'text-primary' : 'text-muted-foreground'}`} />
                                    </>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => moveUp(offer)}
                                    disabled={(offer.featured_order || 0) === 0}
                                  >
                                    <ArrowUp className="w-4 h-4" />
                                  </Button>
                                  <span className="w-8 text-center">{offer.featured_order || 0}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => moveDown(offer)}
                                  >
                                    <ArrowDown className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(`/ofertas/${offer.id}`, '_blank')}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="recent">
                  {recentOffers.length === 0 ? (
                    <div className="text-center py-8">
                      <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">Nenhuma oferta recente destacada</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Marque ofertas na aba "Todas" para exibi-las como recentes
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-md border overflow-x-auto mt-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Oferta</TableHead>
                            <TableHead className="hidden sm:table-cell">Categoria</TableHead>
                            <TableHead className="hidden sm:table-cell">Desconto</TableHead>
                            <TableHead className="hidden md:table-cell">Views</TableHead>
                            <TableHead className="hidden lg:table-cell">Validade</TableHead>
                            <TableHead>Destaque</TableHead>
                            <TableHead>Recente</TableHead>
                            <TableHead>Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {recentOffers.map((offer) => (
                            <TableRow key={offer.id}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  {offer.image_url ? (
                                    <img 
                                      src={offer.image_url} 
                                      alt={offer.title}
                                      className="w-12 h-12 rounded-lg object-cover"
                                    />
                                  ) : (
                                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                                      <Sparkles className="w-5 h-5 text-muted-foreground" />
                                    </div>
                                  )}
                                  <div>
                                    <p className="font-medium line-clamp-1">{offer.title}</p>
                                    <p className="text-sm text-muted-foreground">{offer.business?.name}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="hidden sm:table-cell">
                                <Badge variant="outline">{offer.category}</Badge>
                              </TableCell>
                              <TableCell className="hidden sm:table-cell">
                                <Badge variant="default">-{offer.discount_percentage}%</Badge>
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Eye className="w-4 h-4" />
                                  {offer.views_count || 0}
                                </div>
                              </TableCell>
                              <TableCell className="hidden lg:table-cell">
                                <span className="text-sm">
                                  {format(new Date(offer.valid_until), 'dd/MM/yyyy', { locale: ptBR })}
                                </span>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {updatingIds.has(offer.id) ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                  ) : (
                                    <>
                                      <Switch
                                        checked={offer.is_featured}
                                        onCheckedChange={() => toggleFeatured.mutate({ offerId: offer.id, isFeatured: offer.is_featured })}
                                        disabled={updatingIds.has(offer.id)}
                                      />
                                      <Star className={`w-4 h-4 transition-colors ${offer.is_featured ? 'text-primary fill-primary' : 'text-muted-foreground'}`} />
                                    </>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {updatingIds.has(offer.id) ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                  ) : (
                                    <>
                                      <Switch
                                        checked={offer.is_featured_recent}
                                        onCheckedChange={() => toggleFeaturedRecent.mutate({ offerId: offer.id, isFeaturedRecent: offer.is_featured_recent })}
                                        disabled={updatingIds.has(offer.id)}
                                      />
                                      <Clock className={`w-4 h-4 transition-colors ${offer.is_featured_recent ? 'text-primary' : 'text-muted-foreground'}`} />
                                    </>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(`/ofertas/${offer.id}`, '_blank')}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="all">
                  {activeOffers.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">Nenhuma oferta ativa encontrada</p>
                    </div>
                  ) : (
                    <div className="rounded-md border overflow-x-auto mt-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Oferta</TableHead>
                            <TableHead className="hidden sm:table-cell">Categoria</TableHead>
                            <TableHead className="hidden sm:table-cell">Desconto</TableHead>
                            <TableHead className="hidden md:table-cell">Views</TableHead>
                            <TableHead className="hidden lg:table-cell">Validade</TableHead>
                            <TableHead>Destaque</TableHead>
                            <TableHead>Recente</TableHead>
                            <TableHead>Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {activeOffers.map((offer) => (
                            <TableRow key={offer.id}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  {offer.image_url ? (
                                    <img 
                                      src={offer.image_url} 
                                      alt={offer.title}
                                      className="w-12 h-12 rounded-lg object-cover"
                                    />
                                  ) : (
                                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                                      <Sparkles className="w-5 h-5 text-muted-foreground" />
                                    </div>
                                  )}
                                  <div>
                                    <p className="font-medium line-clamp-1">{offer.title}</p>
                                    <p className="text-sm text-muted-foreground">{offer.business?.name}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="hidden sm:table-cell">
                                <Badge variant="outline">{offer.category}</Badge>
                              </TableCell>
                              <TableCell className="hidden sm:table-cell">
                                <Badge variant="default">-{offer.discount_percentage}%</Badge>
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Eye className="w-4 h-4" />
                                  {offer.views_count || 0}
                                </div>
                              </TableCell>
                              <TableCell className="hidden lg:table-cell">
                                <span className="text-sm">
                                  {format(new Date(offer.valid_until), 'dd/MM/yyyy', { locale: ptBR })}
                                </span>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {updatingIds.has(offer.id) ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                  ) : (
                                    <>
                                      <Switch
                                        checked={offer.is_featured}
                                        onCheckedChange={() => toggleFeatured.mutate({ offerId: offer.id, isFeatured: offer.is_featured })}
                                        disabled={updatingIds.has(offer.id)}
                                      />
                                      <Star className={`w-4 h-4 transition-colors ${offer.is_featured ? 'text-primary fill-primary' : 'text-muted-foreground'}`} />
                                    </>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {updatingIds.has(offer.id) ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                  ) : (
                                    <>
                                      <Switch
                                        checked={offer.is_featured_recent}
                                        onCheckedChange={() => toggleFeaturedRecent.mutate({ offerId: offer.id, isFeaturedRecent: offer.is_featured_recent })}
                                        disabled={updatingIds.has(offer.id)}
                                      />
                                      <Clock className={`w-4 h-4 transition-colors ${offer.is_featured_recent ? 'text-primary' : 'text-muted-foreground'}`} />
                                    </>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(`/ofertas/${offer.id}`, '_blank')}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
