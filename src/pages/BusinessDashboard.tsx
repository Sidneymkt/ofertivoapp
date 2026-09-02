import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { BackButton } from '@/components/BackButton';
import { 
  Plus, 
  Eye, 
  TrendingUp, 
  Users, 
  Target,
  Gift,
  BarChart3,
  Settings,
  LogOut,
  Store,
  CreditCard,
  QrCode,
  HelpCircle,
  MessageSquare,
  Sparkles,
  Award
} from 'lucide-react';
import BusinessThemeToggle from '@/components/BusinessThemeToggle';

import AnalyticsChart from '@/components/business/AnalyticsChart';
import { useBusinessAnalyticsTimeSeries, type AnalyticsPeriod } from '@/hooks/useBusinessAnalyticsTimeSeries';
import CheckinAnalytics from '@/components/business/CheckinAnalytics';
import OfferQRGenerator from '@/components/business/OfferQRGenerator';
import ManualCodeGenerator from '@/components/business/ManualCodeGenerator';
import CheckinInstructions from '@/components/business/CheckinInstructions';
import RecentCheckinsCard from '@/components/RecentCheckinsCard';
import BusinessTipsFooter from '@/components/BusinessTipsFooter';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { useBusinessDashboardRealtimeSync } from '@/hooks/useRealtimeSubscription';
import CheckinSuccessModal, { type CheckinSuccessData } from '@/components/business/CheckinSuccessModal';
import PointsWalletCard from '@/components/business/PointsWalletCard';
import WalletTransactionHistory from '@/components/business/WalletTransactionHistory';
import { LiveMetricsPanel } from '@/components/business/LiveMetricsPanel';
import { QuickOfferTemplates } from '@/components/business/QuickOfferTemplates';
import { useNearbyEngagedUsers } from '@/hooks/useNearbyEngagedUsers';


