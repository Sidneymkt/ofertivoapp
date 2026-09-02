import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Share2,
  Copy,
  Clock,
  CheckCircle,
  Coins,
  Award,
  UserPlus,
  Building
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getAppBaseUrl } from '@/lib/config';

interface ReferralData {
  referral_code: string;
  total_referrals: number;
  user_referrals: number;
  business_referrals: number;
  points_earned_from_referrals: number;
  commissions_earned: number;
  commissions_pending: number;
  recent_referrals: Array<{
    name: string;
    type: 'user' | 'business';
    points_earned: number;
    date: string;
  }>;
}

interface ReferralSystemProps {
  showCommissions?: boolean;
  compact?: boolean;
}

export const ReferralSystem: React.FC<ReferralSystemProps> = ({ 
  showCommissions = false, 
  compact = false 
}) => {
  const { user } = useAuth();
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchReferralData();
    }
  }, [user]);

  const fetchReferralData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Buscar ou criar código de referência no perfil
      let { data: profile } = await supabase
        .from('profiles')
        .select('referral_code')
        .eq('user_id', user.id)
        .single();

      // Se não tiver código, criar um
      if (!profile?.referral_code) {
        const referralCode = generateReferralCode();
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ referral_code: referralCode })
          .eq('user_id', user.id);
        
        if (updateError) throw updateError;
        profile = { referral_code: referralCode };
      }

      // Buscar usuários indicados
      const { data: referredUsers } = await supabase
        .from('profiles')
        .select('user_id, full_name, user_type, created_at')
        .eq('referred_by', user.id)
        .order('created_at', { ascending: false });

      // Buscar pontos ganhos por indicação
      const { data: referralPoints } = await supabase
        .from('user_points')
        .select('points_earned, created_at, description')
        .eq('user_id', user.id)
        .eq('action_type', 'referral')
        .order('created_at', { ascending: false });

      // Buscar estatísticas de comissão (se aplicável)
      const { data: referralStats } = await supabase
        .from('referral_stats')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      const totalPointsFromReferrals = referralPoints?.reduce((sum, p) => sum + p.points_earned, 0) || 0;
      const userReferrals = referredUsers?.filter(u => u.user_type === 'consumer').length || 0;
      const businessReferrals = referredUsers?.filter(u => u.user_type === 'business').length || 0;
      
      const recentReferrals = (referredUsers || []).slice(0, 5).map(user => ({
        name: user.full_name || 'Usuário não identificado',
        type: user.user_type === 'business' ? 'business' as const : 'user' as const,
        points_earned: user.user_type === 'business' ? 100 : 50,
        date: user.created_at
      }));

      setReferralData({
        referral_code: profile.referral_code,
        total_referrals: referredUsers?.length || 0,
        user_referrals: userReferrals,
        business_referrals: businessReferrals,
        points_earned_from_referrals: totalPointsFromReferrals,
        commissions_earned: referralStats?.total_commissions_earned || 0,
        commissions_pending: referralStats?.total_commissions_pending || 0,
        recent_referrals: recentReferrals
      });

    } catch (error) {
      console.error('Error fetching referral data:', error);
      toast.error('Erro ao carregar dados de indicação');
    } finally {
      setLoading(false);
    }
  };

  const generateReferralCode = () => {
    return user?.id ? user.id.substring(0, 8).toUpperCase() : '';
  };

  const getReferralLink = (type: 'user' | 'business' = 'user') => {
    const referralCode = referralData?.referral_code || generateReferralCode();
    const endpoint = type === 'business' ? '/anunciante/cadastro' : '/cadastro';
    return `${getAppBaseUrl()}${endpoint}?ref=${referralCode}`;
  };

  const copyReferralCode = async () => {
    try {
      await navigator.clipboard.writeText(referralData?.referral_code || '');
      toast.success('Código de indicação copiado!');
    } catch (error) {
      toast.error('Erro ao copiar código');
    }
  };

  const copyReferralLink = async (type: 'user' | 'business') => {
    try {
      await navigator.clipboard.writeText(getReferralLink(type));
      toast.success(`Link de indicação ${type === 'business' ? 'para negócios' : 'para usuários'} copiado!`);
    } catch (error) {
      toast.error('Erro ao copiar link');
    }
  };

  const shareReferralLink = async (type: 'user' | 'business') => {
    const link = getReferralLink(type);
    const title = type === 'business' ? 
      'Cadastre seu negócio no Ofertivo' : 
      'Descubra ofertas incríveis no Ofertivo';
    const text = type === 'business' ?
      'Cadastre seu negócio no Ofertivo e aumente suas vendas!' :
      'Descubra ofertas incríveis perto de você no Ofertivo!';

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: link });
      } catch (error) {
        await copyReferralLink(type);
      }
    } else {
      await copyReferralLink(type);
    }
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

  if (compact) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Share2 className="h-5 w-5" />
            Sistema de Indicações
          </CardTitle>
          <CardDescription>
            Seu código: <span className="font-mono font-bold text-primary">{referralData?.referral_code}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-xl font-bold">{referralData?.total_referrals || 0}</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Pontos</p>
              <p className="text-xl font-bold">{referralData?.points_earned_from_referrals || 0}</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button size="sm" onClick={() => shareReferralLink('user')} className="flex-1">
              <Users className="h-4 w-4 mr-1" />
              Usuário
            </Button>
            <Button size="sm" variant="outline" onClick={() => shareReferralLink('business')} className="flex-1">
              <Building className="h-4 w-4 mr-1" />
              Negócio
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const nextMilestone = referralData && referralData.total_referrals < 5 ? 5 : 
                      referralData && referralData.total_referrals < 10 ? 10 : 
                      referralData && referralData.total_referrals < 25 ? 25 : 50;

  const progress = referralData ? (referralData.total_referrals / nextMilestone) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Sistema de Indicações</h2>
        <p className="text-muted-foreground">
          Indique amigos e negócios para ganhar pontos {showCommissions ? 'e comissões' : ''}
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
            Compartilhe este código para que outros se cadastrem
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-lg">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-1">Código de Indicação</p>
              <p className="text-2xl font-mono font-bold text-primary">
                {referralData?.referral_code || generateReferralCode()}
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={copyReferralCode} variant="outline" size="sm">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Share Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button 
              onClick={() => shareReferralLink('user')} 
              variant="outline"
              className="w-full"
            >
              <Users className="h-4 w-4 mr-2" />
              Indicar Usuário (+50 pts)
            </Button>
            <Button 
              onClick={() => shareReferralLink('business')} 
              variant="outline"
              className="w-full"
            >
              <Building className="h-4 w-4 mr-2" />
              Indicar Negócio (+100 pts)
            </Button>
          </div>

          {/* Link Fields for Manual Copy */}
          <div className="space-y-3 pt-2 border-t">
            <div>
              <Label htmlFor="user-link" className="text-sm">Link para Usuários</Label>
              <div className="flex gap-2">
                <Input
                  id="user-link"
                  value={getReferralLink('user')}
                  readOnly
                  className="text-xs"
                />
                <Button size="sm" variant="outline" onClick={() => copyReferralLink('user')}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
            
            <div>
              <Label htmlFor="business-link" className="text-sm">Link para Negócios</Label>
              <div className="flex gap-2">
                <Input
                  id="business-link"
                  value={getReferralLink('business')}
                  readOnly
                  className="text-xs"
                />
                <Button size="sm" variant="outline" onClick={() => copyReferralLink('business')}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Indicações</p>
                <p className="text-3xl font-bold">{referralData?.total_referrals || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Coins className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pontos por Indicações</p>
                <p className="text-3xl font-bold">{referralData?.points_earned_from_referrals || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {showCommissions && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Comissões Ganhas</p>
                  <p className="text-3xl font-bold">R$ {(referralData?.commissions_earned || 0).toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Progress to Next Milestone */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Progresso para Próxima Meta
          </CardTitle>
          <CardDescription>
            Indique {nextMilestone - (referralData?.total_referrals || 0)} pessoas para desbloquear a próxima recompensa
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Meta: {nextMilestone} indicações</span>
              <span>{referralData?.total_referrals || 0}/{nextMilestone}</span>
            </div>
            <Progress value={progress} className="h-3" />
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {nextMilestone * 25}
              </p>
              <p className="text-sm text-muted-foreground">Pontos de Bônus na Meta</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {Math.max(0, nextMilestone - (referralData?.total_referrals || 0))}
              </p>
              <p className="text-sm text-muted-foreground">Restam para a Meta</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Referrals */}
      <Card>
        <CardHeader>
          <CardTitle>Indicações Recentes</CardTitle>
          <CardDescription>
            Suas últimas indicações e pontos ganhos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {referralData && referralData.recent_referrals.length > 0 ? (
            <div className="space-y-4">
              {referralData.recent_referrals.map((referral, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-card rounded-lg border">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-full">
                      {referral.type === 'business' ? (
                        <Building className="h-5 w-5 text-primary" />
                      ) : (
                        <Users className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium">{referral.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {referral.type === 'business' ? 'Negócio' : 'Usuário'} • {format(new Date(referral.date), 'dd/MM/yyyy', { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">
                      +{referral.points_earned} pts
                    </p>
                    <Badge variant="default" className="mt-1">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Concluído
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium mb-2">Nenhuma indicação ainda</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Compartilhe seu código de indicação para começar a ganhar pontos
              </p>
              <Button onClick={() => shareReferralLink('user')} size="sm">
                <Share2 className="h-4 w-4 mr-2" />
                Fazer Primeira Indicação
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tips Card */}
      <Card>
        <CardHeader>
          <CardTitle>💡 Dicas para Indicar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <Users className="h-5 w-5 text-blue-500 mt-0.5" />
            <div>
              <p className="font-medium">Indique Amigos</p>
              <p className="text-sm text-muted-foreground">
                Compartilhe nas redes sociais e grupos de WhatsApp (+50 pontos por amigo)
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Building className="h-5 w-5 text-yellow-500 mt-0.5" />
            <div>
              <p className="font-medium">Indique Negócios</p>
              <p className="text-sm text-muted-foreground">
                Fale com comerciantes locais sobre os benefícios do Ofertivo (+100 pontos {showCommissions ? '+ comissões' : ''})
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <TrendingUp className="h-5 w-5 text-green-500 mt-0.5" />
            <div>
              <p className="font-medium">Bônus por Metas</p>
              <p className="text-sm text-muted-foreground">
                Ganhe pontos extras ao atingir 5, 10, 25 e 50 indicações
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};