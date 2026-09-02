import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useBusiness } from '@/hooks/useBusiness';
import { BackButton } from '@/components/BackButton';
import { PaymentHistory } from '@/components/PaymentHistory';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { QrCode, CreditCard, TrendingUp, DollarSign } from 'lucide-react';

export default function BusinessPayments() {
  const { user } = useAuth();
  const { business, loading: businessLoading } = useBusiness();
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/entrar');
      return;
    }

    if (!businessLoading && !business) {
      navigate('/anunciante/dashboard');
      return;
    }

    if (business) {
      fetchSubscription();
    }
  }, [user, business, businessLoading, navigate]);

  const fetchSubscription = async () => {
    if (!business?.id) return;

    try {
      const { data, error } = await supabase
        .from('business_subscriptions')
        .select(`
          *,
          plan:subscription_plans(*)
        `)
        .eq('business_id', business.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setSubscription(data);
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  if (businessLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          <div className="mb-6">
            <BackButton />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!business) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-6">
          <BackButton />
        </div>

        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold">Pagamentos e Assinatura</h1>
            <p className="text-muted-foreground mt-2">
              Gerencie pagamentos e acompanhe suas transações
            </p>
          </div>

          {/* Resumo da Assinatura */}
          {subscription && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Plano Atual
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{subscription.plan?.name}</div>
                  <p className="text-xs text-muted-foreground">
                    {subscription.payment_gateway === 'abacatepay' ? 'PIX' : 'Cartão'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Status
                  </CardTitle>
                  <Badge 
                    variant={subscription.payment_status === 'active' ? 'default' : 'secondary'}
                  >
                    {subscription.payment_status === 'active' ? 'Ativo' : subscription.payment_status}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {subscription.status === 'active' ? 'Ativo' : subscription.status}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Próximo pagamento: {subscription.next_payment_at ? 
                      new Date(subscription.next_payment_at).toLocaleDateString('pt-BR') : 
                      'N/A'
                    }
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Valor Mensal
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    R$ {subscription.plan?.price_monthly?.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Último pagamento: {subscription.last_payment_at ? 
                      new Date(subscription.last_payment_at).toLocaleDateString('pt-BR') : 
                      'N/A'
                    }
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Informações sobre Gateways */}
          <Card>
            <CardHeader>
              <CardTitle>Métodos de Pagamento Disponíveis</CardTitle>
              <CardDescription>
                O Ofertivo oferece duas opções de pagamento para sua comodidade
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3 p-4 border rounded-lg">
                  <QrCode className="h-6 w-6 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold">PIX via AbacatePay (Recomendado)</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Confirmação instantânea, menor taxa (0,99% + R$ 0,10)
                    </p>
                    <Badge variant="outline" className="mt-2">Gateway Principal</Badge>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 border rounded-lg">
                  <CreditCard className="h-6 w-6 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold">Cartão via Mercado Pago</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Parcelamento disponível, taxa (4,99% + R$ 0,39)
                    </p>
                    <Badge variant="outline" className="mt-2">Alternativo</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Histórico de Pagamentos */}
          <PaymentHistory businessId={business.id} />

          {/* Ações */}
          <div className="flex gap-4">
            <Button onClick={() => navigate('/anunciante/planos')}>
              Gerenciar Assinatura
            </Button>
            <Button variant="outline" onClick={() => navigate('/anunciante/dashboard')}>
              Voltar ao Dashboard
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
