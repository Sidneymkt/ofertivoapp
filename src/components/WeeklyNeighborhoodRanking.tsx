import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, MapPin, Crown, Medal, Flame, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const getStartOfWeek = () => {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
};

const getDaysUntilReset = () => {
  const now = new Date();
  const day = now.getDay();
  const daysLeft = day === 0 ? 0 : 7 - day;
  return daysLeft;
};

interface WeeklyRankingItem {
  userId: string;
  name: string;
  avatar: string | null;
  points: number;
  checkins: number;
  city: string;
}

export const WeeklyNeighborhoodRanking = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedCity, setSelectedCity] = useState<string>('Manaus');

  const weekStart = getStartOfWeek();
  const daysLeft = getDaysUntilReset();

  const { data, isLoading } = useQuery({
    queryKey: ['weekly-neighborhood-ranking', selectedCity, weekStart.toISOString()],
    queryFn: async () => {
      // Get weekly points earned
      const { data: weeklyPoints, error: pointsError } = await supabase
        .from('user_points')
        .select('user_id, points_earned')
        .gte('created_at', weekStart.toISOString());

      if (pointsError) throw pointsError;

      // Aggregate points per user
      const userPoints: Record<string, number> = {};
      (weeklyPoints || []).forEach(p => {
        userPoints[p.user_id] = (userPoints[p.user_id] || 0) + (p.points_earned || 0);
      });

      // Get weekly checkins
      const { data: weeklyCheckins } = await supabase
        .from('offer_checkins')
        .select('user_id')
        .gte('created_at', weekStart.toISOString());

      const userCheckins: Record<string, number> = {};
      (weeklyCheckins || []).forEach(c => {
        userCheckins[c.user_id] = (userCheckins[c.user_id] || 0) + 1;
      });

      // Merge all user IDs
      const allUserIds = [...new Set([
        ...Object.keys(userPoints),
        ...Object.keys(userCheckins)
      ])];

      if (allUserIds.length === 0) return { ranking: [] as WeeklyRankingItem[], userRank: null as number | null };

      // Get profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, city')
        .in('user_id', allUserIds);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

      // Build ranking filtered by city
      const ranking: WeeklyRankingItem[] = allUserIds
        .map(userId => {
          const profile = profileMap.get(userId);
          return {
            userId,
            name: profile?.full_name || 'Usuário',
            avatar: profile?.avatar_url || null,
            points: userPoints[userId] || 0,
            checkins: userCheckins[userId] || 0,
            city: profile?.city || 'Manaus',
          };
        })
        .filter(item => item.city === selectedCity || selectedCity === 'Todas')
        .sort((a, b) => b.points - a.points)
        .slice(0, 10);

      // Find current user's rank
      let userRank: number | null = null;
      if (user?.id) {
        const idx = ranking.findIndex(r => r.userId === user.id);
        userRank = idx >= 0 ? idx + 1 : null;
      }

      return { ranking, userRank };
    },
    staleTime: 2 * 60 * 1000,
  });

  const ranking = data?.ranking || [];
  const userRank = data?.userRank;

  const getPositionIcon = (pos: number) => {
    if (pos === 0) return <Crown className="w-4 h-4 text-yellow-500" />;
    if (pos === 1) return <Medal className="w-4 h-4 text-gray-400" />;
    if (pos === 2) return <Medal className="w-4 h-4 text-orange-500" />;
    return <span className="text-xs font-bold text-muted-foreground">{pos + 1}º</span>;
  };

  return (
    <Card className="border-0 shadow-card overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <Flame className="w-4 h-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg">Ranking Semanal</CardTitle>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {selectedCity}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {daysLeft === 0 ? 'Reseta hoje!' : `${daysLeft}d restantes`}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-4">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-6 h-6 rounded-full" />
                <Skeleton className="w-8 h-8 rounded-full" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
        ) : ranking.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Trophy className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhuma atividade esta semana ainda.</p>
            <p className="text-xs">Seja o primeiro no ranking!</p>
          </div>
        ) : (
          <div className="space-y-1">
            {ranking.map((item, idx) => {
              const isCurrentUser = user?.id === item.userId;
              return (
                <div
                  key={item.userId}
                  onClick={() => navigate(`/usuario/${item.userId}`)}
                  className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all hover:bg-accent/10 ${
                    isCurrentUser ? 'bg-primary/5 ring-1 ring-primary/20' : ''
                  } ${idx < 3 ? 'bg-accent/5' : ''}`}
                >
                  <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                    {getPositionIcon(idx)}
                  </div>
                  <Avatar className="w-8 h-8 border border-border flex-shrink-0">
                    <AvatarImage src={item.avatar || undefined} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {item.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {item.name}
                      {isCurrentUser && <span className="text-xs text-primary ml-1">(você)</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">{item.checkins} check-ins</p>
                  </div>
                  <Badge variant="secondary" className="bg-primary/10 text-primary text-xs px-2">
                    {item.points} pts
                  </Badge>
                </div>
              );
            })}
          </div>
        )}

        {userRank === null && user && ranking.length > 0 && (
          <div className="mt-3 p-2 rounded-lg bg-muted/50 text-center">
            <p className="text-xs text-muted-foreground">
              Você ainda não está no ranking. Ganhe pontos para aparecer! 🚀
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
