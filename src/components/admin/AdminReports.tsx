import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { TrendingUp, Users, Building2, Gift, Ticket, Download, Calendar, BarChart3, PieChart } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Cell, BarChart, Bar, Pie } from 'recharts';
import { toast } from 'sonner';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1'];

export const AdminReports = () => {
  const [period, setPeriod] = useState('30');

  const { data: generalStats, isLoading: isLoadingGeneral } = useQuery({
    queryKey: ['admin-general-stats'],
    queryFn: async () => {
      const [users, businesses, offers, raffles, checkins] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('businesses').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('offers').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('raffles').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('offer_checkins').select('*', { count: 'exact', head: true })
      ]);

      return {
        totalUsers: users.count || 0,
        totalBusinesses: businesses.count || 0,
        totalOffers: offers.count || 0,
        totalRaffles: raffles.count || 0,
        totalCheckins: checkins.count || 0
      };
    },
  });

  const { data: timelineData, isLoading: isLoadingTimeline } = useQuery({
    queryKey: ['admin-timeline-data', period],
    queryFn: async () => {
      const days = parseInt(period);
      const startDate = subDays(new Date(), days);
      
      // Get daily user signups
      const { data: signups } = await supabase
        .from('profiles')
        .select('created_at')
        .gte('created_at', startDate.toISOString());

      // Get daily checkins
      const { data: checkins } = await supabase
        .from('offer_checkins')
        .select('created_at')
        .gte('created_at', startDate.toISOString());

      // Process data by day
      const dailyData = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const dateStr = format(date, 'yyyy-MM-dd');
        
        const signupsCount = signups?.filter(s => 
          format(new Date(s.created_at), 'yyyy-MM-dd') === dateStr
        ).length || 0;
        
        const checkinsCount = checkins?.filter(c => 
          format(new Date(c.created_at), 'yyyy-MM-dd') === dateStr
        ).length || 0;

        dailyData.push({
          date: format(date, 'dd/MM'),
          signups: signupsCount,
          checkins: checkinsCount
        });
      }

      return dailyData;
    },
  });

  const { data: categoryData, isLoading: isLoadingCategories } = useQuery({
    queryKey: ['admin-category-data'],
    queryFn: async () => {
      const { data: offers } = await supabase
        .from('offers')
        .select('category')
        .eq('is_active', true);

      const categoryCount = offers?.reduce((acc, offer) => {
        acc[offer.category] = (acc[offer.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      return Object.entries(categoryCount).map(([name, value]) => ({
        name,
        value
      }));
    },
  });

  const { data: businessGrowth, isLoading: isLoadingGrowth } = useQuery({
    queryKey: ['admin-business-growth'],
    queryFn: async () => {
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const start = startOfMonth(date);
        const end = endOfMonth(date);

        const { count } = await supabase
          .from('businesses')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString());

        months.push({
          month: format(date, 'MMM', { locale: ptBR }),
          businesses: count || 0
        });
      }
      return months;
    },
  });

  const downloadCSV = (filename: string, headers: string[], rows: string[][]) => {
    const bom = '\uFEFF';
    const csv = bom + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportUsers = async () => {
    toast.info('Exportando usuários...');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL || 'https://wogenchxhjipmhfojker.supabase.co'}/functions/v1/admin-export-users`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvZ2VuY2h4aGppcG1oZm9qa2VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0NzE4NjcsImV4cCI6MjA2NzA0Nzg2N30.sAqsfjAnYFK4sUNWRpKoPC0pkog5kEUS8SEeTV5g_oU',
        },
      });
      if (!res.ok) throw new Error('Erro na requisição');
      const users = await res.json();
      const headers = ['Nome', 'E-mail', 'Telefone'];
      const rows = users.map((u: any) => [u.full_name || '', u.email || '', u.phone || '']);
      downloadCSV('usuarios_ofertivo.csv', headers, rows);
      toast.success(`${users.length} usuários exportados!`);
    } catch (err) {
      toast.error('Erro ao exportar usuários');
    }
  };

  const exportBusinesses = async () => {
    toast.info('Exportando anunciantes...');
    const { data, error } = await supabase
      .from('businesses')
      .select('name, email, phone, whatsapp, category, address, is_active')
      .order('created_at', { ascending: false });
    if (error || !data) { toast.error('Erro ao exportar'); return; }

    const headers = ['Nome', 'E-mail', 'Telefone', 'WhatsApp', 'Categoria', 'Endereço', 'Ativo'];
    const rows = data.map(b => [
      b.name || '', b.email || '', b.phone || '', b.whatsapp || '',
      b.category || '', b.address || '', b.is_active ? 'Sim' : 'Não'
    ]);
    downloadCSV('anunciantes_ofertivo.csv', headers, rows);
    toast.success(`${data.length} anunciantes exportados!`);
  };

  if (isLoadingGeneral) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Carregando relatórios...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Relatórios e Analytics
            </CardTitle>
            <CardDescription>
              Relatórios detalhados e análises da plataforma
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
              </SelectContent>
            </Select>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportUsers}>
                  <Users className="h-4 w-4 mr-2" />
                  Usuários (CSV)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportBusinesses}>
                  <Building2 className="h-4 w-4 mr-2" />
                  Anunciantes (CSV)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          {/* Overview Cards */}
          <div className="grid gap-4 md:grid-cols-5 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-blue-500" />
                  <h3 className="text-sm font-medium text-muted-foreground">Usuários</h3>
                </div>
                <p className="text-2xl font-bold text-blue-500">{generalStats?.totalUsers}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Building2 className="h-4 w-4 text-green-500" />
                  <h3 className="text-sm font-medium text-muted-foreground">Negócios</h3>
                </div>
                <p className="text-2xl font-bold text-green-500">{generalStats?.totalBusinesses}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Gift className="h-4 w-4 text-purple-500" />
                  <h3 className="text-sm font-medium text-muted-foreground">Ofertas</h3>
                </div>
                <p className="text-2xl font-bold text-purple-500">{generalStats?.totalOffers}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Ticket className="h-4 w-4 text-yellow-500" />
                  <h3 className="text-sm font-medium text-muted-foreground">Sorteios</h3>
                </div>
                <p className="text-2xl font-bold text-yellow-500">{generalStats?.totalRaffles}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-red-500" />
                  <h3 className="text-sm font-medium text-muted-foreground">Check-ins</h3>
                </div>
                <p className="text-2xl font-bold text-red-500">{generalStats?.totalCheckins}</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="timeline" className="space-y-4">
            <TabsList>
              <TabsTrigger value="timeline">Timeline de Atividade</TabsTrigger>
              <TabsTrigger value="categories">Categorias de Ofertas</TabsTrigger>
              <TabsTrigger value="growth">Crescimento de Negócios</TabsTrigger>
            </TabsList>

            <TabsContent value="timeline" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Atividade Diária
                  </CardTitle>
                  <CardDescription>
                    Novos cadastros e check-ins por dia
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingTimeline ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">Carregando dados...</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart data={timelineData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Line 
                          type="monotone" 
                          dataKey="signups" 
                          stroke="#8884d8" 
                          strokeWidth={2}
                          name="Cadastros"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="checkins" 
                          stroke="#82ca9d" 
                          strokeWidth={2}
                          name="Check-ins"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="categories" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Distribuição por Categorias
                  </CardTitle>
                  <CardDescription>
                    Ofertas ativas por categoria
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingCategories ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">Carregando dados...</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={400}>
                      <RechartsPieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {categoryData?.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="growth" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Crescimento Mensal de Negócios
                  </CardTitle>
                  <CardDescription>
                    Novos negócios cadastrados por mês
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingGrowth ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">Carregando dados...</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={businessGrowth}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="businesses" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};