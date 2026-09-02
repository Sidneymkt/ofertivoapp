import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import OfferQRGenerator from '@/components/business/OfferQRGenerator';
import ManualCodeGenerator from '@/components/business/ManualCodeGenerator';
import { DeleteConfirmationDialog } from '@/components/DeleteConfirmationDialog';
import { ImproveOfferModal } from '@/components/business/ImproveOfferModal';
import { CreateCampaignModal } from '@/components/business/CreateCampaignModal';
import { ShareOfferModal } from '@/components/business/ShareOfferModal';
import { SmartSuggestions } from '@/components/business/SmartSuggestions';
import { GenerateAIArtModal } from '@/components/business/GenerateAIArtModal';
import { 
  ArrowLeft, 
  PlusCircle, 
  Search, 
  Filter,
  Eye,
  Heart,
  Share2,
  Edit,
  Trash2,
  ToggleLeft,
  ToggleRight,
  QrCode,
  Lock,
  CreditCard,
  CheckCircle,
  Sparkles,
  TrendingUp,
  PartyPopper,
  Copy
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CATEGORIES } from '@/lib/categories';

interface Offer {
  id: string;
  title: string;
  category: string;
  original_price: number;
  discounted_price: number;
  discount_percentage: number;
  valid_until: string;
  is_active: boolean;
  views_count: number;
  likes_count: number;
  shares_count: number;
  current_uses: number;
  max_uses: number;
  image_url: string;
  created_at: string;
  checkin_points: number;
  archived_at: string | null;
  deleted_at: string | null;
}

