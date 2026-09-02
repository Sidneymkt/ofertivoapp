import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Check, Crown, Zap, Star, Building, Loader2, RefreshCw, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { BackButton } from '@/components/BackButton';
import { useCaktoPayment } from '@/hooks/useCaktoPayment';
import { useBusiness } from '@/hooks/useBusiness';

interface SubscriptionPlan {
  id: string;
  name: string;
  price_monthly: number;
  price_yearly: number | null;
  max_offers: number | null;
  max_views: number | null;
  max_raffles: number | null;
  features: string[];
}

interface CurrentSubscription {
  id: string;
  plan_id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  plan_name: string;
}

const BusinessPlanUpgrade: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<CurrentSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Get business data
  const { business } = useBusiness();
  
  // Use Cakto payment hook with polling
  const { 
    isPolling, 
    hasActiveSubscription, 
    planName: activePlanName,
    startCheckout,
    manualCheck,
    loading: paymentLoading 
  } = useCaktoPayment(business?.id || null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/anunciante/login');
      return;
    }

    if (user) {
      fetchSubscriptionData();
    }

    // Mostrar mensagem de sucesso se veio do checkout
    if (searchParams.get('payment') === 'success') {
      toast.success('Pagamento confirmado! Sua assinatura foi ativada.');
      setTimeout(() => {
        fetchSubscriptionData();
        manualCheck();
      }, 2000);
    } else if (searchParams.get('payment') === 'failed') {
      toast.error('Pagamento falhou. Tente novamente.');
    } else if (searchParams.get('payment') === 'pending') {
      toast.info('Pagamento pendente. Aguardando confirmação...');
    }
  }, [user, isAuthenticated, isLoading, navigate, searchParams]);

  const fetchSubscriptionData = async () => {
    if (!user) return;

    try {
      // Get user's business
      const { data: business } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (!business) {
        toast.error('Negócio não encontrado');
        return;
      }

      // Get current subscription
      const { data: subscription } = await supabase
        .from('business_subscriptions')
        .select(`
          *,
          subscription_plans!inner(name)
        `)
        .eq('business_id', business.id)
        .eq('status', 'active')
        .single();

      if (subscription) {
        setCurrentSubscription({
          id: subscription.id,
          plan_id: subscription.plan_id,
          status: subscription.status,
          current_period_start: subscription.current_period_start,
          current_period_end: subscription.current_period_end,
          plan_name: subscription.subscription_plans.name
        });
      }

      // Get all available plans
      const { data: plansData } = await supabase
        .from('subscription_plans')
        .select('*');

      if (plansData) {
        const currentPlanId = subscription?.plan_id;
        const transformedPlans = (plansData as any[])
          .filter((plan) => plan.is_visible !== false || plan.id === currentPlanId)
          .map(plan => ({
          id: plan.id,
          name: plan.name,
          price_monthly: plan.price_monthly,
          price_yearly: plan.price_yearly,
          max_offers: plan.max_offers,
          max_views: plan.max_views,
          max_raffles: plan.max_raffles,
          features: Array.isArray(plan.features) 
            ? plan.features.filter(f => typeof f === 'string') 
            : []
        }));

        // Ordenar por preço (menor para maior), tratando "Empresarial" como último
        const orderedPlans = transformedPlans.sort((a, b) => {
          // Empresarial sempre por último (preço 0 = a combinar)
          if (a.price_monthly === 0) return 1;
          if (b.price_monthly === 0) return -1;
          // Ordenar por preço crescente
          return a.price_monthly - b.price_monthly;
        });

        setPlans(orderedPlans);
      }
    } catch (error) {
      console.error('Erro ao carregar dados da assinatura:', error);
      toast.error('Erro ao carregar dados da assinatura');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = (plan: SubscriptionPlan) => {
    if (plan.price_monthly === 0) {
      // Plano empresarial
      window.open('https://wa.me/5592999999999?text=Olá! Gostaria de saber mais sobre o plano empresarial do Ofertivo.', '_blank', 'noopener,noreferrer');
      return;
    }

    // Usar hook de Cakto com polling automático
    startCheckout(plan.name);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const PLAN_CREDITS: Record<string, string> = {
    'Start': '1.000',
    'Essencial': '5.000',
    'Pro': '12.000',
    'Premium': '30.000',
    'Empresarial': 'Personalizado',
  };

  const getPlanIcon = (planName: string) => {
    switch (planName) {
      case 'Essencial': return <Star className="w-5 h-5" />;
      case 'Pro': return <Zap className="w-5 h-5" />;
      case 'Premium': return <Crown className="w-5 h-5" />;
      case 'Empresarial': return <Building className="w-5 h-5" />;
      default: return <Star className="w-5 h-5" />;
    }
  };

  const isCurrentPlan = (planId: string) => {
    return currentSubscription?.plan_id === planId;
  };

  const isUpgrade = (planPrice: number) => {
    if (!currentSubscription) return true;
    const currentPlan = plans.find(p => p.id === currentSubscription.plan_id);
    return currentPlan ? planPrice > currentPlan.price_monthly : true;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-96 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Polling Alert */}
      {isPolling && (
        <Alert className="border-primary bg-primary/10">
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertTitle>Aguardando Confirmação do Pagamento</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>Estamos verificando seu pagamento automaticamente. Isso pode levar alguns minutos.</span>
            <Button variant="outline" size="sm" onClick={manualCheck} disabled={paymentLoading}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Verificar Agora
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Active Subscription Alert */}
      {hasActiveSubscription && !currentSubscription && (
        <Alert className="border-green-500 bg-green-500/10">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <AlertTitle className="text-green-600">Assinatura Ativa!</AlertTitle>
          <AlertDescription>
            Seu plano {activePlanName} está ativo. Você será redirecionado para o dashboard em instantes.
          </AlertDescription>
        </Alert>
      )}

      {/* Header with Back Button */}
      <div className="flex items-center gap-4 mb-6">
        <BackButton to="/anunciante/dashboard" />
        <div className="text-center flex-1 space-y-4">
          <h1 className="text-3xl font-bold">Upgrade do Plano</h1>
          <p className="text-muted-foreground">
            Escolha o plano ideal para fazer seu negócio crescer no Ofertivo
          </p>

          {currentSubscription && (
            <div className="flex flex-col items-center gap-3">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full">
                <Badge variant="outline">Plano Atual</Badge>
                <span className="font-semibold">{currentSubscription.plan_name}</span>
                <span className="text-sm">
                  (até {formatDate(currentSubscription.current_period_end)})
                </span>
              </div>
            </div>
          )}

        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 max-w-7xl mx-auto">
        {plans.map((plan) => {
          const isCurrent = isCurrentPlan(plan.id);
          const isUpgradeOption = isUpgrade(plan.price_monthly);
          
          return (
            <Card 
              key={plan.id}
              className={`relative ${
                plan.name === 'Pro' ? 'border-green-500 shadow-lg scale-105 border-2' : ''
              } ${isCurrent ? 'bg-primary/5 border-primary' : ''}`}
            >
              {plan.name === 'Pro' && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-green-500 text-white">
                    <Star className="w-3 h-3 mr-1" />
                    Mais Popular
                  </Badge>
                </div>
              )}

              {isCurrent && (
                <div className="absolute -top-3 right-4">
                  <Badge className="bg-green-500 text-white">
                    Plano Atual
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-2">
                  {getPlanIcon(plan.name)}
                </div>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>
                  <div className="text-3xl font-bold text-foreground">
                    {plan.price_monthly === 0 ? 'A combinar' : formatCurrency(plan.price_monthly)}
                  </div>
                  {plan.price_monthly > 0 && (
                    <div className="text-sm text-muted-foreground">/mês</div>
                  )}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-3">
                {/* Créditos mensais */}
                {PLAN_CREDITS[plan.name] && (
                  <div className="flex items-center gap-1.5 bg-primary/10 rounded-lg px-3 py-1.5 mb-1">
                    <Zap className="w-4 h-4 text-primary" />
                    <span className="text-sm font-bold text-primary">{PLAN_CREDITS[plan.name]} créditos</span>
                    <span className="text-xs text-muted-foreground">/mês</span>
                  </div>
                )}

                {/* Ofertas */}
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-sm">
                      {plan.max_offers ? `${plan.max_offers} ofertas ativas` : 'Ofertas ilimitadas'}
                    </span>
                  </div>


                  {/* Sorteios */}
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-sm">
                      {plan.max_raffles ? `${plan.max_raffles} sorteios ativos` : 'Sorteios ilimitados'}
                    </span>
                  </div>

                  {/* Features adicionais */}
                  {plan.features
                    .filter(feature => {
                      const lowerFeature = feature.toLowerCase();
                      return !lowerFeature.includes('oferta') && 
                             !lowerFeature.includes('visualizações') && 
                             !lowerFeature.includes('sorteio');
                    })
                    .map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                </div>

                <div className="pt-4">
                  {isCurrent ? (
                    <Button disabled className="w-full">
                      Plano Atual
                    </Button>
                  ) : plan.price_monthly === 0 ? (
                    <Button 
                      className="w-full" 
                      onClick={() => window.open('https://wa.me/5592999999999?text=Olá! Gostaria de saber mais sobre o plano empresarial do Ofertivo.', '_blank', 'noopener,noreferrer')}
                      variant="outline"
                    >
                      Fale Conosco
                    </Button>
                  ) : isUpgradeOption ? (
                    <Button 
                      className="w-full" 
                      onClick={() => handleSelectPlan(plan)}
                      variant={plan.name === 'Pro' ? 'default' : 'outline'}
                    >
                      Fazer Upgrade
                    </Button>
                  ) : (
                    <Button disabled className="w-full" variant="outline">
                      Downgrade
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="text-center mt-8">
        <p className="text-sm text-muted-foreground">
          💡 <strong>Dica:</strong> Ao fazer upgrade, você ganha acesso imediato aos novos recursos. 
          O valor será proporcional ao período restante da sua assinatura atual.
        </p>
      </div>
    </div>
  );
};

export default BusinessPlanUpgrade;
