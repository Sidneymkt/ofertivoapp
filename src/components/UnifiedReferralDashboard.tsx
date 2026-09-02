import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Share2, Users, TrendingUp, Award, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { getAppBaseUrl } from '@/lib/config';

interface ReferralStats {
  total_referrals: number;
  consumer_referrals: number;
  business_referrals: number;
  total_points_earned: number;
  total_commissions_earned: number;
  total_commissions_pending: number;
  recent_referrals: Array<{
    id: string;
    full_name: string;
    user_type: string;
    created_at: string;
    points_awarded: number;
  }>;
}

export function UnifiedReferralDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [referralCode, setReferralCode] = useState('');

  useEffect(() => {
    if (user) {
      fetchReferralData();
      
      // Setup realtime subscription for new referrals
      const channel = supabase
        .channel('referral-tracking-updates')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'referral_tracking',
            filter: `referrer_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('Nova indicação registrada:', payload);
            toast.success('🎉 Nova indicação registrada!');
            fetchReferralData();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'referral_stats',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('Estatísticas de referral atualizadas:', payload);
            fetchReferralData();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchReferralData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Get referral code
      const { data: profile } = await supabase
        .from('profiles')
        .select('referral_code')
        .eq('user_id', user.id)
        .single();

      if (profile?.referral_code) {
        setReferralCode(profile.referral_code);
      }

      // Get referral tracking data
      const { data: trackingData } = await supabase
        .from('referral_tracking')
        .select(`
          *,
          profiles!referral_tracking_referred_user_id_fkey(full_name, user_type)
        `)
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      // Get referral stats
      const { data: statsData } = await supabase
        .from('referral_stats')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // Calculate stats
      const consumerReferrals = trackingData?.filter(t => t.referred_user_type === 'consumer').length || 0;
      const businessReferrals = trackingData?.filter(t => t.referred_user_type === 'business').length || 0;
      const totalPoints = trackingData?.reduce((sum, t) => sum + (t.referrer_points_awarded || 0), 0) || 0;

      setStats({
        total_referrals: (trackingData?.length || 0),
        consumer_referrals: consumerReferrals,
        business_referrals: businessReferrals,
        total_points_earned: totalPoints,
        total_commissions_earned: Number(statsData?.total_commissions_earned || 0),
        total_commissions_pending: Number(statsData?.total_commissions_pending || 0),
        recent_referrals: trackingData?.map(t => ({
          id: t.id,
          full_name: t.profiles?.full_name || 'Usuário',
          user_type: t.referred_user_type || 'consumer',
          created_at: t.created_at,
          points_awarded: t.referrer_points_awarded || 0,
        })) || [],
      });
    } catch (error) {
      console.error('Error fetching referral data:', error);
      toast.error('Erro ao carregar dados de indicações');
    } finally {
      setLoading(false);
    }
  };

  const getReferralLink = (type: 'user' | 'business') => {
    const baseUrl = getAppBaseUrl();
    const endpoint = type === 'business' ? '/anunciante/cadastro' : '/cadastro';
    return `${baseUrl}${endpoint}?ref=${referralCode}`;
  };

  const copyReferralLink = (type: 'user' | 'business') => {
    const link = getReferralLink(type);
    navigator.clipboard.writeText(link);
    toast.success('Link copiado!');
  };

  const shareReferralLink = async (type: 'user' | 'business') => {
    const link = getReferralLink(type);
    const typeLabel = type === 'business' ? 'Anunciante' : 'Consumidor';
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Junte-se ao Ofertivo como ${typeLabel}!`,
          text: `Use meu código ${referralCode} e ganhe pontos de bônus ao se cadastrar!`,
          url: link,
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      navigator.clipboard.writeText(link);
      toast.success('Link copiado para a área de transferência!');
    }
  };

  const copyReferralCode = () => {
    navigator.clipboard.writeText(referralCode);
    toast.success('Código copiado!');
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Referral Code Card */}
      <Card>
        <CardHeader>
          <CardTitle>Seu Código de Indicação</CardTitle>
          <CardDescription>
            Compartilhe este código e ganhe pontos quando alguém se cadastrar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex-1 p-4 bg-primary/10 rounded-lg border-2 border-primary/20">
              <code className="text-2xl font-bold text-primary">{referralCode}</code>
            </div>
            <Button variant="outline" size="icon" onClick={copyReferralCode}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          
          <Separator />
          
          <div className="space-y-3">
            <p className="text-sm font-medium">Links de Indicação:</p>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 truncate text-xs bg-primary/10 border border-primary/20 p-2 rounded">
                  {getReferralLink('user')}
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => copyReferralLink('user')}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copiar
                </Button>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="flex-1 truncate text-xs bg-primary/10 border border-primary/20 p-2 rounded">
                  {getReferralLink('business')}
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => copyReferralLink('business')}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copiar
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div className="text-center p-3 bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-lg">
              <div className="text-sm text-muted-foreground">Consumidor</div>
              <div className="text-2xl font-bold text-primary">+50</div>
              <div className="text-xs text-muted-foreground">pontos por indicação</div>
            </div>
            <div className="text-center p-3 bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-lg">
              <div className="text-sm text-muted-foreground">Anunciante</div>
              <div className="text-2xl font-bold text-primary">+100</div>
              <div className="text-xs text-muted-foreground">pontos + comissão</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Indicações</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_referrals || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.consumer_referrals || 0} consumidores, {stats?.business_referrals || 0} anunciantes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pontos Ganhos</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_points_earned || 0}</div>
            <p className="text-xs text-muted-foreground">
              Por indicações bem-sucedidas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comissões Ganhas</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {(stats?.total_commissions_earned || 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              De indicações de anunciantes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comissões Pendentes</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {(stats?.total_commissions_pending || 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Aguardando processamento
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Referrals */}
      <Card>
        <CardHeader>
          <CardTitle>Indicações Recentes</CardTitle>
          <CardDescription>Últimas pessoas que você indicou</CardDescription>
        </CardHeader>
        <CardContent>
          {stats?.recent_referrals && stats.recent_referrals.length > 0 ? (
            <div className="space-y-4">
              {stats.recent_referrals.map((referral) => (
                <div key={referral.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">{referral.full_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(referral.created_at).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={referral.user_type === 'business' ? 'default' : 'secondary'}>
                      {referral.user_type === 'business' ? 'Anunciante' : 'Consumidor'}
                    </Badge>
                    <div className="text-sm font-medium text-primary mt-1">
                      +{referral.points_awarded} pontos
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhuma indicação ainda</p>
              <p className="text-sm">Comece a compartilhar seu código!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tips Card */}
      <Card>
        <CardHeader>
          <CardTitle>Dicas para Ganhar Mais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-3">
            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-primary">1</span>
            </div>
            <div>
              <div className="font-medium">Compartilhe nas redes sociais</div>
              <div className="text-sm text-muted-foreground">
                Poste seu código no Instagram, Facebook e WhatsApp
              </div>
            </div>
          </div>
          <Separator />
          <div className="flex gap-3">
            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-primary">2</span>
            </div>
            <div>
              <div className="font-medium">Indique negócios locais</div>
              <div className="text-sm text-muted-foreground">
                Ganhe 100 pontos + comissão recorrente por cada anunciante
              </div>
            </div>
          </div>
          <Separator />
          <div className="flex gap-3">
            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-primary">3</span>
            </div>
            <div>
              <div className="font-medium">Ajude amigos e familiares</div>
              <div className="text-sm text-muted-foreground">
                Mostre como economizar com as ofertas do Ofertivo
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
