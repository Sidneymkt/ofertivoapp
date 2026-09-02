import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useBadges, UserBadge, Badge as BadgeType } from '@/hooks/useBadges';
import { Star, Trophy, Zap, Target, Lock } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';

interface AchievementsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId?: string;
}

const MOTIVATIONAL_MESSAGES: Record<string, string> = {
  common: '🌱 Primeiros passos no ecossistema Ofertivo!',
  rare: '💪 Você está se destacando na comunidade!',
  epic: '🔥 Elite do Ofertivo — poucos chegam aqui!',
  legendary: '👑 Lenda viva do ecossistema Ofertivo!',
};

const getRarityColor = (rarity: string) => {
  switch (rarity) {
    case 'common': return 'bg-emerald-500';
    case 'rare': return 'bg-blue-500';
    case 'epic': return 'bg-purple-500';
    case 'legendary': return 'bg-amber-500';
    default: return 'bg-muted';
  }
};

const getRarityLabel = (rarity: string) => {
  switch (rarity) {
    case 'common': return 'Comum';
    case 'rare': return 'Raro';
    case 'epic': return 'Épico';
    case 'legendary': return 'Lendário';
    default: return 'Comum';
  }
};

const getRarityTextColor = (rarity: string) => {
  switch (rarity) {
    case 'common': return 'text-emerald-600';
    case 'rare': return 'text-blue-600';
    case 'epic': return 'text-purple-600';
    case 'legendary': return 'text-amber-600';
    default: return 'text-muted-foreground';
  }
};

const renderBadgeIcon = (iconName: string, unlocked: boolean, size = 22) => {
  const IconComponent = (LucideIcons as any)[iconName] || LucideIcons.Award;
  return (
    <IconComponent
      size={size}
      className={cn('transition-colors', unlocked ? 'text-white' : 'text-muted-foreground')}
    />
  );
};

const renderDetailItem = (
  badge: any,
  unlocked: boolean,
  progress?: number,
  criteriaValue?: number,
  earnedAt?: string
) => {
  const progressPercent = criteriaValue ? Math.min((progress || 0) / criteriaValue * 100, 100) : 100;
  return (
    <div
      key={badge.id}
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border transition-all',
        unlocked
          ? 'bg-gradient-to-r from-primary/5 to-transparent border-primary/20'
          : 'border-muted hover:bg-muted/50'
      )}
    >
      <div
        className={cn(
          'w-12 h-12 rounded-lg flex items-center justify-center shrink-0 relative',
          unlocked ? getRarityColor(badge.rarity) : 'bg-muted'
        )}
      >
        {renderBadgeIcon(badge.icon, unlocked)}
        {!unlocked && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Lock className="w-3 h-3 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className={cn('font-semibold text-sm', unlocked && 'text-foreground')}>
            {badge.name}
          </h4>
          <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', getRarityTextColor(badge.rarity))}>
            {getRarityLabel(badge.rarity)}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{badge.description}</p>
        {!unlocked && criteriaValue && (
          <div className="mt-1.5 flex items-center gap-2">
            <Progress value={progressPercent} className="h-1.5 flex-1" />
            <span className="text-[10px] text-muted-foreground shrink-0">
              {progress || 0}/{criteriaValue}
            </span>
          </div>
        )}
        {unlocked && earnedAt && (
          <p className="text-[10px] text-primary mt-0.5">
            ✅ Conquistado em {new Date(earnedAt).toLocaleDateString('pt-BR')}
          </p>
        )}
      </div>
    </div>
  );
};

