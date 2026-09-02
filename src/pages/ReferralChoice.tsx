import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Store, Gift, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function ReferralChoice() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [referralCode, setReferralCode] = useState('');
  const [referrerName, setReferrerName] = useState('');
  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (!ref) {
      toast.error('Código de indicação não encontrado');
      navigate('/cadastro');
      return;
    }

    // Redirect directly to register page with ref parameter
    navigate(`/cadastro?ref=${ref.trim()}`);
  }, [searchParams, navigate]);

  const handleChoice = (type: 'consumer' | 'business') => {
    const route = type === 'consumer' ? '/cadastro' : '/anunciante/cadastro';
    navigate(`${route}?ref=${referralCode}`);
  };

  if (isValidating) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl shadow-glow border-0">
          <CardContent className="p-12 text-center">
            <div className="animate-pulse space-y-4">
              <Gift className="h-16 w-16 mx-auto text-primary" />
              <p className="text-lg">Validando código de indicação...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-4">
            Ofertivo
          </Link>
          <div className="mt-4 p-4 bg-primary/10 rounded-lg border-2 border-primary/20 inline-block">
            <Gift className="h-8 w-8 text-primary mx-auto mb-2" />
            <p className="text-lg font-semibold">
              🎉 {referrerName} te convidou para o Ofertivo!
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Escolha como deseja se cadastrar e ganhe pontos de bônus
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Consumer Card */}
          <Card className="shadow-glow border-2 border-transparent hover:border-primary/50 transition-all cursor-pointer group">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="h-10 w-10 text-primary" />
              </div>
              <CardTitle className="text-2xl">Sou Consumidor</CardTitle>
              <CardDescription className="text-base">
                Descubra ofertas incríveis perto de você
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-accent rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-primary">+50 pontos</div>
                <div className="text-sm text-muted-foreground">Bônus de boas-vindas</div>
              </div>
              
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Encontre as melhores ofertas da sua região</span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Acumule pontos em cada check-in</span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Participe de sorteios exclusivos</span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Troque pontos por recompensas</span>
                </li>
              </ul>

              <Button 
                onClick={() => handleChoice('consumer')}
                className="w-full bg-gradient-primary"
                size="lg"
              >
                Cadastrar como Consumidor
              </Button>
            </CardContent>
          </Card>

          {/* Business Card */}
          <Card className="shadow-glow border-2 border-transparent hover:border-primary/50 transition-all cursor-pointer group">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Store className="h-10 w-10 text-primary" />
              </div>
              <CardTitle className="text-2xl">Sou Anunciante</CardTitle>
              <CardDescription className="text-base">
                Divulgue seu negócio e atraia mais clientes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-accent rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-primary">+100 pontos</div>
                <div className="text-sm text-muted-foreground">Bônus de boas-vindas + Comissões</div>
              </div>
              
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Crie ofertas ilimitadas para seu negócio</span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Gerencie clientes com CRM integrado</span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Crie sorteios para engajar clientes</span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Analytics e relatórios detalhados</span>
                </li>
              </ul>

              <Button 
                onClick={() => handleChoice('business')}
                className="w-full bg-gradient-primary"
                size="lg"
              >
                Cadastrar como Anunciante
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground">
            Já tem uma conta?{' '}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Faça login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
