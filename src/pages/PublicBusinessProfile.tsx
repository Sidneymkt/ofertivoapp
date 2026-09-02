import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { 
  Share2, 
  MapPin, 
  Phone, 
  Globe, 
  MessageSquare, 
  Star, 
  Heart,
  ArrowLeft,
  Users,
  Eye,
  Award,
  Mail,
  ExternalLink,
  Gift,
  Megaphone,
  Trophy,
  Calendar
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useBusiness } from '@/hooks/useBusiness';
import { API_CONFIG } from '@/lib/config';
import { BusinessReviewsSection } from '@/components/BusinessReviewsSection';
import { FollowBusinessButton } from '@/components/FollowBusinessButton';
import { BusinessBadgeShowcase } from '@/components/BusinessBadgeShowcase';
import { BusinessSocialProof } from '@/components/BusinessSocialProof';
import { MapboxOfferMap } from '@/components/MapboxOfferMap';
import { ChatWindow } from '@/components/ChatWindow';
import { useBusinessRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { SEOHead } from '@/components/SEOHead';
import { ShareMenu } from '@/components/ShareMenu';
import { getCategoryStyle } from '@/lib/categories';
import { getShareableUrl } from '@/lib/shareUrls';
import { useBusinessPresence } from '@/hooks/useBusinessPresence';

const PublicBusinessProfile = () => {
  const { id, slug } = useParams();
  const [resolvedBusinessId, setResolvedBusinessId] = useState<string | null>(id || null);
  const businessId = resolvedBusinessId;
  const { user } = useAuth();
  const { business: userBusiness } = useBusiness();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [newComment, setNewComment] = useState('');
  const [newRating, setNewRating] = useState(5);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const hasScrolledRef = useRef(false);
  const scrollLockTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Track consumer presence for this business
  useBusinessPresence(businessId);

  // Forçar scroll para o topo ANTES da renderização e bloquear scrolls automáticos
  useLayoutEffect(() => {
    // Reset flag quando o ID muda
    hasScrolledRef.current = false;
    
    // Scroll imediato
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    
    // Bloquear qualquer scroll automático por 1 segundo
    const blockScroll = () => {
      if (!hasScrolledRef.current) {
        window.scrollTo(0, 0);
      }
    };
    
    // Usar MutationObserver para detectar mudanças no DOM que podem causar scroll
    const observer = new MutationObserver(() => {
      if (!hasScrolledRef.current) {
        requestAnimationFrame(() => {
          window.scrollTo(0, 0);
        });
      }
    });
    
    observer.observe(document.body, { 
      childList: true, 
      subtree: true,
      attributes: true 
    });
    
    // Listener de scroll para bloquear scrolls automáticos
    window.addEventListener('scroll', blockScroll);
    
    // Após 1 segundo, liberar o scroll
    scrollLockTimeoutRef.current = setTimeout(() => {
      hasScrolledRef.current = true;
      window.removeEventListener('scroll', blockScroll);
      observer.disconnect();
    }, 1000);
    
    return () => {
      window.removeEventListener('scroll', blockScroll);
      observer.disconnect();
      if (scrollLockTimeoutRef.current) {
        clearTimeout(scrollLockTimeoutRef.current);
      }
    };
  }, [id]);

  // Real-time sync for business profile data
  useBusinessRealtimeSubscription(businessId);

  // Allow business owners to view their own public profile
  // Removed automatic redirect to dashboard

  // Resolve slug to business ID if needed
  useEffect(() => {
    if (id) {
      setResolvedBusinessId(id);
      return;
    }
    if (!slug) return;

    const resolveSlug = async () => {
      const { data, error } = await supabase
        .from('businesses')
        .select('id')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();
      
      if (!error && data) {
        setResolvedBusinessId(data.id);
      } else {
        setResolvedBusinessId(null);
      }
    };
    resolveSlug();
  }, [id, slug]);

  const { data: business, isLoading, error: businessError } = useQuery({
    queryKey: ['public-business-profile', businessId],
    queryFn: async () => {
      if (!businessId) return null;
      
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!businessId
  });

  const { data: offers } = useQuery({
    queryKey: ['business-offers', businessId],
    queryFn: async () => {
      if (!businessId) return [];
      
      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .gte('valid_until', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading business offers:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!businessId
  });

  const { data: reviews } = useQuery({
    queryKey: ['business-reviews', businessId],
    queryFn: async () => {
      if (!businessId) return [];
      
      const { data, error } = await supabase
        .from('business_reviews')
        .select(`
          *,
          profiles!business_reviews_user_id_fkey (
            full_name,
            avatar_url
          )
        `)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading reviews:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!businessId
  });

  // Sorteios do anunciante
  const { data: businessRaffles } = useQuery({
    queryKey: ['business-raffles-public', businessId],
    queryFn: async () => {
      if (!businessId) return [];
      const { data, error } = await supabase
        .from('raffles')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('end_date', { ascending: true });
      if (error) return [];
      return data || [];
    },
    enabled: !!businessId
  });

  // Vaquinhas patrocinadas pelo anunciante
  const { data: sponsoredCampaigns } = useQuery({
    queryKey: ['business-sponsored-campaigns', businessId],
    queryFn: async () => {
      if (!businessId) return [];
      const { data, error } = await supabase
        .from('crowdfunding_campaigns')
        .select('*')
        .eq('patrocinador_id', businessId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) return [];
      return data || [];
    },
    enabled: !!businessId
  });

  const handleShare = async () => {
    const slug = (business as any)?.slug;
    const shareUrlForNative = slug 
      ? getShareableUrl('business-slug', slug)
      : getShareableUrl('business', businessId || '');
    const shareData = {
      title: business?.name || 'Negócio no Ofertivo',
      text: `Confira ${business?.name} no Ofertivo!`,
      url: shareUrlForNative,
    };

    if (navigator.share && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        console.log('Erro ao compartilhar:', error);
      }
    } else {
      // Fallback: copiar URL para área de transferência
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: "Link copiado!",
          description: "O link do negócio foi copiado para sua área de transferência.",
        });
      } catch (error) {
        console.log('Erro ao copiar link:', error);
      }
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Login necessário",
        description: "Você precisa estar logado para avaliar um negócio.",
        variant: "destructive"
      });
      return;
    }

    if (!newComment.trim()) {
      toast({
        title: "Comentário obrigatório",
        description: "Por favor, escreva um comentário sobre sua experiência.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('business_reviews')
        .insert({
          user_id: user.id,
          business_id: businessId,
          rating: newRating,
          comment: newComment.trim()
        });

      if (error) throw error;

      setNewComment('');
      setNewRating(5);
      
      toast({
        title: "Avaliação enviada!",
        description: "Obrigado por compartilhar sua experiência."
      });

      // Refresh reviews
      window.location.reload();
    } catch (error) {
      console.error('Error submitting review:', error);
      toast({
        title: "Erro ao enviar avaliação",
        description: "Tente novamente mais tarde.",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto p-4 sm:p-6">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="h-32 animate-pulse bg-muted" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (businessError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Erro ao carregar negócio</h1>
          <p className="text-muted-foreground mb-4">
            Não foi possível carregar as informações do negócio. Tente novamente mais tarde.
          </p>
          <div className="space-y-3">
            <Button onClick={() => window.location.reload()}>
              Tentar novamente
            </Button>
            <Link to="/" className="block">
              <Button variant="outline">Voltar ao início</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Negócio não encontrado</h1>
          <p className="text-muted-foreground mb-4">
            O negócio que você procura não existe, foi removido ou não está ativo.
          </p>
          <Link to="/" className="text-primary hover:underline">
            Voltar ao início
          </Link>
        </div>
      </div>
    );
  }

  const isFollowing = false; // Will be managed by FollowBusinessButton component
  const avgRating = business?.average_rating || 0;

  return (
    <>
      <SEOHead
        title={business.name}
        description={business.description || `${business.name} - ${business.category} em ${business.address}. ${business.followers_count || 0} seguidores, nota ${avgRating.toFixed(1)}/5`}
        image={business.cover_image_url || business.logo_url || undefined}
        type="profile"
        url={`/anunciante/${business.id}`}
      />
      <div className="min-h-screen bg-background pb-20 md:pb-4">
      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        <div className="mb-4 sm:mb-6">
          <Link to="/" className="text-primary hover:underline mb-4 inline-flex items-center text-sm sm:text-base">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Link>
        </div>

        {/* Cover Image and Logo */}
        <div className="relative mb-6">
          {/* Cover Image */}
          {(business as any)?.cover_image_url && (
            <div className="w-full aspect-[16/6] sm:aspect-[16/5] md:aspect-[16/5] lg:aspect-[16/4] overflow-hidden rounded-lg">
              <img 
                key={(business as any).cover_image_url}
                src={(business as any).cover_image_url} 
                alt="Capa do negócio" 
                className="w-full h-full object-cover"
                onLoad={() => console.log('[PublicBusinessProfile] Cover loaded:', (business as any).cover_image_url)}
                onError={(e) => console.error('[PublicBusinessProfile] Cover load error:', e)}
              />
            </div>
          )}
          {/* Placeholder when no cover */}
          {!(business as any)?.cover_image_url && (
            <div className="w-full aspect-[16/6] sm:aspect-[16/5] md:aspect-[16/5] lg:aspect-[16/4] overflow-hidden rounded-lg bg-gradient-to-br from-primary/10 to-accent/10" />
          )}
          
          {/* Logo positioned over the cover */}
          <div className="absolute -bottom-12 sm:-bottom-16 left-6">
            <Avatar className="w-24 h-24 sm:w-32 sm:h-32 border-4 border-background shadow-lg">
              <AvatarImage src={business.logo_url} />
              <AvatarFallback className="text-2xl bg-primary/20">
                {business.name?.charAt(0) || 'N'}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Business Header - Enhanced */}
        <Card className="mb-6 overflow-hidden">
          <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-6 pt-16">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between space-y-6 lg:space-y-0">
              <div className="flex flex-col items-start space-y-4">
                <CardTitle className="text-2xl sm:text-3xl mb-2">{business.name}</CardTitle>
                
                {/* Description */}
                {business.description && (
                  <p className="text-muted-foreground mb-3 max-w-2xl">
                    {business.description}
                  </p>
                )}
                
                <div className="flex items-center justify-center sm:justify-start text-muted-foreground mb-3">
                  <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span className="text-sm">{business.address}</span>
                </div>
                
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-4">
                  <Badge className={`${getCategoryStyle(business.category)} text-sm font-semibold border-0 shadow-md px-3 py-1.5`}>
                    {business.category}
                  </Badge>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-yellow-500" />
                    {avgRating.toFixed(1)} ({business.total_reviews || 0})
                  </Badge>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {business.followers_count || 0} seguidores
                  </Badge>
                </div>

                {/* Contact Info */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-sm text-muted-foreground">
                  {business.phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      <span>{business.phone}</span>
                    </div>
                  )}
                  {business.email && (
                    <div className="flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      <span>{business.email}</span>
                    </div>
                  )}
                  {business.website && (
                    <a 
                      href={business.website.startsWith('http') ? business.website : `https://${business.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-primary"
                    >
                      <Globe className="w-4 h-4" />
                      <span>Website</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto lg:min-w-[200px]">
                <ShareMenu
                  url={window.location.href}
                  title={business?.name || 'Perfil do Negócio'}
                  description={business?.description || `Conheça ${business?.name || 'negócio'} no Ofertivo`}
                  contentType={business?.slug ? "business-slug" : "business"}
                  contentId={business?.slug || businessId || ''}
                  ogImage={business?.cover_image_url || business?.logo_url || undefined}
                  variant="outline"
                  size="sm"
                />
                {user && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setIsChatOpen(true)}
                    className="w-full sm:w-auto"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Chat
                  </Button>
                )}
                <FollowBusinessButton 
                  businessId={businessId!} 
                  size="sm"
                  className="w-full sm:w-auto"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Interactive Map */}
        {business.latitude && business.longitude && (
          <MapboxOfferMap
            latitude={business.latitude}
            longitude={business.longitude}
            businessInfo={{
              id: business.id,
              name: business.name,
              address: business.address,
              phone: business.phone,
              category: business.category,
              website: business.website,
              whatsapp: business.whatsapp
            }}
            className="mb-6"
          />
        )}

        {/* Active Offers - Enhanced with Carousel */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Ofertas em Destaque
          </h2>
          {offers && offers.length > 0 ? (
            <>
              {/* Carousel for larger screens */}
              <div className="hidden md:block">
                <Carousel className="w-full">
                  <CarouselContent className="-ml-4">
                    {offers.map((offer) => (
                      <CarouselItem key={offer.id} className="pl-4 md:basis-1/2 lg:basis-1/3">
                        <Card className="hover:shadow-lg transition-all hover:scale-105">
                          <CardContent className="p-0">
                            {offer.image_url && (
                              <div className="relative">
                                <img 
                                  src={offer.image_url} 
                                  alt={offer.title}
                                  className="w-full h-48 object-cover rounded-t-lg"
                                />
                                <Badge 
                                  variant="secondary" 
                                  className="absolute top-2 right-2 bg-green-600 text-white"
                                >
                                  {offer.discount_percentage}% OFF
                                </Badge>
                              </div>
                            )}
                            <div className="p-4">
                              <h3 className="font-semibold mb-2 line-clamp-2">{offer.title}</h3>
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex flex-col">
                                  <span className="text-sm text-muted-foreground line-through">
                                    R$ {offer.original_price.toFixed(2)}
                                  </span>
                                  <span className="font-bold text-lg text-green-600">
                                    R$ {offer.discounted_price.toFixed(2)}
                                  </span>
                                </div>
                                <Badge className={`${getCategoryStyle(offer.category)} text-xs font-medium border-0 shadow-sm px-2 py-1`}>
                                  {offer.category}
                                </Badge>
                              </div>
                              <Link to={`/ofertas/${offer.id}`}>
                                <Button size="sm" className="w-full">
                                  Ver Oferta
                                </Button>
                              </Link>
                            </div>
                          </CardContent>
                        </Card>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious />
                  <CarouselNext />
                </Carousel>
              </div>

              {/* Grid for mobile */}
              <div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
                {offers.slice(0, 4).map((offer) => (
                  <Card key={offer.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-0">
                      {offer.image_url && (
                        <div className="relative">
                          <img 
                            src={offer.image_url} 
                            alt={offer.title}
                            className="w-full h-32 object-cover rounded-t-lg"
                          />
                          <Badge 
                            variant="secondary" 
                            className="absolute top-2 right-2 bg-green-600 text-white"
                          >
                            {offer.discount_percentage}% OFF
                          </Badge>
                        </div>
                      )}
                      <div className="p-3">
                        <h3 className="font-semibold mb-2 text-sm line-clamp-2">{offer.title}</h3>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground line-through">
                              R$ {offer.original_price.toFixed(2)}
                            </span>
                            <span className="font-bold text-green-600">
                              R$ {offer.discounted_price.toFixed(2)}
                            </span>
                          </div>
                        </div>
                        <Link to={`/ofertas/${offer.id}`}>
                          <Button size="sm" className="w-full text-xs">
                            Ver Oferta
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {offers.length > 4 && (
                <div className="text-center mt-4">
                  <Link to={`/ofertas?negocio=${businessId}`}>
                    <Button variant="outline">
                      Ver todas as ofertas ({offers.length})
                    </Button>
                  </Link>
                </div>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-muted-foreground">
                  <Eye className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhuma oferta ativa no momento.</p>
                  <p className="text-sm mt-1">Volte em breve para conferir as novidades!</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sorteios do Anunciante */}
        {businessRaffles && businessRaffles.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Gift className="w-5 h-5 text-primary" />
              Sorteios
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {businessRaffles.map((raffle: any) => {
                const isEnded = new Date(raffle.end_date) < new Date();
                return (
                  <Link key={raffle.id} to={`/sorteios/${raffle.id}`}>
                    <Card className="hover:shadow-lg transition-all hover:scale-[1.02] h-full">
                      {raffle.image_url && (
                        <img src={raffle.image_url} alt={raffle.title} className="w-full h-36 object-cover rounded-t-lg" />
                      )}
                      <CardContent className="p-4">
                        <h3 className="font-semibold mb-1 line-clamp-2">{raffle.title}</h3>
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-1">{raffle.prize}</p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {raffle.current_participants || 0} participantes
                          </span>
                          <Badge variant={isEnded ? "secondary" : "default"} className="text-xs">
                            {isEnded ? 'Encerrado' : 'Ativo'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Até {format(new Date(raffle.end_date), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Vaquinhas Patrocinadas */}
        {sponsoredCampaigns && sponsoredCampaigns.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-primary" />
              Vaquinhas Patrocinadas
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sponsoredCampaigns.map((campaign: any) => {
                const progress = campaign.goal_points > 0 ? Math.min(100, (campaign.current_points / campaign.goal_points) * 100) : 0;
                return (
                  <Link key={campaign.id} to={`/vaquinhas`}>
                    <Card className="hover:shadow-lg transition-all hover:scale-[1.02] h-full">
                      {campaign.image_url && (
                        <img src={campaign.image_url} alt={campaign.title} className="w-full h-36 object-cover rounded-t-lg" />
                      )}
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                            <Trophy className="w-3 h-3 mr-1" />
                            Patrocinador
                          </Badge>
                        </div>
                        <h3 className="font-semibold mb-1 line-clamp-2">{campaign.title}</h3>
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{campaign.description}</p>
                        <div className="w-full bg-muted rounded-full h-2 mb-2">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all" 
                            style={{ width: `${progress}%` }} 
                          />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{campaign.current_points} pts</span>
                          <span>{campaign.goal_points} pts</span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Social Proof */}
        <div className="mb-6">
          <BusinessSocialProof businessId={businessId!} />
        </div>

        {/* Business Achievements */}
        <div className="mb-6">
          <BusinessBadgeShowcase 
            businessId={businessId!} 
            showOnlyUnlocked={true}
          />
        </div>

        {/* Reviews Section */}
        <div className="mb-6">
          <BusinessReviewsSection businessId={businessId!} />
        </div>
      </div>

      {/* Chat Window */}
      {isChatOpen && user && (
        <ChatWindow
          businessId={businessId!}
          businessName={business.name}
          onClose={() => setIsChatOpen(false)}
        />
      )}
    </div>
    </>
  );
};

export default PublicBusinessProfile;