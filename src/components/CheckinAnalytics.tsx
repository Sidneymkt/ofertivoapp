import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, 
  Users, 
  Clock, 
  TrendingUp, 
  Calendar,
  Trophy,
  Target
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CheckinAnalyticsProps {
  businessId: string;
  offerId?: string;
  className?: string;
}

interface CheckinStat {
  total_checkins: number;
  unique_users: number;
  total_points_awarded: number;
  peak_hour: number;
  avg_daily_checkins: number;
  today_checkins: number;
  week_checkins: number;
}

interface HourlyData {
  hour: number;
  checkins: number;
}

const CheckinAnalytics: React.FC<CheckinAnalyticsProps> = ({
  businessId,
  offerId,
  className = ''
}) => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['checkin-analytics', businessId, offerId],
    queryFn: async () => {
      // Get overall statistics
      const { data: statsData, error: statsError } = await supabase
        .from('checkin_validations')
        .select('*')
        .eq('business_id', businessId)
        .eq(offerId ? 'offer_id' : 'business_id', offerId || businessId);

      if (statsError) throw statsError;

      const now = new Date();
      const today = startOfDay(now);
      const weekAgo = subDays(today, 7);

      // Calculate stats
      const totalCheckins = statsData.length;
      const uniqueUsers = new Set(statsData.map(s => s.user_id)).size;
      const totalPointsAwarded = statsData.reduce((sum, s) => sum + (s.points_awarded || 0), 0);
      
      const todayCheckins = statsData.filter(s => 
        new Date(s.created_at) >= today && new Date(s.created_at) <= endOfDay(now)
      ).length;
      
      const weekCheckins = statsData.filter(s => 
        new Date(s.created_at) >= weekAgo
      ).length;

      // Calculate peak hour
      const hourCounts: { [key: number]: number } = {};
      statsData.forEach(s => {
        const hour = new Date(s.created_at).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      });
      
      const peakHour = Object.keys(hourCounts).reduce((a, b) => 
        hourCounts[Number(a)] > hourCounts[Number(b)] ? a : b, '12'
      );

      const avgDailyCheckins = totalCheckins > 0 ? Math.round(totalCheckins / 7) : 0;

      return {
        total_checkins: totalCheckins,
        unique_users: uniqueUsers,
        total_points_awarded: totalPointsAwarded,
        peak_hour: Number(peakHour),
        avg_daily_checkins: avgDailyCheckins,
        today_checkins: todayCheckins,
        week_checkins: weekCheckins
      } as CheckinStat;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: hourlyData } = useQuery({
    queryKey: ['checkin-hourly', businessId, offerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checkin_validations')
        .select('created_at')
        .eq('business_id', businessId)
        .eq(offerId ? 'offer_id' : 'business_id', offerId || businessId)
        .gte('created_at', subDays(new Date(), 1).toISOString());

      if (error) throw error;

      const hourCounts: { [key: number]: number } = {};
      for (let i = 0; i < 24; i++) {
        hourCounts[i] = 0;
      }

      data.forEach(item => {
        const hour = new Date(item.created_at).getHours();
        hourCounts[hour]++;
      });

      return Object.keys(hourCounts).map(hour => ({
        hour: Number(hour),
        checkins: hourCounts[Number(hour)]
      }));
    },
    enabled: !!stats,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Analytics de Check-in</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 bg-muted rounded"></div>
              ))}
            </div>
            <div className="h-40 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Analytics de Check-in</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <MapPin className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-semibold mb-2">Nenhum check-in ainda</h3>
            <p className="text-muted-foreground">
              Quando clientes fizerem check-in em suas ofertas, as estatísticas aparecerão aqui.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatHour = (hour: number) => {
    return `${hour.toString().padStart(2, '0')}:00`;
  };

  const getEngagementLevel = () => {
    if (stats.today_checkins >= 10) return { label: 'Alto', color: 'green' };
    if (stats.today_checkins >= 5) return { label: 'Médio', color: 'yellow' };
    if (stats.today_checkins >= 1) return { label: 'Baixo', color: 'blue' };
    return { label: 'Nenhum', color: 'gray' };
  };

  const engagement = getEngagementLevel();

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Overview Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Resumo de Check-ins
            {offerId && <Badge variant="secondary">Oferta Específica</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">{stats.total_checkins}</div>
              <div className="text-sm text-muted-foreground">Total Check-ins</div>
            </div>
            
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats.unique_users}</div>
              <div className="text-sm text-muted-foreground">Clientes Únicos</div>
            </div>
            
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.total_points_awarded}</div>
              <div className="text-sm text-muted-foreground">Pontos Concedidos</div>
            </div>
            
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{stats.today_checkins}</div>
              <div className="text-sm text-muted-foreground">Hoje</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Engagement Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Engajamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Nível de atividade hoje:</span>
              <Badge variant={engagement.color === 'green' ? 'default' : 'secondary'}>
                {engagement.label}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span>Check-ins esta semana:</span>
              <span className="font-semibold">{stats.week_checkins}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span>Média diária (7 dias):</span>
              <span className="font-semibold">{stats.avg_daily_checkins}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Horário de pico:
              </span>
              <span className="font-semibold">{formatHour(stats.peak_hour)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Performance Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Taxa de retorno:</span>
              <span className="font-semibold">
                {stats.total_checkins > 0 
                  ? `${Math.round((stats.total_checkins / stats.unique_users) * 100)}%`
                  : '0%'
                }
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span>Pontos por check-in:</span>
              <span className="font-semibold">
                {stats.total_checkins > 0 
                  ? Math.round(stats.total_points_awarded / stats.total_checkins)
                  : 0
                }
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span>Conversão semanal:</span>
              <Badge variant="outline">
                {stats.week_checkins > stats.avg_daily_checkins * 7 ? '↗️' : '↘️'} 
                {stats.week_checkins > 0 ? '+' : ''}{stats.week_checkins - (stats.avg_daily_checkins * 7)}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hourly Distribution */}
      {hourlyData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Distribuição por Horário (Últimas 24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-12 gap-1">
              {hourlyData.map((data) => (
                <div key={data.hour} className="text-center">
                  <div 
                    className="bg-primary/20 rounded mb-1 transition-all hover:bg-primary/40"
                    style={{ 
                      height: `${Math.max(8, (data.checkins / Math.max(...hourlyData.map(d => d.checkins))) * 60)}px` 
                    }}
                    title={`${formatHour(data.hour)}: ${data.checkins} check-ins`}
                  />
                  <div className="text-xs text-muted-foreground">
                    {data.hour.toString().padStart(2, '0')}h
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center mt-4 text-sm text-muted-foreground">
              Passe o mouse sobre as barras para ver detalhes
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CheckinAnalytics;