
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface CheckinStats {
  total_checkins: number;
  unique_users: number;
  peak_hour: number;
  offers_with_checkins: number;
}

const CheckinAnalytics: React.FC = () => {
  const { user } = useAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['checkin-analytics', user?.id],
    queryFn: async () => {
      if (!user) return null;

      // Get business IDs first
      const { data: businessIds, error: businessError } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', user.id);

      if (businessError) throw businessError;

      const businessIdList = businessIds?.map(b => b.id) || [];

      if (businessIdList.length === 0) {
        return {
          total_checkins: 0,
          unique_users: 0,
          peak_hour: 12,
          offers_with_checkins: 0,
        };
      }

      // Buscar estatísticas agregadas de check-ins
      const { data, error } = await supabase
        .from('validation_analytics')
        .select('*')
        .in('business_id', businessIdList)
        .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

      if (error) throw error;

      // Processar dados
      const totalCheckins = data?.reduce((sum, item) => sum + (item.total_validations || 0), 0) || 0;
      const uniqueUsers = data?.reduce((sum, item) => sum + (item.unique_users || 0), 0) || 0;
      const peakHour = data?.length > 0 
        ? Math.round(data.reduce((sum, item) => sum + (item.peak_hour || 12), 0) / data.length)
        : 12;
      const offersWithCheckins = new Set(data?.map(item => item.offer_id).filter(Boolean)).size;

      return {
        total_checkins: totalCheckins,
        unique_users: uniqueUsers,
        peak_hour: peakHour,
        offers_with_checkins: offersWithCheckins,
      } as CheckinStats;
    },
    enabled: !!user,
  });

  const { data: recentCheckins, isLoading: loadingRecent } = useQuery({
    queryKey: ['recent-checkins', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Get business IDs first
      const { data: businessIds, error: businessError } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', user.id);

      if (businessError) throw businessError;

      const businessIdList = businessIds?.map(b => b.id) || [];

      if (businessIdList.length === 0) return [];

      const { data, error } = await supabase
        .from('checkin_validations')
        .select(`
          *,
          offer:offers(title),
          business:businesses(name)
        `)
        .in('business_id', businessIdList)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Carregando Analytics...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Estatísticas Gerais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats?.total_checkins || 0}</div>
            <p className="text-sm text-muted-foreground">Total Check-ins</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats?.unique_users || 0}</div>
            <p className="text-sm text-muted-foreground">Clientes Únicos</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{stats?.peak_hour || 12}h</div>
            <p className="text-sm text-muted-foreground">Horário de Pico</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{stats?.offers_with_checkins || 0}</div>
            <p className="text-sm text-muted-foreground">Ofertas Ativas</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CheckinAnalytics;
