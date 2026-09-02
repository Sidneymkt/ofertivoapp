import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BackButton } from '@/components/BackButton';
import { AchievementCreditsCard } from '@/components/business/AchievementCreditsCard';
import { useAuth } from '@/hooks/useAuth';
import { useBusiness } from '@/hooks/useBusiness';
import { useBusinessBadges } from '@/hooks/useBusinessBadges';
import { useNavigate } from 'react-router-dom';
import { 
  Trophy, 
  Star, 
  Award, 
  Crown, 
  RefreshCw,
  Target,
  Users,
  MessageSquare,
  MapPin,
  Gift,
  Sparkles,
  Coins
} from 'lucide-react';

const getRarityIcon = (rarity: string) => {
  switch (rarity) {
    case 'legendary':
      return <Crown className="w-4 h-4" />;
    case 'epic':
      return <Trophy className="w-4 h-4" />;
    case 'rare':
      return <Award className="w-4 h-4" />;    
    default:
      return <Star className="w-4 h-4" />;
  }
};

const getRarityColor = (rarity: string) => {
  switch (rarity) {
    case 'legendary':
      return 'from-purple-500 to-purple-700 border-purple-400';
    case 'epic':
      return 'from-orange-500 to-orange-700 border-orange-400';
    case 'rare':
      return 'from-blue-500 to-blue-700 border-blue-400';
    default:
      return 'from-green-500 to-green-700 border-green-400';
  }
};

const getRarityCredits = (rarity: string): number => {
  switch (rarity) {
    case 'legendary': return 1000;
    case 'epic': return 500;
    case 'rare': return 250;
    default: return 100;
  }
};

const getCriteriaIcon = (type: string) => {
  switch (type) {
    case 'offers_created':
      return <Target className="w-4 h-4" />;
    case 'followers':
      return <Users className="w-4 h-4" />;
    case 'positive_reviews':
      return <MessageSquare className="w-4 h-4" />;
    case 'checkins_received':
      return <MapPin className="w-4 h-4" />;
    case 'raffles_created':
      return <Gift className="w-4 h-4" />;
    default:
      return <Star className="w-4 h-4" />;
  }
};

const getCriteriaLabel = (type: string) => {
  switch (type) {
    case 'offers_created':
      return 'Ofertas Criadas';
    case 'followers':
      return 'Seguidores';
    case 'positive_reviews':
      return 'Avaliações Positivas';
    case 'checkins_received':
      return 'Check-ins Recebidos';
    case 'raffles_created':
      return 'Sorteios Realizados';
    default:
      return 'Critério';
  }
};

