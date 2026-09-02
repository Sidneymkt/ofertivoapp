
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Check, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { openCaktoCheckout } from '@/lib/cakto';

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

interface SubscriptionPlanSelectProps {
  selectedPlanId?: string;
  onPlanSelect: (planId: string, planName: string) => void;
  disabled?: boolean;
  businessId?: string;
}

const SubscriptionPlanSelect: React.FC<SubscriptionPlanSelectProps> = ({
  selectedPlanId,
  onPlanSelect,
  disabled = false,
  businessId
}) => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const { data, error } = await supabase
          .from('subscription_plans')
          .select('*');

        if (error) throw error;
        
        // Transformar os dados para garantir que features seja um array de strings
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

        // Ordenar planos: Essencial, Pro, Premium, Empresarial
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
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

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

  const handleSelectPlanForPayment = (plan: SubscriptionPlan, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (plan.price_monthly === 0) {
      // Plano empresarial - abrir WhatsApp
      window.open('https://wa.me/5592999999999?text=Olá! Gostaria de saber mais sobre o plano empresarial do Ofertivo.', '_blank', 'noopener,noreferrer');
      return;
    }

    // Abrir checkout da Cakto diretamente
    const success = openCaktoCheckout(plan.name);
    
    if (success) {
      toast.success('Redirecionando para o pagamento...', {
        description: 'Complete sua assinatura na janela que foi aberta.'
      });
      
      onPlanSelect(plan.id, plan.name);
    } else {
      toast.error('Plano não disponível', {
        description: 'Entre em contato com o suporte.'
      });
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
    <div className="space-y-4">
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {plans.map((plan, index) => (
          <Card 
            key={plan.id}
            className={`relative cursor-pointer transition-all hover:shadow-lg ${
              selectedPlanId === plan.id 
                ? 'ring-2 ring-primary shadow-lg' 
                : 'hover:border-primary/50'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${
              plan.name === 'Pro' ? 'border-green-500 shadow-green-100' : ''
            }`}
            onClick={() => !disabled && onPlanSelect(plan.id, plan.name)}
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
              <CardTitle className="text-lg">{plan.name}</CardTitle>
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
                  {!plan.max_raffles && (
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      <span>Sorteios ilimitados</span>
                    </div>
                  )}

                  {plan.features
                    .filter(feature => {
                      // Filtrar features que não sejam duplicatas dos campos estruturados
                      const lowerFeature = feature.toLowerCase();
                      return !lowerFeature.includes('ofertas') && 
                             !lowerFeature.includes('visualizações') && 
                             !lowerFeature.includes('sorteios');
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
                  onClick={(e) => handleSelectPlanForPayment(plan, e)}
                  variant={plan.price_monthly === 0 ? 'outline' : 'default'}
                  disabled={!businessId}
                >
                  {plan.price_monthly === 0 ? 'Fale Conosco' : 'Assinar Plano'}
                </Button>

                {selectedPlanId === plan.id && (
                  <div className="pt-2">
                    <Badge className="bg-green-500 text-white w-full justify-center">
                      Plano Selecionado
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SubscriptionPlanSelect;
