import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, TrendingUp, Users, Building2, Percent, Calendar, CreditCard } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FinancialData {
  totalRevenue: number;
  monthlyRevenue: number;
  totalCommissions: number;
  pendingCommissions: number;
  paidCommissions: number;
  activeSubscriptions: number;
}

export const AdminFinancialManagement = () => {
  const [period, setPeriod] = useState('month');

  const { data: financialData, isLoading: isLoadingFinancial } = useQuery({
    queryKey: ['admin-financial-data', period],
    queryFn: async (): Promise<FinancialData> => {
      const now = new Date();
      let startDate: Date;
      
      switch (period) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      // Get subscription revenue
      const { data: subscriptions, error: subsError } = await supabase
        .from('business_subscriptions')
        .select(`
          *,
          subscription_plans(price_monthly)
        `)
        .gte('created_at', startDate.toISOString())
        .eq('status', 'active');

      if (subsError) throw subsError;

      const monthlyRevenue = subscriptions?.reduce((total, sub) => {
        return total + (sub.subscription_plans?.price_monthly || 0);
      }, 0) || 0;

      // Get total active subscriptions
      const { count: activeSubscriptions } = await supabase
        .from('business_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Get commission data
      const { data: commissions, error: commError } = await supabase
        .from('referral_commissions')
        .select('*')
        .gte('created_at', startDate.toISOString());

      if (commError) throw commError;

      const totalCommissions = commissions?.reduce((total, comm) => total + Number(comm.commission_amount), 0) || 0;
      const pendingCommissions = commissions?.filter(c => c.status === 'pending').reduce((total, comm) => total + Number(comm.commission_amount), 0) || 0;
      const paidCommissions = commissions?.filter(c => c.status === 'paid').reduce((total, comm) => total + Number(comm.commission_amount), 0) || 0;

      return {
        totalRevenue: monthlyRevenue,
        monthlyRevenue,
        totalCommissions,
        pendingCommissions,
        paidCommissions,
        activeSubscriptions: activeSubscriptions || 0
      };
    },
  });

  const { data: recentCommissions, isLoading: isLoadingCommissions } = useQuery({
    queryKey: ['admin-recent-commissions'],
    queryFn: async () => {
      const { data: commissions, error } = await supabase
        .from('referral_commissions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Get referrer names separately
      const commissionsWithNames = await Promise.all(
        (commissions || []).map(async (commission) => {
          const [referrerData, businessData] = await Promise.all([
            supabase
              .from('profiles')
              .select('full_name')
              .eq('user_id', commission.referrer_id)
              .single(),
            supabase
              .from('businesses')
              .select('name')
              .eq('id', commission.business_id)
              .single()
          ]);

          return {
            ...commission,
            profiles: referrerData.data,
            businesses: businessData.data
          };
        })
      );

      return commissionsWithNames;
    },
  });

  const { data: topEarners, isLoading: isLoadingEarners } = useQuery({
    queryKey: ['admin-top-earners'],
    queryFn: async () => {
      const { data: stats, error } = await supabase
        .from('referral_stats')
        .select('*')
        .order('total_commissions_earned', { ascending: false })
        .limit(5);

      if (error) throw error;

      // Get profile names separately
      const statsWithProfiles = await Promise.all(
        (stats || []).map(async (stat) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('user_id', stat.user_id)
            .single();

          return {
            ...stat,
            profiles: profile
          };
        })
      );

      return statsWithProfiles;
    },
  });

  if (isLoadingFinancial) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Carregando dados financeiros...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Gestão Financeira
            </CardTitle>
            <CardDescription>
              Relatórios de receitas e gestão de comissões
            </CardDescription>
          </div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Última semana</SelectItem>
              <SelectItem value="month">Este mês</SelectItem>
              <SelectItem value="year">Este ano</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-medium text-muted-foreground">Receita Total</h3>
                </div>
                <p className="text-2xl font-bold text-primary">
                  R$ {financialData?.totalRevenue.toFixed(2) || '0,00'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-blue-500" />
                  <h3 className="text-sm font-medium text-muted-foreground">Assinaturas Ativas</h3>
                </div>
                <p className="text-2xl font-bold text-blue-500">
                  {financialData?.activeSubscriptions || 0}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Percent className="h-4 w-4 text-yellow-500" />
                  <h3 className="text-sm font-medium text-muted-foreground">Comissões Pendentes</h3>
                </div>
                <p className="text-2xl font-bold text-yellow-500">
                  R$ {financialData?.pendingCommissions.toFixed(2) || '0,00'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <CreditCard className="h-4 w-4 text-green-500" />
                  <h3 className="text-sm font-medium text-muted-foreground">Comissões Pagas</h3>
                </div>
                <p className="text-2xl font-bold text-green-500">
                  R$ {financialData?.paidCommissions.toFixed(2) || '0,00'}
                </p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="commissions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="commissions">Comissões Recentes</TabsTrigger>
          <TabsTrigger value="earners">Top Indicadores</TabsTrigger>
        </TabsList>

        <TabsContent value="commissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Comissões Recentes</CardTitle>
              <CardDescription>
                Últimas comissões geradas por indicações
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingCommissions ? (
                <div className="text-center py-4">
                  <p className="text-muted-foreground">Carregando comissões...</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Indicador</TableHead>
                        <TableHead>Negócio</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>%</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentCommissions?.map((commission) => (
                        <TableRow key={commission.id}>
                          <TableCell>
                            <p className="font-medium">{commission.profiles?.full_name}</p>
                          </TableCell>
                          <TableCell>
                            <p>{commission.businesses?.name}</p>
                          </TableCell>
                          <TableCell>
                            <p className="font-medium text-primary">
                              R$ {Number(commission.commission_amount).toFixed(2)}
                            </p>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {commission.commission_percentage}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              commission.status === 'paid' ? 'default' :
                              commission.status === 'pending' ? 'secondary' : 'destructive'
                            }>
                              {commission.status === 'paid' ? 'Pago' :
                               commission.status === 'pending' ? 'Pendente' : 'Cancelado'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              {format(new Date(commission.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  
                  {recentCommissions?.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">Nenhuma comissão encontrada</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="earners" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Indicadores</CardTitle>
              <CardDescription>
                Usuários que mais ganharam comissões por indicações
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingEarners ? (
                <div className="text-center py-4">
                  <p className="text-muted-foreground">Carregando dados...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {topEarners?.map((earner, index) => (
                    <div key={earner.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{earner.profiles?.full_name}</p>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span>{earner.total_referrals} indicações</span>
                          <span>{earner.active_referrals} ativas</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">
                          R$ {Number(earner.total_commissions_earned).toFixed(2)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          R$ {Number(earner.total_commissions_pending).toFixed(2)} pendente
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  {topEarners?.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">Nenhum indicador encontrado</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};