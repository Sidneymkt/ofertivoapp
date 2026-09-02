import React, { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Building2, 
  Gift, 
  DollarSign, 
  TrendingUp, 
  CheckCircle,
  AlertTriangle,
  Eye,
  Star,
  Target,
  Heart,
  Sparkles
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

export const AdminKPIDashboard = () => {
  const queryClient = useQueryClient();

  // Sincronização em tempo real com Supabase
  useEffect(() => {
    const channel = supabase
      .channel('admin-dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin-kpis'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'businesses' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin-kpis'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'offers' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin-kpis'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'offer_checkins' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin-kpis'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const { data: kpis, isLoading } = useQuery({
    queryKey: ['admin-kpis'],
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      // Fetch multiple KPIs in parallel
      const [
        { count: totalUsers },
        { count: totalBusinesses },  
        { count: totalOffers },
        { count: totalCheckins },
        { data: recentUsers },
        { data: topCategories },
        { data: weeklyStats },
        { data: crowdfundingCampaigns },
        { data: raffles }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('businesses').select('*', { count: 'exact', head: true }),
        supabase.from('offers').select('*', { count: 'exact', head: true }),
        supabase.from('offer_checkins').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('created_at').order('created_at', { ascending: false }).limit(7),
        supabase.from('offers').select('category').limit(100),
        supabase.from('offer_checkins').select('created_at').order('created_at', { ascending: false }).limit(30),
        supabase.from('crowdfunding_campaigns').select('*, contributions:campaign_contributions(amount)').eq('is_active', true),
        supabase.from('raffles').select('*, entries:raffle_entries(id)').eq('is_active', true)
      ]);

      // Process weekly statistics
      const weeklyData = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayName = date.toLocaleDateString('pt-BR', { weekday: 'short' });
        const checkinsForDay = weeklyStats?.filter(stat => {
          const statDate = new Date(stat.created_at);
          return statDate.toDateString() === date.toDateString();
        }).length || 0;
        
        return {
          day: dayName,
          checkins: checkinsForDay,
          date: date.toISOString().split('T')[0]
        };
      }).reverse();

      // Process category data
      const categoryCount = topCategories?.reduce((acc: any, offer: any) => {
        acc[offer.category] = (acc[offer.category] || 0) + 1;
        return acc;
      }, {}) || {};

      const categoryData = Object.entries(categoryCount).map(([name, value]) => ({
        name, 
        value: value as number
      })).slice(0, 5);

      // Calculate growth rate
      const thisWeekUsers = recentUsers?.filter(user => {
        const userDate = new Date(user.created_at);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return userDate >= weekAgo;
      }).length || 0;

      // Crowdfunding stats
      const activeCrowdfunding = crowdfundingCampaigns?.length || 0;
      const totalCrowdfundingPoints = crowdfundingCampaigns?.reduce((sum, c) => sum + (c.current_points || 0), 0) || 0;
      const totalContributions = crowdfundingCampaigns?.reduce((sum, c) => sum + (c.contributions?.length || 0), 0) || 0;

      // Raffle stats
      const activeRaffles = raffles?.length || 0;
      const totalRaffleEntries = raffles?.reduce((sum, r) => sum + (r.entries?.length || 0), 0) || 0;
      const completedRaffles = raffles?.filter(r => r.winner_id)?.length || 0;

      return {
        totalUsers: totalUsers || 0,
        totalBusinesses: totalBusinesses || 0,
        totalOffers: totalOffers || 0,
        totalCheckins: totalCheckins || 0,
        weeklyGrowth: thisWeekUsers,
        weeklyData,
        categoryData,
        crowdfunding: {
          active: activeCrowdfunding,
          totalPoints: totalCrowdfundingPoints,
          totalContributions
        },
        raffles: {
          active: activeRaffles,
          totalEntries: totalRaffleEntries,
          completed: completedRaffles
        }
      };
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const colors = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))', 'hsl(var(--destructive))'];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-1/2"></div>
              <div className="h-8 bg-muted rounded w-3/4"></div>
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Cards - Design atualizado seguindo referência */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="relative overflow-hidden border-2 border-green-500/30 bg-gradient-to-br from-green-500/10 via-background to-background">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-green-500"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Usuários Ativos</CardTitle>
            <Users className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{kpis?.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-green-500">+{kpis?.weeklyGrowth}</span> esta semana
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-2 border-blue-500/30 bg-gradient-to-br from-blue-500/10 via-background to-background">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Negócios Ativos</CardTitle>
            <Building2 className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{kpis?.totalBusinesses.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <CheckCircle className="inline h-3 w-3 text-blue-500 mr-1" />
              Todos verificados
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-2 border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 via-background to-background">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-yellow-500"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ofertas Criadas</CardTitle>
            <Gift className="h-5 w-5 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{kpis?.totalOffers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <Eye className="inline h-3 w-3 text-yellow-500 mr-1" />
              Múltiplas categorias
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-2 border-green-400/30 bg-gradient-to-br from-green-400/10 via-background to-background">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-green-400"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Check-ins Realizados</CardTitle>
            <Target className="h-5 w-5 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{kpis?.totalCheckins.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <Star className="inline h-3 w-3 text-yellow-500 mr-1" />
              Alta conversão
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-2 border-pink-500/30 bg-gradient-to-br from-pink-500/10 via-background to-background">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-pink-500"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vaquinhas Ativas</CardTitle>
            <Heart className="h-5 w-5 text-pink-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{kpis?.crowdfunding.active.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <TrendingUp className="inline h-3 w-3 text-pink-500 mr-1" />
              {kpis?.crowdfunding.totalContributions} contribuições
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-2 border-purple-500/30 bg-gradient-to-br from-purple-500/10 via-background to-background">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-purple-500"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sorteios Ativos</CardTitle>
            <Sparkles className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{kpis?.raffles.active.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <Eye className="inline h-3 w-3 text-purple-500 mr-1" />
              {kpis?.raffles.totalEntries} participações
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts - Design melhorado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Atividade Semanal</CardTitle>
            <CardDescription className="text-sm">Check-ins realizados nos últimos 7 dias</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={kpis?.weeklyData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis 
                  dataKey="day" 
                  fontSize={12}
                  stroke="hsl(var(--muted-foreground))"
                  tickLine={false}
                />
                <YAxis 
                  fontSize={12}
                  stroke="hsl(var(--muted-foreground))"
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '13px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="checkins" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  dot={{ fill: '#10b981', strokeWidth: 2, r: 5 }}
                  activeDot={{ r: 7, stroke: '#10b981', strokeWidth: 2, fill: '#fff' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Top Categorias</CardTitle>
            <CardDescription className="text-sm">Ofertas mais populares por categoria</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={kpis?.categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={{
                    stroke: 'hsl(var(--muted-foreground))',
                    strokeWidth: 1
                  }}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={90}
                  fill="#8884d8"
                  dataKey="value"
                  fontSize={12}
                  fontWeight={500}
                >
                  {kpis?.categoryData?.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]}
                      stroke="hsl(var(--background))"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '13px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* System Status - Removido para ficar mais limpo como na referência */}
    </div>
  );
};