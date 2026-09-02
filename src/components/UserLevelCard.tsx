import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useUserLevel } from '@/hooks/useUserLevel';
import { usePoints } from '@/hooks/usePoints';
import { useAuth } from '@/hooks/useAuth';
import { Sparkles, ChevronRight } from 'lucide-react';
import { AchievementsDialog } from '@/components/AchievementsDialog';

export const UserLevelCard = () => {
  const { user } = useAuth();
  const userLevel = useUserLevel();
  const { pointsStats } = usePoints();
  const [showAchievements, setShowAchievements] = useState(false);

  return (
    <>
      <Card 
        className="overflow-hidden cursor-pointer hover:shadow-lg transition-all border-0"
        onClick={() => setShowAchievements(true)}
      >
        <div className={`bg-gradient-to-r ${userLevel.color} p-4 sm:p-5`}>
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <span className="text-3xl sm:text-4xl">{userLevel.emoji}</span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium opacity-80">Nível {userLevel.level}</span>
                  <Sparkles className="w-3 h-3 opacity-80" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold leading-tight">{userLevel.title}</h3>
              </div>
            </div>
            <div className="text-right flex items-center gap-1">
              <div>
                <p className="text-2xl sm:text-3xl font-bold">{pointsStats.totalPoints.toLocaleString('pt-BR')}</p>
                <p className="text-xs opacity-80">pontos</p>
              </div>
              <ChevronRight className="w-5 h-5 opacity-60" />
            </div>
          </div>
        </div>
        <CardContent className="p-3 sm:p-4">
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progresso para o próximo nível</span>
              {userLevel.pointsToNext > 0 ? (
                <span className="font-medium text-foreground">
                  Faltam {userLevel.pointsToNext.toLocaleString('pt-BR')} pts
                </span>
              ) : (
                <span className="font-medium text-primary">Nível máximo! 🎉</span>
              )}
            </div>
            <Progress value={userLevel.progress} className="h-2.5" />
          </div>
        </CardContent>
      </Card>

      <AchievementsDialog
        open={showAchievements}
        onOpenChange={setShowAchievements}
        userId={user?.id}
      />
    </>
  );
};
