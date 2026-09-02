import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, Star, Award, Crown } from 'lucide-react';
import { useBusinessBadges } from '@/hooks/useBusinessBadges';

interface BusinessBadgeShowcaseProps {
  businessId: string;
  showOnlyUnlocked?: boolean;
  showProgress?: boolean;
  className?: string;
}

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
      return 'bg-gradient-to-r from-purple-500 to-purple-700 border-purple-400';
    case 'epic':
      return 'bg-gradient-to-r from-orange-500 to-orange-700 border-orange-400';
    case 'rare':
      return 'bg-gradient-to-r from-blue-500 to-blue-700 border-blue-400';
    default:
      return 'bg-gradient-to-r from-green-500 to-green-700 border-green-400';
  }
};

const getRarityLabel = (rarity: string) => {
  switch (rarity) {
    case 'legendary':
      return 'Lendário';
    case 'epic':
      return 'Épico';
    case 'rare':
      return 'Raro';
    default:
      return 'Comum';
  }
};

export const BusinessBadgeShowcase: React.FC<BusinessBadgeShowcaseProps> = ({
  businessId,
  showOnlyUnlocked = false,
  showProgress = false,
  className = ''
}) => {
  const { achievements, loading, getUnlockedBadges, getCompletionStats } = useBusinessBadges(businessId);

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayAchievements = showOnlyUnlocked ? getUnlockedBadges() : achievements;
  const stats = getCompletionStats();

  if (displayAchievements.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">
            {showOnlyUnlocked 
              ? 'Nenhuma conquista desbloqueada ainda' 
              : 'Nenhuma conquista disponível'
            }
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Conquistas {showOnlyUnlocked ? 'Desbloqueadas' : ''}
          </CardTitle>
          {showProgress && (
            <Badge variant="secondary">
              {stats.unlocked}/{stats.total} ({stats.percentage}%)
            </Badge>
          )}
        </div>
        {showProgress && stats.total > 0 && (
          <div className="space-y-2">
            <Progress value={stats.percentage} className="h-2" />
            <p className="text-sm text-muted-foreground">
              {stats.unlocked} de {stats.total} conquistas desbloqueadas
            </p>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {displayAchievements.map((achievement) => {
            const badge = achievement.business_badges;
            if (!badge) return null;

            const isUnlocked = achievement.is_unlocked;
            const progressPercentage = badge.criteria_value > 0 
              ? Math.min((achievement.progress / badge.criteria_value) * 100, 100)
              : 0;

            return (
              <div
                key={achievement.id}
                className={`
                  relative p-4 rounded-lg border-2 transition-all duration-300 hover:scale-105
                  ${isUnlocked 
                    ? getRarityColor(badge.rarity) + ' text-white shadow-lg' 
                    : 'bg-muted border-muted-foreground/20 text-muted-foreground'
                  }
                `}
              >
                {/* Badge Icon */}
                <div className="text-center mb-3">
                  <div className="text-3xl mb-2">
                    {badge.icon}
                  </div>
                  <div className="flex items-center justify-center gap-1 mb-1">
                    {getRarityIcon(badge.rarity)}
                    <span className="text-xs font-medium">
                      {getRarityLabel(badge.rarity)}
                    </span>
                  </div>
                </div>

                {/* Badge Info */}
                <div className="text-center">
                  <h4 className="font-semibold text-sm mb-1">
                    {badge.name}
                  </h4>
                  <p className="text-xs opacity-90 mb-2">
                    {badge.description}
                  </p>

                  {/* Progress */}
                  {!isUnlocked && showProgress && (
                    <div className="space-y-1">
                      <div className="text-xs">
                        {achievement.progress}/{badge.criteria_value}
                      </div>
                      <Progress 
                        value={progressPercentage} 
                        className="h-1" 
                      />
                    </div>
                  )}

                  {/* Earned Date */}
                  {isUnlocked && achievement.earned_at && (
                    <div className="text-xs opacity-75 mt-2">
                      Conquistado em {new Date(achievement.earned_at).toLocaleDateString('pt-BR')}
                    </div>
                  )}
                </div>

                {/* Rarity Indicator */}
                {isUnlocked && (
                  <div className="absolute top-2 right-2">
                    {getRarityIcon(badge.rarity)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};