export const AchievementsDialog = ({ open, onOpenChange, userId }: AchievementsDialogProps) => {
  const {
    userBadges,
    availableBadges,
    loading,
    getUnlockedBadges,
    getProgressBadges,
    fetchUserBadges,
    triggerBadgeCheck,
  } = useBadges();

  React.useEffect(() => {
    if (open && userId) {
      fetchUserBadges(userId);
    }
  }, [open, userId]);

  const unlockedBadges = getUnlockedBadges();
  const progressBadges = getProgressBadges();
  const userBadgeIds = new Set(userBadges.map(ub => ub.badge_id));
  const futureBadges = availableBadges.filter(b => !userBadgeIds.has(b.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] p-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Trophy className="w-5 h-5 text-primary" />
            Conquistas do Ofertivo
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Desbloqueie conquistas usando o app e suba de nível!
          </p>
        </DialogHeader>

        <Tabs defaultValue="unlocked" className="w-full">
          <div className="px-4">
            <TabsList className="grid w-full grid-cols-3 h-9">
              <TabsTrigger value="unlocked" className="text-xs">
                <Star className="w-3 h-3 mr-1" />
                Conquistados ({unlockedBadges.length})
              </TabsTrigger>
              <TabsTrigger value="progress" className="text-xs">
                <Target className="w-3 h-3 mr-1" />
                Em progresso ({progressBadges.length})
              </TabsTrigger>
              <TabsTrigger value="future" className="text-xs">
                <Lock className="w-3 h-3 mr-1" />
                Futuras ({futureBadges.length})
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="h-[55vh] px-4 pb-4">
            <TabsContent value="unlocked" className="mt-3 space-y-2">
              {unlockedBadges.length > 0 ? (
                <>
                  <div className="p-2 rounded-lg bg-primary/5 text-center mb-3">
                    <p className="text-xs text-primary font-medium">
                      🎉 Parabéns! Você já conquistou {unlockedBadges.length} {unlockedBadges.length === 1 ? 'selo' : 'selos'}!
                    </p>
                  </div>
                  {unlockedBadges.map((ub) =>
                    renderDetailItem(ub.badge, true, ub.progress, ub.badge.criteria_value, ub.earned_at)
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Star className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium">Nenhuma conquista ainda</p>
                  <p className="text-xs mt-1">Continue usando o Ofertivo para desbloquear!</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="progress" className="mt-3 space-y-2">
              {progressBadges.length > 0 ? (
                <>
                  <div className="p-2 rounded-lg bg-amber-500/10 text-center mb-3">
                    <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                      🔥 Você está quase lá! Continue para desbloquear
                    </p>
                  </div>
                  {progressBadges.map((ub) =>
                    renderDetailItem(ub.badge, false, ub.progress, ub.badge.criteria_value)
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium">Nenhuma conquista em progresso</p>
                  <p className="text-xs mt-1">Explore ofertas, faça check-ins e interaja!</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="future" className="mt-3 space-y-2">
              {futureBadges.length > 0 ? (
                <>
                  <div className="p-2 rounded-lg bg-muted text-center mb-3">
                    <p className="text-xs text-muted-foreground font-medium">
                      🚀 Conquistas que aguardam você no ecossistema Ofertivo
                    </p>
                  </div>
                  {(['legendary', 'epic', 'rare', 'common'] as const).map((rarity) => {
                    const badgesOfRarity = futureBadges.filter(b => b.rarity === rarity);
                    if (badgesOfRarity.length === 0) return null;
                    return (
                      <div key={rarity}>
                        <div className="flex items-center gap-2 mb-2 mt-3">
                          <div className={cn('w-2 h-2 rounded-full', getRarityColor(rarity))} />
                          <span className={cn('text-xs font-semibold uppercase', getRarityTextColor(rarity))}>
                            {getRarityLabel(rarity)}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {MOTIVATIONAL_MESSAGES[rarity]}
                          </span>
                        </div>
                        {badgesOfRarity.map((badge) =>
                          renderDetailItem(badge, false, 0, badge.criteria_value)
                        )}
                      </div>
                    );
                  })}
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Trophy className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium">Todas as conquistas já foram alcançadas!</p>
                  <p className="text-xs mt-1">Você é uma lenda do Ofertivo! 👑</p>
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <div className="p-4 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={() => {
              triggerBadgeCheck();
              onOpenChange(false);
            }}
          >
            <Zap className="w-3 h-3 mr-1" />
            Verificar novos selos
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
