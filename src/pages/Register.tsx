import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import CategorySelect from '@/components/CategorySelect';

const Register = () => {
  const [userType, setUserType] = useState('consumer');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessCategory, setBusinessCategory] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  
  const { signUp, signInWithGoogle, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Set initial type from URL params and extract referral code
    const urlParams = new URLSearchParams(location.search);
    const refCode = urlParams.get('ref');
    if (refCode) {
      setReferralCode(refCode);
      toast.info('Código de indicação aplicado! Escolha o tipo de conta para ganhar pontos de bônus.');
    }
    if (location.pathname.includes('/anunciante') || location.pathname.includes('/cadastro/negocio')) setUserType('business');

    if (isAuthenticated && !isLoading) {
      navigate('/');
    }
  }, [isAuthenticated, isLoading, navigate, location.search, location.pathname]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações frontend
    if (!fullName.trim() || fullName.trim().length < 3) {
      toast.error('Nome completo deve ter pelo menos 3 caracteres');
      return;
    }
    
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      toast.error('Email inválido');
      return;
    }
    
    if (!phone.match(/^\d{10,11}$/)) {
      toast.error('Telefone inválido. Digite apenas números (DDD + número)');
      return;
    }
    
    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    
    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }
    
    if (!acceptTerms) {
      toast.error('Você deve aceitar os termos de uso');
      return;
    }

    // Validar código de referral se fornecido
    let referrerId = null;
    if (referralCode && referralCode.trim()) {
      try {
        const { data: validationResult } = await supabase.rpc('validate_referral_code', {
          p_code: referralCode.trim()
        });

        const result = validationResult as any;
        if (!result?.valid) {
          toast.error(result?.message || 'Código de indicação inválido');
          return;
        }
        
        // Get referrer ID
        const { data: referrerProfile } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('referral_code', referralCode.trim().toUpperCase())
          .single();
        
        if (referrerProfile) {
          referrerId = referrerProfile.user_id;
        }

        const bonusPoints = userType === 'business' ? 100 : 150;
        toast.success(`Código válido! Você receberá ${bonusPoints} pontos de bônus ao completar o cadastro.`);
      } catch (error) {
        console.error('Erro ao validar código:', error);
        // Continuar mesmo se a validação falhar
      }
    }

    // Prepare user metadata
    const userData = {
      full_name: fullName.trim(),
      phone: phone.replace(/\D/g, ''),
      user_type: userType === 'business' ? 'business' : 'consumer',
      referred_by: referrerId,
      ...(referralCode && referralCode.trim() && { referral_code: referralCode.trim().toUpperCase() })
    };

    const result = await signUp(email, password, userData);
    if (result.success) {
      // Se for anunciante, criar registro do negócio mínimo
      if (userType === 'business' && result.data?.user) {
        try {
          // esperar trigger criar perfil
          await new Promise((r) => setTimeout(r, 1500));
          await supabase.from('businesses').insert({
            owner_id: result.data.user.id,
            name: businessName,
            category: businessCategory,
            description: null,
            phone: phone || null,
            whatsapp: null,
            address: businessAddress,
            latitude: -3.1190275,
            longitude: -60.0217314,
            is_active: true
          });
        } catch (e) {
          console.error('Erro ao criar negócio:', e);
        }
        navigate('/anunciante/dashboard');
        return;
      }
      // Consumer flow
      navigate('/ofertas');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-glow border-0">
          <CardHeader className="text-center p-4 sm:p-6">
            <Link to="/" className="text-2xl sm:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-3 sm:mb-4 block">
              Ofertivo
            </Link>
            <CardTitle className="text-xl sm:text-2xl">Crie sua conta</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Junte-se à maior comunidade de ofertas da sua cidade
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-3">
                <Label>Tipo de conta</Label>
                <RadioGroup
                  value={userType}
                  onValueChange={(value) => setUserType(value as 'consumer' | 'business')}
                  className="grid grid-cols-2 gap-4"
                >
                  <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-accent transition-colors cursor-pointer">
                    <RadioGroupItem value="consumer" id="consumer" />
                    <Label htmlFor="consumer" className="cursor-pointer flex-1">
                      <div className="font-semibold">Consumidor</div>
                      <div className="text-xs text-muted-foreground">Descubra ofertas e ganhe pontos</div>
                      {referralCode && <div className="text-xs text-primary mt-1">+150 pontos de bônus</div>}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-accent transition-colors cursor-pointer">
                    <RadioGroupItem value="business" id="business" />
                    <Label htmlFor="business" className="cursor-pointer flex-1">
                      <div className="font-semibold">Anunciante</div>
                      <div className="text-xs text-muted-foreground">Crie ofertas e atraia clientes</div>
                      {referralCode && <div className="text-xs text-primary mt-1">+100 pontos de bônus</div>}
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">Nome completo</Label>
                <Input 
                  id="fullName" 
                  placeholder="João Silva"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input 
                  id="phone" 
                  type="tel" 
                  placeholder="(92) 99999-9999"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>

              {userType === 'business' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="businessName">Nome do negócio</Label>
                    <Input 
                      id="businessName" 
                      placeholder="Minha Loja"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      required
                    />
                  </div>
                  <CategorySelect
                    value={businessCategory}
                    onValueChange={setBusinessCategory}
                    required
                  />
                  <div className="space-y-2">
                    <Label htmlFor="businessAddress">Endereço do negócio</Label>
                    <Input
                      id="businessAddress"
                      placeholder="Rua, número, bairro, sua cidade"
                      value={businessAddress}
                      onChange={(e) => setBusinessAddress(e.target.value)}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Os detalhes avançados podem ser completados depois no painel do anunciante.
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="referralCode">Código de indicação (opcional)</Label>
                <Input 
                  id="referralCode" 
                  placeholder="Código do amigo que te indicou"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                />
                <p className="text-xs text-muted-foreground">
                  {referralCode ? `🎉 Você ganhará ${userType === 'business' ? 100 : 150} pontos extras!` : 'Se foi indicado por um amigo, digite o código aqui. Sem código, você ganha 100 pontos de boas-vindas!'}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="Crie uma senha forte"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar senha</Label>
                <Input 
                  id="confirmPassword" 
                  type="password" 
                  placeholder="Confirme sua senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <div className="flex items-start space-x-2 text-sm">
                <input 
                  type="checkbox" 
                  className="rounded mt-1"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  required
                />
                <span>
                  Aceito os{' '}
                  <Link to="/termos" className="text-primary hover:underline">
                    termos de uso
                  </Link>{' '}
                  e{' '}
                  <Link to="/privacidade" className="text-primary hover:underline">
                    política de privacidade
                  </Link>
                </span>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-primary" 
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? 'Criando conta...' : 'Criar conta'}
              </Button>
            </form>
            
            <Separator className="my-4" />
            
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                size="lg"
                disabled={isLoading}
                onClick={() =>
                  signInWithGoogle(userType === 'business' ? 'business' : 'consumer', {
                    referralCode: referralCode || undefined,
                    mode: 'register',
                  })
                }
              >
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continuar com Google
              </Button>
            </div>

            
            <div className="text-center text-sm mt-4">
              Já tem uma conta?{' '}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Faça login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Register;