import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BadgeGrid } from './BadgeGrid';
import { BadgeCard } from './BadgeCard';
import { useBadges } from '@/hooks/useBadges';
import { Award, Star, Trophy, Zap } from 'lucide-react';

interface BadgeShowcaseProps {
  userId?: string;
  compact?: boolean;
}

export const BadgeShowcase = ({ userId, compact = false }: BadgeShowcaseProps) => {
  const { 
    userBadges, 
    loading, 
    getUnlockedBadges, 
    getProgressBadges,
    triggerBadgeCheck,
    fetchUserBadges
  } = useBadges();

  React.useEffect(() => {
    if (userId) {
      fetchUserBadges(userId);
    }
  }, [userId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const unlockedBadges = getUnlockedBadges();
  const progressBadges = getProgressBadges();

  const getRarityBadges = (rarity: string) => {
    return unlockedBadges.filter(badge => badge.badge.rarity === rarity);
  };

  const rarityStats = {
    legendary: getRarityBadges('legendary').length,
    epic: getRarityBadges('epic').length,
    rare: getRarityBadges('rare').length,
    common: getRarityBadges('common').length,
  };

  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Award className="w-5 h-5" />
              Selos Conquistados
            </CardTitle>
            <Badge variant="secondary">
              {unlockedBadges.length} selos
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {unlockedBadges.length > 0 ? (
            <div className="grid grid-cols-6 md:grid-cols-8 gap-2">
              {unlockedBadges.slice(0, 12).map((userBadge) => (
                <BadgeCard
                  key={userBadge.id}
                  userBadge={userBadge}
                  size="sm"
                  showProgress={false}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              Nenhum selo conquistado ainda
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Coleção de Selos
          </CardTitle>
          <CardDescription>
            Conquiste selos realizando atividades no app
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
              <div className="text-2xl font-bold text-amber-600">{rarityStats.legendary}</div>
              <div className="text-sm text-amber-600">Lendários</div>
            </div>
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{rarityStats.epic}</div>
              <div className="text-sm text-purple-600">Épicos</div>
            </div>
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{rarityStats.rare}</div>
              <div className="text-sm text-blue-600">Raros</div>
            </div>
            <div className="text-center p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg">
              <div className="text-2xl font-bold text-emerald-600">{rarityStats.common}</div>
              <div className="text-sm text-emerald-600">Comuns</div>
            </div>
          </div>

          {!userId && (
            <div className="mt-4 flex justify-center">
              <Button 
                onClick={triggerBadgeCheck}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Zap className="w-4 h-4" />
                Verificar Novos Selos
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Badges Tabs */}
      <Tabs defaultValue="unlocked" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="unlocked" className="flex items-center gap-2">
            <Star className="w-4 h-4" />
            Conquistados ({unlockedBadges.length})
          </TabsTrigger>
          <TabsTrigger value="progress" className="flex items-center gap-2">
            <Award className="w-4 h-4" />
            Em Progresso ({progressBadges.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="unlocked" className="mt-4">
          <BadgeGrid
            badges={unlockedBadges}
            size="md"
            showProgress={false}
            emptyMessage="Você ainda não conquistou nenhum selo. Continue usando o app!"
          />
        </TabsContent>
        
        <TabsContent value="progress" className="mt-4">
          <BadgeGrid
            badges={progressBadges}
            size="md"
            showProgress={true}
            emptyMessage="Todos os selos disponíveis já foram conquistados!"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};