const BusinessOffers = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { hasActiveSubscription, planName, loading: subscriptionLoading } = useSubscriptionStatus();
  const { canCreateOffer, currentOffers, maxOffers, offersRemaining, loading: limitsLoading, refresh: refreshLimits } = usePlanLimits();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [businessId, setBusinessId] = useState<string>('');
  const [businessName, setBusinessName] = useState<string>('');
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    offer: Offer | null;
    isHardDelete: boolean;
  }>({ open: false, offer: null, isHardDelete: false });
  const [isDeleting, setIsDeleting] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [qrModal, setQrModal] = useState<{
    isOpen: boolean;
    offerId: string;
    offerTitle: string;
  }>({
    isOpen: false,
    offerId: '',
    offerTitle: '',
  });
  const [improveModal, setImproveModal] = useState<{
    isOpen: boolean;
    offer: Offer | null;
  }>({ isOpen: false, offer: null });
  const [campaignModal, setCampaignModal] = useState(false);
  const [shareModal, setShareModal] = useState<{
    isOpen: boolean;
    offer: Offer | null;
  }>({ isOpen: false, offer: null });
  const [aiArtModal, setAiArtModal] = useState<{
    isOpen: boolean;
    offer: Offer | null;
  }>({ isOpen: false, offer: null });
  const [validationSuccess, setValidationSuccess] = useState<{
    isOpen: boolean;
    offerTitle: string;
    userName: string;
    points: number;
  }>({ isOpen: false, offerTitle: '', userName: '', points: 0 });

  useEffect(() => {
    if (user) {
      loadOffers();
    }
  }, [user]);

  // Real-time subscription for offers updates
  useEffect(() => {
    if (!businessId) return;

    console.log('Setting up real-time subscriptions for offers');

    const channel = supabase
      .channel(`business_offers_${businessId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'offers',
          filter: `business_id=eq.${businessId}`
        },
        (payload) => {
          console.log('Offer change detected:', payload);
          loadOffers();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'offer_views',
        },
        (payload) => {
          console.log('Offer views change detected:', payload);
          loadOffers();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'offer_likes',
        },
        (payload) => {
          console.log('Offer likes change detected:', payload);
          loadOffers();
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
          console.log('Offer checkin INSERT detected:', payload);
          loadOffers();
          
          // Buscar informações do check-in para mostrar modal de sucesso
          const checkinData = payload.new as any;
          if (checkinData) {
            try {
              // Buscar nome do usuário
              const { data: userProfile } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('user_id', checkinData.user_id)
                .single();
              
              // Buscar título da oferta
              const { data: offerData } = await supabase
                .from('offers')
                .select('title, checkin_points')
                .eq('id', checkinData.offer_id)
                .single();
              
              if (offerData) {
                setValidationSuccess({
                  isOpen: true,
                  offerTitle: offerData.title || 'Oferta',
                  userName: userProfile?.full_name || 'Cliente',
                  points: checkinData.points_awarded || offerData.checkin_points || 50
                });
              }
            } catch (error) {
              console.error('Erro ao buscar dados do check-in:', error);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'checkin_validations',
          filter: `business_id=eq.${businessId}`
        },
        async (payload) => {
          console.log('Checkin validation INSERT detected:', payload);
          loadOffers();
          
          // Buscar informações da validação para mostrar modal de sucesso
          const validationData = payload.new as any;
          if (validationData) {
            try {
              // Buscar nome do usuário
              const { data: userProfile } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('user_id', validationData.user_id)
                .single();
              
              // Buscar título da oferta
              const { data: offerData } = await supabase
                .from('offers')
                .select('title, checkin_points')
                .eq('id', validationData.offer_id)
                .single();
              
              if (offerData) {
                setValidationSuccess({
                  isOpen: true,
                  offerTitle: offerData.title || 'Oferta',
                  userName: userProfile?.full_name || 'Cliente',
                  points: validationData.points_awarded || offerData.checkin_points || 50
                });
              }
            } catch (error) {
              console.error('Erro ao buscar dados da validação:', error);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'favorites',
        },
        (payload) => {
          console.log('Favorites change detected:', payload);
          loadOffers();
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up real-time subscriptions');
      supabase.removeChannel(channel);
    };
  }, [businessId]);

  const handleValidationSuccessClose = () => {
    setValidationSuccess({ isOpen: false, offerTitle: '', userName: '', points: 0 });
    navigate('/business/crm');
  };

  const loadOffers = async () => {
    try {
      if (!user) return;

      // Buscar o business do usuário primeiro
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('id, name')
        .eq('owner_id', user.id)
        .single();

      if (businessError || !business) {
        console.log('Business não encontrado para o usuário');
        setOffers([]);
        return;
      }

      setBusinessId(business.id);
      setBusinessName(business.name || '');

      // Buscar ofertas do business (incluindo arquivadas, mas não deletadas definitivamente)
      const { data: offersData, error: offersError } = await supabase
        .from('offers')
        .select('*')
        .eq('business_id', business.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (offersError) {
        throw offersError;
      }

      // Transformar dados para o formato esperado pelo componente
      const transformedOffers: Offer[] = offersData?.map(offer => ({
        id: offer.id,
        title: offer.title || '',
        category: offer.category || '',
        original_price: offer.original_price || 0,
        discounted_price: offer.discounted_price || 0,
        discount_percentage: offer.discount_percentage || 0,
        valid_until: offer.valid_until || '',
        is_active: offer.is_active || false,
        views_count: offer.views_count || 0,
        likes_count: offer.likes_count || 0,
        shares_count: offer.shares_count || 0,
        current_uses: offer.current_uses || 0,
        max_uses: offer.max_uses || 0,
        image_url: offer.image_url || '',
        created_at: offer.created_at || '',
        checkin_points: offer.checkin_points || 50,
        archived_at: offer.archived_at || null,
        deleted_at: offer.deleted_at || null
      })) || [];

      setOffers(transformedOffers);
    } catch (error) {
      console.error('Error loading offers:', error);
      toast.error('Erro ao carregar ofertas');
    } finally {
      setLoading(false);
    }
  };

  const toggleOfferStatus = async (offerId: string, currentStatus: boolean) => {
    if (!hasActiveSubscription) {
      toast.error('Assinatura inativa. Regularize seu plano para reativar ou repostar ofertas.');
      navigate('/anunciante/planos');
      return;
    }
    try {
      const { error } = await supabase
        .from('offers')
        .update({ is_active: !currentStatus })
        .eq('id', offerId);


      if (error) throw error;

      // Atualizar estado local
      setOffers(prev => prev.map(offer => 
        offer.id === offerId 
          ? { ...offer, is_active: !currentStatus }
          : offer
      ));

      toast.success(`Oferta ${!currentStatus ? 'ativada' : 'desativada'} com sucesso!`);
    } catch (error) {
      console.error('Erro ao alterar status da oferta:', error);
      toast.error('Erro ao alterar status da oferta');
    }
  };

  const handleArchiveOffer = async (offer: Offer) => {
    try {
      const { error } = await supabase
        .from('offers')
        .update({ 
          archived_at: new Date().toISOString(),
          archived_by: user?.id,
          is_active: false
        })
        .eq('id', offer.id);

      if (error) throw error;

      // Registrar log de auditoria
      await supabase.rpc('log_offer_action', {
        p_offer_id: offer.id,
        p_business_id: businessId,
        p_action: 'archived',
        p_offer_data: offer as any,
        p_metadata: { 
          archived_at: new Date().toISOString(),
          reason: 'Arquivada pelo anunciante'
        }
      });

      // Atualizar estado local
      setOffers(prev => prev.map(o => 
        o.id === offer.id 
          ? { ...o, archived_at: new Date().toISOString(), is_active: false }
          : o
      ));

      toast.success('Oferta arquivada com sucesso!');
    } catch (error) {
      console.error('Erro ao arquivar oferta:', error);
      toast.error('Erro ao arquivar oferta');
    }
  };

  const handleRestoreOffer = async (offer: Offer) => {
    if (!hasActiveSubscription) {
      toast.error('Assinatura inativa. Regularize seu plano para restaurar ofertas.');
      navigate('/anunciante/planos');
      return;
    }
    try {
      const { error } = await supabase
        .from('offers')
        .update({ 
          archived_at: null,

          archived_by: null,
          is_active: true
        })
        .eq('id', offer.id);

      if (error) throw error;

      // Registrar log de auditoria
      await supabase.rpc('log_offer_action', {
        p_offer_id: offer.id,
        p_business_id: businessId,
        p_action: 'restored',
        p_offer_data: offer as any,
        p_metadata: { 
          restored_at: new Date().toISOString(),
          reason: 'Restaurada pelo anunciante'
        }
      });

      // Atualizar estado local
      setOffers(prev => prev.map(o => 
        o.id === offer.id 
          ? { ...o, archived_at: null, is_active: true }
          : o
      ));

      toast.success('Oferta restaurada com sucesso!');
    } catch (error) {
      console.error('Erro ao restaurar oferta:', error);
      toast.error('Erro ao restaurar oferta');
    }
  };

  const handleDeleteOffer = async () => {
    if (!deleteDialog.offer) return;

    setIsDeleting(true);
    try {
      const offerId = deleteDialog.offer.id;
      
      console.log('Starting deletion process for offer:', offerId);
      
      // Delete validation analytics
      const { error: analyticsError } = await supabase
        .from('validation_analytics')
        .delete()
        .eq('offer_id', offerId);
      if (analyticsError) console.warn('Analytics deletion error:', analyticsError);
      
      // Delete automatic raffle participations where trigger_id references the offer
      const { error: raffleParticipationsError } = await supabase
        .from('automatic_raffle_participations')
        .delete()
        .eq('trigger_id', offerId);
      if (raffleParticipationsError) console.warn('Raffle participations deletion error:', raffleParticipationsError);
      
      // Delete business analytics related to this offer
      const { error: businessAnalyticsError } = await supabase
        .from('business_analytics')
        .delete()
        .eq('offer_id', offerId);
      if (businessAnalyticsError) console.warn('Business analytics deletion error:', businessAnalyticsError);
      
      // Delete QR codes
      const { error: qrCodesError } = await supabase
        .from('qr_codes')
        .delete()
        .eq('offer_id', offerId);
      if (qrCodesError) console.warn('QR codes deletion error:', qrCodesError);
      
      // Delete favorites
      const { error: favoritesError } = await supabase
        .from('favorites')
        .delete()
        .eq('offer_id', offerId);
      if (favoritesError) console.warn('Favorites deletion error:', favoritesError);
      
      // Delete reviews
      const { error: reviewsError } = await supabase
        .from('reviews')
        .delete()
        .eq('offer_id', offerId);
      if (reviewsError) console.warn('Reviews deletion error:', reviewsError);
      
      // Delete offer views
      const { error: offerViewsError } = await supabase
        .from('offer_views')
        .delete()
        .eq('offer_id', offerId);
      if (offerViewsError) console.warn('Offer views deletion error:', offerViewsError);
      
      // Delete checkin validations
      const { error: checkinValidationsError } = await supabase
        .from('checkin_validations')
        .delete()
        .eq('offer_id', offerId);
      if (checkinValidationsError) console.warn('Checkin validations deletion error:', checkinValidationsError);
      
      // Delete offer checkins
      const { error: offerCheckinsError } = await supabase
        .from('offer_checkins')
        .delete()
        .eq('offer_id', offerId);
      if (offerCheckinsError) console.warn('Offer checkins deletion error:', offerCheckinsError);
      
      // Delete user points related to this offer
      const { error: userPointsError } = await supabase
        .from('user_points')
        .delete()
        .eq('offer_id', offerId);
      if (userPointsError) console.warn('User points deletion error:', userPointsError);
      
      // Delete manual checkin codes
      const { error: manualCodesError } = await supabase
        .from('manual_checkin_codes')
        .delete()
        .eq('offer_id', offerId);
      if (manualCodesError) console.warn('Manual codes deletion error:', manualCodesError);
      
      console.log('All related records deleted, now deleting main offer...');
      
      // Finally delete the offer
      const { error: offerError } = await supabase
        .from('offers')
        .delete()
        .eq('id', offerId);

      if (offerError) {
        console.error('Error deleting main offer:', offerError);
        throw offerError;
      }

      console.log('Offer deleted successfully!');

      // Registrar log de auditoria
      await supabase.rpc('log_offer_action', {
        p_offer_id: offerId,
        p_business_id: businessId,
        p_action: 'deleted',
        p_offer_data: deleteDialog.offer as any,
        p_metadata: { 
          deleted_at: new Date().toISOString(),
          reason: 'Exclusão definitiva pelo anunciante'
        }
      });

      // Atualizar estado local
      setOffers(prev => prev.filter(offer => offer.id !== deleteDialog.offer!.id));

      toast.success('Oferta excluída definitivamente!');
      setDeleteDialog({ open: false, offer: null, isHardDelete: false });
    } catch (error) {
      console.error('Erro ao excluir oferta:', error);
      toast.error('Erro ao excluir oferta');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredOffers = offers.filter(offer => {
    const matchesSearch = offer.title.toLowerCase().includes(searchTerm.toLowerCase());
    const now = new Date();
    const validUntil = new Date(offer.valid_until);
    const isExpired = validUntil < now;
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && offer.is_active && !offer.archived_at && !isExpired) ||
      (statusFilter === 'inactive' && !offer.is_active && !offer.archived_at && !isExpired) ||
      (statusFilter === 'expired' && isExpired) ||
      (statusFilter === 'archived' && offer.archived_at !== null);
    const matchesCategory = categoryFilter === 'all' || offer.category === categoryFilter;
    const matchesArchived = showArchived || !offer.archived_at;
    
    return matchesSearch && matchesStatus && matchesCategory && matchesArchived;
  });

  const getStatusBadge = (offer: Offer) => {
    const now = new Date();
    const validUntil = new Date(offer.valid_until);
    const isExpired = validUntil < now;
    
    if (offer.archived_at) return <Badge variant="outline" className="bg-muted">Arquivada</Badge>;
    if (isExpired) return <Badge variant="destructive">Expirada</Badge>;
    if (!offer.is_active) return <Badge variant="secondary">Inativa</Badge>;
    return <Badge className="bg-gradient-points">Ativa</Badge>;
  };

  const handleSaveImprovement = async (updates: { title: string; description: string }) => {
    if (!improveModal.offer) return;
    
    const { error } = await supabase
      .from('offers')
      .update(updates)
      .eq('id', improveModal.offer.id);

    if (error) throw error;
    
    await loadOffers();
  };

  return (
    <div className="page-shell bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="page-container-wide py-3 sm:py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center justify-between sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-4">
                <Link to="/anunciante/dashboard" className="flex items-center gap-1 sm:gap-2 text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="w-4 h-4" />
                  <span className="text-sm sm:text-base">Voltar</span>
                </Link>
                <h1 className="text-lg sm:text-xl font-semibold">Minhas Ofertas</h1>
                {hasActiveSubscription && !limitsLoading && (
                  <div className="hidden md:flex items-center gap-2">
                    {offersRemaining !== null ? (
                      <Badge variant="outline" className="border-muted-foreground/50">
                        {currentOffers}/{maxOffers} ofertas ativas
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-green-500/50 text-green-600">
                        Ofertas ilimitadas
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                onClick={() => setCampaignModal(true)}
                variant="outline"
                size="sm"
                className="border-primary text-primary hover:bg-primary/10"
              >
                <TrendingUp className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Criar Campanha com IA</span>
              </Button>
              {hasActiveSubscription && canCreateOffer ? (
                <Link to="/anunciante/ofertas/nova">
                  <Button size="sm" className="bg-gradient-primary">
                    <PlusCircle className="w-4 h-4" />
                  </Button>
                </Link>
              ) : hasActiveSubscription && !canCreateOffer ? (
              <Button 
                onClick={() => {
                  toast.error(`Limite de ${maxOffers} ofertas atingido. Faça upgrade do seu plano.`);
                  navigate('/anunciante/planos');
                }}
                disabled={limitsLoading}
                size="sm"
                className="bg-gradient-to-r from-orange-500 to-amber-500"
                title={`Limite de ${maxOffers} ofertas atingido`}
              >
                <Lock className="w-4 h-4" />
              </Button>
              ) : (
              <Button 
                onClick={() => {
                  toast.error('Você precisa de um plano ativo para criar ofertas');
                  navigate('/anunciante/planos');
                }}
                disabled={subscriptionLoading}
                size="sm"
                className="bg-gradient-primary"
              >
                <Lock className="w-4 h-4" />
              </Button>
            )}
            </div>
          </div>
        </div>
      </header>

      <div className="page-container-wide">
        {/* Verificação de Plano */}
        {subscriptionLoading ? (
          <Card className="mb-4 sm:mb-6">
            <CardContent className="py-6 sm:py-8">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-primary"></div>
                <span className="ml-3 text-sm sm:text-base text-muted-foreground">Verificando plano...</span>
              </div>
            </CardContent>
          </Card>
        ) : !hasActiveSubscription ? (
          <Alert className="mb-4 sm:mb-6 border-yellow-500/50 bg-yellow-500/10">
            <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600" />
            <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
              <div>
                <p className="font-semibold text-yellow-600 mb-1 text-sm sm:text-base">Plano Necessário</p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Para criar ofertas, você precisa assinar um plano. Escolha o plano ideal para seu negócio.
                </p>
              </div>
              <Button 
                onClick={() => navigate('/anunciante/planos')}
                size="sm"
                className="bg-gradient-primary whitespace-nowrap w-full sm:w-auto"
              >
                <CreditCard className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                Ver Planos
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <div className="mb-3 sm:mb-4">
            <Badge variant="default" className="bg-green-600 text-xs sm:text-sm">
              <CheckCircle className="w-3 h-3 mr-1" />
              {planName}
            </Badge>
          </div>
        )}

        {/* Filtros */}
        <Card className="border-0 shadow-card mb-4 sm:mb-6">
          <CardContent className="p-3 sm:p-6">
            <div className="flex flex-col gap-3 sm:gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-3 h-3 sm:w-4 sm:h-4" />
                  <Input
                    placeholder="Buscar ofertas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 sm:pl-10 text-sm sm:text-base h-9 sm:h-10"
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-48 h-9 sm:h-10 text-sm sm:text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="active">Ativas</SelectItem>
                    <SelectItem value="inactive">Inativas</SelectItem>
                    <SelectItem value="expired">Expiradas</SelectItem>
                    <SelectItem value="archived">Arquivadas</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full sm:w-48 h-9 sm:h-10 text-sm sm:text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas categorias</SelectItem>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Ofertas */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border-0 shadow-card animate-pulse">
                <div className="h-40 sm:h-48 bg-muted rounded-t-lg"></div>
                <CardContent className="p-3 sm:p-4">
                  <div className="h-3 sm:h-4 bg-muted rounded mb-2"></div>
                  <div className="h-3 sm:h-4 bg-muted rounded w-2/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredOffers.length === 0 ? (
          <Card className="border-0 shadow-card">
            <CardContent className="p-6 sm:p-12 text-center">
              <PlusCircle className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-semibold mb-2">Nenhuma oferta encontrada</h3>
              <p className="text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4">
                {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all' 
                  ? 'Tente ajustar os filtros ou criar uma nova oferta.'
                  : 'Comece criando sua primeira oferta para atrair clientes.'
                }
              </p>
              <Link to="/anunciante/ofertas/nova">
                <Button size="sm" className="bg-gradient-primary">
                  <PlusCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                  Criar Primeira Oferta
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredOffers.map((offer) => (
              <Card key={offer.id} className="border-0 shadow-card hover:shadow-glow transition-all duration-300">
                <div className="relative">
                  {offer.image_url ? (
                    <img 
                      src={offer.image_url} 
                      alt={offer.title} 
                      className="w-full h-40 sm:h-48 object-cover rounded-t-lg cursor-pointer hover:opacity-90 transition-opacity" 
                      onClick={() => window.open(`/ofertas/${offer.id}`, '_blank')}
                    />
                  ) : (
                    <div 
                      className="w-full h-40 sm:h-48 bg-gradient-primary rounded-t-lg flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => window.open(`/ofertas/${offer.id}`, '_blank')}
                    >
                      <span className="text-white text-base sm:text-lg font-semibold">{offer.title.charAt(0)}</span>
                    </div>
                  )}
                  <div className="absolute top-2 left-2">
                    {getStatusBadge(offer)}
                  </div>
                  <div className="absolute top-2 right-2">
                    {!offer.archived_at && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleOfferStatus(offer.id, offer.is_active)}
                        className="bg-white/90 hover:bg-white h-7 w-7 sm:h-9 sm:w-9 p-0"
                        disabled={!hasActiveSubscription}
                        title={!hasActiveSubscription ? 'Assinatura inativa' : ''}
                      >
                        {offer.is_active ? (
                          <ToggleRight className="w-3 h-3 sm:w-4 sm:h-4 text-success" />
                        ) : (
                          <ToggleLeft className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />
                        )}
                      </Button>
                    )}

                  </div>
                </div>

                <CardContent className="p-3 sm:p-4">
                  <h3 className="font-semibold mb-2 line-clamp-2 text-sm sm:text-base">{offer.title}</h3>
                  
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3 flex-wrap">
                    <span className="text-base sm:text-lg font-bold text-success">
                      R$ {offer.discounted_price.toFixed(2)}
                    </span>
                    <span className="text-xs sm:text-sm text-muted-foreground line-through">
                      R$ {offer.original_price.toFixed(2)}
                    </span>
                    <Badge variant="outline" className="text-[10px] sm:text-xs px-1 py-0 h-5">
                      -{offer.discount_percentage}%
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between gap-2 bg-muted/50 rounded-lg px-3 py-2 mb-3 sm:mb-4">
                    <div className="flex items-center gap-1.5 text-primary">
                      <Eye className="w-4 h-4" />
                      <span className="font-semibold text-sm">{offer.views_count}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-red-500">
                      <Heart className="w-4 h-4" />
                      <span className="font-semibold text-sm">{offer.likes_count}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-blue-500">
                      <Share2 className="w-4 h-4" />
                      <span className="font-semibold text-sm">{offer.shares_count}</span>
                    </div>
                  </div>

                  <div className="text-[10px] sm:text-xs text-muted-foreground mb-3 sm:mb-4 space-y-0.5">
                    <p>Usos: {offer.current_uses}/{offer.max_uses || '∞'}</p>
                    <p>Válida até: {new Date(offer.valid_until).toLocaleDateString('pt-BR')}</p>
                    <p>Pontos por check-in: {offer.checkin_points}</p>
                  </div>

                   <div className="flex flex-col gap-1.5 sm:gap-2">
                     <div className="flex gap-1.5 sm:gap-2">
                       <Button
                         variant="outline"
                         size="sm"
                         onClick={() => setImproveModal({ isOpen: true, offer })}
                         className="flex-1 border-primary text-primary hover:bg-primary/10 h-8 text-xs"
                         disabled={!!offer.archived_at}
                       >
                         <Sparkles className="w-3 h-3 sm:mr-1" />
                         <span className="hidden sm:inline">Melhorar com IA</span>
                       </Button>
                       <Button
                         variant="outline"
                         size="sm"
                         onClick={() => setShareModal({ isOpen: true, offer })}
                         className="flex-1 h-8 text-xs"
                       >
                         <Share2 className="w-3 h-3 sm:mr-1" />
                         <span className="hidden sm:inline">Divulgar</span>
                       </Button>
                     </div>
                     <div className="flex gap-1.5 sm:gap-2">
                      <Link to={`/anunciante/ofertas/editar/${offer.id}`} className={`flex-1 ${!hasActiveSubscription ? 'pointer-events-none' : ''}`}>
                        <Button variant="outline" size="sm" className="w-full h-8 text-xs" disabled={!!offer.archived_at || !hasActiveSubscription} title={!hasActiveSubscription ? 'Assinatura inativa' : ''}>
                          <Edit className="w-3 h-3 sm:mr-1" />
                          <span className="hidden sm:inline">Editar</span>
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (!hasActiveSubscription) {
                            toast.error('Assinatura inativa. Regularize seu plano para duplicar/repostar ofertas.');
                            navigate('/anunciante/planos');
                            return;
                          }
                          navigate('/anunciante/ofertas/nova', {
                            state: {
                              prefilled: {
                                isDuplicate: true,
                                title: `${offer.title} (cópia)`,
                                category: offer.category,
                                originalPrice: offer.original_price,
                                discountedPrice: offer.discounted_price,
                                checkinPoints: offer.checkin_points,
                                maxUses: offer.max_uses,
                              }
                            }
                          });
                        }}
                        className="px-2 h-8"
                        title={!hasActiveSubscription ? 'Assinatura inativa' : 'Duplicar oferta'}
                        disabled={!hasActiveSubscription}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>

                      {offer.archived_at ? (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleRestoreOffer(offer)}
                          className="px-2 h-8 hover:bg-success hover:text-white hover:border-success"
                          title="Restaurar oferta"
                        >
                          <ToggleRight className="w-3 h-3" />
                        </Button>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setDeleteDialog({ open: true, offer, isHardDelete: true })}
                          className="px-2 h-8 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
                          title="Excluir oferta"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                     <div className="flex gap-1.5 sm:gap-2">
                       <OfferQRGenerator
                         offerId={offer.id}
                         businessId={businessId}
                         offerTitle={offer.title}
                         businessName={businessName}
                         checkinPoints={offer.checkin_points}
                       />
                       <ManualCodeGenerator
                         offerId={offer.id}
                         businessId={businessId}
                         offerTitle={offer.title}
                         checkinPoints={offer.checkin_points}
                       />
                     </div>
                     <Button
                       variant="default"
                       size="sm"
                       onClick={() => setAiArtModal({ isOpen: true, offer })}
                       className="w-full h-8 text-xs bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                       disabled={!!offer.archived_at}
                     >
                       <Sparkles className="w-3 h-3 mr-1" />
                       🎨 Gerar Arte com IA
                     </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Smart Suggestions */}
      {businessId && <SmartSuggestions businessId={businessId} />}

      {/* Modals */}
      {improveModal.offer && (
        <ImproveOfferModal
          isOpen={improveModal.isOpen}
          onClose={() => setImproveModal({ isOpen: false, offer: null })}
          offer={{
            id: improveModal.offer.id,
            title: improveModal.offer.title,
            description: '',
            category: improveModal.offer.category,
            original_price: improveModal.offer.original_price,
            discounted_price: improveModal.offer.discounted_price,
            image_url: improveModal.offer.image_url
          }}
          businessName={businessName}
          onSave={handleSaveImprovement}
        />
      )}

      <CreateCampaignModal
        isOpen={campaignModal}
        onClose={() => setCampaignModal(false)}
        businessName={businessName}
      />

      {shareModal.offer && (
        <ShareOfferModal
          isOpen={shareModal.isOpen}
          onClose={() => setShareModal({ isOpen: false, offer: null })}
          offer={{
            id: shareModal.offer.id,
            title: shareModal.offer.title,
            description: '',
            category: shareModal.offer.category,
            original_price: shareModal.offer.original_price,
            discounted_price: shareModal.offer.discounted_price,
            image_url: shareModal.offer.image_url
          }}
          businessName={businessName}
        />
      )}

      <GenerateAIArtModal
        isOpen={aiArtModal.isOpen}
        onClose={() => setAiArtModal({ isOpen: false, offer: null })}
        offer={aiArtModal.offer}
        businessId={businessId}
        businessName={businessName}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
        title={deleteDialog.isHardDelete ? "Excluir Oferta Definitivamente" : "Arquivar Oferta"}
        description={
          deleteDialog.isHardDelete
            ? `Tem certeza que deseja excluir DEFINITIVAMENTE a oferta "${deleteDialog.offer?.title}"? Esta ação removerá permanentemente todos os dados relacionados e NÃO pode ser desfeita.`
            : `Tem certeza que deseja arquivar a oferta "${deleteDialog.offer?.title}"? Você poderá restaurá-la depois.`
        }
        onConfirm={handleDeleteOffer}
        isLoading={isDeleting}
        confirmButtonText={deleteDialog.isHardDelete ? "Excluir Definitivamente" : "Arquivar"}
      />

      {/* Validation Success Modal */}
      <Dialog open={validationSuccess.isOpen} onOpenChange={(open) => {
        if (!open) handleValidationSuccessClose();
      }}>
        <DialogContent className="max-w-md bg-gradient-to-b from-green-900/90 to-background border-green-500/30">
          <DialogHeader className="text-center pb-2">
            <DialogTitle className="flex flex-col items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center animate-pulse">
                <PartyPopper className="w-10 h-10 text-green-400" />
              </div>
              <span className="text-2xl font-bold text-green-400">Check-in Validado!</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4 text-center">
            <div className="space-y-2">
              <p className="text-muted-foreground">Cliente</p>
              <p className="text-xl font-semibold text-foreground">{validationSuccess.userName}</p>
            </div>
            
            <div className="space-y-2">
              <p className="text-muted-foreground">Oferta</p>
              <p className="text-lg font-medium text-foreground">{validationSuccess.offerTitle}</p>
            </div>
            
            <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/20">
              <p className="text-sm text-muted-foreground mb-1">Pontos concedidos</p>
              <p className="text-3xl font-bold text-green-400">+{validationSuccess.points}</p>
            </div>
          </div>

          <Button 
            onClick={handleValidationSuccessClose}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Ver Clientes (CRM)
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BusinessOffers;