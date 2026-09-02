import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const PaymentSuccess: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'checking' | 'success' | 'pending' | 'error'>('checking');
  const [planName, setPlanName] = useState<string>('');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!user) {
      navigate('/anunciante/login');
      return;
    }

    checkSubscriptionStatus();
  }, [user, retryCount]);

  const checkSubscriptionStatus = async () => {
    try {
      // Buscar business do usuário
      const { data: business } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (!business) {
        setStatus('error');
        return;
      }

      // Verificar se há assinatura ativa
      const { data: subscription } = await supabase
        .from('business_subscriptions')
        .select(`
          *,
          subscription_plans!inner(name)
        `)
        .eq('business_id', business.id)
        .eq('status', 'active')
        .eq('payment_status', 'active')
        .single();

      if (subscription) {
        setStatus('success');
        setPlanName((subscription.subscription_plans as any).name);
      } else if (retryCount < 5) {
        // Tentar novamente após 3 segundos (máximo 5 tentativas)
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
        }, 3000);
      } else {
        // Após 5 tentativas, acionar sincronização manual
        await syncPendingPayments(business.id);
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
      if (retryCount < 5) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
        }, 3000);
      } else {
        setStatus('pending');
      }
    }
  };

  const syncPendingPayments = async (businessId: string) => {
    try {
      toast.info('Sincronizando pagamento...');
      
      const { error } = await supabase.functions.invoke('sync-pending-payments');
      
      if (error) throw error;

      // Verificar novamente após sincronização
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Error syncing payments:', error);
      setStatus('pending');
    }
  };

  const handleCreateOffer = () => {
    navigate('/anunciante/ofertas/nova');
  };

  const handleGoToDashboard = () => {
    navigate('/anunciante/dashboard');
  };

  const handleContactSupport = () => {
    navigate('/anunciante/suporte');
  };

  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 flex items-center justify-center">
              <Loader2 className="w-16 h-16 text-primary animate-spin" />
            </div>
            <CardTitle className="text-2xl">Verificando seu pagamento...</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Estamos confirmando sua assinatura. Isso pode levar alguns instantes.
            </p>
            {retryCount > 0 && (
              <p className="text-sm text-muted-foreground">
                Tentativa {retryCount} de 5...
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Redirecionar automaticamente para o dashboard quando pagamento for confirmado
  useEffect(() => {
    if (status === 'success') {
      toast.success(`Bem-vindo ao Plano ${planName}! 🎉`, {
        description: 'Sua assinatura está ativa. Redirecionando para o dashboard...'
      });
      
      // Redirecionar após 2 segundos para dar tempo de ler a mensagem
      const timer = setTimeout(() => {
        navigate('/anunciante/dashboard');
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [status, planName, navigate]);

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-primary/20 shadow-glow">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center animate-bounce">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Pagamento Confirmado!
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <div className="space-y-2">
              <p className="text-lg font-semibold">
                Bem-vindo ao Plano {planName}! 🎉
              </p>
              <p className="text-muted-foreground">
                Sua assinatura está ativa. Redirecionando para o dashboard...
              </p>
            </div>

            <div className="bg-primary/5 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-center gap-2 text-primary">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="font-semibold">Preparando tudo para você...</span>
              </div>
              <ul className="text-sm text-left space-y-1 text-muted-foreground">
                <li>✓ Criar suas primeiras ofertas atrativas</li>
                <li>✓ Configurar sorteios para engajar clientes</li>
                <li>✓ Acompanhar resultados no dashboard</li>
              </ul>
            </div>

            <div className="flex flex-col gap-3">
              <Button 
                onClick={handleGoToDashboard}
                size="lg"
                className="w-full bg-gradient-primary hover:shadow-glow transition-all"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Ir para o Dashboard Agora
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-yellow-500/20">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center">
              <AlertCircle className="w-10 h-10 text-yellow-500" />
            </div>
            <CardTitle className="text-2xl">Pagamento em Processamento</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Seu pagamento foi recebido e está sendo processado. Isso pode levar alguns minutos.
            </p>
            <p className="text-sm text-muted-foreground">
              Você receberá uma notificação assim que sua assinatura for ativada.
            </p>
            <div className="flex flex-col gap-3 mt-6">
              <Button 
                onClick={handleGoToDashboard}
                size="lg"
                className="w-full"
              >
                Voltar ao Dashboard
              </Button>
              <Button 
                onClick={handleContactSupport}
                variant="outline"
                size="lg"
                className="w-full"
              >
                Falar com Suporte
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-destructive/20">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Erro ao Verificar Pagamento</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            Não conseguimos verificar o status do seu pagamento. Por favor, entre em contato com o suporte.
          </p>
          <div className="flex flex-col gap-3 mt-6">
            <Button 
              onClick={handleContactSupport}
              size="lg"
              className="w-full"
            >
              Falar com Suporte
            </Button>
            <Button 
              onClick={handleGoToDashboard}
              variant="outline"
              size="lg"
              className="w-full"
            >
              Voltar ao Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;