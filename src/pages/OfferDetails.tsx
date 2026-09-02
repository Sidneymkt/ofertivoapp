import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Bookmark, Share2, QrCode, MapPin, Phone, Mail, Globe, Users, Tag, MessageSquare, Star, Send, Navigation, Truck, Gift } from 'lucide-react';
import { Countdown } from '@/components/Countdown';
import { useAuth } from '@/hooks/useAuth';
import { useUserNavigation } from '@/hooks/useUserNavigation';
import { useFavorites } from '@/hooks/useFavorites';
import { useToast } from '@/hooks/use-toast';
import CheckinModal from '@/components/CheckinModal';
import OfferImageCarousel from '@/components/OfferImageCarousel';
import { MapboxOfferMap } from '@/components/MapboxOfferMap';
import { ChatWindow } from '@/components/ChatWindow';
import { LikeButton } from '@/components/LikeButton';
import { SEOHead } from '@/components/SEOHead';
import { ShareMenu } from '@/components/ShareMenu';
import { SmartShareCard } from '@/components/SmartShareCard';
import { getOfferTypeLabel, getOfferTypeStyle } from '@/lib/offerTypes';
import { useOfferViews } from '@/hooks/useOfferViews';
import { getCategoryStyle } from '@/lib/categories';
import { awardSharePoints } from '@/lib/pointsService';
import { useBusinessPresence } from '@/hooks/useBusinessPresence';
import { PixPurchaseModal } from '@/components/PixPurchaseModal';

const OfferDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { favorites, toggleFavorite } = useFavorites();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { navigateToUserProfile } = useUserNavigation();
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showPixModal, setShowPixModal] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [showMap, setShowMap] = useState(false);
  const [isMapDialogOpen, setIsMapDialogOpen] = useState(false);
  const { recordOfferView } = useOfferViews();
  const [viewRecorded, setViewRecorded] = useState(false);

  // Scroll para o topo ao abrir a página - simples e controlado
  useEffect(() => {
    // Garantir que a navegação para detalhes sempre comece no topo
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [id]);

  // Registrar visualização quando usuário acessa a oferta
  useEffect(() => {
    if (id && user && !viewRecorded) {
      recordOfferView(id);
      setViewRecorded(true);
    }
  }, [id, user, viewRecorded, recordOfferView]);

  const { data: offer, isLoading, error, refetch } = useQuery({
    queryKey: ['offer', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    }
  });

  // Track consumer presence for this business
  useBusinessPresence(offer?.business_id);

  // Query separada para estatísticas em tempo real
  const { data: offerStats, refetch: refetchStats } = useQuery({
    queryKey: ['offer-stats', id],
    queryFn: async () => {
      if (!id) return null;
      
      // Buscar contagens em paralelo para performance
      const [viewsResult, likesResult, checkinsResult, favoritesResult] = await Promise.all([
        supabase
          .from('offer_views')
          .select('id', { count: 'exact', head: true })
          .eq('offer_id', id),
        supabase
          .from('offer_likes')
          .select('id', { count: 'exact', head: true })
          .eq('offer_id', id),
        supabase
          .from('offer_checkins')
          .select('id', { count: 'exact', head: true })
          .eq('offer_id', id),
        supabase.rpc('get_offer_favorite_count', { offer_uuid: id })
      ]);
      
      return {
        views_count: viewsResult.count || 0,
        likes_count: likesResult.count || 0,
        checkins_count: checkinsResult.count || 0,
        favorites_count: favoritesResult.data || 0,
        shares_count: offer?.shares_count || 0
      };
    },
    enabled: !!id,
    refetchInterval: 30000 // Atualizar a cada 30 segundos
  });

  // Real-time updates for offer details
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`offer-realtime-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'offers',
          filter: `id=eq.${id}`,
        },
        () => {
          refetch();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'offer_likes',
          filter: `offer_id=eq.${id}`,
        },
        () => {
          refetch();
          refetchStats();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'offer_views',
          filter: `offer_id=eq.${id}`,
        },
        () => {
          refetchStats();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'offer_checkins',
          filter: `offer_id=eq.${id}`,
        },
        () => {
          refetch();
          refetchStats();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'favorites',
          filter: `offer_id=eq.${id}`,
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, refetch, refetchStats]);

// Dados do negócio da oferta - consultas separadas para usuários logados e não logados
const { data: businessForLoggedUser, isLoading: businessLoggedLoading, error: businessLoggedError } = useQuery({
  queryKey: ['business', offer?.business_id],
  queryFn: async () => {
    if (!offer?.business_id) return null;
    
    const { data, error } = await supabase
      .from('businesses')
      .select('id, name, description, address, phone, website, email, logo_url, cover_image_url, category, followers_count, latitude, longitude, whatsapp')
      .eq('id', offer.business_id)
      .eq('is_active', true)
      .maybeSingle();
      
    if (error) throw error;
    return data;
  },
  enabled: !!offer?.business_id && !!user,
  retry: 3,
  staleTime: 5 * 60 * 1000,
});

const { data: businessForPublic, isLoading: businessPublicLoading, error: businessPublicError } = useQuery({
  queryKey: ['business-public', offer?.business_id],
  queryFn: async () => {
    if (!offer?.business_id) return null;
    
    const { data, error } = await supabase
      .from('businesses_public')
      .select('id, name, description, address, logo_url, cover_image_url, category, followers_count, latitude, longitude')
      .eq('id', offer.business_id)
      .eq('is_active', true)
      .maybeSingle();
      
    if (error) throw error;
    return data;
  },
  enabled: !!offer?.business_id && !user,
  retry: 3,
  staleTime: 5 * 60 * 1000,
});

// Selecionar os dados corretos baseado no status de login
const business = user ? businessForLoggedUser : businessForPublic;
const businessLoading = user ? businessLoggedLoading : businessPublicLoading;
const businessError = user ? businessLoggedError : businessPublicError;

// Query para buscar reviews da oferta
const { data: reviews, refetch: refetchReviews } = useQuery({
  queryKey: ['offer-reviews', id],
  queryFn: async () => {
    if (!id) return [];
    
    // Buscar reviews primeiro
    const { data: reviewsData, error: reviewsError } = await supabase
      .from('reviews')
      .select('*')
      .eq('offer_id', id)
      .order('created_at', { ascending: false });
      
    if (reviewsError) throw reviewsError;
    if (!reviewsData || reviewsData.length === 0) return [];

    // Buscar dados dos usuários separadamente
    const userIds = [...new Set(reviewsData.map(r => r.user_id))];
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, full_name, avatar_url')
      .in('user_id', userIds);

    // Combinar reviews com profiles
    const reviewsWithProfiles = reviewsData.map(review => ({
      ...review,
      profile: profilesData?.find(p => p.user_id === review.user_id) || null
    }));

    return reviewsWithProfiles;
  },
  enabled: !!id
});

// Query para buscar outras ofertas do mesmo negócio
const { data: otherOffers } = useQuery({
  queryKey: ['business-offers', offer?.business_id],
  queryFn: async () => {
    if (!offer?.business_id) return [];
    
    const { data, error } = await supabase
      .from('offers')
      .select('id, title, image_url, original_price, discounted_price, valid_until, offer_type')
      .eq('business_id', offer.business_id)
      .eq('is_active', true)
      .gte('valid_until', new Date().toISOString())
      .neq('id', id)
      .limit(4)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return data;
  },
  enabled: !!offer?.business_id
});

  const handleShare = async () => {
    const url = window.location.href;
    const shareData = {
      title: offer?.title || 'Oferta especial',
      text: `Confira esta oferta incrível: ${offer?.title}`,
      url
    };
    
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        
        // Award share points when user shares
        if (user && offer?.id) {
          await awardSharePoints(user.id, offer.id);
          
          toast({
            title: "Compartilhado com sucesso! 🎉",
            description: "Você ganhou pontos por compartilhar!",
          });
        }
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`Confira esta oferta incrível: ${offer?.title} - ${url}`)}`;
          window.open(whatsappUrl, '_blank');
        }
      }
    } else {
      await navigator.clipboard.writeText(url);
      
      // Award points for copying link too
      if (user && offer?.id) {
        await awardSharePoints(user.id, offer.id);
      }
      
      toast({ title: "Link copiado! Você ganhou pontos por compartilhar!" });
    }
  };

  const handleWhatsAppShare = () => {
    const url = window.location.href;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`Confira esta oferta incrível: ${offer?.title} - ${url}`)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleSubmitReview = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!user) {
      toast({
        title: "Login necessário",
        description: "Faça login para avaliar esta oferta",
        variant: "destructive"
      });
      return;
    }

    // Preserva a posição atual da página para evitar qualquer "pulo" após o envio
    const currentScrollY = window.scrollY;

    try {
      // Check if user already reviewed this offer
      const { data: existingReview } = await supabase
        .from('reviews')
        .select('id')
        .eq('offer_id', id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingReview) {
        // Update existing review
        const { error: updateError } = await supabase
          .from('reviews')
          .update({
            rating: newRating,
            comment: newComment.trim() || null
          })
          .eq('id', existingReview.id);

        if (updateError) throw updateError;
        
        toast({ title: "Avaliação atualizada com sucesso!" });
      } else {
        // Insert new review
        const { error: insertError } = await supabase
          .from('reviews')
          .insert([
            {
              offer_id: id,
              business_id: offer?.business_id,
              user_id: user.id,
              rating: newRating,
              comment: newComment.trim() || null
            }
          ]);

        if (insertError) throw insertError;

        // Award points for new review (apenas consumidores)
        try {
          const { data: reviewerProfile } = await supabase
            .from('profiles')
            .select('user_type')
            .eq('user_id', user.id)
            .single();

          if (reviewerProfile?.user_type !== 'business') {
            await supabase.from('user_points').insert({
              user_id: user.id,
              points_earned: 25,
              action_type: 'review',
              offer_id: id,
              business_id: offer?.business_id,
              description: 'Avaliou uma oferta'
            });

            await supabase.rpc('update_user_points', {
              user_id: user.id,
              points_to_add: 25
            });

            toast({ 
              title: "Avaliação enviada com sucesso!",
              description: "+25 pontos ganhos por avaliar"
            });
          } else {
            toast({ title: "Avaliação enviada com sucesso!" });
          }
        } catch (pointsError) {
          console.warn('Error awarding review points:', pointsError);
          toast({ title: "Avaliação enviada com sucesso!" });
        }
      }

      setNewComment('');
      setNewRating(5);
      await refetchReviews();

      // Restaura exatamente a mesma posição de scroll após atualizar os dados
      window.scrollTo({ top: currentScrollY, left: 0, behavior: 'auto' });
    } catch (error: any) {
      console.error('Error submitting review:', error);
      
      // Handle duplicate review error
      if (error?.code === '23505') {
        toast({
          title: "Você já avaliou esta oferta",
          description: "Sua avaliação anterior será atualizada",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Erro ao enviar avaliação",
          description: "Tente novamente mais tarde",
          variant: "destructive"
        });
      }
    }
  };

  const handleCheckIn = () => {
    if (!user) {
      toast({ 
        title: "Login necessário", 
        description: "Faça login para fazer check-in",
        variant: "destructive" 
      });
      return;
    }
    setShowCheckinModal(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-64 bg-muted rounded"></div>
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !offer) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Oferta não encontrada</h1>
          <p className="text-muted-foreground mb-4">A oferta que você procura não existe ou foi removida.</p>
          <Link to="/ofertas">
            <Button>Ver todas as ofertas</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isFavorited = favorites.some(f => f.offer_id === id);
  const discountPercentage = Math.round(((offer.original_price - offer.discounted_price) / offer.original_price) * 100);
  
  const averageRating = reviews && reviews.length > 0 
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
    : 0;


  const renderStars = (rating: number, interactive = false, size = 'w-4 h-4') => {
    return [...Array(5)].map((_, i) => (
      <Star
        key={i}
        className={`${size} ${
          i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
        } ${interactive ? 'cursor-pointer hover:text-yellow-400' : ''}`}
        onClick={interactive ? (e) => {
          e.preventDefault();
          e.stopPropagation();
          setNewRating(i + 1);
        } : undefined}
      />
    ));
  };
  

  return (
    <>
      <SEOHead
        title={offer.title}
        description={offer.description || `${offer.title} - ${discountPercentage}% de desconto no ${business?.name || 'Ofertivo'}. De R$ ${offer.original_price.toFixed(2)} por R$ ${offer.discounted_price.toFixed(2)}`}
        image={offer.image_url || (Array.isArray(offer.image_urls) && typeof offer.image_urls[0] === 'string' ? offer.image_urls[0] : undefined)}
        type="article"
        url={`/ofertas/${offer.id}`}
      />
      <div className="min-h-screen bg-background pb-20 md:pb-0">
      <div className="max-w-4xl mx-auto p-3 sm:p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <Link to="/ofertas" className="flex items-center text-primary hover:underline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar às ofertas
          </Link>
          <div className="flex flex-wrap gap-2">
            <ShareMenu
              url={window.location.href}
              title={offer?.title || 'Oferta especial'}
              description={offer?.description || `Confira esta oferta incrível: ${offer?.title}`}
              offerId={offer?.id}
              contentType="offer"
              contentId={offer?.id}
              variant="outline"
              size="sm"
            />
            {user && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleFavorite(id!)}
                className={`${isFavorited ? "text-red-500" : ""} flex items-center gap-1`}
              >
                <Bookmark className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
                <span className="hidden sm:inline">
                  {isFavorited ? 'Favoritado' : 'Favoritar'}
                </span>
              </Button>
            )}
            <LikeButton offerId={id!} showCount={true} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Offer Images Carousel */}
            <div className="aspect-[4/3] sm:aspect-video rounded-lg overflow-hidden relative">
              <OfferImageCarousel 
                images={(() => {
                  // Debug: log para verificar o formato dos dados
                  console.log('Offer image data:', {
                    image_urls: offer.image_urls,
                    image_url: offer.image_url,
                    type_image_urls: typeof offer.image_urls,
                    type_image_url: typeof offer.image_url
                  });
                  
                  try {
                    let images: string[] = [];
                    
                    // Se image_urls existe e é um array válido
                    if (offer.image_urls && Array.isArray(offer.image_urls)) {
                      images = (offer.image_urls as string[]).filter(url => typeof url === 'string' && url.trim() !== '');
                    }
                    
                    // Se image_urls é uma string JSON, tentar fazer parse
                    else if (offer.image_urls && typeof offer.image_urls === 'string') {
                      try {
                        const parsed = JSON.parse(offer.image_urls);
                        if (Array.isArray(parsed)) {
                          images = parsed.filter(url => typeof url === 'string' && url.trim() !== '');
                        }
                      } catch (parseError) {
                        console.error('Error parsing image_urls JSON:', parseError);
                      }
                    }
                    
                    // Fallback para image_url (campo legado) se não houver image_urls
                    if (images.length === 0 && offer.image_url && typeof offer.image_url === 'string' && offer.image_url.trim() !== '') {
                      images = [offer.image_url];
                    }
                    
                    console.log('Final processed images:', images);
                    return images;
                  } catch (error) {
                    console.error('Error processing offer images:', error);
                    // Em caso de erro, tentar usar image_url como fallback
                    return offer.image_url && typeof offer.image_url === 'string' && offer.image_url.trim() !== '' ? [offer.image_url] : [];
                  }
                })()}
                title={offer.title}
              />
            </div>

            {/* Offer Details */}
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-lg sm:text-xl lg:text-2xl mb-3 leading-tight">{offer.title}</CardTitle>
                      <div className="flex flex-wrap gap-2 mb-3">
                        <Badge className={`${getCategoryStyle(offer.category)} text-sm font-semibold border-0 shadow-md px-3 py-1.5`}>
                          {offer.category}
                        </Badge>
                        <Badge className={`${getOfferTypeStyle(offer.offer_type)} text-xs sm:text-sm font-semibold border-0 shadow-md px-3 py-1.5`}>
                          {getOfferTypeLabel(offer.offer_type)}
                        </Badge>
                        {(offer.targeting_data as any)?.product_condition && (
                          <Badge className={`${
                            (offer.targeting_data as any)?.product_condition === 'novo'
                              ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white'
                              : 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white'
                          } text-xs sm:text-sm font-semibold border-0 shadow-md px-3 py-1.5`}>
                            {(offer.targeting_data as any)?.product_condition === 'novo' ? '✨ Novo' : '🔄 Seminovo'}
                          </Badge>
                        )}
                        {offer.offer_type === 'min-purchase' && (offer.targeting_data as any)?.min_purchase_value && (
                          <Badge className="bg-gradient-to-r from-violet-500 to-purple-600 text-white text-xs sm:text-sm font-semibold border-0 shadow-md px-3 py-1.5">
                            💰 Mín. R$ {parseFloat((offer.targeting_data as any).min_purchase_value).toFixed(2)}
                          </Badge>
                        )}
                        {offer.is_delivery && (
                          <Badge className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white text-xs sm:text-sm font-semibold border-0 shadow-md px-3 py-1.5 flex items-center gap-1">
                            <Truck className="w-3 h-3" />
                            Delivery
                          </Badge>
                        )}
                      </div>
                      {reviews && reviews.length > 0 && (
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex">
                            {renderStars(Math.round(averageRating))}
                          </div>
                          <span className="text-xs sm:text-sm text-muted-foreground">
                            {averageRating.toFixed(1)} ({reviews.length} avaliação{reviews.length !== 1 ? 'ões' : ''})
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-start sm:items-end text-left sm:text-right">
                      <div className="flex flex-col sm:flex-row items-start sm:items-baseline gap-2 mb-2">
                        <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-green-600">
                          R$ {offer.discounted_price?.toFixed(2) || '0.00'}
                        </div>
                        <div className="text-sm sm:text-lg text-muted-foreground line-through">
                          R$ {offer.original_price?.toFixed(2) || '0.00'}
                        </div>
                      </div>
                      <Badge variant="destructive" className="text-sm sm:text-base font-bold px-3 py-1">
                        {discountPercentage}% OFF
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">{offer.description}</p>
                
                <div className="mb-4">
                  <Countdown endDate={offer.valid_until} variant="default" />
                </div>

                {offer.max_uses && (
                  <div className="text-sm text-muted-foreground mb-4">
                    Restam {offer.max_uses - offer.current_uses} unidades
                  </div>
                )}

                <Separator className="my-4" />

                {/* Check-in Points Display */}
                <div className="bg-gradient-points/10 p-4 rounded-lg mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Pontos por check-in</p>
                      <p className="text-2xl font-bold text-points">
                        +{offer.checkin_points || 50} pontos
                      </p>
                    </div>
                    <div className="text-points">
                      <QrCode className="w-8 h-8" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {offer.is_delivery 
                      ? 'Valide seu check-in com o entregador no momento da entrega'
                      : 'Faça check-in no estabelecimento e ganhe pontos no Ofertivo'
                    }
                  </p>
                </div>

                {/* PIX Purchase */}
                {business?.id && (
                  <Button
                    className="w-full mb-4 bg-emerald-600 hover:bg-emerald-700 text-white"
                    size="lg"
                    onClick={() => {
                      if (!user) { navigate('/login'); return; }
                      setShowPixModal(true);
                    }}
                  >
                    <QrCode className="w-4 h-4 mr-2" />
                    Comprar via PIX (direto ao anunciante)
                  </Button>
                )}
                {business?.id && (
                  <PixPurchaseModal
                    open={showPixModal}
                    onClose={() => setShowPixModal(false)}
                    offer={{ id: offer.id, title: offer.title, discounted_price: offer.discounted_price, checkin_points: offer.checkin_points, image_url: offer.image_url }}
                    businessId={business.id}
                    businessName={business.name}
                  />
                )}

                {/* Prêmios Extras do Check-in */}
                {(() => {
                  const prizes = (offer.targeting_data as any)?.checkin_prizes;
                  if (!prizes || !Array.isArray(prizes) || prizes.length === 0) return null;
                  return (
                    <div className="p-4 rounded-lg border bg-gradient-to-r from-amber-500/5 to-orange-500/5 border-amber-500/20 mb-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Gift className="w-5 h-5 text-amber-500" />
                        <p className="font-semibold text-sm">Prêmios Extras do Check-in</p>
                      </div>
                      <div className="space-y-2">
                        {prizes.map((prize: any, i: number) => (
                          <div key={prize.id || i} className="flex items-center gap-2 text-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                            <span className="font-medium">{prize.name}</span>
                            {prize.every_n_checkins && (
                              <span className="text-xs text-muted-foreground">(a cada {prize.every_n_checkins} check-ins)</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Delivery Info Banner */}
                {offer.is_delivery && (
                  <div className="bg-gradient-to-r from-teal-500/10 to-cyan-500/10 border border-teal-500/30 p-4 rounded-lg mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-teal-500/20">
                        <Truck className="w-5 h-5 text-teal-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-teal-700 dark:text-teal-400">Modo Delivery Disponível</p>
                        <p className="text-xs text-muted-foreground">
                          Esta oferta pode ser entregue no seu endereço. O check-in é validado pelo entregador.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Button */}
                <Button 
                  onClick={handleCheckIn}
                  className="w-full bg-gradient-primary text-sm sm:text-base"
                  disabled={!user}
                  size="lg"
                >
                  <QrCode className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Fazer Check-in e Ganhar Pontos</span>
                  <span className="sm:hidden">Check-in</span>
                </Button>

                {/* Chat Button */}
                <Button 
                  onClick={() => setIsChatOpen(true)}
                  className="w-full mt-3 text-sm sm:text-base"
                  variant="outline"
                  disabled={!user}
                  size="lg"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Conversar com o Anunciante</span>
                  <span className="sm:hidden">Chat</span>
                </Button>

                {!user && (
                  <p className="text-xs sm:text-sm text-muted-foreground text-center mt-2">
                    <Link to="/login" className="text-primary hover:underline">
                      Faça login
                    </Link> para fazer check-in nesta oferta
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Reviews Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5" />
                  Avaliações
                  {reviews && reviews.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {reviews.length}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {user && (
                  <div className="space-y-4 mb-6 p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-medium">Deixe sua avaliação</h4>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Nota:</label>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        {renderStars(newRating, true, 'w-6 h-6')}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Comentário (opcional):</label>
                      <Textarea
                        placeholder="Compartilhe sua experiência com esta oferta..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onFocus={(e) => e.stopPropagation()}
                        maxLength={500}
                      />
                    </div>
                    <Button onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSubmitReview(e);
                    }} size="sm">
                      <Send className="w-4 h-4 mr-2" />
                      Enviar Avaliação
                    </Button>
                  </div>
                )}

                {reviews && reviews.length > 0 ? (
                  <div className="space-y-4">
                    {reviews.slice(0, 3).map((review) => (
                      <div key={review.id} className="p-4 rounded-lg border">
                        <div className="flex items-start gap-3 mb-2">
                          <button 
                            onClick={() => navigateToUserProfile(review.user_id)}
                            className="hover:opacity-80 transition-opacity cursor-pointer"
                          >
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={review.profile?.avatar_url} />
                              <AvatarFallback>
                                {review.profile?.full_name?.charAt(0) || 'A'}
                              </AvatarFallback>
                            </Avatar>
                          </button>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <button 
                                onClick={() => navigateToUserProfile(review.user_id)}
                                className="font-medium text-sm hover:underline cursor-pointer text-left"
                              >
                                {review.profile?.full_name || 'Usuário'}
                              </button>
                              <span className="text-xs text-muted-foreground">
                                {new Date(review.created_at).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                            <div className="flex mt-1">
                              {renderStars(review.rating, false, 'w-3 h-3')}
                            </div>
                          </div>
                        </div>
                        {review.comment && (
                          <p className="text-sm text-muted-foreground ml-11">
                            {review.comment}
                          </p>
                        )}
                      </div>
                    ))}
                    {reviews.length > 3 && (
                      <div className="text-center">
                        <Button variant="outline" size="sm">
                          Ver todas as avaliações ({reviews.length})
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <Star className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>Esta oferta ainda não tem avaliações.</p>
                    {user && <p className="text-sm mt-1">Seja o primeiro a avaliar!</p>}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Related Offers Section */}
            {otherOffers && otherOffers.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    Ofertas Relacionadas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {otherOffers.map((relatedOffer) => {
                      const discount = Math.round(((relatedOffer.original_price - relatedOffer.discounted_price) / relatedOffer.original_price) * 100);
                      return (
                        <Link 
                          key={relatedOffer.id} 
                          to={`/ofertas/${relatedOffer.id}`}
                          className="block p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                        >
                          <div className="space-y-2">
                            {relatedOffer.image_url && (
                              <img 
                                src={relatedOffer.image_url} 
                                alt={relatedOffer.title}
                                className="w-full h-24 object-cover rounded"
                              />
                            )}
                            <div>
                              <h4 className="font-medium text-sm line-clamp-2 mb-1">
                                {relatedOffer.title}
                              </h4>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-green-600">
                                    R$ {relatedOffer.discounted_price}
                                  </span>
                                  {discount > 0 && (
                                    <Badge variant="secondary" className="text-xs">
                                      {discount}% OFF
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {getOfferTypeLabel(relatedOffer.offer_type)}
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Business Info Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-center sm:text-left">Sobre o Negócio</CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                {businessLoading ? (
                  <div className="animate-pulse space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-muted rounded-full"></div>
                      <div className="space-y-2 flex-1">
                        <div className="h-4 bg-muted rounded w-3/4"></div>
                        <div className="h-3 bg-muted rounded w-1/2"></div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 bg-muted rounded w-full"></div>
                      <div className="h-3 bg-muted rounded w-2/3"></div>
                    </div>
                  </div>
                ) : businessError ? (
                  <div className="text-center py-8">
                    <div className="text-muted-foreground mb-2">
                      Não foi possível carregar as informações do negócio
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.location.reload()}
                    >
                      Tentar novamente
                    </Button>
                  </div>
                ) : !business ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="mb-2">Informações do negócio não disponíveis</div>
                    <div className="text-xs">
                      As informações podem ter sido removidas ou não foram cadastradas
                    </div>
                  </div>
                 ) : (
                   <>
                     {/* Imagem de capa do negócio */}
                     {business?.cover_image_url && (
                       <div className="mb-4 -mx-4 sm:-mx-6 -mt-4 sm:-mt-6">
                         <img 
                           src={business.cover_image_url} 
                           alt={`Capa de ${business.name}`}
                           className="w-full h-24 sm:h-32 object-cover rounded-t-lg"
                         />
                       </div>
                     )}

                     <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-3 sm:space-y-0 sm:space-x-3 mb-4">
                       <Avatar className="w-16 h-16 sm:w-12 sm:h-12 flex-shrink-0">
                         <AvatarImage src={business?.logo_url} />
                         <AvatarFallback>
                           {business?.name?.charAt(0) || 'N'}
                         </AvatarFallback>
                       </Avatar>
                       <div className="flex-1 text-center sm:text-left">
                         <h3 className="font-semibold text-base sm:text-sm">{business?.name}</h3>
                         <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2">
                           <Badge variant="outline" className="text-xs">
                             {business?.category}
                           </Badge>
                           {business?.followers_count && business.followers_count > 0 && (
                             <div className="flex items-center text-xs text-muted-foreground">
                               <Users className="w-3 h-3 mr-1" />
                               {business.followers_count} seguidor{business.followers_count > 1 ? 'es' : ''}
                             </div>
                           )}
                         </div>
                       </div>
                     </div>

                     {business?.description && (
                       <div className="mb-4">
                         <p className="text-sm text-muted-foreground text-center sm:text-left">
                           {business.description}
                         </p>
                       </div>
                     )}

                     <div className="space-y-3 text-sm">
                       <div className="flex flex-col sm:flex-row sm:items-start">
                         <div className="flex items-start justify-center sm:justify-start mb-1 sm:mb-0">
                           <MapPin className="w-4 h-4 mr-2 text-muted-foreground mt-0.5 flex-shrink-0" />
                         </div>
                         <span className="flex-1 text-center sm:text-left">{business?.address}</span>
                       </div>
                       
                        {user && businessForLoggedUser?.phone && (
                          <div className="flex flex-col sm:flex-row sm:items-center">
                            <div className="flex items-center justify-center sm:justify-start mb-1 sm:mb-0">
                              <Phone className="w-4 h-4 mr-2 text-muted-foreground flex-shrink-0" />
                            </div>
                            <a 
                              href={`tel:${businessForLoggedUser.phone}`}
                              className="text-primary hover:underline text-center sm:text-left"
                            >
                              {businessForLoggedUser.phone}
                            </a>
                          </div>
                        )}

                        {user && businessForLoggedUser?.email && (
                          <div className="flex flex-col sm:flex-row sm:items-center">
                            <div className="flex items-center justify-center sm:justify-start mb-1 sm:mb-0">
                              <Mail className="w-4 h-4 mr-2 text-muted-foreground flex-shrink-0" />
                            </div>
                            <a 
                              href={`mailto:${businessForLoggedUser.email}`}
                              className="text-primary hover:underline text-center sm:text-left break-all"
                            >
                              {businessForLoggedUser.email}
                            </a>
                          </div>
                        )}
                        
                         {user && businessForLoggedUser?.website && (
                          <div className="flex flex-col sm:flex-row sm:items-center">
                            <div className="flex items-center justify-center sm:justify-start mb-1 sm:mb-0">
                              <Globe className="w-4 h-4 mr-2 text-muted-foreground flex-shrink-0" />
                            </div>
                            <a 
                              href={businessForLoggedUser?.website.startsWith('http') ? businessForLoggedUser.website : `https://${businessForLoggedUser.website}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline text-center sm:text-left"
                            >
                              Visitar site
                            </a>
                          </div>
                         )}
                     </div>

                     <Separator className="my-4" />

                     {business?.id && (
                       <Link to={`/negocio/${business.id}`}>
                          <Button className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground font-semibold shadow-md hover:shadow-lg transition-all">
                            Ver Perfil Completo do Negócio
                          </Button>
                       </Link>
                     )}
                   </>
                 )}
              </CardContent>
            </Card>

            {/* Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>Estatísticas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Visualizações:</span>
                    <span className="font-medium">{offerStats?.views_count ?? offer.views_count ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Curtidas:</span>
                    <span className="font-medium">{offerStats?.likes_count ?? offer.likes_count ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Favoritaram:</span>
                    <span className="font-medium">{offerStats?.favorites_count ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Compartilhamentos:</span>
                    <span className="font-medium">{offer.shares_count ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Resgates:</span>
                    <span className="font-medium">{offerStats?.checkins_count ?? offer.current_uses ?? 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Mapa do Local - aberto em modal para evitar qualquer scroll automático */}
            {offer?.latitude && offer?.longitude && business && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Localização do Negócio
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Veja no mapa onde o estabelecimento está localizado. O mapa abre em tela cheia quando você solicitar, sem mover a página.
                  </p>
                  <Button
                    type="button"
                    className="w-full"
                    onClick={() => {
                      setShowMap(true);
                      setIsMapDialogOpen(true);
                    }}
                  >
                    <Navigation className="w-4 h-4 mr-2" />
                    Ver mapa do local
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Outras ofertas do mesmo negócio */}
            {otherOffers && otherOffers.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    Mais ofertas deste negócio
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {otherOffers.map((otherOffer) => {
                      const discount = Math.round(((otherOffer.original_price - otherOffer.discounted_price) / otherOffer.original_price) * 100);
                      return (
                        <Link 
                          key={otherOffer.id} 
                          to={`/ofertas/${otherOffer.id}`}
                          className="block p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex gap-3">
                            {otherOffer.image_url && (
                              <img 
                                src={otherOffer.image_url} 
                                alt={otherOffer.title}
                                className="w-12 h-12 object-cover rounded flex-shrink-0"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm truncate">{otherOffer.title}</h4>
                              <div className="flex items-center justify-between mt-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-green-600">
                                    R$ {otherOffer.discounted_price}
                                  </span>
                                  {discount > 0 && (
                                    <Badge variant="secondary" className="text-xs">
                                      {discount}% OFF
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Até {new Date(otherOffer.valid_until).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                </div>
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                  
                  <Separator className="my-3" />
                  
                  {business?.id && (
                    <Link to={`/negocio/${business.id}`}>
                      <Button variant="outline" size="sm" className="w-full">
                        Ver todas as ofertas
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Smart Share Card */}
            {offer && business && (
              <SmartShareCard
                offer={{
                  id: offer.id,
                  title: offer.title,
                  description: offer.description,
                  original_price: offer.original_price,
                  discounted_price: offer.discounted_price,
                  discount_percentage: offer.discount_percentage,
                  image_url: offer.image_url,
                  business: { name: business.name, logo_url: business.logo_url },
                  category: offer.category,
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Check-in Modal */}
      <CheckinModal
        isOpen={showCheckinModal}
        onClose={() => setShowCheckinModal(false)}
        offerId={id!}
        businessId={offer?.business_id || ''}
        offerTitle={offer?.title || ''}
      />

      {/* Modal de Mapa em Tela Cheia para evitar qualquer rolagem na página */}
      {offer?.latitude && offer?.longitude && business && showMap && (
        <Dialog open={isMapDialogOpen} onOpenChange={setIsMapDialogOpen}>
          <DialogContent className="max-w-3xl w-full p-0 sm:p-0">
            <DialogHeader className="px-4 pt-4 pb-2 sm:px-6 sm:pt-6 sm:pb-3">
              <DialogTitle className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Localização do Negócio
              </DialogTitle>
            </DialogHeader>
            <div className="px-4 pb-4 sm:px-6 sm:pb-6">
              <MapboxOfferMap
                latitude={offer.latitude}
                longitude={offer.longitude}
                businessInfo={{
                  id: business.id,
                  name: business.name,
                  address: business.address,
                  phone: user ? (business as any).phone : undefined,
                  category: business.category,
                  website: user ? (business as any).website : undefined,
                  whatsapp: user ? (business as any).whatsapp : undefined,
                }}
                className="w-full"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Chat Window */}
      {isChatOpen && business && (
        <ChatWindow
          businessId={business.id}
          offerId={id}
          businessName={business.name}
          onClose={() => setIsChatOpen(false)}
        />
      )}
    </div>
    </>
  );
};

export default OfferDetails;
