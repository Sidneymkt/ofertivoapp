import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Coins, 
  Gift, 
  Sparkles,
  Target,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PointsStats {
  totalPoints: number;
  level: number;
  nextLevelPoints: number;
  progressToNext: number;
  earnedThisMonth: number;
  totalCheckins: number;
}

interface InteractivePointsCardProps {
  pointsStats: PointsStats;
  className?: string;
  onRedeem?: () => void;
}

export const InteractivePointsCard: React.FC<InteractivePointsCardProps> = ({
  pointsStats,
  className,
  onRedeem
}) => {
  const pointsToNext = pointsStats.nextLevelPoints - pointsStats.totalPoints;
  const progressPercentage = ((pointsStats.totalPoints % 1000) / 1000) * 100;

  return (
    <Card 
      className={cn(
        "relative overflow-hidden transition-all duration-300 group bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-800",
        className
      )}
    >
        {/* Background gradient animation */}
        <div className="absolute inset-0 bg-gradient-to-r from-amber-400/5 to-orange-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        {/* Sparkle effects */}
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <Sparkles className="h-5 w-5 text-amber-500 animate-pulse" />
        </div>

        <CardHeader className="relative pb-2 p-4 sm:p-6">
          <div className="flex items-center gap-2">
            <div className="p-1.5 sm:p-2 bg-amber-500/10 rounded-full">
              <Coins className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <CardTitle className="text-base sm:text-lg font-bold text-amber-900 dark:text-amber-100">
              Seus Pontos
            </CardTitle>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0">
          {/* Main points display */}
          <div className="text-center space-y-1 sm:space-y-2">
            <div className="text-3xl sm:text-4xl font-bold text-amber-900 dark:text-amber-100 animate-fade-in">
              {pointsStats.totalPoints.toLocaleString('pt-BR')}
            </div>
            <p className="text-sm sm:text-base text-amber-700 dark:text-amber-300 font-medium">
              Continue participando para ganhar mais recompensas!
            </p>
          </div>

          {/* Progress section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-amber-800 dark:text-amber-200 font-medium">
                Próximo nível
              </span>
              <span className="text-amber-600 dark:text-amber-400 font-bold">
                {(pointsStats.level + 1) * 1000} pontos
              </span>
            </div>
            
            <div className="space-y-2">
              <Progress 
                value={progressPercentage} 
                className="h-3 bg-amber-100 dark:bg-amber-900/50" 
              />
              <p className="text-xs text-amber-700 dark:text-amber-300 text-center">
                Faltam {pointsToNext.toLocaleString('pt-BR')} pontos para o próximo nível
              </p>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div className="bg-white/50 dark:bg-amber-950/30 rounded-lg p-2 sm:p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-amber-600" />
                <span className="text-[10px] sm:text-xs font-medium text-amber-800 dark:text-amber-200">
                  Este Mês
                </span>
              </div>
              <div className="text-base sm:text-lg font-bold text-amber-900 dark:text-amber-100">
                {pointsStats.earnedThisMonth}
              </div>
            </div>
            
            <div className="bg-white/50 dark:bg-amber-950/30 rounded-lg p-2 sm:p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Target className="h-3 w-3 sm:h-4 sm:w-4 text-amber-600" />
                <span className="text-[10px] sm:text-xs font-medium text-amber-800 dark:text-amber-200">
                  Check-ins
                </span>
              </div>
              <div className="text-base sm:text-lg font-bold text-amber-900 dark:text-amber-100">
                {pointsStats.totalCheckins}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
  );
};