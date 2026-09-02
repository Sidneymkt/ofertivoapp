import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useReferrals } from '@/hooks/useReferrals';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Copy,
  Share2,
  Calendar,
  Building2,
  UserCircle,
  Star,
  Trophy
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ReferredUser {
  id: string;
  full_name: string | null;
  user_type: 'consumer' | 'business';
  created_at: string;
  total_points?: number;
  referral_points?: number;
}

interface ReferredBusiness {
  id: string;
  name: string;
  category: string;
  created_at: string;
  owner_name?: string;
  subscription_status?: string;
  subscription_plan?: string;
}

const ReferralTracking = () => {
  const { 
    stats, 
    commissions, 
    loading, 
    getReferralLink,
    fetchReferralStats,
    fetchReferralCommissions 
  } = useReferrals();
  const { user } = useAuth();
  const { toast } = useToast();

  const [referredUsers, setReferredUsers] = useState<ReferredUser[]>([]);
  const [referredBusinesses, setReferredBusinesses] = useState<ReferredBusiness[]>([]);
  const [loadingReferrals, setLoadingReferrals] = useState(false);
  const [totalPoints, setTotalPoints] = useState(0);

  // Fetch referred users and businesses
  useEffect(() => {
    if (user) {
      fetchReferredData();
    }
  }, [user]);

  const fetchReferredData = async () => {
    if (!user) return;
    
    setLoadingReferrals(true);
    try {
      // Fetch referred users (consumers)
      const { data: consumers, error: consumersError } = await supabase
        .from('profiles')
        .select('id, full_name, user_type, created_at, total_points')
        .eq('referred_by', user.id)
        .eq('user_type', 'consumer')
        .order('created_at', { ascending: false });

      if (consumersError) throw consumersError;

      // Fetch referred businesses with subscription info
      const { data: businessProfiles, error: businessError } = await supabase
        .from('profiles')
        .select('id, full_name, user_type, created_at')
        .eq('referred_by', user.id)
        .eq('user_type', 'business')
        .order('created_at', { ascending: false });

      if (businessError) throw businessError;

      // Get business details for referred business owners
      if (businessProfiles && businessProfiles.length > 0) {
        const businessOwnerIds = businessProfiles.map(p => p.id);
        const { data: businesses, error: businessDetailsError } = await supabase
          .from('businesses')
          .select(`
            id, 
            name, 
            category, 
            owner_id, 
            created_at,
            business_subscriptions(
              status,
              plan_id,
              subscription_plans(name)
            )
          `)
          .in('owner_id', businessOwnerIds);

        if (businessDetailsError) throw businessDetailsError;

        const businessData = businesses?.map(business => ({
          id: business.id,
          name: business.name || 'Negócio sem nome',
          category: business.category || 'Categoria não definida',
          created_at: business.created_at,
          owner_name: businessProfiles.find(p => p.id === business.owner_id)?.full_name || 'Nome não definido',
          subscription_status: business.business_subscriptions?.[0]?.status || 'Sem assinatura',
          subscription_plan: business.business_subscriptions?.[0]?.subscription_plans?.name || 'Plano gratuito'
        })) || [];

        setReferredBusinesses(businessData);
      }

      // Calculate referral points (100 points per referral)
      const consumerReferrals = consumers?.length || 0;
      const businessReferrals = businessProfiles?.length || 0;
      const referralPoints = (consumerReferrals + businessReferrals) * 100;

      const consumerData = consumers?.map(consumer => ({
        ...consumer,
        user_type: consumer.user_type as 'consumer' | 'business',
        referral_points: 100 // Points earned for referring this user
      })) || [];

      setReferredUsers(consumerData);
      setTotalPoints(referralPoints);

    } catch (error) {
      console.error('Erro ao buscar dados de indicação:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados de indicação.",
        variant: "destructive",
      });
    } finally {
      setLoadingReferrals(false);
    }
  };

  const copyReferralLink = async () => {
    try {
      await navigator.clipboard.writeText(getReferralLink());
      toast({
        title: "Link copiado!",
        description: "Link de indicação copiado para a área de transferência.",
      });
    } catch (error) {
      console.error('Erro ao copiar link:', error);
      toast({
        title: "Erro",
        description: "Não foi possível copiar o link.",
        variant: "destructive",
      });
    }
  };

  const shareReferralLink = async () => {
    const link = getReferralLink();
    const text = `Indicar usuários e negócios no Ofertivo e ganhe pontos e comissões! Use meu link: ${link}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Programa de Indicação Ofertivo',
          text: text,
          url: link
        });
      } catch (error) {
        console.error('Erro ao compartilhar:', error);
      }
    } else {
      copyReferralLink();
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'secondary',
      approved: 'default',
      paid: 'default',
      cancelled: 'destructive',
      active: 'default'
    } as const;
    
    const labels = {
      pending: 'Pendente',
      approved: 'Aprovado',
      paid: 'Pago',
      cancelled: 'Cancelado',
      active: 'Ativo'
    };

    const isPaid = status === 'paid';
    const isActive = status === 'active';
    
    return (
      <Badge 
        variant={variants[status as keyof typeof variants] || 'secondary'}
        className={isPaid ? 'bg-success text-success-foreground' : isActive ? 'bg-primary text-primary-foreground' : ''}
      >
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  if (loading || loadingReferrals) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="border-0 shadow-card">
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-8 bg-muted rounded mb-2"></div>
                  <div className="h-4 bg-muted rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const totalReferrals = referredUsers.length + referredBusinesses.length;
  const businessReferrals = referredBusinesses.length;
  const consumerReferrals = referredUsers.length;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-5 h-5 text-muted-foreground" />
              <Badge variant="outline" className="text-primary">
                Total
              </Badge>
            </div>
            <div className="text-2xl font-bold text-primary">
              {totalReferrals}
            </div>
            <div className="text-sm text-muted-foreground">
              Indicações Totais
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Building2 className="w-5 h-5 text-muted-foreground" />
              <Badge variant="outline" className="text-success">
                Negócios
              </Badge>
            </div>
            <div className="text-2xl font-bold text-success">
              {businessReferrals}
            </div>
            <div className="text-sm text-muted-foreground">
              Negócios Indicados
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Trophy className="w-5 h-5 text-muted-foreground" />
              <Badge variant="outline" className="text-warning">
                Pontos
              </Badge>
            </div>
            <div className="text-2xl font-bold text-warning">
              {totalPoints}
            </div>
            <div className="text-sm text-muted-foreground">
              Pontos por Indicação
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-5 h-5 text-muted-foreground" />
              <Badge variant="outline" className="text-success">
                Comissões (30%)
              </Badge>
            </div>
            <div className="text-2xl font-bold text-success">
              {formatCurrency(stats?.total_commissions_earned || 0)}
            </div>
            <div className="text-sm text-muted-foreground">
              De Planos Pagos
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Referral Link Section */}
      <Card className="border-0 shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Programa de Afiliados
          </CardTitle>
          <CardDescription>
            Indique usuários e negócios para ganhar pontos e comissões recorrentes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="referral-link">Seu Link de Indicação</Label>
            <div className="flex gap-2">
              <Input
                id="referral-link"
                value={getReferralLink()}
                readOnly
                className="flex-1"
              />
              <Button onClick={copyReferralLink} variant="outline" size="icon">
                <Copy className="w-4 h-4" />
              </Button>
              <Button onClick={shareReferralLink} variant="outline" size="icon">
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-2">Como Funciona:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Indique negócios para se cadastrarem no Ofertivo</li>
              <li>• <strong>Ganhe comissão recorrente de 30%</strong> sobre as assinaturas pagas</li>
              <li>• Acompanhe seus ganhos em tempo real</li>
              <li>• Receba 100 pontos por cada indicação (usuário ou negócio)</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Referrals Tabs */}
      <Tabs defaultValue="businesses" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="businesses" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Negócios ({businessReferrals})
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <UserCircle className="w-4 h-4" />
            Usuários ({consumerReferrals})
          </TabsTrigger>
          <TabsTrigger value="commissions" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Comissões
          </TabsTrigger>
        </TabsList>

        <TabsContent value="businesses">
          <Card className="border-0 shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Negócios Indicados
              </CardTitle>
              <CardDescription>
                Negócios que se cadastraram usando seu link de indicação. Comissão de 30% em planos pagos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {referredBusinesses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum negócio indicado ainda.</p>
                  <p className="text-sm">Compartilhe seu link para começar a ganhar comissões!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {referredBusinesses.map((business) => (
                    <div
                      key={business.id}
                      className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{business.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {business.category}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Proprietário: {business.owner_name}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Calendar className="w-3 h-3" />
                          Cadastrado em: {new Date(business.created_at).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="font-medium">
                          {business.subscription_plan}
                        </div>
                        {getStatusBadge(business.subscription_status || 'Gratuito')}
                        <div className="text-xs text-success">
                          +100 pontos
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card className="border-0 shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCircle className="w-5 h-5" />
                Usuários Indicados
              </CardTitle>
              <CardDescription>
                Usuários consumidores que se cadastraram usando seu link de indicação.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {referredUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <UserCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum usuário indicado ainda.</p>
                  <p className="text-sm">Compartilhe seu link para começar a indicar usuários!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {referredUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">
                            {user.full_name || 'Usuário sem nome'}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            Consumidor
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Pontos do usuário: {user.total_points || 0}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Calendar className="w-3 h-3" />
                          Cadastrado em: {new Date(user.created_at).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-success mb-1">
                          Você ganhou:
                        </div>
                        <div className="font-bold text-success">
                          +{user.referral_points} pontos
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="commissions">
          <Card className="border-0 shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Comissões Recentes (30%)
              </CardTitle>
              <CardDescription>
                Histórico das suas comissões por indicações de negócios com planos pagos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {commissions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma comissão ainda.</p>
                  <p className="text-sm">Indique negócios que assinem planos pagos para ganhar 30% de comissão!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {commissions.map((commission) => (
                    <div
                      key={commission.id}
                      className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">
                            {commission.business?.name || 'Negócio'}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {commission.business?.category || 'N/A'}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {commission.commission_percentage}% de {formatCurrency(commission.subscription_amount)}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(commission.period_start).toLocaleDateString('pt-BR')} - {new Date(commission.period_end).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg mb-1">
                          {formatCurrency(commission.commission_amount)}
                        </div>
                        {getStatusBadge(commission.status)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReferralTracking;