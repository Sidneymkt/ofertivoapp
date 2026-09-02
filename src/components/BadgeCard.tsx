import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import * as LucideIcons from 'lucide-react';
import { UserBadge } from '@/hooks/useBadges';
import { useIsMobile } from '@/hooks/use-mobile';

interface BadgeCardProps {
  userBadge: UserBadge;
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
  className?: string;
}

export const BadgeCard = ({ 
  userBadge, 
  size = 'md', 
  showProgress = true,
  className 
}: BadgeCardProps) => {
  const { badge, is_unlocked, progress, earned_at } = userBadge;
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  
  // Get the icon component
  const IconComponent = (LucideIcons as any)[badge.icon] || LucideIcons.Award;
  
  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'bg-emerald-500';
      case 'rare': return 'bg-blue-500';
      case 'epic': return 'bg-purple-500';
      case 'legendary': return 'bg-amber-500';
      default: return 'bg-gray-500';
    }
  };

  const getRarityGlow = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'shadow-emerald-500/20';
      case 'rare': return 'shadow-blue-500/20';
      case 'epic': return 'shadow-purple-500/20';
      case 'legendary': return 'shadow-amber-500/20';
      default: return 'shadow-gray-500/20';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm': return 'w-16 h-16 p-2';
      case 'lg': return 'w-24 h-24 p-4';
      default: return 'w-20 h-20 p-3';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm': return 20;
      case 'lg': return 32;
      default: return 24;
    }
  };

  const progressPercentage = badge.criteria_value 
    ? Math.min((progress / badge.criteria_value) * 100, 100)
    : 100;

  const badgeContent = (
    <Card className={cn(
      "relative overflow-hidden border-2 transition-all duration-300",
      is_unlocked 
        ? `${getRarityColor(badge.rarity)} border-current shadow-lg ${getRarityGlow(badge.rarity)}` 
        : "border-muted bg-muted/50",
      "hover:scale-105 cursor-pointer",
      className
    )}>
      <CardContent className="p-0">
        <div className={cn(
          "relative flex items-center justify-center rounded-lg",
          getSizeClasses(),
          is_unlocked ? "bg-white/10" : "bg-muted/30"
        )}>
          <IconComponent 
            size={getIconSize()}
            className={cn(
              "transition-colors",
              is_unlocked ? "text-white" : "text-muted-foreground"
            )}
            style={{ color: is_unlocked ? 'white' : undefined }}
          />
          
          {!is_unlocked && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
              <div className="w-6 h-6 border-2 border-muted-foreground rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-muted-foreground rounded-full" />
              </div>
            </div>
          )}

          {badge.rarity === 'legendary' && is_unlocked && (
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 via-amber-500/20 to-orange-500/20 animate-pulse rounded-lg" />
          )}
        </div>

        {showProgress && !is_unlocked && badge.criteria_value && (
          <div className="absolute bottom-0 left-0 right-0 p-1">
            <Progress 
              value={progressPercentage} 
              className="h-1 bg-black/20"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );

  const badgeDetails = (
    <div className="text-center space-y-2">
      <div className="font-semibold">{badge.name}</div>
      <div className="text-xs text-muted-foreground">{badge.description}</div>
      <div className="flex items-center justify-center gap-2">
        <Badge variant="secondary" className="text-xs">
          {badge.rarity === 'common' && 'Comum'}
          {badge.rarity === 'rare' && 'Raro'}
          {badge.rarity === 'epic' && 'Épico'}
          {badge.rarity === 'legendary' && 'Lendário'}
        </Badge>
        {is_unlocked && (
          <Badge variant="default" className="text-xs bg-green-500">
            Conquistado
          </Badge>
        )}
      </div>
      {!is_unlocked && badge.criteria_value && (
        <div className="text-xs">
          Progresso: {progress}/{badge.criteria_value} ({Math.round(progressPercentage)}%)
        </div>
      )}
      {is_unlocked && (
        <div className="text-xs text-muted-foreground">
          Conquistado em {new Date(earned_at).toLocaleDateString('pt-BR')}
        </div>
      )}
    </div>
  );

  // Mobile: use Dialog with click
  if (isMobile) {
    return (
      <>
        <div onClick={() => setIsOpen(true)}>
          {badgeContent}
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-center gap-2">
                <IconComponent size={24} />
                Detalhes do Selo
              </DialogTitle>
            </DialogHeader>
            {badgeDetails}
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Desktop: use Tooltip with hover
  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          {badgeContent}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          {badgeDetails}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};