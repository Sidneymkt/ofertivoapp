import React, { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Coins, 
  Trophy, 
  TrendingUp, 
  Gift,
  Calendar,
  Star,
  Award,
  Target,
  Zap,
  Users,
  ExternalLink
} from 'lucide-react';
import { usePoints } from '@/hooks/usePoints';
import { BusinessBadgeShowcase } from '@/components/BusinessBadgeShowcase';
import { InteractivePointsCard } from '@/components/InteractivePointsCard';
import { AvailableRaffles } from '@/components/AvailableRaffles';
import { ReferralSystem } from '@/components/ReferralSystem';
import { useBusiness } from '@/hooks/useBusiness';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { supabase } from '@/integrations/supabase/client';
import { BackButton } from '@/components/BackButton';
import { TipsFooter } from '@/components/TipsFooter';
import { UserLevelCard } from '@/components/UserLevelCard';
import { SavingsTrackerCard } from '@/components/SavingsTrackerCard';
import { DailyMissionsCard } from '@/components/DailyMissionsCard';
import { DailyStreakTracker } from '@/components/DailyStreakTracker';
import { RankingSection } from '@/components/RankingSection';
import { useBusinessStats } from '@/hooks/useBusinessStats';
import { useBusinessWallet } from '@/hooks/useBusinessWallet';
import { useBusinessBadges } from '@/hooks/useBusinessBadges';
import BusinessTipsFooter from '@/components/BusinessTipsFooter';
import { useNavigate, Link } from 'react-router-dom';
import { useUserProfileRealtimeSync, useBusinessDashboardRealtimeSync } from '@/hooks/useRealtimeSubscription';
import { PointsTransferHistory } from '@/components/PointsTransferHistory';
import { Heart, Send } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Points = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, adminLevel } = useAdminAuth();
  const { businessId, loading: businessLoading } = useBusiness();
  const { pointsStats, recentActivities, loading, refresh } = usePoints();
  const { stats: businessStats, recentActivities: businessActivities, loading: statsLoading } = useBusinessStats(businessId || undefined);
  const { balance: walletBalance, monthlyAllocation, totalConsumed } = useBusinessWallet();
  const { getUnlockedBadges, achievements } = useBusinessBadges(businessId || undefined);

  // Calcular créditos extras por conquistas (mantém equilíbrio do sistema)
  // Pontuação por raridade: common=100, rare=250, epic=500, legendary=1000
  const calculateAchievementBonus = () => {
    const unlockedBadges = getUnlockedBadges();
    const RARITY_BONUS: Record<string, number> = {
      common: 100,
      rare: 250,
      epic: 500,
      legendary: 1000
    };
    
    return unlockedBadges.reduce((total, achievement) => {
      const rarity = achievement.business_badges?.rarity || 'common';
      return total + (RARITY_BONUS[rarity] || 100);
    }, 0);
  };

  const achievementBonus = calculateAchievementBonus();

  // Query for won raffles
  const { data: wonRaffles = [] } = useQuery({
    queryKey: ['won-raffles', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('raffles')
        .select(`
          id,
          title,
          prize,
          draw_date,
          image_url,
          business:businesses(id, name, logo_url)
        `)
        .eq('winner_id', user.id)
        .order('draw_date', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    refetchInterval: 30000
  });

  // Real-time sync for user points and business stats
  useUserProfileRealtimeSync(user?.id);
  useBusinessDashboardRealtimeSync(businessId || undefined);

  // Setup real-time updates for points
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`user_points_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_points',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          // Refresh points data when changes occur
          refresh();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          // Refresh when profile is updated (total_points field)
          refresh();
        }
      )
      .subscribe();

    // Listen for custom checkin validated event
    const handleCheckinValidated = () => {
      refresh();
    };
    
    window.addEventListener('checkinValidated', handleCheckinValidated);
    window.addEventListener('pointsUpdated', handleCheckinValidated);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('checkinValidated', handleCheckinValidated);
      window.removeEventListener('pointsUpdated', handleCheckinValidated);
    };
  }, [user, refresh]);

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold mb-4">Faça login para ver seus pontos</h1>
        <p className="text-muted-foreground mb-8">Entre na sua conta para acompanhar sua pontuação e resgatar prêmios.</p>
      </div>
    );
  }

  if (loading || businessLoading || statsLoading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p>Carregando...</p>
      </div>
    );
  }

  // Se for um anunciante (tem businessId) E não for admin master, mostrar página de conquistas
  if (businessId && !(isAdmin && adminLevel === 'master')) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex-1">
          <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 max-w-7xl">
            <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
              <BackButton to="/dashboard" />
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                  <Trophy className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                  Conquistas do Anunciante
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground">Acompanhe suas conquistas, marcos e desempenho do seu negócio</p>
              </div>
            </div>

            <div className="grid gap-4 sm:gap-6">
              {/* Estatísticas de Conquistas */}
              <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
                <Card className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <Trophy className="h-6 w-6 sm:h-8 sm:w-8" />
                      <div>
                        <p className="text-xs sm:text-sm opacity-90">Conquistas Desbloqueadas</p>
                        <p className="text-xl sm:text-2xl font-bold">{businessStats.unlockedAchievements}/{businessStats.totalAchievements}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <Star className="h-6 w-6 sm:h-8 sm:w-8" />
                      <div>
                        <p className="text-xs sm:text-sm opacity-90">Nível Atual</p>
                        <p className="text-xl sm:text-2xl font-bold">{businessStats.currentLevel}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8" />
                      <div>
                        <p className="text-xs sm:text-sm opacity-90">Check-ins Recebidos</p>
                        <p className="text-xl sm:text-2xl font-bold">{businessStats.checkinsReceived}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <Users className="h-6 w-6 sm:h-8 sm:w-8" />
                      <div>
                        <p className="text-xs sm:text-sm opacity-90">Seguidores</p>
                        <p className="text-xl sm:text-2xl font-bold">{businessStats.followersCount}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Créditos de Pontos - Discreto */}
              <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-3">
                <Card className="border-dashed border-muted-foreground/30 bg-muted/30">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center gap-2">
                      <Coins className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Créditos Atuais</p>
                        <p className="text-sm sm:text-base font-semibold">{walletBalance.toLocaleString('pt-BR')} pts</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-dashed border-muted-foreground/30 bg-muted/30">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center gap-2">
                      <Gift className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Créditos por Conquistas</p>
                        {/* Créditos extras baseados em conquistas desbloqueadas */}
                        {/* common=100, rare=250, epic=500, legendary=1000 pts */}
                        <p className="text-sm sm:text-base font-semibold">
                          {achievementBonus > 0 
                            ? `+${achievementBonus.toLocaleString('pt-BR')} pts`
                            : '—'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Card de Vantagens - Resgate com Créditos */}
                <Card 
                  className="cursor-pointer hover:shadow-lg transition-all border-2 border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-pink-500/5 hover:scale-[1.02] col-span-2 lg:col-span-1"
                  onClick={() => navigate('/anunciante/vantagens')}
                >
                  <CardContent className="p-3 sm:p-4 flex items-center gap-3">
                    <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-full p-2 shadow-lg">
                      <Award className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-semibold text-sm">Resgatar Vantagens</h3>
                        <Badge className="bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30 text-[10px] px-1.5 py-0">
                          Novo
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        Use seus créditos para benefícios exclusivos
                      </p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-purple-500 shrink-0" />
                  </CardContent>
                </Card>
              </div>

              {/* Conquistas Badge */}
              <BusinessBadgeShowcase
                businessId={businessId} 
                showProgress={true}
              />

              {/* Grid com Próximas Conquistas e Desempenho Recente */}
              <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
                {/* Próximas Conquistas */}
                <Card>
                  <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <Target className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                      Próximas Conquistas
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Continue crescendo para desbloquear mais conquistas
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 pt-0">
                    <div className="space-y-3 sm:space-y-4">
                      <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 border rounded-lg">
                        <div className="text-xl sm:text-2xl">🏆</div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm sm:text-base">Negócio Popular</h4>
                          <p className="text-xs sm:text-sm text-muted-foreground">Alcance 500 seguidores</p>
                          <div className="mt-2 flex items-center gap-2">
                            <Progress value={(businessStats.followersCount / 500) * 100} className="flex-1 h-1.5 sm:h-2" />
                            <span className="text-xs text-muted-foreground shrink-0">{businessStats.followersCount}/500</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 border rounded-lg">
                        <div className="text-xl sm:text-2xl">⭐</div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm sm:text-base">Mestre das Ofertas</h4>
                          <p className="text-xs sm:text-sm text-muted-foreground">Crie 100 ofertas</p>
                          <div className="mt-2 flex items-center gap-2">
                            <Progress value={(businessStats.offersCreated / 100) * 100} className="flex-1 h-1.5 sm:h-2" />
                            <span className="text-xs text-muted-foreground shrink-0">{businessStats.offersCreated}/100</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 border rounded-lg">
                        <div className="text-xl sm:text-2xl">🎯</div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm sm:text-base">Campeão de Check-in</h4>
                          <p className="text-xs sm:text-sm text-muted-foreground">Receba 1000 check-ins</p>
                          <div className="mt-2 flex items-center gap-2">
                            <Progress value={(businessStats.checkinsReceived / 1000) * 100} className="flex-1 h-1.5 sm:h-2" />
                            <span className="text-xs text-muted-foreground shrink-0">{businessStats.checkinsReceived}/1000</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Desempenho Recente */}
                <Card>
                  <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                      Desempenho Recente
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Suas atividades mais recentes como anunciante
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 pt-0">
                    {businessActivities.length > 0 ? (
                      <div className="space-y-2 sm:space-y-3">
                        {businessActivities.map((activity, index) => {
                          const iconBg = activity.type === 'checkin' ? 'bg-green-100 text-green-600' :
                                       activity.type === 'follower' ? 'bg-blue-100 text-blue-600' :
                                       activity.type === 'raffle' ? 'bg-purple-100 text-purple-600' :
                                       'bg-orange-100 text-orange-600';
                          
                          const badgeBg = activity.type === 'checkin' ? 'bg-green-100 text-green-700' :
                                        activity.type === 'follower' ? 'bg-blue-100 text-blue-700' :
                                        activity.type === 'raffle' ? 'bg-purple-100 text-purple-700' :
                                        'bg-orange-100 text-orange-700';
                          
                          const Icon = activity.type === 'follower' ? Users :
                                     activity.type === 'raffle' ? Gift : Star;
                          
                          return (
                            <div key={index} className="flex items-start sm:items-center justify-between p-2 sm:p-3 border rounded gap-2">
                              <div className="flex items-start sm:items-center gap-2 sm:gap-3 flex-1 min-w-0">
                                <div className={`p-1.5 sm:p-2 ${iconBg} rounded-full shrink-0`}>
                                  <Icon className="h-3 w-3 sm:h-4 sm:w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium text-xs sm:text-sm line-clamp-2">{activity.description}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(activity.timestamp).toLocaleDateString('pt-BR', {
                                      day: '2-digit',
                                      month: '2-digit',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </p>
                                </div>
                              </div>
                              <Badge variant="secondary" className={`${badgeBg} text-xs shrink-0`}>
                                +{activity.points} pts
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-muted-foreground">
                        <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Nenhuma atividade recente</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
          </div>
        </div>
      </div>
      <BusinessTipsFooter />
    </div>
  );
}

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 max-w-7xl">
          <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
            <BackButton to="/" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Meus Pontos</h1>
              <p className="text-sm sm:text-base text-muted-foreground">Acompanhe sua pontuação, conquistas e indicações</p>
            </div>
          </div>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4 h-9 sm:h-10">
              <TabsTrigger value="overview" className="text-xs sm:text-sm">Visão Geral</TabsTrigger>
              <TabsTrigger value="achievements" className="text-xs sm:text-sm">Prêmios</TabsTrigger>
              <TabsTrigger value="donations" className="text-xs sm:text-sm">Doações</TabsTrigger>
              <TabsTrigger value="history" className="text-xs sm:text-sm">Histórico</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 sm:space-y-6">
              {/* User Level + Savings */}
              <div className="grid gap-4 md:grid-cols-2">
                <UserLevelCard />
                <SavingsTrackerCard />
              </div>

              {/* Daily Streak + Missions */}
              <div className="grid gap-4 md:grid-cols-2">
                <DailyStreakTracker />
                <DailyMissionsCard />
              </div>


              {/* Ranking */}
              <RankingSection />

              {/* Available Raffles */}
              <AvailableRaffles />

              {/* Recent Activity */}
              <Card>
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-base sm:text-lg">Atividade Recente</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Suas últimas ações que geraram pontos
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  {recentActivities && recentActivities.length > 0 ? (
                    <div className="space-y-2 sm:space-y-3">
                      {recentActivities.slice(0, 5).map((activity, index) => (
                        <div key={index} className="flex items-start sm:items-center justify-between gap-2">
                          <div className="flex items-start sm:items-center gap-2 sm:gap-3 flex-1 min-w-0">
                            <div className="p-1.5 sm:p-2 bg-primary/10 rounded-full shrink-0">
                              <Star className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-xs sm:text-sm line-clamp-2">{activity.description}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(activity.created_at).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-xs shrink-0">
                            +{activity.points_earned}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 sm:py-8 text-muted-foreground">
                      <Star className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm sm:text-base">Nenhuma atividade ainda</p>
                      <p className="text-xs sm:text-sm">Faça check-ins para ganhar seus primeiros pontos!</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="achievements" className="space-y-4 sm:space-y-6">
              {/* Prêmios Ganhos em Sorteios */}
              <Card>
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    Prêmios Ganhos
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Sorteios que você ganhou no Ofertivo
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  {wonRaffles.length > 0 ? (
                    <div className="space-y-3 sm:space-y-4">
                      {wonRaffles.map((raffle: any) => (
                        <Link 
                          key={raffle.id} 
                          to={`/sorteio-resultado/${raffle.id}`}
                          className="block"
                        >
                          <Card className="bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border-yellow-600/30 hover:border-yellow-500/50 transition-all cursor-pointer">
                            <CardContent className="p-4">
                              <div className="flex items-start gap-4">
                                {raffle.image_url ? (
                                  <img 
                                    src={raffle.image_url} 
                                    alt={raffle.title}
                                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg object-cover"
                                  />
                                ) : (
                                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                                    <Trophy className="h-8 w-8 text-yellow-400" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold text-sm sm:text-base line-clamp-1">
                                    {raffle.title}
                                  </h3>
                                  <p className="text-yellow-400 font-bold text-base sm:text-lg mt-1">
                                    🏆 {raffle.prize}
                                  </p>
                                  <div className="flex items-center gap-2 mt-2">
                                    {raffle.business?.logo_url ? (
                                      <img 
                                        src={raffle.business.logo_url} 
                                        alt={raffle.business.name}
                                        className="w-5 h-5 rounded-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-xs text-primary-foreground">
                                        {raffle.business?.name?.charAt(0) || '?'}
                                      </div>
                                    )}
                                    <span className="text-xs text-muted-foreground">
                                      {raffle.business?.name}
                                    </span>
                                  </div>
                                  {raffle.draw_date && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Ganho em {format(new Date(raffle.draw_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                                    </p>
                                  )}
                                </div>
                                <Badge className="bg-green-600 shrink-0">
                                  Ganhador
                                </Badge>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="font-medium">Nenhum prêmio ganho ainda</p>
                      <p className="text-sm mt-1">Participe dos sorteios para ganhar prêmios incríveis!</p>
                      <Button 
                        variant="outline" 
                        className="mt-4"
                        onClick={() => navigate('/sorteios')}
                      >
                        <Gift className="h-4 w-4 mr-2" />
                        Ver Sorteios Disponíveis
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Conquistas do Anunciante */}
              {businessId && (
                <BusinessBadgeShowcase businessId={businessId} />
              )}
            </TabsContent>

            <TabsContent value="donations" className="space-y-4 sm:space-y-6">
              {/* Vaquinhas Ativas */}
              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <CardHeader className="p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Heart className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base sm:text-lg">Vaquinhas</CardTitle>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => navigate('/vaquinhas')}
                      className="text-xs sm:text-sm"
                    >
                      Ver Todas
                    </Button>
                  </div>
                  <CardDescription className="text-xs sm:text-sm">
                    Apoie causas e projetos usando seus pontos
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  <div className="space-y-3">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start gap-2"
                      onClick={() => navigate('/vaquinhas')}
                    >
                      <Heart className="h-4 w-4" />
                      Explorar Vaquinhas Ativas
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start gap-2"
                      onClick={() => navigate('/minhas-vaquinhas')}
                    >
                      <Trophy className="h-4 w-4" />
                      Minhas Vaquinhas
                    </Button>
                  </div>
                  
                  <Separator className="my-4" />
                  
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <Gift className="h-4 w-4 text-primary" />
                      Como funcionam as doações?
                    </h4>
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      <li>• Use seus pontos para contribuir com vaquinhas</li>
                      <li>• 100 pontos = R$ 1,00 em contribuição</li>
                      <li>• Você pode doar anonimamente se preferir</li>
                      <li>• Acompanhe o progresso das campanhas</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* Transferências de Pontos */}
              <Card>
                <CardHeader className="p-4 sm:p-6">
                  <div className="flex items-center gap-2">
                    <Send className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base sm:text-lg">Transferências de Pontos</CardTitle>
                  </div>
                  <CardDescription className="text-xs sm:text-sm">
                    Histórico de doações diretas entre usuários
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  <PointsTransferHistory />
                </CardContent>
              </Card>

              {/* Estatísticas de Doações */}
              <div className="grid gap-3 sm:gap-4 grid-cols-2">
                <Card className="bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/20 dark:to-pink-950/20 border-rose-200 dark:border-rose-800">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Heart className="h-4 w-4 text-rose-600" />
                      <h3 className="font-semibold text-sm text-rose-900 dark:text-rose-100">
                        Saldo Disponível
                      </h3>
                    </div>
                    <div className="text-2xl font-bold text-rose-900 dark:text-rose-100">
                      {pointsStats?.totalPoints?.toLocaleString('pt-BR') || 0}
                    </div>
                    <p className="text-xs text-rose-700 dark:text-rose-300">
                      pontos para doar
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20 border-purple-200 dark:border-purple-800">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Gift className="h-4 w-4 text-purple-600" />
                      <h3 className="font-semibold text-sm text-purple-900 dark:text-purple-100">
                        Valor Equivalente
                      </h3>
                    </div>
                    <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                      {((pointsStats?.totalPoints || 0) / 100).toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      })}
                    </div>
                    <p className="text-xs text-purple-700 dark:text-purple-300">
                      em contribuições
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="history" className="space-y-4 sm:space-y-6">
              {/* Resumo de Pontos */}
              <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
                <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                      <h3 className="font-semibold text-sm text-blue-900 dark:text-blue-100">
                        Total Acumulado
                      </h3>
                    </div>
                    <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                      {pointsStats?.totalPoints?.toLocaleString('pt-BR') || 0}
                    </div>
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      pontos no total
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="h-4 w-4 text-green-600" />
                      <h3 className="font-semibold text-sm text-green-900 dark:text-green-100">
                        Pontos Ganhos
                      </h3>
                    </div>
                    <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                      {recentActivities?.reduce((sum, a) => sum + a.points_earned, 0).toLocaleString('pt-BR') || 0}
                    </div>
                    <p className="text-xs text-green-700 dark:text-green-300">
                      através de atividades
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20 border-purple-200 dark:border-purple-800">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-4 w-4 text-purple-600" />
                      <h3 className="font-semibold text-sm text-purple-900 dark:text-purple-100">
                        Nível Atual
                      </h3>
                    </div>
                    <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                      {pointsStats?.level || 1}
                    </div>
                    <p className="text-xs text-purple-700 dark:text-purple-300">
                      {pointsStats?.progressToNext || 0}% para próximo
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border-orange-200 dark:border-orange-800">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-orange-600" />
                      <h3 className="font-semibold text-sm text-orange-900 dark:text-orange-100">
                        Atividades
                      </h3>
                    </div>
                    <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                      {recentActivities?.length || 0}
                    </div>
                    <p className="text-xs text-orange-700 dark:text-orange-300">
                      ações realizadas
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Histórico Completo */}
              <Card>
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-base sm:text-lg">Histórico Completo</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Todas as suas atividades de pontos
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  {recentActivities && recentActivities.length > 0 ? (
                    <div className="space-y-2 sm:space-y-3">
                      {recentActivities.map((activity, index) => (
                        <div key={index} className="flex items-start sm:items-center justify-between p-2 sm:p-3 border rounded gap-2">
                          <div className="flex items-start sm:items-center gap-2 sm:gap-3 flex-1 min-w-0">
                            <div className="p-1.5 sm:p-2 bg-primary/10 rounded-full shrink-0">
                              <Star className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-xs sm:text-sm line-clamp-2">{activity.description}</p>
                              <p className="text-xs text-muted-foreground">
                                {activity.action_type} • {new Date(activity.created_at).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                          </div>
                          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 text-xs shrink-0">
                            +{activity.points_earned}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 sm:py-12 text-muted-foreground">
                      <Calendar className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-sm sm:text-base">Nenhuma atividade registrada</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <TipsFooter />
    </div>
  );
};

export default Points;