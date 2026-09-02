import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useReferrals } from '@/hooks/useReferrals';
import { supabase } from '@/integrations/supabase/client';
import { 
  DollarSign, 
  Users, 
  TrendingUp, 
  Settings,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Calendar,
  Building2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AdminStats {
  totalCommissions: number;
  pendingCommissions: number;
  paidCommissions: number;
  totalReferrers: number;
  activeBusinesses: number;
}

interface CommissionWithDetails {
  id: string;
  referrer_id: string;
  business_id: string;
  commission_amount: number;
  commission_percentage: number;
  subscription_amount: number;
  status: string;
  payment_date: string | null;
  period_start: string;
  period_end: string;
  created_at: string;
  referrer?: {
    full_name: string;
    email: string;
  };
  business?: {
    name: string;
    category: string;
    owner?: {
      full_name: string;
      email: string;
    };
  };
}

const AdminReferrals = () => {
  const { 
    settings, 
    loading, 
    fetchReferralSettings,
    updateCommissionSettings,
    updateCommissionStatus
  } = useReferrals();
  
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [commissions, setCommissions] = useState<CommissionWithDetails[]>([]);
  const [selectedCommission, setSelectedCommission] = useState<CommissionWithDetails | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchReferralSettings();
    fetchAdminStats();
    fetchAllCommissions();
  }, []);

  const fetchAdminStats = async () => {
    setLoadingStats(true);
    try {
      // Fetch aggregated stats
      const { data: statsData, error: statsError } = await supabase
        .from('referral_commissions')
        .select('commission_amount, status');

      if (statsError) throw statsError;

      const totalCommissions = statsData?.reduce((sum, c) => sum + c.commission_amount, 0) || 0;
      const pendingCommissions = statsData?.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.commission_amount, 0) || 0;
      const paidCommissions = statsData?.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.commission_amount, 0) || 0;

      // Count unique referrers
      const { count: totalReferrers } = await supabase
        .from('referral_stats')
        .select('*', { count: 'exact', head: true });

      // Count active businesses with referrals
      const { count: activeBusinesses } = await supabase
        .from('businesses')
        .select('*', { count: 'exact', head: true })
        .not('referred_by', 'is', null);

      setAdminStats({
        totalCommissions,
        pendingCommissions,
        paidCommissions,
        totalReferrers: totalReferrers || 0,
        activeBusinesses: activeBusinesses || 0
      });
    } catch (error: any) {
      console.error('Erro ao buscar estatísticas admin:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as estatísticas.",
        variant: "destructive"
      });
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchAllCommissions = async () => {
    try {
      const { data, error } = await supabase
        .from('referral_commissions')
        .select(`
          id,
          referrer_id,
          business_id,
          subscription_id,
          commission_amount,
          commission_percentage,
          subscription_amount,
          status,
          payment_date,
          period_start,
          period_end,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch related data separately to avoid complex joins
      const commissionsWithDetails: CommissionWithDetails[] = [];
      
      if (data) {
        for (const commission of data) {
          // Fetch referrer profile
          const { data: referrer } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', commission.referrer_id)
            .maybeSingle();

          // Fetch business and owner data  
          const { data: business } = await supabase
            .from('businesses')
            .select(`
              name,
              category,
              owner_id
            `)
            .eq('id', commission.business_id)
            .maybeSingle();

          let businessOwner = null;
          if (business?.owner_id) {
            const { data: owner } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('user_id', business.owner_id)
              .maybeSingle();
            businessOwner = owner;
          }

          commissionsWithDetails.push({
            ...commission,
            referrer: referrer ? { 
              full_name: referrer.full_name || '',
              email: '' 
            } : undefined,
            business: business ? {
              name: business.name,
              category: business.category,
              owner: businessOwner ? {
                full_name: businessOwner.full_name || '',
                email: ''
              } : undefined
            } : undefined
          });
        }
      }

      setCommissions(commissionsWithDetails);
    } catch (error: any) {
      console.error('Erro ao buscar comissões:', error);
    }
  };

  const handleUpdateCommissionStatus = async (
    commissionId: string, 
    newStatus: 'pending' | 'approved' | 'paid' | 'cancelled'
  ) => {
    const success = await updateCommissionStatus(commissionId, newStatus);
    if (success) {
      await fetchAllCommissions();
      await fetchAdminStats();
      toast({
        title: "Sucesso",
        description: "Status da comissão atualizado com sucesso.",
      });
    }
  };

  const handleUpdateSettings = async (planId: string, percentage: number) => {
    const success = await updateCommissionSettings(planId, percentage);
    if (success) {
      await fetchReferralSettings();
      toast({
        title: "Sucesso",
        description: "Configuração de comissão atualizada com sucesso.",
      });
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
      cancelled: 'destructive'
    } as const;
    
    const labels = {
      pending: 'Pendente',
      approved: 'Aprovado',
      paid: 'Pago',
      cancelled: 'Cancelado'
    };

    const isPaid = status === 'paid';

    return (
      <Badge 
        variant={variants[status as keyof typeof variants] || 'secondary'}
        className={isPaid ? 'bg-success text-success-foreground' : ''}
      >
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Painel de Afiliação - Administrador
          </h1>
          <p className="text-muted-foreground">
            Gerencie comissões, configurações e pagamentos do programa de afiliação.
          </p>
        </div>

        {/* Admin Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <Card className="border-0 shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold text-primary">
                {formatCurrency(adminStats?.totalCommissions || 0)}
              </div>
              <div className="text-sm text-muted-foreground">
                Total em Comissões
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold text-warning">
                {formatCurrency(adminStats?.pendingCommissions || 0)}
              </div>
              <div className="text-sm text-muted-foreground">
                Pendente Pagamento
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold text-success">
                {formatCurrency(adminStats?.paidCommissions || 0)}
              </div>
              <div className="text-sm text-muted-foreground">
                Já Pago
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold text-primary">
                {adminStats?.totalReferrers || 0}
              </div>
              <div className="text-sm text-muted-foreground">
                Afiliados Ativos
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Building2 className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold text-primary">
                {adminStats?.activeBusinesses || 0}
              </div>
              <div className="text-sm text-muted-foreground">
                Negócios Indicados
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="commissions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="commissions">Gerenciar Comissões</TabsTrigger>
            <TabsTrigger value="settings">Configurações</TabsTrigger>
          </TabsList>

          <TabsContent value="commissions" className="space-y-6">
            <Card className="border-0 shadow-card">
              <CardHeader>
                <CardTitle>Comissões Pendentes</CardTitle>
                <CardDescription>
                  Gerencie os pagamentos e status das comissões de afiliados.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {commissions
                    .filter(c => c.status === 'pending')
                    .map((commission) => (
                    <div
                      key={commission.id}
                      className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">
                            {commission.referrer?.full_name || 'Afiliado'}
                          </span>
                          <span className="text-muted-foreground">→</span>
                          <span className="font-medium">
                            {commission.business?.name || 'Negócio'}
                          </span>
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
                        <div className="font-bold text-lg mb-2">
                          {formatCurrency(commission.commission_amount)}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleUpdateCommissionStatus(commission.id, 'approved')}
                            className="bg-gradient-secondary"
                          >
                            Aprovar
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleUpdateCommissionStatus(commission.id, 'paid')}
                            className="bg-gradient-primary"
                          >
                            Pagar
                          </Button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedCommission(commission)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Detalhes da Comissão</DialogTitle>
                              </DialogHeader>
                              {selectedCommission && (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label>Afiliado</Label>
                                      <p className="font-medium">{selectedCommission.referrer?.full_name}</p>
                                    </div>
                                    <div>
                                      <Label>Negócio</Label>
                                      <p className="font-medium">{selectedCommission.business?.name}</p>
                                    </div>
                                    <div>
                                      <Label>Valor da Assinatura</Label>
                                      <p className="font-medium">{formatCurrency(selectedCommission.subscription_amount)}</p>
                                    </div>
                                    <div>
                                      <Label>Percentual</Label>
                                      <p className="font-medium">{selectedCommission.commission_percentage}%</p>
                                    </div>
                                    <div>
                                      <Label>Comissão</Label>
                                      <p className="font-medium">{formatCurrency(selectedCommission.commission_amount)}</p>
                                    </div>
                                    <div>
                                      <Label>Status</Label>
                                      {getStatusBadge(selectedCommission.status)}
                                    </div>
                                  </div>
                                  <div className="flex gap-2 pt-4">
                                    <Button
                                      onClick={() => {
                                        handleUpdateCommissionStatus(selectedCommission.id, 'approved');
                                        setSelectedCommission(null);
                                      }}
                                      className="bg-gradient-secondary"
                                    >
                                      Aprovar
                                    </Button>
                                    <Button
                                      onClick={() => {
                                        handleUpdateCommissionStatus(selectedCommission.id, 'paid');
                                        setSelectedCommission(null);
                                      }}
                                      className="bg-gradient-primary"
                                    >
                                      Marcar como Pago
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      onClick={() => {
                                        handleUpdateCommissionStatus(selectedCommission.id, 'cancelled');
                                        setSelectedCommission(null);
                                      }}
                                    >
                                      Cancelar
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    </div>
                  ))}

                  {commissions.filter(c => c.status === 'pending').length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhuma comissão pendente.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card className="border-0 shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Configurações de Comissão por Plano
                </CardTitle>
                <CardDescription>
                  Defina os percentuais de comissão para cada plano de assinatura.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {settings.map((setting) => (
                    <div
                      key={setting.id}
                      className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="font-medium mb-1">
                          {setting.plan?.name || 'Plano'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Comissão atual: {setting.commission_percentage}%
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          max="50"
                          step="0.5"
                          defaultValue={setting.commission_percentage}
                          className="w-24"
                          onBlur={(e) => {
                            const newValue = parseFloat(e.target.value);
                            if (newValue !== setting.commission_percentage && newValue >= 0 && newValue <= 50) {
                              handleUpdateSettings(setting.subscription_plan_id, newValue);
                            }
                          }}
                        />
                        <span className="text-sm text-muted-foreground">%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminReferrals;