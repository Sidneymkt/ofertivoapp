import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useBadges } from '@/hooks/useBadges';
import { useUserLevel } from '@/hooks/useUserLevel';
import { Award, Trophy, Target, Sparkles, Lock, ChevronRight } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';
import { AchievementsDialog } from '@/components/AchievementsDialog';

interface ProfileAchievementsShowcaseProps {
  userId: string;
}

export const ProfileAchievementsShowcase = ({ userId }: ProfileAchievementsShowcaseProps) => {
  const {
    userBadges,
    availableBadges,
    loading,
    getUnlockedBadges,
    getProgressBadges,
    fetchUserBadges,
  } = useBadges();
  const userLevel = useUserLevel();
  const [showAllDialog, setShowAllDialog] = useState(false);

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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const unlockedBadges = getUnlockedBadges();
  const progressBadges = getProgressBadges();
  const userBadgeIds = new Set(userBadges.map(ub => ub.badge_id));
  const futureBadges = availableBadges.filter(b => !userBadgeIds.has(b.id));

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'bg-emerald-500';
      case 'rare': return 'bg-blue-500';
      case 'epic': return 'bg-purple-500';
      case 'legendary': return 'bg-amber-500';
      default: return 'bg-muted';
    }
  };

  const renderBadgeIcon = (iconName: string, unlocked: boolean, size = 20) => {
    const IconComponent = (LucideIcons as any)[iconName] || LucideIcons.Award;
    return (
      <IconComponent
        size={size}
        className={cn('transition-colors', unlocked ? 'text-white' : 'text-muted-foreground')}
      />
    );
  };

  const renderCompactBadge = (badge: any, unlocked: boolean, rarity: string, key: string) => (
    <div
      key={key}
      className={cn(
        'w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center relative transition-all',
        unlocked
          ? `${getRarityColor(rarity)} shadow-lg hover:scale-110 cursor-pointer`
          : 'bg-muted/60 border border-dashed border-muted-foreground/30'
      )}
    >
      {renderBadgeIcon(badge.icon, unlocked)}
      {!unlocked && (
        <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center">
          <Lock className="w-3 h-3 text-muted-foreground" />
        </div>
      )}
      {rarity === 'legendary' && unlocked && (
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 via-amber-500/20 to-orange-500/20 animate-pulse rounded-xl" />
      )}
    </div>
  );

  return (
    <>
      <Card>
        <CardHeader className="pb-3 p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              Conquistas
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {unlockedBadges.length} de {unlockedBadges.length + progressBadges.length + futureBadges.length}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-primary h-7 px-2"
                onClick={() => setShowAllDialog(true)}
              >
                Ver todas
                <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          {/* Level context */}
          <div
            className={cn(
              'flex items-center gap-3 p-3 rounded-lg mb-4 bg-gradient-to-r cursor-pointer hover:opacity-90 transition-opacity',
              userLevel.color
            )}
            onClick={() => setShowAllDialog(true)}
          >
            <span className="text-2xl">{userLevel.emoji}</span>
            <div className="text-white">
              <p className="text-xs font-medium opacity-80">Nível {userLevel.level}</p>
              <p className="font-bold text-sm">{userLevel.title}</p>
            </div>
            <div className="ml-auto text-right text-white">
              <Sparkles className="w-4 h-4 opacity-80 ml-auto" />
            </div>
          </div>

          {/* Compact badge grid */}
          {unlockedBadges.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {unlockedBadges.slice(0, 12).map((ub) =>
                renderCompactBadge(ub.badge, true, ub.badge.rarity, ub.id)
              )}
              {progressBadges.slice(0, Math.max(0, 12 - unlockedBadges.length)).map((ub) =>
                renderCompactBadge(ub.badge, false, ub.badge.rarity, ub.id)
              )}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma conquista ainda</p>
              <p className="text-xs">Use o app para desbloquear suas primeiras conquistas!</p>
            </div>
          )}

          {/* CTA to open popup */}
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-4 text-xs"
            onClick={() => setShowAllDialog(true)}
          >
            <Award className="w-4 h-4 mr-2" />
            Ver todas as conquistas e próximos desafios
          </Button>
        </CardContent>
      </Card>

      <AchievementsDialog
        open={showAllDialog}
        onOpenChange={setShowAllDialog}
        userId={userId}
      />
    </>
  );
};
