import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePoints } from '@/hooks/usePoints';
import { 
  Target, MapPin, Share2, Star, Eye, Heart, 
  CheckCircle2, Clock, Flame, Gift, Zap 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface Mission {
  key: string;
  title: string;
  description: string;
  points: number;
  icon: React.ReactNode;
  action: string; // route to navigate or action to take
  checkFn?: () => Promise<boolean>; // check if naturally completed
}

const DAILY_MISSIONS: Mission[] = [
  {
    key: 'view_3_offers',
    title: 'Explorador',
    description: 'Visualize 3 ofertas diferentes',
    points: 50,
    icon: <Eye className="w-4 h-4" />,
    action: '/ofertas'
  },
  {
    key: 'visit_map',
    title: 'Navegador',
    description: 'Explore o mapa de ofertas',
    points: 30,
    icon: <MapPin className="w-4 h-4" />,
    action: '/mapa'
  },
  {
    key: 'favorite_offer',
    title: 'Colecionador',
    description: 'Favorite uma oferta',
    points: 40,
    icon: <Heart className="w-4 h-4" />,
    action: '/ofertas'
  },
  {
    key: 'share_offer',
    title: 'Divulgador',
    description: 'Compartilhe uma oferta com amigos',
    points: 60,
    icon: <Share2 className="w-4 h-4" />,
    action: '/ofertas'
  },
  {
    key: 'visit_community',
    title: 'Social',
    description: 'Visite e interaja na comunidade (publique, curta, comente ou compartilhe)',
    points: 20,
    icon: <Star className="w-4 h-4" />,
    action: '/comunidade'
  }
];

export const DailyMissionsCard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const today = new Date().toISOString().split('T')[0];

  const { data: completedMissions = [] } = useQuery({
    queryKey: ['daily-missions', user?.id, today],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('daily_mission_completions')
        .select('mission_key')
        .eq('user_id', user.id)
        .eq('mission_date', today);
      return data?.map(d => d.mission_key) || [];
    },
    enabled: !!user?.id,
    staleTime: 30000
  });

  if (!user) return null;

  const completedCount = completedMissions.length;
  const totalMissions = DAILY_MISSIONS.length;
  const progress = (completedCount / totalMissions) * 100;
  const totalPointsAvailable = DAILY_MISSIONS.reduce((s, m) => s + m.points, 0);
  const pointsEarned = DAILY_MISSIONS.filter(m => completedMissions.includes(m.key))
    .reduce((s, m) => s + m.points, 0);

  // Calculate time until reset (midnight)
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const hoursLeft = Math.floor((midnight.getTime() - now.getTime()) / (1000 * 60 * 60));
  const minutesLeft = Math.floor(((midnight.getTime() - now.getTime()) % (1000 * 60 * 60)) / (1000 * 60));

  return (
    <section className="py-4">
      <div className="container mx-auto px-3 sm:px-4">
        <Card className="border-2 border-primary/10 overflow-hidden">
          {/* Header */}
          <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-accent/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg flex items-center justify-center">
                  <Flame className="w-4 h-4 text-white" />
                </div>
                <div>
                  <CardTitle className="text-base sm:text-lg">Missões do Dia</CardTitle>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {hoursLeft}h {minutesLeft}min restantes
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="bg-primary/10 text-primary font-bold">
                <Zap className="w-3 h-3 mr-1" />
                {pointsEarned}/{totalPointsAvailable} pts
              </Badge>
            </div>
            <Progress value={progress} className="h-2 mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {completedCount}/{totalMissions} missões completas
              {completedCount === totalMissions && (
                <span className="text-primary font-bold ml-2">🎉 Todas completas!</span>
              )}
            </p>
          </CardHeader>

          {/* Missions List */}
          <CardContent className="p-3 sm:p-4 space-y-2">
            {DAILY_MISSIONS.map((mission) => {
              const isCompleted = completedMissions.includes(mission.key);
              
              return (
                <div
                  key={mission.key}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-200 cursor-pointer ${
                    isCompleted
                      ? 'bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800'
                      : 'bg-muted/30 hover:bg-muted/50 border border-transparent hover:border-primary/20'
                  }`}
                  onClick={() => !isCompleted && navigate(mission.action)}
                >
                  {/* Icon */}
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isCompleted
                      ? 'bg-green-500 text-white'
                      : 'bg-primary/10 text-primary'
                  }`}>
                    {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : mission.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-medium ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                        {mission.title}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">{mission.description}</p>
                  </div>

                  {/* Points */}
                  <Badge
                    variant={isCompleted ? 'default' : 'outline'}
                    className={`flex-shrink-0 ${
                      isCompleted
                        ? 'bg-green-500 text-white border-green-500'
                        : 'text-primary border-primary/30'
                    }`}
                  >
                    {isCompleted ? '✓' : `+${mission.points}`}
                  </Badge>
                </div>
              );
            })}

            {/* Bonus for completing all */}
            {completedCount === totalMissions && (
              <div className="mt-3 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-950/30 rounded-xl border border-yellow-200 dark:border-yellow-800 text-center">
                <div className="flex items-center justify-center gap-2">
                  <Gift className="w-5 h-5 text-yellow-600" />
                  <span className="font-bold text-yellow-700 dark:text-yellow-400">
                    🎉 Bônus diário conquistado!
                  </span>
                </div>
                <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-1">
                  Volte amanhã para novas missões
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
};
