import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Share2,
  Copy,
  Clock,
  CheckCircle
} from 'lucide-react';
import { useReferrals } from '@/hooks/useReferrals';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const BusinessReferralDashboard: React.FC = () => {
  const { 
    stats, 
    commissions, 
    loading, 
    generateReferralCode, 
    getReferralLink 
  } = useReferrals();

  const referralCode = generateReferralCode();
  const referralLink = getReferralLink();

  // Show toast when new referral is detected
  React.useEffect(() => {
    if (stats && stats.total_referrals > 0) {
      console.log('Referral stats updated:', stats);
    }
  }, [stats]);

  // Show notification for new commissions
  React.useEffect(() => {
    if (commissions && commissions.length > 0) {
      console.log('Commissions updated:', commissions.length);
    }
  }, [commissions]);

  const copyReferralCode = async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
      toast.success('Código de indicação copiado!');
    } catch (error) {
      toast.error('Erro ao copiar código');
    }
  };

  const shareReferralLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Ofertivo - Plataforma de Ofertas',
          text: 'Cadastre seu negócio no Ofertivo e ganhe mais clientes!',
          url: referralLink
        });
      } catch (error) {
        // Fallback to copy
        await navigator.clipboard.writeText(referralLink);
        toast.success('Link de indicação copiado!');
      }
    } else {
      await navigator.clipboard.writeText(referralLink);
      toast.success('Link de indicação copiado!');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-20 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Sistema de Indicações</h2>
        <p className="text-muted-foreground">
          Indique outros negócios e ganhe comissão recorrente de 25% durante o período de lançamento
        </p>
      </div>

      {/* Referral Code Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Seu Código de Indicação
          </CardTitle>
          <CardDescription>
            Compartilhe este código para que novos negócios se cadastrem
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-lg">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-1">Código de Indicação</p>
              <p className="text-2xl font-mono font-bold text-primary">{referralCode}</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={copyReferralCode} variant="outline" size="sm">
                <Copy className="h-4 w-4" />
              </Button>
              <Button onClick={shareReferralLink} size="sm">
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            💡 Dica: Compartilhe nas suas redes sociais, com parceiros comerciais ou durante eventos de negócios
          </p>
        </CardContent>
      </Card>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Indicações</p>
                <p className="text-2xl font-bold">{stats?.total_referrals || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Indicações Ativas</p>
                <p className="text-2xl font-bold">{stats?.active_referrals || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Ganho</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(stats?.total_commissions_earned || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pendente</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(stats?.total_commissions_pending || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Commissions History */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Comissões</CardTitle>
          <CardDescription>
            Acompanhe suas comissões mensais por indicações
          </CardDescription>
        </CardHeader>
        <CardContent>
          {commissions && commissions.length > 0 ? (
            <div className="space-y-4">
              {commissions.slice(0, 5).map((commission) => (
                <div key={commission.id} className="flex items-center justify-between p-4 bg-card rounded-lg border">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-full">
                      <DollarSign className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium">{commission.business?.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {commission.commission_percentage}% • {formatCurrency(commission.subscription_amount)} • 
                        {format(new Date(commission.period_start), 'MMM/yyyy', { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">
                      {formatCurrency(commission.commission_amount)}
                    </p>
                    <Badge 
                      variant={commission.status === 'paid' ? 'default' : 
                              commission.status === 'approved' ? 'secondary' : 'outline'}
                      className="mt-1"
                    >
                      {commission.status === 'paid' && <CheckCircle className="h-3 w-3 mr-1" />}
                      {commission.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                      {commission.status === 'paid' ? 'Pago' :
                       commission.status === 'approved' ? 'Aprovado' :
                       commission.status === 'pending' ? 'Pendente' : 'Cancelado'}
                    </Badge>
                  </div>
                </div>
              ))}
              
              {commissions.length > 5 && (
                <div className="text-center pt-4">
                  <Button variant="outline" size="sm">
                    Ver todas as comissões
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium mb-2">Nenhuma comissão ainda</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Compartilhe seu código de indicação para começar a ganhar comissões
              </p>
              <Button onClick={shareReferralLink} size="sm">
                <Share2 className="h-4 w-4 mr-2" />
                Compartilhar Agora
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Indicator */}
      {stats && stats.total_referrals > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Performance de Indicações</CardTitle>
            <CardDescription>
              Acompanhe o desempenho das suas indicações
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Taxa de Conversão</span>
                <span>{Math.round((stats.active_referrals / stats.total_referrals) * 100)}%</span>
              </div>
              <Progress 
                value={(stats.active_referrals / stats.total_referrals) * 100} 
                className="h-2"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency((stats.total_commissions_earned || 0) / Math.max(stats.active_referrals, 1))}
                </p>
                <p className="text-sm text-muted-foreground">Comissão Média por Indicação</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {stats.last_commission_date ? 
                    format(new Date(stats.last_commission_date), 'dd/MM/yyyy', { locale: ptBR }) : 
                    'Nunca'
                  }
                </p>
                <p className="text-sm text-muted-foreground">Última Comissão</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};