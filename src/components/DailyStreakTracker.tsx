import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Flame, Calendar, Gift, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export const DailyStreakTracker = () => {
  const { user } = useAuth();

  const { data: streakData } = useQuery({
    queryKey: ['daily-streak', user?.id],
    queryFn: async () => {
      if (!user?.id) return { currentStreak: 0, longestStreak: 0, todayActive: false, weekDays: [] };

      // Get recent daily mission completions to calculate streak
      const { data: completions } = await supabase
        .from('daily_mission_completions')
        .select('mission_date')
        .eq('user_id', user.id)
        .order('mission_date', { ascending: false })
        .limit(90);

      if (!completions || completions.length === 0) {
        return { currentStreak: 0, longestStreak: 0, todayActive: false, weekDays: generateWeekDays([]) };
      }

      // Get unique dates
      const uniqueDates = [...new Set(completions.map(c => c.mission_date))].sort().reverse();
      
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      
      const todayActive = uniqueDates.includes(today);
      
      // Calculate current streak
      let currentStreak = 0;
      let checkDate = todayActive ? today : yesterday;
      
      for (const date of uniqueDates) {
        if (date === checkDate) {
          currentStreak++;
          const d = new Date(checkDate);
          d.setDate(d.getDate() - 1);
          checkDate = d.toISOString().split('T')[0];
        } else if (date < checkDate) {
          break;
        }
      }

      // If streak didn't start from today or yesterday, it's broken
      if (!todayActive && !uniqueDates.includes(yesterday)) {
        currentStreak = 0;
      }

      // Calculate longest streak
      let longestStreak = 0;
      let tempStreak = 1;
      const sortedDates = [...uniqueDates].sort();
      
      for (let i = 1; i < sortedDates.length; i++) {
        const prev = new Date(sortedDates[i - 1]);
        const curr = new Date(sortedDates[i]);
        const diffDays = (curr.getTime() - prev.getTime()) / 86400000;
        
        if (diffDays === 1) {
          tempStreak++;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      }
      longestStreak = Math.max(longestStreak, tempStreak);

      return {
        currentStreak,
        longestStreak,
        todayActive,
        weekDays: generateWeekDays(uniqueDates),
      };
    },
    enabled: !!user?.id,
    staleTime: 60000,
  });

  if (!user || !streakData) return null;

  const { currentStreak, longestStreak, todayActive, weekDays } = streakData;

  // Bonus info
  const nextBonus = currentStreak < 3 ? 3 : currentStreak < 7 ? 7 : currentStreak < 14 ? 14 : 30;
  const bonusPoints = nextBonus === 3 ? 50 : nextBonus === 7 ? 150 : nextBonus === 14 ? 400 : 1000;

  return (
    <Card className="overflow-hidden border-0 shadow-card">
      <CardContent className="p-0">
        {/* Header */}
        <div className={cn(
          'px-4 py-3 sm:px-5 sm:py-4 flex items-center justify-between',
          currentStreak >= 7
            ? 'bg-gradient-to-r from-destructive to-destructive/80'
            : currentStreak >= 3
            ? 'bg-gradient-to-r from-accent to-accent/80'
            : 'bg-gradient-to-r from-muted to-muted/80'
        )}>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className={cn(
              'text-2xl sm:text-3xl',
              currentStreak >= 3 && 'animate-pulse'
            )}>
              {currentStreak >= 7 ? '🔥' : currentStreak >= 3 ? '🔥' : '💤'}
            </div>
            <div>
              <h3 className={cn(
                'font-bold text-sm sm:text-base',
                currentStreak >= 3 ? 'text-white' : 'text-foreground'
              )}>
                {currentStreak > 0 ? `${currentStreak} dias seguidos!` : 'Comece sua sequência!'}
              </h3>
              <p className={cn(
                'text-xs',
                currentStreak >= 3 ? 'text-white/80' : 'text-muted-foreground'
              )}>
                Recorde: {longestStreak} {longestStreak === 1 ? 'dia' : 'dias'}
              </p>
            </div>
          </div>
          
          {currentStreak > 0 && (
            <div className={cn(
              'text-right',
              currentStreak >= 3 ? 'text-white' : 'text-foreground'
            )}>
              <div className="text-xl sm:text-2xl font-bold">{currentStreak}</div>
              <div className="text-[10px] sm:text-xs opacity-80">streak</div>
            </div>
          )}
        </div>

        {/* Week Days Visual */}
        <div className="px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex justify-between gap-1 sm:gap-2 mb-3">
            {weekDays.map((day, i) => (
              <div key={i} className="flex flex-col items-center gap-1 flex-1">
                <span className="text-[10px] sm:text-xs text-muted-foreground">{day.label}</span>
                <div className={cn(
                  'w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium transition-all',
                  day.isToday && !day.active && 'border-2 border-dashed border-primary',
                  day.active && 'bg-gradient-to-br from-accent to-destructive text-white shadow-sm',
                  !day.active && !day.isToday && 'bg-muted text-muted-foreground',
                  day.isFuture && 'opacity-40'
                )}>
                  {day.active ? '🔥' : day.dayNum}
                </div>
              </div>
            ))}
          </div>

          {/* Next Bonus */}
          <div className="flex items-center gap-2 p-2 sm:p-3 rounded-lg bg-accent/10 border border-accent/20">
            <Gift className="w-4 h-4 text-accent shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-foreground">
                Bônus em {nextBonus - currentStreak} {nextBonus - currentStreak === 1 ? 'dia' : 'dias'}
              </p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                +{bonusPoints} pontos extras ao completar {nextBonus} dias
              </p>
            </div>
            <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-accent shrink-0" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

function generateWeekDays(activeDates: string[]) {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - dayOfWeek);

  const labels = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
  
  return labels.map((label, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const isToday = dateStr === today.toISOString().split('T')[0];
    const isFuture = d > today && !isToday;
    
    return {
      label,
      dayNum: d.getDate(),
      active: activeDates.includes(dateStr),
      isToday,
      isFuture,
    };
  });
}
