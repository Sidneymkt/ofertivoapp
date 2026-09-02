import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Check, Star, Loader2, RefreshCw, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCaktoPayment } from '@/hooks/useCaktoPayment';

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

interface SubscriptionPlanSelectHybridProps {
  businessId: string;
  selectedPlanId?: string;
  onPlanSelect?: (planId: string, planName: string) => void;
  disabled?: boolean;
}

const SubscriptionPlanSelectHybrid: React.FC<SubscriptionPlanSelectHybridProps> = ({
  businessId,
  selectedPlanId,
  onPlanSelect,
  disabled = false
}) => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  // Use Cakto payment hook
  const {
    isPolling,
    hasActiveSubscription,
    planName: activePlanName,
    startCheckout,
    manualCheck,
    loading: paymentLoading
  } = useCaktoPayment(businessId);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*');

      if (error) throw error;
      
      const transformedPlans = ((data as any[]) || [])
        .filter((plan) => plan.is_visible !== false)
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
    } catch (error) {
      console.error('Erro ao carregar planos:', error);
      toast.error('Erro ao carregar planos');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (plan: SubscriptionPlan) => {
    const price = billingCycle === 'monthly' 
      ? plan.price_monthly 
      : plan.price_yearly || plan.price_monthly * 12;
    
    const period = billingCycle === 'monthly' ? '/mês' : '/ano';
    return `R$ ${price.toFixed(2).replace('.', ',')}${period}`;
  };

  const getDiscount = (plan: SubscriptionPlan) => {
    if (!plan.price_yearly) return null;
    const monthlyTotal = plan.price_monthly * 12;
    const discount = ((monthlyTotal - plan.price_yearly) / monthlyTotal) * 100;
    return Math.round(discount);
  };

  const handleSelectPlan = (plan: SubscriptionPlan) => {
    if (disabled) return;
    
    if (plan.price_monthly === 0) {
      // Plano empresarial - abrir WhatsApp
      window.open('https://wa.me/5592999999999?text=Olá! Gostaria de saber mais sobre o plano empresarial do Ofertivo.', '_blank', 'noopener,noreferrer');
      return;
    }

    // Usar hook de Cakto com polling automático
    startCheckout(plan.name);
    
    if (onPlanSelect) {
      onPlanSelect(plan.id, plan.name);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Label>Escolher Plano de Assinatura</Label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-8 bg-muted rounded w-2/3"></div>
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-4 bg-muted rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Polling Alert */}
        {isPolling && (
          <Alert className="border-primary bg-primary/10">
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertTitle>Aguardando Confirmação do Pagamento</AlertTitle>
            <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
              <span>Estamos verificando seu pagamento automaticamente...</span>
              <Button variant="outline" size="sm" onClick={manualCheck} disabled={paymentLoading}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Verificar Agora
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Active Subscription Alert */}
        {hasActiveSubscription && (
          <Alert className="border-green-500 bg-green-500/10">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertTitle className="text-green-600">Assinatura Ativa!</AlertTitle>
            <AlertDescription>
              Seu plano {activePlanName} está ativo. Você pode criar ofertas e sorteios!
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between">
          <Label>Escolher Plano de Assinatura</Label>
          <div className="flex bg-muted rounded-lg p-1">
            <Button
              variant={billingCycle === 'monthly' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setBillingCycle('monthly')}
              className="text-xs"
            >
              Mensal
            </Button>
            <Button
              variant={billingCycle === 'yearly' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setBillingCycle('yearly')}
              className="text-xs"
            >
              Anual
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {plans.map((plan) => (
            <Card 
              key={plan.id}
              onClick={() => handleSelectPlan(plan)}
              className={`relative cursor-pointer transition-all duration-200 hover:shadow-xl hover:scale-[1.02] hover:-translate-y-1 active:scale-[0.98] ${
                selectedPlanId === plan.id 
                  ? 'ring-2 ring-primary shadow-lg scale-[1.02]' 
                  : 'hover:border-primary/50'
              } ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''} ${
                plan.name === 'Pro' ? 'border-green-500 shadow-green-100' : ''
              } ${
                plan.name === 'Start' ? 'border-primary shadow-primary/20' : ''
              }`}
            >
              {plan.name === 'Pro' && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-green-500 text-white">
                    <Star className="w-3 h-3 mr-1" />
                    Mais Popular
                  </Badge>
                </div>
              )}

              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  {plan.name}
                  {plan.name === 'Start' && (
                    <Badge variant="outline" className="text-xs font-normal">Teste</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  <div className="space-y-1">
                    <div className="text-2xl font-bold text-foreground">
                      {plan.price_monthly === 0 ? 'A combinar' : formatPrice(plan)}
                    </div>
                    {billingCycle === 'yearly' && getDiscount(plan) && (
                      <Badge variant="secondary" className="text-xs">
                        Economize {getDiscount(plan)}%
                      </Badge>
                    )}
                  </div>
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm space-y-1">
                    {plan.max_offers && (
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        <span>{plan.max_offers} ofertas ativas</span>
                      </div>
                    )}
                    {!plan.max_offers && (
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        <span>Ofertas ilimitadas</span>
                      </div>
                    )}
                    {plan.max_raffles && (
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        <span>{plan.max_raffles} sorteios ativos</span>
                      </div>
                    )}

                    {plan.features
                      .filter(feature => {
                        const lowerFeature = feature.toLowerCase();
                        return !lowerFeature.includes('oferta') && 
                               !lowerFeature.includes('visualizações') && 
                               !lowerFeature.includes('sorteio');
                      })
                      .map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 text-green-500" />
                          <span>{feature}</span>
                        </div>
                      ))}
                  </div>

                  <Button 
                    className="w-full mt-3" 
                    onClick={() => handleSelectPlan(plan)}
                    variant={plan.price_monthly === 0 ? 'outline' : 'default'}
                    disabled={disabled}
                  >
                    {plan.price_monthly === 0 ? 'Fale Conosco' : 'Assinar Plano'}
                  </Button>

                  {selectedPlanId === plan.id && (
                    <div className="pt-2">
                      <Badge className="bg-green-500 text-white w-full justify-center">
                        Plano Atual
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
};

export default SubscriptionPlanSelectHybrid;
