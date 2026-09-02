import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useBusiness } from '@/hooks/useBusiness';
import { useUserNavigation } from '@/hooks/useUserNavigation';
import { useCRMData } from '@/hooks/useCRMData';
import { usePayments } from '@/hooks/usePayments';
import { useCRMKanban } from '@/hooks/useCRMKanban';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { CRMKanbanBoard } from '@/components/CRMKanbanBoard';
import { supabase } from '@/integrations/supabase/client';
import { 
  ArrowLeft, 
  Users, 
  Download, 
  MessageCircle,
  MapPin,
  Clock,
  Phone,
  Mail,
  Bookmark,
  Gift,
  DollarSign,
  TrendingUp,
  Calendar,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

const BusinessCRM = () => {
  const { user, isAuthenticated, isLoading: authLoading, session } = useAuth();
  const navigate = useNavigate();
  const { navigateToUserProfile } = useUserNavigation();
  const { business, loading: businessLoading } = useBusiness();
  const { leads, stats, loading: crmLoading, refresh: refreshCRM, lastUpdate } = useCRMData(business?.id);
  const { transactions, loading: paymentsLoading, refetch: refetchTransactions } = usePayments(business?.id);
  const { hasActiveSubscription, planName } = useSubscriptionStatus();
  const isPro = hasActiveSubscription && planName !== 'Start';
  const kanban = useCRMKanban(business?.id, isPro);
  const [searchTerm, setSearchTerm] = useState('');
  const [subscription, setSubscription] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);

  // Debug logs
  console.log('[CRM] Component render');
  console.log('[CRM] Auth state:', {
    isAuthenticated,
    authLoading,
    hasUser: !!user,
    userId: user?.id,
    hasSession: !!session
  });
  console.log('[CRM] Business state:', {
    businessLoading,
    hasBusiness: !!business,
    businessId: business?.id
  });
  console.log('[CRM] Data state:', {
    crmLoading,
    paymentsLoading,
    leadsCount: leads.length,
    stats
  });

  // Fetch subscription and analytics data
  useEffect(() => {
    if (!business?.id) return;

    const fetchFinancialData = async () => {
      try {
        // Fetch subscription
        const { data: subData, error: subError } = await supabase
          .from('business_subscriptions')
          .select(`
            *,
            plan:subscription_plans(*)
          `)
          .eq('business_id', business.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (subError) throw subError;
        setSubscription(subData);

        // Buscar ofertas do negócio para filtrar views
        const { data: offersData } = await supabase
          .from('offers')
          .select('id')
          .eq('business_id', business.id);
        
        const offerIds = offersData?.map(o => o.id) || [];

        // Fetch offer_views count (visualizações reais)
        let viewsCount = 0;
        if (offerIds.length > 0) {
          const { count: viewsResult } = await supabase
            .from('offer_views')
            .select('id', { count: 'exact', head: true })
            .in('offer_id', offerIds);
          viewsCount = viewsResult || 0;
        }

        // Fetch favorites count (favoritaram)
        let favoritesCount = 0;
        if (offerIds.length > 0) {
          const { count: favResult } = await supabase
            .from('favorites')
            .select('id', { count: 'exact', head: true })
            .in('offer_id', offerIds);
          favoritesCount = favResult || 0;
        }

        // Fetch offer_likes count (cliques/curtidas)
        let clicksCount = 0;
        if (offerIds.length > 0) {
          const { count: likesResult } = await supabase
            .from('offer_likes')
            .select('id', { count: 'exact', head: true })
            .in('offer_id', offerIds);
          clicksCount = likesResult || 0;
        }

        // Fetch checkins count
        const { count: checkinsCount } = await supabase
          .from('offer_checkins')
          .select('id', { count: 'exact', head: true })
          .eq('business_id', business.id);

        const conversions = checkinsCount || 0;
        const conversionRate = viewsCount > 0 ? ((conversions / viewsCount) * 100).toFixed(1) : '0.0';

        setAnalytics({
          views: viewsCount,
          clicks: clicksCount,
          favorites: favoritesCount,
          conversions,
          conversionRate
        });
        
        console.log('[CRM] Analytics updated:', { views: viewsCount, clicks: clicksCount, favorites: favoritesCount, conversions, conversionRate });
      } catch (error) {
        console.error('Error fetching financial data:', error);
      }
    };

    fetchFinancialData();

    // Real-time subscription for business_subscriptions, transactions and analytics
    const channel = supabase
      .channel(`business_financial_${business.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'business_subscriptions',
          filter: `business_id=eq.${business.id}`,
        },
        () => {
          console.log('Subscription updated, refreshing financial data');
          fetchFinancialData();
          toast.success('Assinatura atualizada!');
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `business_id=eq.${business.id}`,
        },
        (payload) => {
          console.log('Transaction updated:', payload);
          refetchTransactions();
          fetchFinancialData();
          if (payload.eventType === 'UPDATE' && payload.new.status === 'paid') {
            toast.success('💳 Pagamento confirmado!');
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'business_analytics',
          filter: `business_id=eq.${business.id}`,
        },
        () => {
          console.log('New analytics event, refreshing data');
          fetchFinancialData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'favorites',
        },
        () => {
          console.log('[CRM Real-time] ❤️ Favorites change detected, refreshing');
          refreshCRM();
          fetchFinancialData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'offer_checkins',
          filter: `business_id=eq.${business.id}`,
        },
        () => {
          console.log('Offer checkins change detected, refreshing CRM');
          refreshCRM();
          fetchFinancialData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'checkin_validations',
          filter: `business_id=eq.${business.id}`,
        },
        () => {
          console.log('Checkin validations change detected, refreshing CRM');
          refreshCRM();
          fetchFinancialData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'offer_views',
        },
        () => {
          console.log('[CRM Real-time] 👁️ Offer views change detected, refreshing');
          refreshCRM();
          fetchFinancialData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'offer_likes',
        },
        () => {
          console.log('[CRM Real-time] ❤️ Offer likes change detected, refreshing');
          fetchFinancialData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'offer_checkins',
        },
        () => {
          console.log('[CRM Real-time] ❤️ Offer likes change detected, refreshing');
          fetchFinancialData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'offer_checkins',
        },
        () => {
          console.log('[CRM Real-time] ✅ Check-in/Conversão detected, refreshing');
          fetchFinancialData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [business?.id, refetchTransactions, refreshCRM]);

  // Auth check - only redirect after loading is complete
  useEffect(() => {
    console.log('[CRM] Auth check useEffect triggered');
    console.log('[CRM] States:', {
      authLoading,
      isAuthenticated,
      hasUser: !!user,
      businessLoading,
      hasBusiness: !!business
    });

    // Don't do anything while still loading authentication
    if (authLoading) {
      console.log('[CRM] Still loading auth, waiting...');
      return;
    }

    // After auth loading is complete, check if user is authenticated
    if (!isAuthenticated || !user) {
      console.log('[CRM] Not authenticated after loading, redirecting to login');
      toast.error('Você precisa estar logado para acessar o CRM');
      navigate('/login?redirect=/dashboard/clientes');
      return;
    }

    // User is authenticated, now check for business
    // Don't redirect while business is still loading
    if (businessLoading) {
      console.log('[CRM] Still loading business, waiting...');
      return;
    }

    // After business loading is complete, check if business exists
    if (!business) {
      console.log('[CRM] No business found after loading, redirecting to dashboard');
      toast.warning('Você precisa ter um negócio cadastrado para acessar o CRM');
      navigate('/dashboard');
      return;
    }

    console.log('[CRM] Auth check passed successfully');
  }, [authLoading, isAuthenticated, user, businessLoading, business, navigate]);

  const getInteractionIcon = (type: string) => {
    switch (type) {
      case 'checkin': return <MapPin className="w-4 h-4 text-success" />;
      case 'favorite': return <Bookmark className="w-4 h-4 text-primary" />;
      case 'share': return <Gift className="w-4 h-4 text-primary" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getInteractionLabel = (type: string) => {
    switch (type) {
      case 'checkin': return 'Check-in';
      case 'favorite': return 'Favoritou';
      case 'share': return 'Compartilhou';
      default: return 'Visualizou';
    }
  };

  const filteredLeads = leads.filter(lead => 
    lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.phone.includes(searchTerm)
  );

  const exportLeads = () => {
    if (leads.length === 0) {
      toast.error('Nenhum lead para exportar');
      return;
    }

    // Create CSV content
    const headers = ['Nome', 'Email', 'Telefone', 'Localização', 'Última Interação', 'Tipo', 'Total Interações', 'Ofertas Usadas'];
    const csvContent = [
      headers.join(','),
      ...leads.map(lead => [
        lead.name,
        lead.email,
        lead.phone,
        lead.location,
        new Date(lead.last_interaction).toLocaleDateString('pt-BR'),
        lead.interaction_type,
        lead.total_interactions,
        lead.offers_used
      ].join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `leads_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Leads exportados com sucesso!');
  };

  const handleRefresh = () => {
    console.log('[CRM] Manual refresh triggered');
    toast.info('🔄 Atualizando dados em tempo real...');
    refreshCRM();
    setTimeout(() => {
      toast.success('✅ Dados atualizados!');
    }, 1000);
  };

  const sendWhatsApp = (phone: string, name: string) => {
    const message = `Olá ${name}! Temos uma oferta especial para você no Ofertivo!`;
    const url = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // Show loading state while authentication or business is loading
  if (authLoading || businessLoading) {
    console.log('[CRM] Rendering loading state', { authLoading, businessLoading });
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">
            {authLoading ? 'Verificando autenticação...' : 'Carregando CRM...'}
          </p>
        </div>
      </div>
    );
  }

  // If not authenticated or no business after loading, return null (will be redirected by useEffect)
  if (!isAuthenticated || !user || !business) {
    console.log('[CRM] Not ready to render, returning null', {
      isAuthenticated,
      hasUser: !!user,
      hasBusiness: !!business
    });
    return null;
  }

  console.log('[CRM] Rendering main CRM interface');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </Link>
              <h1 className="text-xl font-semibold">CRM</h1>
              {lastUpdate && (
                <Badge variant="outline" className="gap-1 text-xs">
                  <Clock className="w-3 h-3" />
                  Atualizado {new Date(lastUpdate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </Badge>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Atualizar
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="kanban" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="kanban">Kanban</TabsTrigger>
            <TabsTrigger value="leads">Leads & Clientes</TabsTrigger>
            <TabsTrigger value="financial">Financeiro</TabsTrigger>
          </TabsList>

          <TabsContent value="kanban" className="space-y-6">
            {kanban.loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => (
                  <Skeleton key={i} className="h-[400px] w-full rounded-xl" />
                ))}
              </div>
            ) : (
              <CRMKanbanBoard
                leads={kanban.leads}
                stats={kanban.stats}
                isPro={isPro}
                isAtLimit={kanban.isAtLimit}
                freeLimit={kanban.FREE_LEAD_LIMIT}
                alertas={kanban.alertas}
                getLeadsByStatus={kanban.getLeadsByStatus}
                updateLeadStatus={kanban.updateLeadStatus}
                syncLeads={kanban.syncLeadsFromInteractions}
                dismissAlerta={kanban.dismissAlerta}
                updateLeadDetails={kanban.updateLeadDetails}
                deleteLead={kanban.deleteLead}
              />
            )}
          </TabsContent>

          <TabsContent value="leads" className="space-y-6">
            {/* Estatísticas de Leads */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-card to-card/80 border-0 shadow-elegant hover:shadow-glow transition-all duration-300">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <div className="text-3xl font-bold mb-1">{stats.totalLeads}</div>
                  <div className="text-sm text-muted-foreground">Total Leads</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-card to-card/80 border-0 shadow-elegant hover:shadow-glow transition-all duration-300">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Bookmark className="w-6 h-6 text-primary" />
                  </div>
                  <div className="text-3xl font-bold mb-1">{analytics?.favorites ?? stats.favorites}</div>
                  <div className="text-sm text-muted-foreground">Favoritaram</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-card to-card/80 border-0 shadow-elegant hover:shadow-glow transition-all duration-300">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <MapPin className="w-6 h-6 text-success" />
                  </div>
                  <div className="text-3xl font-bold mb-1">{stats.checkins}</div>
                  <div className="text-sm text-muted-foreground">Check-ins</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-card to-card/80 border-0 shadow-elegant hover:shadow-glow transition-all duration-300">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Gift className="w-6 h-6 text-primary" />
                  </div>
                  <div className="text-3xl font-bold mb-1">{stats.offersUsed}</div>
                  <div className="text-sm text-muted-foreground">Ofertas Usadas</div>
                </CardContent>
              </Card>
            </div>

            {/* Filtros e Ações */}
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
              <div className="flex-1 w-full">
                <Input
                  placeholder="Buscar por nome, email ou telefone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-12 bg-card border-0 shadow-elegant"
                />
              </div>
              <Button onClick={exportLeads} variant="outline" className="h-12 gap-2 shadow-elegant hover:shadow-glow">
                <Download className="w-4 h-4" />
                Exportar Excel
              </Button>
            </div>

            {/* Lista de Leads */}
            <div className="grid gap-4">
              {crmLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="border-0 shadow-card animate-pulse">
                      <CardContent className="p-4">
                        <div className="h-4 bg-muted rounded mb-2"></div>
                        <div className="h-4 bg-muted rounded w-2/3"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredLeads.length > 0 ? (
                filteredLeads.map((lead) => (
                  <Card key={lead.id} className="bg-gradient-to-br from-card to-card/80 border-0 shadow-elegant hover:shadow-glow transition-all duration-300 group">
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
                        {/* Avatar e Info Principal */}
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <button 
                            onClick={() => navigateToUserProfile(lead.user_id)}
                            className="w-14 h-14 bg-gradient-primary rounded-full flex items-center justify-center text-white font-bold text-xl hover:scale-110 transition-transform cursor-pointer shadow-elegant flex-shrink-0"
                            style={lead.avatar_url ? {
                              backgroundImage: `url(${lead.avatar_url})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center'
                            } : undefined}
                          >
                            {!lead.avatar_url && lead.name.charAt(0).toUpperCase()}
                          </button>
                          <div className="flex-1 min-w-0">
                            <button 
                              onClick={() => navigateToUserProfile(lead.user_id)}
                              className="text-left hover:underline cursor-pointer block"
                            >
                              <h3 className="font-bold text-lg">{lead.name}</h3>
                            </button>
                            <div className="flex items-center gap-2 text-sm">
                              {getInteractionIcon(lead.interaction_type)}
                              <span className={
                                lead.interaction_type === 'checkin' ? 'text-success' :
                                lead.interaction_type === 'favorite' ? 'text-red-500' :
                                'text-primary'
                              }>
                                {getInteractionLabel(lead.interaction_type)}
                              </span>
                              <span className="text-muted-foreground">• {new Date(lead.last_interaction).toLocaleDateString('pt-BR')}</span>
                            </div>
                          </div>
                        </div>

                        {/* Informações de Contato */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 flex-1 text-sm">
                          <div className="flex items-center gap-2 min-w-0">
                            <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <span className="truncate">{lead.email}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <span>{lead.phone}</span>
                          </div>
                          <div className="flex items-center gap-2 min-w-0">
                            <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <span className="truncate">{lead.location}</span>
                          </div>
                        </div>

                        {/* Métricas e Ações */}
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-lg">
                            <TrendingUp className="w-4 h-4 text-primary" />
                            <span className="text-sm font-semibold">{lead.total_interactions} interações</span>
                          </div>
                          <Button 
                            variant="default"
                            size="sm"
                            onClick={() => sendWhatsApp(lead.phone, lead.name)}
                            className="gap-2 shadow-elegant hover:shadow-glow"
                          >
                            <MessageCircle className="w-4 h-4" />
                            WhatsApp
                          </Button>
                          <Badge variant="secondary" className="text-sm px-3 py-1 shadow-card">
                            {lead.offers_used} ofertas usadas
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card className="border-0 shadow-card">
                  <CardContent className="p-12 text-center">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      {searchTerm ? 'Nenhum lead encontrado' : 'Nenhum lead ainda'}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {searchTerm 
                        ? 'Tente ajustar sua busca ou limpar o filtro' 
                        : 'Seus leads aparecerão aqui quando usuários interagirem com suas ofertas'}
                    </p>
                    {!searchTerm && (
                      <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                        <p>💡 Leads são gerados quando usuários:</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>Fazem check-in nas suas ofertas</li>
                          <li>Favoritam suas ofertas</li>
                          <li>Visualizam suas ofertas</li>
                        </ul>
                        <Link to="/dashboard/ofertas/criar" className="mt-4">
                          <Button variant="default" className="gap-2">
                            Criar Nova Oferta
                          </Button>
                        </Link>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="financial" className="space-y-6">
            {paymentsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : (
              <>
                {/* Plano Atual */}
                {subscription && (
                  <Card className="border-0 shadow-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5" />
                        Plano Atual
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-success">{subscription.plan?.name || 'Plano'}</div>
                          <div className="text-sm text-muted-foreground">Plano ativo</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">R$ {subscription.plan?.price_monthly?.toFixed(2) || '0.00'}</div>
                          <div className="text-sm text-muted-foreground">Mensalidade</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-primary">R$ {((analytics?.views || 0) * 0.5).toFixed(0)}</div>
                          <div className="text-sm text-muted-foreground">ROI Estimado</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Métricas de Performance */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="border-0 shadow-card">
                    <CardContent className="p-4 text-center">
                      <TrendingUp className="w-6 h-6 text-primary mx-auto mb-2" />
                      <div className="text-2xl font-bold">{analytics?.views?.toLocaleString() || '0'}</div>
                      <div className="text-xs text-muted-foreground">Visualizações</div>
                    </CardContent>
                  </Card>
                  <Card className="border-0 shadow-card">
                    <CardContent className="p-4 text-center">
                      <Users className="w-6 h-6 text-secondary mx-auto mb-2" />
                      <div className="text-2xl font-bold">{analytics?.clicks || 0}</div>
                      <div className="text-xs text-muted-foreground">Cliques</div>
                    </CardContent>
                  </Card>
                  <Card className="border-0 shadow-card">
                    <CardContent className="p-4 text-center">
                      <Gift className="w-6 h-6 text-success mx-auto mb-2" />
                      <div className="text-2xl font-bold">{analytics?.conversionRate || '0.0'}%</div>
                      <div className="text-xs text-muted-foreground">Conversão</div>
                    </CardContent>
                  </Card>
                  <Card className="border-0 shadow-card">
                    <CardContent className="p-4 text-center">
                      <Calendar className="w-6 h-6 text-warning mx-auto mb-2" />
                      <div className="text-2xl font-bold">{subscription?.next_payment_at ? new Date(subscription.next_payment_at).getDate() : '-'}</div>
                      <div className="text-xs text-muted-foreground">Próximo pagamento</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Histórico de Pagamentos */}
                <Card className="border-0 shadow-card">
                  <CardHeader>
                    <CardTitle>Histórico de Pagamentos</CardTitle>
                    <CardDescription>Últimos pagamentos realizados</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {transactions.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Nenhum pagamento registrado ainda
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {transactions.slice(0, 5).map((transaction) => (
                          <div 
                            key={transaction.id}
                            className={`flex items-center justify-between p-4 rounded-lg border ${
                              transaction.status === 'paid' 
                                ? 'bg-success/10 border-success/20' 
                                : transaction.status === 'pending'
                                ? 'bg-warning/10 border-warning/20'
                                : 'bg-destructive/10 border-destructive/20'
                            }`}
                          >
                            <div>
                              <div className="font-semibold">
                                {new Date(transaction.created_at).toLocaleDateString('pt-BR', { 
                                  month: 'long', 
                                  year: 'numeric' 
                                })} - {transaction.gateway === 'abacatepay' ? 'PIX' : 'Cartão'}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {transaction.status === 'paid' 
                                  ? `Pago em ${new Date(transaction.paid_at || transaction.created_at).toLocaleDateString('pt-BR')}`
                                  : transaction.status === 'pending'
                                  ? 'Aguardando pagamento'
                                  : 'Pagamento não confirmado'
                                }
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Badge 
                                variant={
                                  transaction.status === 'paid' 
                                    ? 'default' 
                                    : transaction.status === 'pending'
                                    ? 'secondary'
                                    : 'destructive'
                                }
                                className={transaction.status === 'paid' ? 'bg-success text-white' : ''}
                              >
                                {transaction.status === 'paid' 
                                  ? 'Pago' 
                                  : transaction.status === 'pending'
                                  ? 'Pendente'
                                  : 'Falhou'
                                }
                              </Badge>
                              <span className="font-bold">R$ {transaction.amount.toFixed(2)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default BusinessCRM;