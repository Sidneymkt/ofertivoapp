import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BadgeShowcase } from '@/components/BadgeShowcase';
import { useAuth } from '@/hooks/useAuth';
import { useUserFollows } from '@/hooks/useUserFollows';
import { useToast } from '@/hooks/use-toast';
import { ContributeModal } from '@/components/ContributeModal';
import { ChatWindow } from '@/components/ChatWindow';
import { SEOHead } from '@/components/SEOHead';
import { ShareMenu } from '@/components/ShareMenu';
import { useUserProfileRealtimeSync } from '@/hooks/useRealtimeSubscription';
import { useStorageImageUrl } from '@/hooks/useStorageImageUrl';
import {
  MapPin, 
  Award, 
  Calendar, 
  Target,
  Users,
  Heart,
  Star,
  Trophy,
  UserPlus,
  UserMinus,
  Eye,
  Store,
  UserCheck,
  ArrowLeft,
  Share2,
  Gift,
  TrendingUp,
  MessageSquare
} from 'lucide-react';

const PublicUserProfile = () => {
  const { id: userId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { checkIfFollowing, toggleUserFollow } = useUserFollows();
  const { toast } = useToast();
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowingUser, setIsFollowingUser] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [contributeModalOpen, setContributeModalOpen] = useState(false);
  const [showChat, setShowChat] = useState(false);

  // Real-time sync for user profile data
  useUserProfileRealtimeSync(userId);

  const { data: userProfile, isLoading, refetch } = useQuery({
    queryKey: ['public-user-profile', userId],
    queryFn: async () => {
      if (!userId) {
        return null;
      }

      // Get user profile data
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('[PublicUserProfile] Error loading profile:', profileError);
        throw new Error('Erro ao carregar perfil');
      }

      if (!profile) {
        return null;
      }

      // Get user statistics - using offer_checkins table with offer details for savings calculation
      const { data: checkins } = await supabase
        .from('offer_checkins')
        .select(`
          id, 
          points_awarded,
          offers (
            original_price,
            discounted_price
          )
        `)
        .eq('user_id', userId);

      const { data: reviews } = await supabase
        .from('reviews')
        .select('id, rating')
        .eq('user_id', userId);

      const { data: favorites } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', userId);

      // Get raffle entries
      const { data: raffleEntries } = await supabase
        .from('raffle_entries')
        .select('id')
        .eq('user_id', userId);

      // Get raffles won
      const { data: rafflesWon } = await supabase
        .from('raffles')
        .select('id')
        .eq('winner_id', userId);

      const { data: follows } = await supabase
        .from('follows')
        .select('id')
        .eq('user_id', userId);

      // Get recent activity from offer_checkins
      const { data: recentActivity } = await supabase
        .from('offer_checkins')
        .select(`
          id,
          created_at,
          points_awarded,
          offers (
            title,
            businesses (name)
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      // Get user badges
      const { data: badges } = await supabase
        .from('user_badges')
        .select('*, badges(*)')
        .eq('user_id', userId)
        .order('earned_at', { ascending: false });

      // Get favorited offers for display
      const { data: favoritedOffers } = await supabase
        .from('favorites')
        .select(`
          id, 
          offer_id, 
          created_at,
          offers!favorites_offer_id_fkey(
            title,
            businesses!offers_business_id_fkey(name)
          )
        `)
        .eq('user_id', userId)
        .limit(8);

      // Get followed businesses for display  
      const { data: followedBusinesses } = await supabase
        .from('follows')
        .select(`
          id, 
          business_id, 
          created_at,
          businesses!follows_business_id_fkey(
            name,
            category
          )
        `)
        .eq('user_id', userId)
        .limit(8);

      // Get active campaigns (vaquinhas)
      let campaigns: any[] = [];
      try {
        const { data: campaignsData } = await supabase
          .from('crowdfunding_campaigns')
          .select('*')
          .eq('creator_id', userId)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(5);
        campaigns = campaignsData || [];
      } catch (error) {
        console.log('Campaigns not available:', error);
      }

      // Calculate savings and points from checkins
      const totalSavings = checkins?.reduce((sum: number, checkin: any) => {
        const offer = checkin.offers;
        if (offer?.original_price && offer?.discounted_price) {
          return sum + (Number(offer.original_price) - Number(offer.discounted_price));
        }
        return sum;
      }, 0) || 0;

      const totalPointsFromCheckins = checkins?.reduce((sum: number, checkin: any) => {
        return sum + (checkin.points_awarded || 0);
      }, 0) || 0;

      // Calculate average rating
      const avgRating = reviews?.length 
        ? reviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / reviews.length 
        : 0;

      const result = {
        profile,
        stats: {
          totalCheckins: checkins?.length || 0,
          totalReviews: reviews?.length || 0,
          totalFavorites: favorites?.length || 0,
          totalFollows: follows?.length || 0,
          totalSavings: Math.round(totalSavings * 100) / 100,
          totalPointsFromCheckins,
          totalRaffleEntries: raffleEntries?.length || 0,
          rafflesWon: rafflesWon?.length || 0,
          avgRating: Math.round(avgRating * 10) / 10
        },
        recentActivity: recentActivity || [],
        badges: badges || [],
        followedBusinesses: followedBusinesses || [],
        favoritedOffers: favoritedOffers || [],
        campaigns: campaigns || []
      };

      return result;
    },
    refetchInterval: 10000, // Refetch every 10 seconds for real-time sync
    staleTime: 5000,
  });

  // Check if current user follows the profile user
  const { data: followStatus } = useQuery({
    queryKey: ['user-follow-status', userId, user?.id],
    queryFn: async () => {
      if (!user?.id || !userId || user.id === userId) return false;
      return await checkIfFollowing(userId);
    },
    enabled: !!user && !!userId && user.id !== userId
  });

  const handleFollowUser = async () => {
    if (!userId || !user) return;
    
    try {
      await toggleUserFollow(userId);
      setIsFollowingUser(!isFollowingUser);
      toast({
        title: isFollowingUser ? "Deixou de seguir" : "Seguindo",
        description: isFollowingUser 
          ? "Você não segue mais este usuário." 
          : "Agora você segue este usuário!",
      });
      refetch();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status de seguir.",
        variant: "destructive"
      });
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: `Perfil de ${userProfile?.profile?.full_name || 'Usuário Ofertivo'}`,
      text: `Conheça o perfil de ${userProfile?.profile?.full_name || 'usuário'} no Ofertivo!`,
      url: window.location.href,
    };

  // Real-time updates for user profile
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`user-profile-realtime-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${userId}`,
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
          table: 'user_badges',
          filter: `user_id=eq.${userId}`,
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
          table: 'user_follows',
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
          table: 'favorites',
          filter: `user_id=eq.${userId}`,
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
          table: 'follows',
          filter: `user_id=eq.${userId}`,
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
          table: 'offer_checkins',
          filter: `user_id=eq.${userId}`,
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
          table: 'raffle_entries',
          filter: `user_id=eq.${userId}`,
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
          table: 'raffles',
        },
        (payload) => {
          // Refetch if user won a raffle
          if ((payload.new as any)?.winner_id === userId) {
            refetch();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, refetch]);

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
          description: "O link do perfil foi copiado para sua área de transferência.",
        });
      } catch (error) {
        console.log('Erro ao copiar link:', error);
      }
    }
  };

  React.useEffect(() => {
    if (followStatus !== undefined) {
      setIsFollowingUser(followStatus);
    }
  }, [followStatus]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto p-4 sm:p-6">
          <div className="mb-4">
            <Link to="/" className="inline-flex items-center text-primary hover:underline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Link>
          </div>
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="h-32 animate-pulse bg-muted" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!userProfile?.profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-6xl">😔</div>
          <h1 className="text-2xl font-bold">Perfil não encontrado</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Este perfil não existe ou não está disponível publicamente.
          </p>
          <Link to="/">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao início
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const { profile, stats, recentActivity, badges, followedBusinesses, favoritedOffers, campaigns = [] } = userProfile;
  const memberSince = new Date(profile.created_at).toLocaleDateString('pt-BR', {
    month: 'long', 
    year: 'numeric' 
  });
  
  const isCurrentUser = user?.id === userId;

  return (
    <>
      <SEOHead
        title={profile.full_name || 'Usuário Ofertivo'}
        description={profile.bio || `Perfil de ${profile.full_name || 'usuário'} no Ofertivo - ${stats.totalCheckins} check-ins realizados, ${profile.total_points || 0} pontos acumulados, ${stats.totalFollows} lojas seguidas`}
        image={profile.cover_image_url || profile.avatar_url || undefined}
        type="profile"
        url={`/usuario/${userId}`}
      />
      <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <Link to="/" className="inline-flex items-center text-primary hover:underline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Link>
            <ShareMenu
              url={window.location.href}
              title={profile?.full_name || 'Perfil do Usuário'}
              description={profile?.bio || `Veja o perfil de ${profile?.full_name || 'usuário'} no Ofertivo`}
              contentType="user"
              contentId={userId}
              variant="outline"
              size="sm"
            />
          </div>

          {/* Cover Image and Avatar */}
          <div className="relative mb-4">
            {/* Cover Image */}
            {resolvedCoverUrl && (
              <div className="w-full aspect-[16/6] sm:aspect-[16/5] md:aspect-[16/5] lg:aspect-[16/4] overflow-hidden rounded-lg">
                <img
                  key={resolvedCoverUrl}
                  src={resolvedCoverUrl}
                  alt="Capa do perfil"
                  className="w-full h-full object-cover"
                  onError={handleCoverError}
                />
              </div>
            )}
            {/* Placeholder when no cover */}
            {!resolvedCoverUrl && (
              <div className={`w-full aspect-[16/6] sm:aspect-[16/5] md:aspect-[16/5] lg:aspect-[16/4] overflow-hidden rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 ${coverLoading ? 'animate-pulse' : ''}`} />
            )}
            
            {/* Avatar positioned over the cover */}
            <div className="absolute -bottom-14 left-6">
              <Avatar className="w-28 h-28 border-4 border-background shadow-lg">
                <AvatarImage src={resolvedAvatarUrl || undefined} onError={handleAvatarError} />
                <AvatarFallback className="text-3xl bg-primary/20">
                  {profile.full_name?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
          
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-primary/10 to-secondary/10 px-6 pt-20 pb-8">
              <div className="flex flex-col sm:flex-row items-start gap-6">
                
                <div className="flex-1 text-center sm:text-left">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className="flex-1">
                      <h1 className="text-3xl sm:text-4xl font-bold mb-2">
                        {profile.full_name || 'Usuário Ofertivo'}
                      </h1>
                      
                      {/* Bio */}
                      {profile.bio && (
                        <p className="text-muted-foreground mb-4 text-lg max-w-2xl">
                          {profile.bio}
                        </p>
                      )}
                      
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mb-4 text-muted-foreground">
                        {profile.city && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            <span>{profile.city}, {profile.state}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>Membro desde {memberSince}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Trophy className="w-3 h-3" />
                          {profile.total_points || 0} pontos
                        </Badge>
                        {badges.filter(b => b.is_unlocked).length > 0 && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Award className="w-3 h-3" />
                            {badges.filter(b => b.is_unlocked).length} conquistas
                          </Badge>
                        )}
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {profile.followers_count || 0} seguidores
                        </Badge>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2 min-w-[120px]">
                      {!isCurrentUser && user && (
                        <>
                          <Button
                            onClick={handleFollowUser}
                            variant={isFollowingUser ? "outline" : "default"}
                            size="sm"
                            className="w-full"
                          >
                            {isFollowingUser ? (
                              <>
                                <UserMinus className="w-4 h-4 mr-2" />
                                Seguindo
                              </>
                            ) : (
                              <>
                                <UserPlus className="w-4 h-4 mr-2" />
                                Seguir
                              </>
                            )}
                          </Button>
                          <Button
                            onClick={() => setShowChat(true)}
                            variant="outline"
                            size="sm"
                            className="w-full"
                          >
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Conversar
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Chat desabilitado - apenas entre usuários e negócios */}

        {/* Savings & Benefits Stats */}
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 mb-6">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center text-base sm:text-lg">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-green-600" />
              Economia e Benefícios
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 p-3 sm:p-4 rounded-lg text-center">
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 mx-auto mb-1" />
                <span className="text-xl sm:text-2xl font-bold text-green-600 block">
                  R$ {stats.totalSavings?.toFixed(2) || '0.00'}
                </span>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Economia Total</p>
              </div>
              <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 p-3 sm:p-4 rounded-lg text-center">
                <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 mx-auto mb-1" />
                <span className="text-xl sm:text-2xl font-bold text-blue-600 block">
                  {stats.totalPointsFromCheckins || 0}
                </span>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Pontos de Check-ins</p>
              </div>
              <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 p-3 sm:p-4 rounded-lg text-center">
                <Gift className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 mx-auto mb-1" />
                <span className="text-xl sm:text-2xl font-bold text-purple-600 block">
                  {stats.totalRaffleEntries || 0}
                </span>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Sorteios Participados</p>
              </div>
              <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border border-yellow-500/20 p-3 sm:p-4 rounded-lg text-center">
                <Award className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600 mx-auto mb-1" />
                <span className="text-xl sm:text-2xl font-bold text-yellow-600 block">
                  {stats.rafflesWon || 0}
                </span>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Sorteios Ganhos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <Card className="mb-6">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center text-base sm:text-lg">
              <Trophy className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              Estatísticas do Usuário
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="bg-muted/50 p-3 sm:p-4 rounded-lg text-center">
                <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500 mx-auto mb-1" />
                <span className="text-xl sm:text-2xl font-bold block">{profile.total_points || 0}</span>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Pontos Totais</p>
              </div>
              <div className="bg-muted/50 p-3 sm:p-4 rounded-lg text-center">
                <Star className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500 mx-auto mb-1" />
                <span className="text-xl sm:text-2xl font-bold block">{stats.avgRating || 0}</span>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Avaliação Média</p>
              </div>
              <div className="bg-muted/50 p-3 sm:p-4 rounded-lg text-center">
                <span className="text-xl sm:text-2xl font-bold block">{stats.totalReviews}</span>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Avaliações</p>
              </div>
              <div className="bg-muted/50 p-3 sm:p-4 rounded-lg text-center">
                <span className="text-xl sm:text-2xl font-bold block">{stats.totalCheckins}</span>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Check-ins</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Campaigns Banner - Destaque Principal */}
        {campaigns && campaigns.length > 0 && (
          <Card className="mb-6 border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
            <CardHeader className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <Gift className="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0" />
                  <span className="line-clamp-2">Vaquinhas Ativas - Apoie Esta Causa! 🎯</span>
                </CardTitle>
                {campaigns.length > 1 && (
                  <Badge variant="secondary" className="text-xs sm:text-sm self-start sm:self-auto">
                    {campaigns.length} {campaigns.length === 1 ? 'vaquinha' : 'vaquinhas'}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-3 sm:space-y-4">
                {campaigns.map((campaign: any) => {
                  const progress = (campaign.current_points / campaign.goal_points) * 100;
                  const pointsToReais = (points: number) => 
                    (points * 0.01).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                  
                  return (
                    <Card key={campaign.id} className="border-2 border-primary/10 hover:border-primary/30 transition-all">
                      <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                        {/* Imagem da vaquinha se houver */}
                        {campaign.image_url && (
                          <div className="w-full h-40 sm:h-48 rounded-lg overflow-hidden">
                            <img 
                              src={campaign.image_url}
                              alt={campaign.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                              <h3 className="font-bold text-lg sm:text-xl line-clamp-2">{campaign.title}</h3>
                              <Badge variant="secondary" className="flex items-center gap-1 self-start">
                                <TrendingUp className="w-3 h-3" />
                                {Math.round(progress)}%
                              </Badge>
                            </div>
                            <p className="text-muted-foreground text-sm line-clamp-3 mb-4">
                              {campaign.description}
                            </p>
                          </div>
                        </div>
                        
                        {/* Progresso */}
                        <div className="space-y-3">
                          <Progress value={progress} className="h-2 sm:h-3" />
                          <div className="grid grid-cols-2 gap-2 sm:gap-4 text-center">
                            <div className="p-2 sm:p-3 bg-primary/5 rounded-lg">
                              <p className="text-xs sm:text-sm text-muted-foreground mb-1">Arrecadado</p>
                              <p className="text-sm sm:text-lg font-bold text-primary">
                                {campaign.current_points.toLocaleString()} pts
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {pointsToReais(campaign.current_points)}
                              </p>
                            </div>
                            <div className="p-2 sm:p-3 bg-secondary/5 rounded-lg">
                              <p className="text-xs sm:text-sm text-muted-foreground mb-1">Meta</p>
                              <p className="text-sm sm:text-lg font-bold">
                                {campaign.goal_points.toLocaleString()} pts
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {pointsToReais(campaign.goal_points)}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Botão de contribuir */}
                        {!isCurrentUser && user && (
                          <div className="flex flex-col sm:flex-row gap-2">
                            <Button
                              onClick={() => {
                                setSelectedCampaign(campaign);
                                setContributeModalOpen(true);
                              }}
                              className="flex-1 h-11 sm:h-12 text-sm sm:text-base font-semibold"
                              size="lg"
                            >
                              <Gift className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                              <span className="truncate">Contribuir com Esta Vaquinha</span>
                            </Button>
                            <Button
                              onClick={async () => {
                                const shareData = {
                                  title: `Vaquinha: ${campaign.title}`,
                                  text: `Ajude ${profile.full_name} com esta vaquinha! ${campaign.description.substring(0, 100)}...`,
                                  url: window.location.href,
                                };
                                
                                if (navigator.share && navigator.canShare?.(shareData)) {
                                  try {
                                    await navigator.share(shareData);
                                  } catch (error) {
                                    console.log('Compartilhamento cancelado');
                                  }
                                } else {
                                  try {
                                    await navigator.clipboard.writeText(window.location.href);
                                    toast({
                                      title: "Link copiado!",
                                      description: "Compartilhe o link desta vaquinha com seus amigos.",
                                    });
                                  } catch (error) {
                                    console.log('Erro ao copiar');
                                  }
                                }
                              }}
                              variant="outline"
                              className="h-11 sm:h-12 sm:w-auto w-full"
                              size="lg"
                              aria-label="Compartilhar vaquinha"
                            >
                              <Share2 className="w-4 h-4 sm:w-5 sm:h-5 sm:mr-0" />
                              <span className="sm:hidden ml-2">Compartilhar</span>
                            </Button>
                          </div>
                        )}
                        
                        {!user && (
                          <div className="text-center p-3 sm:p-4 bg-muted rounded-lg space-y-3">
                            <p className="text-xs sm:text-sm text-muted-foreground mb-2">
                              Faça login para contribuir com esta vaquinha
                            </p>
                            <div className="flex flex-col sm:flex-row gap-2">
                              <Link to="/login" className="flex-1">
                                <Button variant="default" className="w-full h-11 sm:h-12 text-sm sm:text-base" size="lg">
                                  Fazer Login
                                </Button>
                              </Link>
                              <Button
                                onClick={async () => {
                                  const shareData = {
                                    title: `Vaquinha: ${campaign.title}`,
                                    text: `Ajude ${profile.full_name} com esta vaquinha! ${campaign.description.substring(0, 100)}...`,
                                    url: window.location.href,
                                  };
                                  
                                  if (navigator.share && navigator.canShare?.(shareData)) {
                                    try {
                                      await navigator.share(shareData);
                                    } catch (error) {
                                      console.log('Compartilhamento cancelado');
                                    }
                                  } else {
                                    try {
                                      await navigator.clipboard.writeText(window.location.href);
                                      toast({
                                        title: "Link copiado!",
                                        description: "Compartilhe o link desta vaquinha.",
                                      });
                                    } catch (error) {
                                      console.log('Erro ao copiar');
                                    }
                                  }
                                }}
                                variant="outline"
                                size="lg"
                                className="h-11 sm:h-12 w-full sm:w-auto"
                                aria-label="Compartilhar vaquinha"
                              >
                                <Share2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-0" />
                                <span className="sm:hidden">Compartilhar</span>
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content - Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-20 sm:mb-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Badges/Achievements */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <Award className="w-5 h-5" />
                  Conquistas
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <BadgeShowcase userId={userId} compact={false} />
              </CardContent>
            </Card>

            {/* Activity Level */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <Target className="w-5 h-5" />
                  Nível de Atividade
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6">
                <div>
                  <div className="flex justify-between text-xs sm:text-sm mb-2">
                    <span>Check-ins</span>
                    <span>{stats.totalCheckins}/50</span>
                  </div>
                  <Progress value={Math.min((stats.totalCheckins / 50) * 100, 100)} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between text-xs sm:text-sm mb-2">
                    <span>Avaliações</span>
                    <span>{stats.totalReviews}/20</span>
                  </div>
                  <Progress value={Math.min((stats.totalReviews / 20) * 100, 100)} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between text-xs sm:text-sm mb-2">
                    <span>Negócios seguidos</span>
                    <span>{stats.totalFollows}/30</span>
                  </div>
                  <Progress value={Math.min((stats.totalFollows / 30) * 100, 100)} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <Eye className="w-5 h-5" />
                  Atividade Recente
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                {recentActivity.length > 0 ? (
                  <div className="space-y-2 sm:space-y-3">
                    {recentActivity.map((activity: any) => (
                      <div key={activity.id} className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-muted/50">
                        <div className="w-2 h-2 rounded-full bg-primary mt-1 sm:mt-2 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm font-medium">
                            ✅ Check-in realizado
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {activity.offers?.title || 'Oferta'} - {activity.offers?.businesses?.name || 'Negócio'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(activity.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs flex-shrink-0">
                          +{activity.points_awarded || 0}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4 text-sm">
                    Nenhuma atividade recente.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-4 sm:space-y-6">
            {/* User Interests */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <Heart className="w-5 h-5" />
                  Interesses
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                {profile.interests && profile.interests.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {profile.interests.map((interest, index) => (
                      <Badge key={index} variant="secondary" className="text-xs sm:text-sm">
                        {interest}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-xs sm:text-sm">
                    Nenhum interesse definido.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Public Activity Tabs */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-lg sm:text-xl">Atividade Pública</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Tabs defaultValue="favorites" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="favorites" className="text-xs sm:text-sm">Favoritos</TabsTrigger>
                    <TabsTrigger value="following" className="text-xs sm:text-sm">Seguindo</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="favorites" className="p-3 sm:p-4 pt-3 sm:pt-4">
                    {favoritedOffers.length > 0 ? (
                      <div className="space-y-2 sm:space-y-3">
                        {favoritedOffers.map((favorite) => (
                          <div key={favorite.id} className="flex items-center gap-2 sm:gap-3 p-2 rounded-lg hover:bg-muted/50">
                            <Heart className="w-3 h-3 sm:w-4 sm:h-4 text-red-500 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs sm:text-sm font-medium truncate">
                                {(favorite.offers as any)?.title}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {(favorite.offers as any)?.businesses?.name}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-xs sm:text-sm text-center py-4">
                        Nenhuma oferta favoritada.
                      </p>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="following" className="p-3 sm:p-4 pt-3 sm:pt-4">
                    {followedBusinesses.length > 0 ? (
                      <div className="space-y-2 sm:space-y-3">
                        {followedBusinesses.map((follow) => (
                          <div key={follow.id} className="flex items-center gap-2 sm:gap-3 p-2 rounded-lg hover:bg-muted/50">
                            <Store className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs sm:text-sm font-medium truncate">
                                {(follow.businesses as any)?.name}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {(follow.businesses as any)?.category}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-xs sm:text-sm text-center py-4">
                        Não segue nenhum negócio.
                      </p>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Contribute Modal */}
        {selectedCampaign && (
          <ContributeModal
            open={contributeModalOpen}
            onOpenChange={setContributeModalOpen}
            campaign={selectedCampaign}
            onSuccess={() => {
              setContributeModalOpen(false);
              refetch();
              toast({
                title: "Contribuição realizada!",
                description: "Sua contribuição foi registrada com sucesso.",
              });
            }}
          />
        )}

        {/* Chat Window */}
        {showChat && profile?.user_id && (
          <ChatWindow
            targetUserId={profile.user_id}
            businessName={profile.full_name || 'Usuário'}
            onClose={() => setShowChat(false)}
          />
        )}
      </div>
    </div>
    </>
  );
};

export default PublicUserProfile;