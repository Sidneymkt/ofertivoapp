import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Star, MapPin, Users, Award, Store, Crown, Medal, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface RankingItem {
  id: string;
  name: string;
  avatar?: string;
  value: number;
  type: 'user' | 'business';
}

const RankingPosition = ({ position }: { position: number }) => {
  if (position === 1) {
    return (
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center">
        <Crown className="w-4 h-4 text-white" />
      </div>
    );
  }
  if (position === 2) {
    return (
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center">
        <Medal className="w-4 h-4 text-white" />
      </div>
    );
  }
  if (position === 3) {
    return (
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
        <Medal className="w-4 h-4 text-white" />
      </div>
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
      <span className="text-sm font-bold text-muted-foreground">{position}</span>
    </div>
  );
};

const RankingList = ({ 
  items, 
  isLoading, 
  valueLabel,
  onItemClick 
}: { 
  items: RankingItem[]; 
  isLoading: boolean;
  valueLabel: string;
  onItemClick: (item: RankingItem) => void;
}) => {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <Skeleton className="w-8 h-8 rounded-full" />
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-6 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum dado disponível
      </div>
    );
  }

  return (
    <div className="space-y-1 sm:space-y-2">
      {items.map((item, index) => (
        <div
          key={item.id}
          onClick={() => onItemClick(item)}
          className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg cursor-pointer transition-all hover:bg-accent/10 ${
            index < 3 ? 'bg-accent/5' : ''
          }`}
        >
          <RankingPosition position={index + 1} />
          <Avatar className="w-8 h-8 sm:w-10 sm:h-10 border-2 border-border flex-shrink-0">
            <AvatarImage src={item.avatar} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {item.type === 'business' ? (
                <Store className="w-4 h-4 sm:w-5 sm:h-5" />
              ) : (
                item.name?.charAt(0)?.toUpperCase() || '?'
              )}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate text-foreground text-sm sm:text-base">{item.name || 'Usuário'}</p>
            <p className="text-xs text-muted-foreground hidden xs:block">{item.type === 'business' ? 'Anunciante' : 'Usuário'}</p>
          </div>
          <Badge variant="secondary" className="bg-primary/10 text-primary text-xs px-2 py-0.5 flex-shrink-0">
            {item.value.toLocaleString()} <span className="hidden xs:inline ml-1">{valueLabel}</span>
          </Badge>
        </div>
      ))}
    </div>
  );
};

export const RankingSection = () => {
  const navigate = useNavigate();

  // Top users by points
  const { data: topByPoints = [], isLoading: loadingPoints } = useQuery({
    queryKey: ['ranking-points'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, total_points')
        .order('total_points', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return (data || []).map(p => ({
        id: p.user_id,
        name: p.full_name || 'Usuário',
        avatar: p.avatar_url,
        value: p.total_points || 0,
        type: 'user' as const
      }));
    },
    staleTime: 5 * 60 * 1000,
  });

  // Top users by checkins
  const { data: topByCheckins = [], isLoading: loadingCheckins } = useQuery({
    queryKey: ['ranking-checkins'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('offer_checkins')
        .select('user_id')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Count checkins per user
      const checkinCounts: Record<string, number> = {};
      (data || []).forEach(c => {
        checkinCounts[c.user_id] = (checkinCounts[c.user_id] || 0) + 1;
      });
      
      // Get top 10 user IDs
      const topUserIds = Object.entries(checkinCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([id]) => id);
      
      if (topUserIds.length === 0) return [];
      
      // Get profiles for these users
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', topUserIds);
      
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
      
      return topUserIds.map(userId => {
        const profile = profileMap.get(userId);
        return {
          id: userId,
          name: profile?.full_name || 'Usuário',
          avatar: profile?.avatar_url,
          value: checkinCounts[userId],
          type: 'user' as const
        };
      });
    },
    staleTime: 5 * 60 * 1000,
  });

  // Top businesses by offers
  const { data: topByOffers = [], isLoading: loadingOffers } = useQuery({
    queryKey: ['ranking-offers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('offers')
        .select('business_id, businesses!inner(id, name, logo_url)')
        .eq('is_active', true);
      
      if (error) throw error;
      
      // Count offers per business
      const offerCounts: Record<string, { count: number; name: string; logo: string | null }> = {};
      (data || []).forEach((o: any) => {
        const biz = o.businesses;
        if (!offerCounts[biz.id]) {
          offerCounts[biz.id] = { count: 0, name: biz.name, logo: biz.logo_url };
        }
        offerCounts[biz.id].count++;
      });
      
      return Object.entries(offerCounts)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 10)
        .map(([id, data]) => ({
          id,
          name: data.name,
          avatar: data.logo,
          value: data.count,
          type: 'business' as const
        }));
    },
    staleTime: 5 * 60 * 1000,
  });

  // Top businesses by followers
  const { data: topByFollowers = [], isLoading: loadingFollowers } = useQuery({
    queryKey: ['ranking-followers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('businesses')
        .select('id, name, logo_url, followers_count')
        .eq('is_active', true)
        .order('followers_count', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return (data || []).map(b => ({
        id: b.id,
        name: b.name,
        avatar: b.logo_url,
        value: b.followers_count || 0,
        type: 'business' as const
      }));
    },
    staleTime: 5 * 60 * 1000,
  });

  // Top businesses by achievements
  const { data: topByAchievements = [], isLoading: loadingAchievements } = useQuery({
    queryKey: ['ranking-achievements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_achievements')
        .select('business_id')
        .eq('is_unlocked', true);
      
      if (error) throw error;
      
      // Count achievements per business
      const achievementCounts: Record<string, number> = {};
      (data || []).forEach(a => {
        achievementCounts[a.business_id] = (achievementCounts[a.business_id] || 0) + 1;
      });
      
      // Get top 10 business IDs
      const topBusinessIds = Object.entries(achievementCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([id]) => id);
      
      if (topBusinessIds.length === 0) return [];
      
      // Get business info
      const { data: businesses } = await supabase
        .from('businesses')
        .select('id, name, logo_url')
        .in('id', topBusinessIds);
      
      const businessMap = new Map((businesses || []).map(b => [b.id, b]));
      
      return topBusinessIds.map(bizId => {
        const business = businessMap.get(bizId);
        return {
          id: bizId,
          name: business?.name || 'Anunciante',
          avatar: business?.logo_url,
          value: achievementCounts[bizId],
          type: 'business' as const
        };
      });
    },
    staleTime: 5 * 60 * 1000,
  });

  // Top sponsors by campaigns supported and social impact
  const { data: topSponsors = [], isLoading: loadingSponsors } = useQuery({
    queryKey: ['ranking-sponsors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patrocinios_vaquinha')
        .select('business_id, valor_patrocinado, valor_maximo, multiplicador, tipo')
        .eq('is_active', true);
      
      if (error) throw error;
      
      // Aggregate sponsor data
      const sponsorData: Record<string, { 
        campaigns: number; 
        impact: number;
      }> = {};
      
      (data || []).forEach(p => {
        if (!sponsorData[p.business_id]) {
          sponsorData[p.business_id] = { campaigns: 0, impact: 0 };
        }
        sponsorData[p.business_id].campaigns++;
        // Calculate impact: use valor_patrocinado or valor_maximo
        const impact = Number(p.valor_patrocinado) || Number(p.valor_maximo) || 0;
        sponsorData[p.business_id].impact += impact;
      });
      
      // Get top 10 sponsor IDs sorted by campaigns
      const topSponsorIds = Object.entries(sponsorData)
        .sort((a, b) => {
          // Primary sort by campaigns, secondary by impact
          if (b[1].campaigns !== a[1].campaigns) {
            return b[1].campaigns - a[1].campaigns;
          }
          return b[1].impact - a[1].impact;
        })
        .slice(0, 10)
        .map(([id]) => id);
      
      if (topSponsorIds.length === 0) return [];
      
      // Get business info
      const { data: businesses } = await supabase
        .from('businesses')
        .select('id, name, logo_url')
        .in('id', topSponsorIds);
      
      const businessMap = new Map((businesses || []).map(b => [b.id, b]));
      
      return topSponsorIds.map(bizId => {
        const business = businessMap.get(bizId);
        const stats = sponsorData[bizId];
        return {
          id: bizId,
          name: business?.name || 'Patrocinador',
          avatar: business?.logo_url,
          value: stats.campaigns,
          impact: stats.impact,
          type: 'business' as const
        };
      });
    },
    staleTime: 5 * 60 * 1000,
  });

  const handleItemClick = (item: RankingItem) => {
    if (item.type === 'business') {
      navigate(`/negocio/${item.id}`);
    } else {
      navigate(`/usuario/${item.id}`);
    }
  };

  return (
    <section className="py-8 sm:py-16 bg-background">
      <div className="container mx-auto px-2 sm:px-4">
        <div className="text-center mb-6 sm:mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-primary/10 text-primary mb-3 sm:mb-4">
            <Trophy className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="font-semibold text-sm sm:text-base">Ranking</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2 sm:mb-3">
            Top 10 da Comunidade
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto px-2">
            Descubra os usuários e anunciantes mais ativos da plataforma
          </p>
        </div>

        <Card className="border-0 shadow-card">
          <CardContent className="p-0">
            <Tabs defaultValue="points" className="w-full">
              <div className="border-b overflow-x-auto scrollbar-hide">
                <TabsList className="w-max min-w-full justify-start bg-transparent h-auto p-0 gap-0 flex">
                  <TabsTrigger 
                    value="points" 
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-3 sm:px-4 py-2 sm:py-3 gap-1.5 sm:gap-2 flex-shrink-0 text-xs sm:text-sm"
                  >
                    <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>Pontos</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="checkins" 
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-3 sm:px-4 py-2 sm:py-3 gap-1.5 sm:gap-2 flex-shrink-0 text-xs sm:text-sm"
                  >
                    <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>Check-ins</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="offers" 
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-3 sm:px-4 py-2 sm:py-3 gap-1.5 sm:gap-2 flex-shrink-0 text-xs sm:text-sm"
                  >
                    <Store className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>Ofertas</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="followers" 
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-3 sm:px-4 py-2 sm:py-3 gap-1.5 sm:gap-2 flex-shrink-0 text-xs sm:text-sm"
                  >
                    <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>Seguidores</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="achievements" 
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-3 sm:px-4 py-2 sm:py-3 gap-1.5 sm:gap-2 flex-shrink-0 text-xs sm:text-sm"
                  >
                    <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>Conquistas</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="sponsors" 
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-3 sm:px-4 py-2 sm:py-3 gap-1.5 sm:gap-2 flex-shrink-0 text-xs sm:text-sm"
                  >
                    <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>Patrocinadores</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="p-2 sm:p-4">
                <TabsContent value="points" className="mt-0">
                  <RankingList 
                    items={topByPoints} 
                    isLoading={loadingPoints} 
                    valueLabel="pts"
                    onItemClick={handleItemClick}
                  />
                </TabsContent>

                <TabsContent value="checkins" className="mt-0">
                  <RankingList 
                    items={topByCheckins} 
                    isLoading={loadingCheckins} 
                    valueLabel="check-ins"
                    onItemClick={handleItemClick}
                  />
                </TabsContent>

                <TabsContent value="offers" className="mt-0">
                  <RankingList 
                    items={topByOffers} 
                    isLoading={loadingOffers} 
                    valueLabel="ofertas"
                    onItemClick={handleItemClick}
                  />
                </TabsContent>

                <TabsContent value="followers" className="mt-0">
                  <RankingList 
                    items={topByFollowers} 
                    isLoading={loadingFollowers} 
                    valueLabel="seguidores"
                    onItemClick={handleItemClick}
                  />
                </TabsContent>

                <TabsContent value="achievements" className="mt-0">
                  <RankingList 
                    items={topByAchievements} 
                    isLoading={loadingAchievements} 
                    valueLabel="conquistas"
                    onItemClick={handleItemClick}
                  />
                </TabsContent>

                <TabsContent value="sponsors" className="mt-0">
                  <SponsorRankingList 
                    items={topSponsors} 
                    isLoading={loadingSponsors}
                    onItemClick={handleItemClick}
                  />
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

// Special ranking list for sponsors showing campaigns + impact
interface SponsorRankingItem extends RankingItem {
  impact: number;
}

const SponsorRankingList = ({ 
  items, 
  isLoading,
  onItemClick 
}: { 
  items: SponsorRankingItem[]; 
  isLoading: boolean;
  onItemClick: (item: RankingItem) => void;
}) => {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <Skeleton className="w-8 h-8 rounded-full" />
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-6 w-24" />
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Heart className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>Nenhum patrocinador ainda</p>
        <p className="text-sm">Seja o primeiro a apoiar uma vaquinha!</p>
      </div>
    );
  }

  return (
    <div className="space-y-1 sm:space-y-2">
      {items.map((item, index) => (
        <div
          key={item.id}
          onClick={() => onItemClick(item)}
          className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg cursor-pointer transition-all hover:bg-accent/10 ${
            index < 3 ? 'bg-accent/5' : ''
          }`}
        >
          <RankingPosition position={index + 1} />
          <Avatar className="w-8 h-8 sm:w-10 sm:h-10 border-2 border-border flex-shrink-0">
            <AvatarImage src={item.avatar} />
            <AvatarFallback className="bg-primary/10 text-primary">
              <Store className="w-4 h-4 sm:w-5 sm:h-5" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate text-foreground text-sm sm:text-base">{item.name}</p>
            <p className="text-xs text-muted-foreground">
              {item.value} campanha{item.value !== 1 ? 's' : ''} apoiada{item.value !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
            <Badge variant="secondary" className="bg-green-500/10 text-green-600 dark:text-green-400 text-xs px-2 py-0.5">
              R$ {item.impact.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </Badge>
            <span className="text-[10px] text-muted-foreground">impacto social</span>
          </div>
        </div>
      ))}
    </div>
  );
};