export const BusinessAchievements: React.FC = () => {
  const { user } = useAuth();
  const { business } = useBusiness();
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();
  
  const {
    achievements,
    allBadges,
    loading,
    refreshBadges,
    getUnlockedBadges,
    getInProgressBadges,
    getBadgesByRarity,
    getCompletionStats
  } = useBusinessBadges(business?.id);

  // Calcular créditos totais ganhos
  const totalCreditsEarned = getUnlockedBadges().reduce((sum, achievement) => {
    const badge = achievement.business_badges;
    if (!badge) return sum;
    return sum + getRarityCredits(badge.rarity);
  }, 0);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshBadges();
    setRefreshing(false);
  };

  if (!user || !business) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/50 p-4">
        <div className="max-w-4xl mx-auto text-center py-12">
          <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Acesso Negado</h2>
          <p className="text-muted-foreground">
            Você precisa ter um negócio cadastrado para ver as conquistas.
          </p>
        </div>
      </div>
    );
  }

  const stats = getCompletionStats();
  const unlockedBadges = getUnlockedBadges();
  const inProgressBadges = getInProgressBadges();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/50">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <BackButton to="/dashboard" />
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Trophy className="w-8 h-8 text-primary" />
                Conquistas
              </h1>
              <p className="text-muted-foreground">
                Acompanhe seu progresso e desbloqueie novos selos
              </p>
            </div>
          </div>
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        {/* Card de Créditos por Conquistas + Botão Vantagens */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <AchievementCreditsCard businessId={business.id} compact />
          
          {/* Card de Vantagens - Resgate com Créditos */}
          <Card 
            className="cursor-pointer hover:shadow-lg transition-all border-2 border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-pink-500/5 hover:scale-[1.02]"
            onClick={() => navigate('/anunciante/vantagens')}
          >
            <CardContent className="p-6 flex items-center gap-4">
              <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-full p-3 shadow-lg">
                <Gift className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-lg">Resgatar Vantagens</h3>
                  <Badge className="bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30">
                    Novo
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Use seus créditos por conquistas para desbloquear benefícios exclusivos
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-1 text-purple-500">
                <Sparkles className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">
                {stats.unlocked}
              </div>
              <div className="text-sm text-muted-foreground">
                Desbloqueadas
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-500">
                {stats.inProgress}
              </div>
              <div className="text-sm text-muted-foreground">
                Em Progresso
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-500">
                {stats.percentage}%
              </div>
              <div className="text-sm text-muted-foreground">
                Completado
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">
                {stats.total}
              </div>
              <div className="text-sm text-muted-foreground">
                Total Disponível
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-200 dark:border-purple-800">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 flex items-center justify-center gap-1">
                <Coins className="w-5 h-5" />
                {totalCreditsEarned.toLocaleString('pt-BR')}
              </div>
              <div className="text-sm text-muted-foreground">
                Créditos Ganhos
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Bar */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Progresso Geral</h3>
              <Badge variant="secondary">
                {stats.unlocked}/{stats.total}
              </Badge>
            </div>
            <Progress value={stats.percentage} className="h-3" />
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="unlocked" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="unlocked" className="flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Desbloqueadas ({unlockedBadges.length})
            </TabsTrigger>
            <TabsTrigger value="progress" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Em Progresso ({inProgressBadges.length})
            </TabsTrigger>
            <TabsTrigger value="all" className="flex items-center gap-2">
              <Star className="w-4 h-4" />
              Todas ({allBadges.length})
            </TabsTrigger>
            <TabsTrigger value="rarity" className="flex items-center gap-2">
              <Crown className="w-4 h-4" />
              Por Raridade
            </TabsTrigger>
          </TabsList>

          <TabsContent value="unlocked">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {unlockedBadges.map((achievement) => {
                const badge = achievement.business_badges;
                if (!badge) return null;

                return (
                  <Card
                    key={achievement.id}
                    className={`border-2 bg-gradient-to-br ${getRarityColor(badge.rarity)} text-white shadow-lg hover:scale-105 transition-transform`}
                  >
                    <CardContent className="p-4 text-center">
                      <div className="text-4xl mb-2">{badge.icon}</div>
                      <h4 className="font-bold mb-1">{badge.name}</h4>
                      <p className="text-sm opacity-90 mb-2">{badge.description}</p>
                      <div className="flex items-center justify-center gap-1 mb-2">
                        {getRarityIcon(badge.rarity)}
                        <span className="text-xs font-medium capitalize">
                          {badge.rarity}
                        </span>
                      </div>
                      {/* Créditos ganhos */}
                      <div className="flex items-center justify-center gap-1 mb-2 bg-white/20 rounded-full px-2 py-1">
                        <Coins className="w-3 h-3" />
                        <span className="text-xs font-bold">
                          +{getRarityCredits(badge.rarity).toLocaleString('pt-BR')} pts
                        </span>
                      </div>
                      {achievement.earned_at && (
                        <div className="text-xs opacity-75">
                          {new Date(achievement.earned_at).toLocaleDateString('pt-BR')}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="progress">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {inProgressBadges.map((achievement) => {
                const badge = achievement.business_badges;
                if (!badge) return null;

                const progressPercentage = badge.criteria_value > 0 
                  ? Math.min((achievement.progress / badge.criteria_value) * 100, 100)
                  : 0;

                return (
                  <Card key={achievement.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="text-3xl">{badge.icon}</div>
                        <div className="flex-1">
                          <h4 className="font-semibold mb-1">{badge.name}</h4>
                          <p className="text-sm text-muted-foreground mb-3">
                            {badge.description}
                          </p>
                          
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-1">
                                {getCriteriaIcon(badge.criteria_type)}
                                <span>{getCriteriaLabel(badge.criteria_type)}</span>
                              </div>
                              <span className="font-medium">
                                {achievement.progress}/{badge.criteria_value}
                              </span>
                            </div>
                            <Progress value={progressPercentage} className="h-2" />
                            <div className="text-xs text-muted-foreground text-right">
                              {Math.round(progressPercentage)}% completo
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="all">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {allBadges.map((badge) => {
                const achievement = achievements.find(a => a.badge_id === badge.id);
                const isUnlocked = achievement?.is_unlocked || false;
                const progress = achievement?.progress || 0;
                const progressPercentage = badge.criteria_value > 0 
                  ? Math.min((progress / badge.criteria_value) * 100, 100)
                  : 0;

                return (
                  <Card
                    key={badge.id}
                    className={`border-2 transition-all hover:scale-105 ${
                      isUnlocked 
                        ? `bg-gradient-to-br ${getRarityColor(badge.rarity)} text-white shadow-lg`
                        : 'bg-muted border-muted-foreground/20'
                    }`}
                  >
                    <CardContent className="p-4 text-center">
                      <div className="text-3xl mb-2">{badge.icon}</div>
                      <h4 className={`font-semibold text-sm mb-1 ${!isUnlocked ? 'text-muted-foreground' : ''}`}>
                        {badge.name}
                      </h4>
                      <p className={`text-xs mb-2 ${!isUnlocked ? 'text-muted-foreground' : 'opacity-90'}`}>
                        {badge.description}
                      </p>
                      
                      <div className="flex items-center justify-center gap-1 mb-2">
                        {getRarityIcon(badge.rarity)}
                        <span className="text-xs font-medium capitalize">
                          {badge.rarity}
                        </span>
                      </div>

                      {!isUnlocked && (
                        <div className="space-y-1">
                          <div className="text-xs">
                            {progress}/{badge.criteria_value}
                          </div>
                          <Progress value={progressPercentage} className="h-1" />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="rarity">
            <div className="space-y-6">
              {['legendary', 'epic', 'rare', 'common'].map((rarity) => {
                const rarityBadges = getBadgesByRarity(rarity);
                if (rarityBadges.length === 0) return null;

                return (
                  <div key={rarity}>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 capitalize">
                      {getRarityIcon(rarity)}
                      {rarity} ({rarityBadges.length})
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {rarityBadges.map((achievement) => {
                        const badge = achievement.business_badges;
                        if (!badge) return null;

                        return (
                          <Card
                            key={achievement.id}
                            className={`border-2 bg-gradient-to-br ${getRarityColor(badge.rarity)} text-white shadow-lg`}
                          >
                            <CardContent className="p-4 text-center">
                              <div className="text-3xl mb-2">{badge.icon}</div>
                              <h4 className="font-semibold text-sm mb-1">{badge.name}</h4>
                              <p className="text-xs opacity-90">{badge.description}</p>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};