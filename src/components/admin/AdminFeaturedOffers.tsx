import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Star, Clock, Search, ArrowUp, ArrowDown, Eye, TrendingUp, Sparkles } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FeaturedOffer {
  id: string;
  title: string;
  category: string;
  discount_percentage: number;
  is_featured: boolean;
  is_featured_recent: boolean;
  featured_order: number;
  featured_at: string | null;
  views_count: number;
  likes_count: number;
  valid_until: string;
  image_url: string | null;
  businesses: {
    id: string;
    name: string;
    logo_url: string | null;
  } | null;
}

export const AdminFeaturedOffers = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('featured');
  const queryClient = useQueryClient();

  // Fetch all active offers
  const { data: offers, isLoading } = useQuery({
    queryKey: ['admin-featured-offers', searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('offers')
        .select(`
          id,
          title,
          category,
          discount_percentage,
          is_featured,
          is_featured_recent,
          featured_order,
          featured_at,
          views_count,
          likes_count,
          valid_until,
          image_url,
          businesses(id, name, logo_url)
        `)
        .eq('is_active', true)
        .gte('valid_until', new Date().toISOString())
        .order('featured_order', { ascending: true })
        .order('views_count', { ascending: false });

      if (searchTerm) {
        query = query.ilike('title', `%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as FeaturedOffer[];
    },
  });

  // Toggle featured status
  const toggleFeatured = useMutation({
    mutationFn: async ({ offerId, isFeatured }: { offerId: string; isFeatured: boolean }) => {
      const { error } = await supabase
        .from('offers')
        .update({ 
          is_featured: !isFeatured,
          featured_at: !isFeatured ? new Date().toISOString() : null
        })
        .eq('id', offerId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-featured-offers'] });
      toast.success('Status de destaque atualizado');
    },
    onError: () => {
      toast.error('Erro ao atualizar destaque');
    }
  });

  // Toggle featured recent status
  const toggleFeaturedRecent = useMutation({
    mutationFn: async ({ offerId, isFeaturedRecent }: { offerId: string; isFeaturedRecent: boolean }) => {
      const { error } = await supabase
        .from('offers')
        .update({ is_featured_recent: !isFeaturedRecent })
        .eq('id', offerId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-featured-offers'] });
      toast.success('Status de recente atualizado');
    },
    onError: () => {
      toast.error('Erro ao atualizar recente');
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
      queryClient.invalidateQueries({ queryKey: ['admin-featured-offers'] });
      toast.success('Ordem atualizada');
    },
    onError: () => {
      toast.error('Erro ao atualizar ordem');
    }
  });

  const moveUp = (offer: FeaturedOffer) => {
    updateOrder.mutate({ offerId: offer.id, newOrder: Math.max(0, offer.featured_order - 1) });
  };

  const moveDown = (offer: FeaturedOffer) => {
    updateOrder.mutate({ offerId: offer.id, newOrder: offer.featured_order + 1 });
  };

  const featuredOffers = offers?.filter(o => o.is_featured) || [];
  const recentOffers = offers?.filter(o => o.is_featured_recent) || [];
  const allOffers = offers || [];

  const renderOfferRow = (offer: FeaturedOffer, showOrder: boolean = false) => (
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
            <p className="text-sm text-muted-foreground">{offer.businesses?.name}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline">{offer.category}</Badge>
      </TableCell>
      <TableCell>
        <Badge variant="default">-{offer.discount_percentage}%</Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Eye className="w-4 h-4" />
          {offer.views_count || 0}
        </div>
      </TableCell>
      <TableCell>
        <span className="text-sm">
          {format(new Date(offer.valid_until), 'dd/MM/yyyy', { locale: ptBR })}
        </span>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Switch
            checked={offer.is_featured}
            onCheckedChange={() => toggleFeatured.mutate({ offerId: offer.id, isFeatured: offer.is_featured })}
          />
          <Star className={`w-4 h-4 ${offer.is_featured ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`} />
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Switch
            checked={offer.is_featured_recent}
            onCheckedChange={() => toggleFeaturedRecent.mutate({ offerId: offer.id, isFeaturedRecent: offer.is_featured_recent })}
          />
          <Clock className={`w-4 h-4 ${offer.is_featured_recent ? 'text-primary' : 'text-muted-foreground'}`} />
        </div>
      </TableCell>
      {showOrder && (
        <TableCell>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => moveUp(offer)}
              disabled={offer.featured_order === 0}
            >
              <ArrowUp className="w-4 h-4" />
            </Button>
            <span className="w-8 text-center">{offer.featured_order}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => moveDown(offer)}
            >
              <ArrowDown className="w-4 h-4" />
            </Button>
          </div>
        </TableCell>
      )}
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
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Gerenciar Ofertas em Destaque
          </CardTitle>
          <CardDescription>
            Controle quais ofertas aparecem nos carrosséis de destaque e recentes na página inicial
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar ofertas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-yellow-500/20">
                    <Star className="w-5 h-5 text-yellow-500" />
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
                    <p className="text-2xl font-bold">{allOffers.length}</p>
                    <p className="text-sm text-muted-foreground">Ofertas Ativas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="featured" className="flex items-center gap-2">
                <Star className="w-4 h-4" />
                Destaques ({featuredOffers.length})
              </TabsTrigger>
              <TabsTrigger value="recent" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Recentes ({recentOffers.length})
              </TabsTrigger>
              <TabsTrigger value="all" className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Todas ({allOffers.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="featured">
              {isLoading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Carregando...</p>
                </div>
              ) : featuredOffers.length === 0 ? (
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
                        <TableHead>Categoria</TableHead>
                        <TableHead>Desconto</TableHead>
                        <TableHead>Views</TableHead>
                        <TableHead>Validade</TableHead>
                        <TableHead>Destaque</TableHead>
                        <TableHead>Recente</TableHead>
                        <TableHead>Ordem</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {featuredOffers.map((offer) => renderOfferRow(offer, true))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="recent">
              {isLoading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Carregando...</p>
                </div>
              ) : recentOffers.length === 0 ? (
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
                        <TableHead>Categoria</TableHead>
                        <TableHead>Desconto</TableHead>
                        <TableHead>Views</TableHead>
                        <TableHead>Validade</TableHead>
                        <TableHead>Destaque</TableHead>
                        <TableHead>Recente</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentOffers.map((offer) => renderOfferRow(offer))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="all">
              {isLoading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Carregando...</p>
                </div>
              ) : allOffers.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Nenhuma oferta encontrada</p>
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto mt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Oferta</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Desconto</TableHead>
                        <TableHead>Views</TableHead>
                        <TableHead>Validade</TableHead>
                        <TableHead>Destaque</TableHead>
                        <TableHead>Recente</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allOffers.map((offer) => renderOfferRow(offer))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