const BusinessDashboard = () => {
  const { user, signOut, isLoading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { unreadCount } = useUnreadMessages();
  const [realtimeStats, setRealtimeStats] = useState({
    newCheckins: 0,
    todayCheckins: 0,
    liveUsers: 0
  });
  const [checkinModalOpen, setCheckinModalOpen] = useState(false);
  const [checkinModalData, setCheckinModalData] = useState<CheckinSuccessData | null>(null);
  const lastCheckinKeyRef = useRef<string | null>(null);
  const [analyticsPeriod, setAnalyticsPeriod] = useState<AnalyticsPeriod>(30);

  // Redirect to login if not authenticated
  React.useEffect(() => {
    if (!isLoading && !user) {
      navigate('/anunciante/login');
    }
  }, [user, isLoading, navigate]);

  const { data: businessData, isLoading: isLoadingData, error, refetch } = useQuery({
    queryKey: ['business-dashboard', user?.id],
    queryFn: async () => {
      if (!user) return null;

      console.log('Fetching business data for user:', user.id);

      try {
        // First, get the business
        const { data: business, error: businessError } = await supabase
          .from('businesses')
          .select('*')
          .eq('owner_id', user.id)
          .maybeSingle();

        if (businessError) {
          console.error('Error fetching business:', businessError);
          throw businessError;
        }

        if (!business) {
          console.log('No business found for user');
          return { business: null, offers: [], analytics: [], stats: { views: 0, likes: 0, checkins: 0, todayCheckins: 0 } };
        }

        console.log('Business found:', business);

        // Then get offers for this business
        const { data: offers, error: offersError } = await supabase
          .from('offers')
          .select('*')
          .eq('business_id', business.id);

        if (offersError) {
          console.error('Error fetching offers:', offersError);
        }

        const offerIds = (offers || []).map(o => o.id);

        // Get real counts from source tables
        let totalViews = 0;
        let totalLikes = 0;
        let totalCheckins = 0;
        let todayCheckins = 0;
        let totalShares = 0;
        
        // Map to store per-offer counts
        const offerViewsMap: Record<string, number> = {};
        const offerLikesMap: Record<string, number> = {};
        const offerCheckinsMap: Record<string, number> = {};

        if (offerIds.length > 0) {
          // Get views per offer
          const { data: viewsData } = await supabase
            .from('offer_views')
            .select('offer_id')
            .in('offer_id', offerIds);
          
          if (viewsData) {
            viewsData.forEach(v => {
              offerViewsMap[v.offer_id] = (offerViewsMap[v.offer_id] || 0) + 1;
            });
            totalViews = viewsData.length;
          }

          // Get likes per offer
          const { data: likesData } = await supabase
            .from('offer_likes')
            .select('offer_id')
            .in('offer_id', offerIds);
          
          if (likesData) {
            likesData.forEach(l => {
              offerLikesMap[l.offer_id] = (offerLikesMap[l.offer_id] || 0) + 1;
            });
            totalLikes = likesData.length;
          }

          // Get check-ins per offer
          const { data: checkinsData } = await supabase
            .from('offer_checkins')
            .select('offer_id, created_at')
            .eq('business_id', business.id);
          
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          if (checkinsData) {
            checkinsData.forEach(c => {
              offerCheckinsMap[c.offer_id] = (offerCheckinsMap[c.offer_id] || 0) + 1;
              if (new Date(c.created_at) >= today) {
                todayCheckins++;
              }
            });
            totalCheckins = checkinsData.length;
          }

          // Get shares count from business_analytics
          const { data: sharesData, count: sharesCount } = await supabase
            .from('business_analytics')
            .select('*', { count: 'exact', head: true })
            .eq('business_id', business.id)
            .eq('event_type', 'share');

          // Also sum shares_count from offers table
          const offersSharesSum = (offers || []).reduce((sum, offer) => sum + (offer.shares_count || 0), 0);
          
          // Use the maximum between analytics count and offers sum
          totalShares = Math.max(sharesCount || 0, offersSharesSum);
        }

        // Enrich offers with real counts
        const enrichedOffers = (offers || []).map(offer => ({
          ...offer,
          views_count: offerViewsMap[offer.id] || 0,
          likes_count: offerLikesMap[offer.id] || 0,
          current_uses: offerCheckinsMap[offer.id] || 0
        }));

        // Get analytics for this business
        const { data: analytics, error: analyticsError } = await supabase
          .from('business_analytics')
          .select('*')
          .eq('business_id', business.id)
          .order('created_at', { ascending: false })
          .limit(30);

        if (analyticsError) {
          console.error('Error fetching analytics:', analyticsError);
        }

        return { 
          business, 
          offers: enrichedOffers, 
          analytics: analytics || [],
        stats: {
            views: totalViews,
            likes: totalLikes,
            shares: totalShares,
            checkins: totalCheckins,
            todayCheckins
          }
        };
      } catch (error) {
        console.error('Error in businessData query:', error);
        throw error;
      }
    },
    enabled: !!user && !isLoading,
    retry: 1,
    refetchInterval: 30000 // Atualiza a cada 30 segundos
  });

  // Real-time sync for business dashboard
  useBusinessDashboardRealtimeSync(businessData?.business?.id);

  // Radar-eligible users (those that will actually show on the map)
  const { data: radarUsers } = useNearbyEngagedUsers(businessData?.business?.id ?? null);
  const radarUsersCount = (radarUsers || []).filter(u => u.latitude !== null && u.longitude !== null).length;

  // Setup realtime subscriptions for live updates
  useEffect(() => {
    if (!user || !businessData?.business) return;

    const businessId = businessData.business.id;
    
    // Subscribe to checkin validations in real-time
    const checkinChannel = supabase
      .channel('checkin-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'checkin_validations',
          filter: `business_id=eq.${businessId}`
        },
        (payload) => {
          console.log('New checkin received:', payload);

          // Modal (fallback): some flows may insert into this table
          const row = payload.new as any;
          const key = `checkin_validations:${row?.id ?? ''}`;
          if (key && lastCheckinKeyRef.current !== key) {
            lastCheckinKeyRef.current = key;
            setCheckinModalData({
              offerTitle: null,
              pointsAwarded: Number(row?.points_awarded ?? 0),
            });
            setCheckinModalOpen(true);
          }
          
          // Update real-time stats
          setRealtimeStats(prev => ({
            ...prev,
            newCheckins: prev.newCheckins + 1,
            todayCheckins: prev.todayCheckins + 1
          }));

          // Invalidate and refetch relevant queries
          queryClient.invalidateQueries({ queryKey: ['business-dashboard'] });
          queryClient.invalidateQueries({ queryKey: ['checkin-analytics'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'offer_checkins',
          filter: `business_id=eq.${businessId}`
        },
        async (payload) => {
          console.log('New offer checkin:', payload);

          const row = payload.new as any;
          const key = `offer_checkins:${row?.id ?? ''}`;
          if (key && lastCheckinKeyRef.current === key) {
            return;
          }
          lastCheckinKeyRef.current = key;

          let offerTitle: string | null | undefined = null;
          let fallbackPoints: number | null = null;

          if (row?.offer_id) {
            const { data: offer } = await supabase
              .from('offers')
              .select('title, checkin_points')
              .eq('id', row.offer_id)
              .maybeSingle();

            offerTitle = offer?.title ?? null;
            fallbackPoints = typeof offer?.checkin_points === 'number' ? offer.checkin_points : null;
          }

          setCheckinModalData({
            offerTitle,
            pointsAwarded: Number(row?.points_awarded ?? fallbackPoints ?? 0),
          });
          setCheckinModalOpen(true);
          
          // Invalidate offers and analytics
          queryClient.invalidateQueries({ queryKey: ['business-dashboard'] });
          queryClient.invalidateQueries({ queryKey: ['checkin-analytics'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'offers',
          filter: `business_id=eq.${businessId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['business-dashboard'] });
          queryClient.invalidateQueries({ queryKey: ['business-offers'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'follows',
          filter: `business_id=eq.${businessId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['business-dashboard'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'business_subscriptions',
          filter: `business_id=eq.${businessId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['business-dashboard'] });
          refetch();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'offer_likes',
        },
        (payload: any) => {
          // Verificar se o like é para uma oferta do negócio atual
          const offerIds = businessData?.offers?.map((o: any) => o.id) || [];
          if (payload.new && offerIds.includes(payload.new.offer_id)) {
            console.log('New like for business offer:', payload);
            queryClient.invalidateQueries({ queryKey: ['business-dashboard'] });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'offer_likes',
        },
        (payload: any) => {
          // Verificar se o unlike é para uma oferta do negócio atual
          const offerIds = businessData?.offers?.map((o: any) => o.id) || [];
          if (payload.old && offerIds.includes(payload.old.offer_id)) {
            console.log('Like removed from business offer:', payload);
            queryClient.invalidateQueries({ queryKey: ['business-dashboard'] });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'offer_views',
        },
        (payload: any) => {
          // Verificar se a view é para uma oferta do negócio atual
          const offerIds = businessData?.offers?.map((o: any) => o.id) || [];
          if (payload.new && offerIds.includes(payload.new.offer_id)) {
            console.log('New view for business offer:', payload);
            queryClient.invalidateQueries({ queryKey: ['business-dashboard'] });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'business_analytics',
          filter: `business_id=eq.${businessId}`,
        },
        () => {
          console.log('Business analytics change detected');
          queryClient.invalidateQueries({ queryKey: ['business-dashboard'] });
          refetch();
        }
      )
      .subscribe();

    // Subscribe to user presence for live user count
    const presenceChannel = supabase.channel(`business-presence-${businessId}`, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        // Count all users except the business owner
        const userCount = Object.keys(state).filter(key => key !== user.id).length;
        setRealtimeStats(prev => ({ ...prev, liveUsers: userCount }));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            user_id: user.id,
            business_id: businessId,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(checkinChannel);
      supabase.removeChannel(presenceChannel);
    };
  }, [user, businessData?.business, businessData?.offers, queryClient]);

  // Initialize realtime stats with database values
  useEffect(() => {
    const todayCheckins = businessData?.stats?.todayCheckins || 0;
    if (todayCheckins > 0) {
      setRealtimeStats(prev => ({
        ...prev,
        todayCheckins
      }));
    }
  }, [businessData?.stats?.todayCheckins]);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
      navigate('/');
    }
  };

  // Show loading state
  if (isLoading || isLoadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    console.error('Dashboard error:', error);
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Erro ao carregar dashboard</h2>
          <p className="text-muted-foreground mb-4">
            Ocorreu um erro ao carregar os dados do dashboard.
          </p>
          <Button onClick={() => window.location.reload()}>
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  // Redirect to setup if no business
  if (!isLoading && !isLoadingData && !businessData?.business) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Store className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-4">Configure seu negócio</h2>
          <p className="text-muted-foreground mb-4">
            Para acessar o dashboard, você precisa configurar seu perfil comercial.
          </p>
          <Button onClick={() => navigate('/anunciante/perfil')}>
            Configurar Agora
          </Button>
        </div>
      </div>
    );
  }

  const business = businessData?.business;
  const offers = businessData?.offers || [];
  const analytics = businessData?.analytics || [];
  const stats = businessData?.stats || { views: 0, likes: 0, shares: 0, checkins: 0, todayCheckins: 0 };

  const activeOffers = offers.filter(offer => offer.is_active);
  const totalViews = stats.views;
  const totalShares = stats.shares;
  const totalLikes = stats.likes;
  const totalRedemptions = stats.checkins;

  return (
    <div className="page-shell bg-background">
      <CheckinSuccessModal open={checkinModalOpen} onOpenChange={setCheckinModalOpen} data={checkinModalData} />
      <div className="page-container-wide">
        {/* Header - Responsive */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4">
          <div className="flex items-center gap-2 sm:gap-4">
            <BackButton to="/ofertas" label="Voltar ao Site" className="shrink-0" />
            <div>
              <h1 className="page-title">Dashboard do Anunciante</h1>
              <p className="page-subtitle">
                Bem-vindo, {business?.name || 'Anunciante'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto justify-end">
            <BusinessThemeToggle />
            <Link to="/anunciante/suporte">
              <Button variant="outline" size="sm" className="flex items-center text-sm">
                <HelpCircle className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Suporte</span>
              </Button>
            </Link>
            <Button 
              variant="outline" 
              onClick={handleSignOut}
              className="flex items-center text-sm"
              size="sm"
            >
              <LogOut className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>

        {/* Quick Actions - Compact Responsive Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-2 sm:gap-2.5 mb-6 sm:mb-8">
          <Link to="/anunciante/ofertas/nova" className="relative group">
            <Card className="h-full bg-gradient-primary hover:shadow-glow transition-all duration-300 hover:scale-105 border border-primary/20 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardContent className="flex flex-col items-center p-2 sm:p-3 text-center relative z-10">
                <div className="bg-white/20 rounded-full p-1.5 mb-1.5 group-hover:scale-110 transition-transform">
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <p className="font-bold text-[11px] sm:text-xs text-white leading-tight">Nova Oferta</p>
                <p className="text-[10px] text-white/80 hidden sm:block leading-tight">Criar</p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/anunciante/ofertas">
            <Card className="hover:shadow-md hover:border-primary/40 transition-all cursor-pointer h-full">
              <CardContent className="flex flex-col items-center p-2 sm:p-3 text-center">
                <Target className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500 mb-1.5" />
                <p className="font-semibold text-[11px] sm:text-xs leading-tight">Ofertas</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{activeOffers.length} ativas</p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/anunciante/sorteios">
            <Card className="hover:shadow-md hover:border-primary/40 transition-all cursor-pointer h-full">
              <CardContent className="flex flex-col items-center p-2 sm:p-3 text-center">
                <Gift className="w-5 h-5 sm:w-6 sm:h-6 text-purple-500 mb-1.5" />
                <p className="font-semibold text-[11px] sm:text-xs leading-tight">Sorteios</p>
                <p className="text-[10px] text-muted-foreground leading-tight hidden sm:block">Gerenciar</p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/anunciante/crm">
            <Card className="hover:shadow-md hover:border-primary/40 transition-all cursor-pointer h-full">
              <CardContent className="flex flex-col items-center p-2 sm:p-3 text-center">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-green-500 mb-1.5" />
                <p className="font-semibold text-[11px] sm:text-xs leading-tight">CRM</p>
                <p className="text-[10px] text-muted-foreground leading-tight hidden sm:block">Clientes</p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/anunciante/mensagens" className="relative">
            <Card className="hover:shadow-md hover:border-primary/40 transition-all cursor-pointer h-full">
              <CardContent className="flex flex-col items-center p-2 sm:p-3 text-center">
                <div className="relative">
                  <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500 mb-1.5" />
                  {unreadCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-1.5 -right-2 h-4 min-w-4 px-1 flex items-center justify-center text-[10px]"
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Badge>
                  )}
                </div>
                <p className="font-semibold text-[11px] sm:text-xs leading-tight">Mensagens</p>
                <p className="text-[10px] text-muted-foreground leading-tight hidden sm:block">
                  {unreadCount > 0 ? `${unreadCount} nova${unreadCount > 1 ? 's' : ''}` : 'Chat'}
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/anunciante/pix">
            <Card className="hover:shadow-glow hover:border-emerald-500/50 transition-all cursor-pointer h-full border-emerald-500/20 bg-emerald-500/5">
              <CardContent className="flex flex-col items-center p-2 sm:p-3 text-center">
                <QrCode className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500 mb-1.5" />
                <p className="font-semibold text-[11px] sm:text-xs leading-tight">PIX / Delivery</p>
                <p className="text-[10px] text-muted-foreground leading-tight hidden sm:block">Pagamentos e Pontos</p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/anunciante/planos">
            <Card className="hover:shadow-md hover:border-primary/40 transition-all cursor-pointer h-full">
              <CardContent className="flex flex-col items-center p-2 sm:p-3 text-center">
                <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500 mb-1.5" />
                <p className="font-semibold text-[11px] sm:text-xs leading-tight">Planos</p>
                <p className="text-[10px] text-muted-foreground leading-tight hidden sm:block">Upgrade</p>
              </CardContent>
            </Card>
          </Link>
        </div>


        {/* Main Content - Responsive Layout */}
        <div className="grid grid-responsive-2col gap-4 sm:gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Live Metrics Panel - NEW */}
            <LiveMetricsPanel
              totalViews={totalViews}
              totalLikes={totalLikes}
              totalShares={totalShares}
              totalCheckins={totalRedemptions}
              todayCheckins={realtimeStats.todayCheckins}
              followersCount={business?.followers_count || 0}
              liveUsers={radarUsersCount}
            />

            {/* Advanced Analytics Chart with integrated performance distribution */}
            <AnalyticsChartSection
              businessId={business?.id}
              period={analyticsPeriod}
              onPeriodChange={setAnalyticsPeriod}
              distribution={{
                totalViews,
                totalLikes,
                totalShares,
                totalRedemptions,
              }}
            />


            {/* Quick Offer Templates & Points Wallet - visible only on mobile */}
            <div className="lg:hidden space-y-4">
              <QuickOfferTemplates />
              <PointsWalletCard />
            </div>

            {/* Recent Check-ins */}
            <RecentCheckinsCard businessId={business?.id} />

            {/* Check-in Instructions */}
            <CheckinInstructions />


          </div>

          {/* Sidebar */}
          <div className="space-y-4 sm:space-y-6">
            {/* Quick Offer Templates - hidden on mobile (shown in main content) */}
            <div className="hidden lg:block">
              <QuickOfferTemplates />
            </div>

            {/* Points Wallet Card - hidden on mobile (shown in main content) */}
            <div className="hidden lg:block">
              <PointsWalletCard />
            </div>

            {/* Business Profile Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-base sm:text-lg">
                  <Store className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Meu Negócio
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold text-sm sm:text-base">{business?.name}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">{business?.category}</p>
                  </div>
                  <Separator />
                  <div className="space-y-2 text-xs sm:text-sm">
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <Badge variant={business?.is_active ? "default" : "secondary"} className="text-xs">
                        {business?.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Seguidores:</span>
                      <span>{business?.followers_count || 0}</span>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <Link to="/anunciante/perfil" className="flex-1">
                      <Button size="sm" className="w-full text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
                        <Settings className="w-4 h-4 mr-2" />
                        Editar Perfil
                      </Button>
                    </Link>
                    <Link to={`/negocio/${business?.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full text-xs font-semibold border-primary/30 text-primary hover:bg-primary/10">
                        <Store className="w-4 h-4 mr-2" />
                        Ver Perfil Público
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>



            {/* Patrocínios - Fundo Social */}
            <Link to="/anunciante/patrocinios">
              <Card className="hover:shadow-md transition-shadow cursor-pointer border border-yellow-500/30 bg-gradient-to-br from-yellow-500/5 to-transparent">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="bg-yellow-500/10 rounded-full p-2">
                    <Sparkles className="w-5 h-5 text-yellow-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">Patrocínios</p>
                    <p className="text-xs text-muted-foreground">Apoie o Fundo Social</p>
                  </div>
                  <Badge variant="outline" className="text-xs border-yellow-500/50 text-yellow-600">
                    Novo
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>

        {/* Business Tips Footer */}
        <BusinessTipsFooter />
      </div>
    </div>
  );
};

const AnalyticsChartSection: React.FC<{
  businessId: string | undefined;
  period: AnalyticsPeriod;
  onPeriodChange: (p: AnalyticsPeriod) => void;
  distribution?: {
    totalViews: number;
    totalLikes: number;
    totalShares: number;
    totalRedemptions: number;
  };
}> = ({ businessId, period, onPeriodChange, distribution }) => {
  const { data, isLoading } = useBusinessAnalyticsTimeSeries(businessId, period);
  return (
    <AnalyticsChart
      data={data || []}
      loading={isLoading}
      period={period}
      onPeriodChange={onPeriodChange}
      distribution={distribution}
    />
  );
};

export default BusinessDashboard;
