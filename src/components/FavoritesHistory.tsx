import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Heart, History, Eye, Clock, TrendingUp, Star } from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';
import { useOfferViews } from '@/hooks/useOfferViews';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const FavoritesHistory: React.FC = () => {
  const { user } = useAuth();
  const { favorites, follows, loading } = useFavorites();
  const { views: history, loading: loadingHistory, recordOfferView } = useOfferViews();
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'rating'>('recent');
  const navigate = useNavigate();

  const handleViewOffer = async (offerId: string) => {
    // Record offer view
    await recordOfferView(offerId);
    navigate(`/ofertas/${offerId}`);
  };

  const handleViewBusiness = (businessId: string) => {
    navigate(`/negocio/${businessId}`);
  };

  const sortedFavorites = React.useMemo(() => {
    if (!favorites) return [];
    
    const sorted = [...favorites];
    switch (sortBy) {
      case 'recent':
        return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case 'popular':
        return sorted.sort((a, b) => (b.offers?.views_count || 0) - (a.offers?.views_count || 0));
      case 'rating':
        return sorted; // Could implement rating sort
      default:
        return sorted;
    }
  }, [favorites, sortBy]);

  const sortedFollows = React.useMemo(() => {
    if (!follows) return [];
    
    const sorted = [...follows];
    switch (sortBy) {
      case 'recent':
        return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case 'popular':
        return sorted.sort((a, b) => (b.businesses?.followers_count || 0) - (a.businesses?.followers_count || 0));
      default:
        return sorted;
    }
  }, [follows, sortBy]);

  if (loading || loadingHistory) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sort Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h2 className="text-xl sm:text-2xl font-bold">Favoritos e Histórico</h2>
        <Select value={sortBy} onValueChange={(value: 'recent' | 'popular' | 'rating') => setSortBy(value)}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                Mais Recentes
              </div>
            </SelectItem>
            <SelectItem value="popular">
              <div className="flex items-center">
                <TrendingUp className="w-4 h-4 mr-2" />
                Mais Populares
              </div>
            </SelectItem>
            <SelectItem value="rating">
              <div className="flex items-center">
                <Star className="w-4 h-4 mr-2" />
                Melhor Avaliados
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="favorites" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="favorites" className="flex items-center gap-1 sm:gap-2 py-2 px-2 sm:px-3 text-xs sm:text-sm">
            <Heart className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="truncate">Ofertas ({favorites.length})</span>
          </TabsTrigger>
          <TabsTrigger value="follows" className="flex items-center gap-1 sm:gap-2 py-2 px-2 sm:px-3 text-xs sm:text-sm">
            <Star className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="truncate">Negócios ({follows.length})</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-1 sm:gap-2 py-2 px-2 sm:px-3 text-xs sm:text-sm">
            <History className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="truncate">Histórico ({history.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="favorites" className="space-y-4">
          {sortedFavorites.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Heart className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma oferta favorita</h3>
                <p className="text-muted-foreground text-center">
                  Comece a favoritar ofertas para vê-las aqui
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:gap-4">
              {sortedFavorites.map((favorite) => (
                <Card 
                  key={favorite.id} 
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleViewOffer(favorite.offers?.id)}
                >
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start gap-3 sm:gap-4">
                      {favorite.offers?.image_url && (
                        <img
                          src={favorite.offers.image_url}
                          alt={favorite.offers.title}
                          className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg object-cover flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm sm:text-base line-clamp-2">{favorite.offers?.title}</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">
                          {favorite.offers?.businesses?.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 sm:mt-2">
                          Favoritado {formatDistanceToNow(new Date(favorite.created_at), { 
                            addSuffix: true, 
                            locale: ptBR 
                          })}
                        </p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="hidden sm:flex flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewOffer(favorite.offers?.id);
                        }}
                      >
                        Ver Oferta
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="follows" className="space-y-4">
          {sortedFollows.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Star className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum negócio seguido</h3>
                <p className="text-muted-foreground text-center">
                  Comece a seguir negócios para receber atualizações
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:gap-4">
              {sortedFollows.map((follow) => (
                <Card 
                  key={follow.id} 
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleViewBusiness(follow.businesses?.id)}
                >
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center gap-3 sm:gap-4">
                      {follow.businesses?.logo_url && (
                        <img
                          src={follow.businesses.logo_url}
                          alt={follow.businesses.name}
                          className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm sm:text-base truncate">{follow.businesses?.name}</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">
                          {follow.businesses?.category}
                        </p>
                        <Badge variant="secondary" className="mt-1 text-xs">
                          {follow.businesses?.followers_count || 0} seguidores
                        </Badge>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="hidden sm:flex flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewBusiness(follow.businesses?.id);
                        }}
                      >
                        Ver Negócio
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {history.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <History className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum histórico</h3>
                <p className="text-muted-foreground text-center">
                  Suas ofertas visualizadas aparecerão aqui
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:gap-4">
              {history.map((item) => (
                <Card 
                  key={item.id} 
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleViewOffer(item.offer_id)}
                >
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start gap-3 sm:gap-4">
                      {item.offers?.image_url && (
                        <img
                          src={item.offers.image_url}
                          alt={item.offers.title}
                          className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg object-cover flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm sm:text-base line-clamp-2">{item.offers?.title}</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">
                          {item.offers?.businesses?.name}
                        </p>
                        <div className="flex items-center mt-1 sm:mt-2 text-xs text-muted-foreground">
                          <Eye className="w-3 h-3 mr-1 flex-shrink-0" />
                          <span className="truncate">
                            Visualizado {formatDistanceToNow(new Date(item.viewed_at), { 
                              addSuffix: true, 
                              locale: ptBR 
                            })}
                          </span>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="hidden sm:flex flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewOffer(item.offer_id);
                        }}
                      >
                        Ver Novamente
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
