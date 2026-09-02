
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { BackButton } from '@/components/BackButton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { getAppBaseUrl } from '@/lib/config';
import { 
  User, 
  UserPlus, 
  TrendingUp, 
  DollarSign, 
  Copy,
  Share2,
  Settings,
  LogOut,
  Trophy,
  Star,
  Award,
  MapPin,
  Eye,
  Users,
  Save,
  Heart,
  Plus,
  ArrowRight,
  MessageSquare,
  Lock
} from 'lucide-react';
import { ProfileAchievementsShowcase } from '@/components/ProfileAchievementsShowcase';
import { ThemeToggleCompact } from '@/components/ui/theme-toggle';
import { AvatarUpload } from '@/components/AvatarUpload';
import { CoverImageUpload } from '@/components/CoverImageUpload';
import { InterestsEditor } from '@/components/InterestsEditor';
import { AddressEditor } from '@/components/AddressEditor';
import { FavoritesHistory } from '@/components/FavoritesHistory';
import { TipsFooter } from '@/components/TipsFooter';
import { HelpCircle, Gift } from 'lucide-react';
import { ReferralStatsChart } from '@/components/ReferralStatsChart';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { UserChatList } from '@/components/UserChatList';
import { ChatWindow } from '@/components/ChatWindow';
import type { Chat } from '@/hooks/useChat';
import { useUserProfileRealtimeSync } from '@/hooks/useRealtimeSubscription';
import { NotificationSettings } from '@/components/NotificationSettings';
import { ChangePasswordForm } from '@/components/ChangePasswordForm';

interface UserProfileData {
  full_name: string;
  bio: string;
  phone: string;
  city: string;
  state: string;
  address: string;
  interests: string[];
}

const Profile = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [profileData, setProfileData] = useState<UserProfileData>({
    full_name: '',
    bio: '',
    phone: '',
    city: 'Manaus',
    state: 'AM',
    address: '',
    interests: []
  });
  const [originalProfileData, setOriginalProfileData] = useState<UserProfileData>({
    full_name: '',
    bio: '',
    phone: '',
    city: 'Manaus',
    state: 'AM',
    address: '',
    interests: []
  });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [userStats, setUserStats] = useState({
    totalPoints: 0,
    totalReviews: 0,
    avgRating: 0,
    totalOffers: 0,
    totalCheckins: 0
  });
  const [savingsStats, setSavingsStats] = useState({
    totalSavings: 0,
    totalCheckins: 0,
    totalRaffleEntries: 0,
    rafflesWon: 0,
    totalPointsFromCheckins: 0
  });
  const [referralCode, setReferralCode] = useState('');
  const [referralStats, setReferralStats] = useState({
    total: 0,
    users: 0,
    businesses: 0,
    points: 0
  });
  const [referralChartData, setReferralChartData] = useState<Array<{
    date: string;
    users: number;
    businesses: number;
  }>>([]);
  const [loadingReferrals, setLoadingReferrals] = useState(false);
  const [campaignStats, setCampaignStats] = useState({
    total: 0,
    active: 0,
    totalContributed: 0,
    totalReceived: 0
  });
  const { unreadCount } = useUnreadMessages();
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [showingUserName, setShowingUserName] = useState<string>('');

  // Real-time sync for profile data
  useUserProfileRealtimeSync(user?.id);

  // Check if profile data has changed
  useEffect(() => {
    const dataChanged = JSON.stringify(profileData) !== JSON.stringify(originalProfileData);
    setHasChanges(dataChanged);
  }, [profileData, originalProfileData]);

  // Load user profile data
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('[Profile] Error loading profile:', error);
          return;
        }

        const loadedData = {
          full_name: data?.full_name || '',
          bio: data?.bio || '',
          phone: data?.phone || '',
          city: data?.city || 'Manaus',
          state: data?.state || 'AM',
          address: data?.address || '',
          interests: data?.interests || []
        };

        setProfileData(loadedData);
        setOriginalProfileData(loadedData);
        setAvatarUrl(data?.avatar_url || null);
        const coverImageUrl = (data as any)?.cover_image_url;
        console.log('[Profile] Setting cover URL:', coverImageUrl);
        setCoverUrl(coverImageUrl || null);
      } catch (error) {
        console.error('[Profile] Error loading profile:', error);
      }
    };

    loadProfile();

    // Subscribe to profile changes for real-time updates
    if (user) {
      const channel = supabase
        .channel('user-profile-changes')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('[Profile] Real-time update received:', payload);
            if (payload.new) {
              const newData = payload.new as any;
              setCoverUrl(newData.cover_image_url || null);
              setAvatarUrl(newData.avatar_url || null);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  // Load user statistics
  useEffect(() => {
    const loadStats = async () => {
      if (!user) return;

      try {
        // Get total points
        const { data: profileData } = await supabase
          .from('profiles')
          .select('total_points, referral_code')
          .eq('user_id', user.id)
          .single();

        if (profileData?.referral_code) {
          setReferralCode(profileData.referral_code);
        }

        // Get reviews
        const { data: reviewsData } = await supabase
          .from('reviews')
          .select('rating')
          .eq('user_id', user.id);

        // Get checkins from offer_checkins table (correct table)
        const { data: checkinsData } = await supabase
          .from('offer_checkins')
          .select('id, points_awarded')
          .eq('user_id', user.id);

        const totalPoints = profileData?.total_points || 0;
        const totalReviews = reviewsData?.length || 0;
        const avgRating = reviewsData?.length 
          ? reviewsData.reduce((sum, r) => sum + r.rating, 0) / reviewsData.length 
          : 0;
        const totalCheckins = checkinsData?.length || 0;

        setUserStats({
          totalPoints,
          totalReviews,
          avgRating: Math.round(avgRating * 10) / 10,
          totalOffers: 0,
          totalCheckins
        });

        // Load savings and benefits statistics
        // Get checkins with offer details to calculate savings
        const { data: offerCheckinsData } = await supabase
          .from('offer_checkins')
          .select(`
            points_awarded,
            offer_id,
            offers (
              original_price,
              discounted_price
            )
          `)
          .eq('user_id', user.id);

        // Calculate total savings from offers
        const totalSavings = offerCheckinsData?.reduce((sum, checkin: any) => {
          const offer = checkin.offers;
          if (offer?.original_price && offer?.discounted_price) {
            return sum + (Number(offer.original_price) - Number(offer.discounted_price));
          }
          return sum;
        }, 0) || 0;

        // Calculate total points from checkins
        const totalPointsFromCheckins = offerCheckinsData?.reduce((sum, checkin: any) => {
          return sum + (checkin.points_awarded || 0);
        }, 0) || 0;

        // Get raffle entries
        const { data: raffleEntriesData } = await supabase
          .from('raffle_entries')
          .select('id')
          .eq('user_id', user.id);

        // Get raffles won
        const { data: rafflesWonData } = await supabase
          .from('raffles')
          .select('id, prize')
          .eq('winner_id', user.id);

        setSavingsStats({
          totalSavings: Math.round(totalSavings * 100) / 100,
          totalCheckins: offerCheckinsData?.length || 0,
          totalRaffleEntries: raffleEntriesData?.length || 0,
          rafflesWon: rafflesWonData?.length || 0,
          totalPointsFromCheckins
        });
      } catch (error) {
        console.error('Error loading stats:', error);
      }
    };

    loadStats();
  }, [user]);

  // Note: Real-time updates are handled by separate useEffects for each data type
  // (loadSavingsStats, loadReferralStats, etc.) to avoid unnecessary page reloads

  // Load referral statistics with realtime
  useEffect(() => {
    if (!user) return;

    const loadReferralStats = async () => {
      setLoadingReferrals(true);
      try {
        // Get ALL referral tracking data (no date filter for stats)
        const { data: allTrackingData } = await supabase
          .from('referral_tracking')
          .select('*')
          .eq('referrer_id', user.id)
          .order('created_at', { ascending: true });

        if (allTrackingData) {
          // Calculate stats from ALL referrals
          const users = allTrackingData.filter(t => t.referred_user_type === 'consumer').length;
          const businesses = allTrackingData.filter(t => t.referred_user_type === 'business').length;
          const points = allTrackingData.reduce((sum, t) => sum + (t.referrer_points_awarded || 0), 0);

          setReferralStats({
            total: allTrackingData.length,
            users,
            businesses,
            points
          });

          // Prepare chart data - group by day (use all data for chart too)
          const chartDataMap = new Map<string, { users: number; businesses: number }>();
          
          allTrackingData.forEach(item => {
            const date = format(new Date(item.created_at), 'dd/MM', { locale: ptBR });
            const existing = chartDataMap.get(date) || { users: 0, businesses: 0 };
            
            if (item.referred_user_type === 'consumer') {
              existing.users++;
            } else if (item.referred_user_type === 'business') {
              existing.businesses++;
            }
            
            chartDataMap.set(date, existing);
          });

          const chartData = Array.from(chartDataMap.entries()).map(([date, data]) => ({
            date,
            ...data
          }));

          setReferralChartData(chartData);
        }
      } catch (error) {
        console.error('Error loading referral stats:', error);
      } finally {
        setLoadingReferrals(false);
      }
    };

    loadReferralStats();

    // Setup realtime subscription - only if user exists
    const channel = supabase
      .channel('profile-referral-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'referral_tracking',
          filter: `referrer_id=eq.${user.id}`,
        },
        () => {
          console.log('Nova indicação detectada');
          toast({
            title: "🎉 Nova Indicação!",
            description: "Você acabou de ganhar uma nova indicação!"
          });
          loadReferralStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Real-time updates for savings and benefits statistics
  useEffect(() => {
    if (!user) return;

    const loadSavingsStats = async () => {
      try {
        // Get total points from profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('total_points')
          .eq('user_id', user.id)
          .single();

        // Get checkins with offer details to calculate savings
        const { data: offerCheckinsData } = await supabase
          .from('offer_checkins')
          .select(`
            points_awarded,
            offer_id,
            offers (
              original_price,
              discounted_price
            )
          `)
          .eq('user_id', user.id);

        // Calculate total savings from offers
        const totalSavings = offerCheckinsData?.reduce((sum, checkin: any) => {
          const offer = checkin.offers;
          if (offer?.original_price && offer?.discounted_price) {
            return sum + (Number(offer.original_price) - Number(offer.discounted_price));
          }
          return sum;
        }, 0) || 0;

        // Calculate total points from checkins
        const totalPointsFromCheckins = offerCheckinsData?.reduce((sum, checkin: any) => {
          return sum + (checkin.points_awarded || 0);
        }, 0) || 0;

        // Get raffle entries
        const { data: raffleEntriesData } = await supabase
          .from('raffle_entries')
          .select('id')
          .eq('user_id', user.id);

        // Get raffles won
        const { data: rafflesWonData } = await supabase
          .from('raffles')
          .select('id, prize')
          .eq('winner_id', user.id);

        setSavingsStats({
          totalSavings: Math.round(totalSavings * 100) / 100,
          totalCheckins: offerCheckinsData?.length || 0,
          totalRaffleEntries: raffleEntriesData?.length || 0,
          rafflesWon: rafflesWonData?.length || 0,
          totalPointsFromCheckins
        });

        // Update user stats with latest points
        setUserStats(prev => ({
          ...prev,
          totalPoints: profileData?.total_points || 0
        }));
      } catch (error) {
        console.error('Error loading savings stats:', error);
      }
    };

    // Initial load
    loadSavingsStats();

    // Setup realtime subscriptions for savings-related changes
    const checkinChannel = supabase
      .channel('savings-checkins-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'offer_checkins',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          console.log('Check-in detectado - atualizando estatísticas');
          loadSavingsStats();
        }
      )
      .subscribe();

    const raffleEntriesChannel = supabase
      .channel('savings-raffle-entries-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'raffle_entries',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          console.log('Nova entrada em sorteio detectada - atualizando estatísticas');
          loadSavingsStats();
        }
      )
      .subscribe();

    const rafflesWonChannel = supabase
      .channel('savings-raffles-won-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'raffles',
        },
        (payload) => {
          // Check if this user won the raffle
          const newData = payload.new as any;
          if (newData?.winner_id === user.id) {
            console.log('Sorteio ganho detectado - atualizando estatísticas');
            toast({
              title: "🎉 Parabéns!",
              description: "Você ganhou um sorteio!"
            });
            loadSavingsStats();
          }
        }
      )
      .subscribe();

    // Subscribe to profile changes for total_points updates
    const profileChannel = supabase
      .channel('profile-points-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Pontos atualizados - recarregando dados');
          loadSavingsStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(checkinChannel);
      supabase.removeChannel(raffleEntriesChannel);
      supabase.removeChannel(rafflesWonChannel);
      supabase.removeChannel(profileChannel);
    };
  }, [user, toast]);

  // Load campaign statistics
  useEffect(() => {
    const loadCampaignStats = async () => {
      if (!user) return;

      try {
        // Get campaigns created by user
        const { data: createdCampaigns } = await supabase
          .from('crowdfunding_campaigns')
          .select('id, is_active, current_points')
          .eq('creator_id', user.id);

        const totalCreated = createdCampaigns?.length || 0;
        const activeCreated = createdCampaigns?.filter(c => c.is_active).length || 0;
        const totalReceived = createdCampaigns?.reduce((sum, c) => sum + c.current_points, 0) || 0;

        // Get contributions made by user
        const { data: contributions } = await supabase
          .from('campaign_contributions')
          .select('amount')
          .eq('contributor_id', user.id);

        const totalContributed = contributions?.reduce((sum, c) => sum + c.amount, 0) || 0;

        setCampaignStats({
          total: totalCreated,
          active: activeCreated,
          totalContributed,
          totalReceived
        });
      } catch (error) {
        console.error('Error loading campaign stats:', error);
      }
    };

    loadCampaignStats();
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          full_name: profileData.full_name,
          bio: profileData.bio,
          phone: profileData.phone,
          city: profileData.city,
          state: profileData.state,
          address: profileData.address,
          interests: profileData.interests,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      setOriginalProfileData(profileData);
      setHasChanges(false);
      
      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram salvas com sucesso."
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as informações.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setProfileData(originalProfileData);
    setHasChanges(false);
    setIsEditing(false);
  };


  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
      navigate('/');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Acesso negado</h2>
          <p className="text-muted-foreground mb-4">
            Você precisa estar logado para acessar esta página.
          </p>
          <Button onClick={() => navigate('/login')}>
            Fazer Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="flex items-start gap-2 sm:gap-4">
            <BackButton to="/" label="Voltar" className="mt-1" />
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold">Meu Perfil</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Gerencie suas informações e programa de afiliados
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button 
              variant="outline" 
              onClick={() => navigate(`/usuario/${user?.id}`)}
              className="flex items-center flex-1 sm:flex-initial"
              size="sm"
            >
              <Eye className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Ver Perfil Público</span>
              <span className="sm:hidden">Perfil</span>
            </Button>
            <ThemeToggleCompact />
            <Button 
              variant="outline" 
              onClick={handleSignOut}
              className="flex items-center"
              size="sm"
            >
              <LogOut className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>

        <div className="max-w-5xl mx-auto">
          {/* Main Content */}
          <div className="space-y-4 sm:space-y-6">
            {/* Cover Image and Avatar */}
            <div className="relative">
              {/* Cover Image - higher z-index for hover interactions */}
              <div className="relative z-10">
                <CoverImageUpload
                  currentCoverUrl={coverUrl}
                  onCoverChange={(url) => {
                    console.log('[Profile] Cover changed, new URL:', url);
                    setCoverUrl(url);
                  }}
                  entityType="user"
                  showSizeHint={isEditing}
                />
              </div>
              
              {/* Avatar positioned over the cover - lower z-index */}
              <div className="absolute -bottom-12 sm:-bottom-16 left-4 sm:left-8 z-20 pointer-events-none">
                <div className="pointer-events-auto">
                  <AvatarUpload
                    currentAvatarUrl={avatarUrl}
                    onAvatarChange={(url) => setAvatarUrl(url)}
                    size="lg"
                    showSizeHint={isEditing}
                  />
                </div>
              </div>
            </div>

            {/* Spacing for overlapped avatar */}
            <div className="h-12 sm:h-16" />

            {/* Savings & Benefits Stats */}
            <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center text-base sm:text-lg">
                  <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-green-600" />
                  Economia e Benefícios
                </CardTitle>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Veja quanto você economizou usando o Ofertivo
                </p>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 p-3 sm:p-4 rounded-lg">
                    <div className="flex flex-col items-center mb-2">
                      <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 mb-1" />
                      <span className="text-xl sm:text-2xl font-bold text-green-600">
                        R$ {savingsStats.totalSavings.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-[10px] sm:text-xs text-center text-muted-foreground">
                      Economia Total
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 p-3 sm:p-4 rounded-lg">
                    <div className="flex flex-col items-center mb-2">
                      <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 mb-1" />
                      <span className="text-xl sm:text-2xl font-bold text-blue-600">
                        {savingsStats.totalPointsFromCheckins}
                      </span>
                    </div>
                    <p className="text-[10px] sm:text-xs text-center text-muted-foreground">
                      Pontos de Check-ins
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 p-3 sm:p-4 rounded-lg">
                    <div className="flex flex-col items-center mb-2">
                      <Gift className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 mb-1" />
                      <span className="text-xl sm:text-2xl font-bold text-purple-600">
                        {savingsStats.totalRaffleEntries}
                      </span>
                    </div>
                    <p className="text-[10px] sm:text-xs text-center text-muted-foreground">
                      Sorteios Participados
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border border-yellow-500/20 p-3 sm:p-4 rounded-lg">
                    <div className="flex flex-col items-center mb-2">
                      <Award className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600 mb-1" />
                      <span className="text-xl sm:text-2xl font-bold text-yellow-600">
                        {savingsStats.rafflesWon}
                      </span>
                    </div>
                    <p className="text-[10px] sm:text-xs text-center text-muted-foreground">
                      Sorteios Ganhos
                    </p>
                  </div>
                </div>
                
                {savingsStats.totalSavings > 0 && (
                  <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <p className="text-xs sm:text-sm text-green-800 dark:text-green-300 text-center">
                      🎉 Parabéns! Você já economizou{' '}
                      <span className="font-bold">R$ {savingsStats.totalSavings.toFixed(2)}</span>{' '}
                      usando o Ofertivo!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* User Stats Overview */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center text-base sm:text-lg">
                  <Trophy className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Estatísticas do Usuário
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4">
                  <div className="bg-muted/50 p-2 sm:p-3 md:p-4 rounded-lg">
                    <div className="flex flex-col items-center mb-1 sm:mb-2">
                      <Trophy className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-yellow-500 mb-1" />
                      <span className="text-base sm:text-lg md:text-2xl font-bold">{userStats.totalPoints}</span>
                    </div>
                    <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">Pontos Totais</p>
                  </div>
                  <div className="bg-muted/50 p-2 sm:p-3 md:p-4 rounded-lg">
                    <div className="flex flex-col items-center mb-1 sm:mb-2">
                      <Star className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-yellow-500 mb-1" />
                      <span className="text-base sm:text-lg md:text-2xl font-bold">{userStats.avgRating}</span>
                    </div>
                    <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">Avaliação Média</p>
                  </div>
                  <div className="bg-muted/50 p-2 sm:p-3 md:p-4 rounded-lg">
                    <span className="text-base sm:text-lg md:text-2xl font-bold block">{userStats.totalReviews}</span>
                    <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mt-1">Avaliações</p>
                  </div>
                  <div className="bg-muted/50 p-2 sm:p-3 md:p-4 rounded-lg">
                    <span className="text-base sm:text-lg md:text-2xl font-bold block">{userStats.totalCheckins}</span>
                    <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mt-1">Check-ins</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Badges Section */}
            <ProfileAchievementsShowcase userId={user!.id} />

            {/* Profile Information */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="flex items-center text-base sm:text-lg">
                    <User className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    Informações Pessoais
                  </CardTitle>
                  {!isEditing && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                      className="flex-shrink-0"
                    >
                      <Settings className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Editar</span>
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <Label htmlFor="full_name">Nome Completo</Label>
                    <Input
                      id="full_name"
                      value={profileData.full_name}
                      onChange={(e) => setProfileData(prev => ({ ...prev, full_name: e.target.value }))}
                      disabled={!isEditing}
                      placeholder="Digite seu nome completo"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      value={profileData.phone}
                      onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                      disabled={!isEditing}
                      placeholder="Digite seu telefone"
                    />
                  </div>
                  <div>
                    <Label htmlFor="city">Cidade</Label>
                    <Input
                      id="city"
                      value={profileData.city}
                      onChange={(e) => setProfileData(prev => ({ ...prev, city: e.target.value }))}
                      disabled={!isEditing}
                      placeholder="Digite sua cidade"
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">Estado</Label>
                    <Input
                      id="state"
                      value={profileData.state}
                      onChange={(e) => setProfileData(prev => ({ ...prev, state: e.target.value }))}
                      disabled={!isEditing}
                      placeholder="Digite seu estado"
                    />
                  </div>
                </div>

                <Separator className="my-4" />

                {/* Address Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <Label className="text-base font-medium">Endereço</Label>
                  </div>
                  <AddressEditor
                    onAddressSelect={(address) => {
                      setProfileData(prev => ({ ...prev, address: address.formatted_address }));
                    }}
                    disabled={!isEditing}
                    showSavedAddresses={false}
                  />
                </div>

                {isEditing && (
                  <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={handleCancelEdit}
                      disabled={isSaving}
                      className="w-full sm:w-auto min-w-[100px]"
                      size="default"
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleSaveProfile}
                      disabled={isSaving || !hasChanges}
                      className="bg-gradient-primary w-full sm:w-auto min-w-[120px]"
                      size="default"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {isSaving ? 'Salvando...' : 'Salvar'}
                    </Button>
                  </div>
                )}

                {hasChanges && isEditing && (
                  <div className="text-xs sm:text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-2 sm:p-3 rounded-lg">
                    ⚠️ Você tem alterações não salvas
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Interests Editor */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg">Interesses</CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                {user && (
                  <InterestsEditor
                    userId={user.id}
                    initialInterests={profileData.interests}
                    onInterestsChange={(ints) => {
                      setProfileData((prev) => ({ ...prev, interests: ints }));
                      setOriginalProfileData((prev) => ({ ...prev, interests: ints }));
                    }}
                  />
                )}
              </CardContent>
            </Card>

            {/* Segurança */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Lock className="w-5 h-5 text-primary" />
                  Segurança
                </CardTitle>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Gerencie sua senha de acesso
                </p>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="max-w-md">
                  <ChangePasswordForm />
                </div>
              </CardContent>
            </Card>

            {/* Messages Section */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <MessageSquare className="h-5 w-5" />
                      Minhas Conversas
                      {unreadCount > 0 && (
                        <Badge variant="destructive" className="ml-2">
                          {unreadCount} nova{unreadCount > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </CardTitle>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                      Gerencie suas conversas com outros usuários e negócios
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <UserChatList 
                  onChatSelect={async (chat) => {
                    setSelectedChat(chat);
                    // Determinar o nome para exibir
                    if (chat.business_id) {
                      const { data: businessData } = await supabase
                        .from('businesses')
                        .select('name')
                        .eq('id', chat.business_id)
                        .single();
                      setShowingUserName(businessData?.name || 'Negócio');
                    } else {
                      const otherUserId = chat.target_user_id === user?.id ? chat.user_id : chat.target_user_id;
                      const { data: profile } = await supabase
                        .from('profiles')
                        .select('full_name')
                        .eq('user_id', otherUserId)
                        .single();
                      setShowingUserName(profile?.full_name || 'Usuário');
                    }
                  }} 
                />
              </CardContent>
            </Card>

            {/* Referral System Section */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <Gift className="h-5 w-5" />
                      Sistema de Indicações
                    </CardTitle>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                      Indique amigos e negócios para ganhar pontos e comissões
                    </p>
                  </div>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => navigate('/indicacoes')}
                    className="hidden sm:flex bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    Ver Detalhes
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-4">
                {/* Referral Code Display */}
                <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                  <p className="text-sm text-muted-foreground mb-2">Seu Código de Indicação</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xl sm:text-2xl font-bold text-primary flex-1">
                      {referralCode || user.id.substring(0, 8).toUpperCase()}
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(referralCode || user.id.substring(0, 8).toUpperCase());
                        toast({
                          title: "Código copiado!",
                          description: "Compartilhe com seus amigos"
                        });
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Referral Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="h-4 w-4 text-primary" />
                      <span className="text-xs text-muted-foreground">Total</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold">{referralStats.total}</p>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="h-4 w-4 text-blue-500" />
                      <span className="text-xs text-muted-foreground">Usuários</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold">{referralStats.users}</p>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Award className="h-4 w-4 text-yellow-500" />
                      <span className="text-xs text-muted-foreground">Negócios</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold">{referralStats.businesses}</p>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Trophy className="h-4 w-4 text-green-500" />
                      <span className="text-xs text-muted-foreground">Pontos</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold">{referralStats.points}</p>
                  </div>
                </div>

                {/* Referral Links */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">Links de Indicação:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => {
                        const link = `${getAppBaseUrl()}/cadastro?ref=${referralCode || user.id.substring(0, 8).toUpperCase()}`;
                        if (navigator.share) {
                          navigator.share({
                            title: 'Junte-se ao Ofertivo!',
                            text: `Use meu código ${referralCode} e ganhe 50 pontos de bônus!`,
                            url: link,
                          }).catch(() => {
                            navigator.clipboard.writeText(link);
                            toast({ title: "Link copiado!" });
                          });
                        } else {
                          navigator.clipboard.writeText(link);
                          toast({ title: "Link copiado!" });
                        }
                      }}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      <span className="text-xs sm:text-sm">Indicar Consumidor (+50 pts)</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => {
                        const link = `${getAppBaseUrl()}/anunciante/cadastro?ref=${referralCode || user.id.substring(0, 8).toUpperCase()}`;
                        if (navigator.share) {
                          navigator.share({
                            title: 'Cadastre seu negócio no Ofertivo!',
                            text: `Use meu código ${referralCode} e ganhe benefícios exclusivos!`,
                            url: link,
                          }).catch(() => {
                            navigator.clipboard.writeText(link);
                            toast({ title: "Link copiado!" });
                          });
                        } else {
                          navigator.clipboard.writeText(link);
                          toast({ title: "Link copiado!" });
                        }
                      }}
                    >
                      <DollarSign className="h-4 w-4 mr-2" />
                      <span className="text-xs sm:text-sm">Indicar Negócio (+25% comissão)</span>
                    </Button>
                  </div>
                </div>

                <Button
                  variant="default"
                  className="w-full sm:hidden bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-200"
                  onClick={() => navigate('/indicacoes')}
                >
                  Ver Detalhes Completos
                </Button>
              </CardContent>
            </Card>

            {/* Referral Chart */}
            <ReferralStatsChart
              data={referralChartData}
              totalReferrals={referralStats.total}
              loading={loadingReferrals}
            />

            {/* Vaquinhas Section */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <Heart className="h-5 w-5 text-pink-500" />
                      Vaquinhas Digitais
                    </CardTitle>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                      Apoie causas e crie campanhas com seus pontos
                    </p>
                  </div>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => navigate('/vaquinhas')}
                    className="hidden sm:flex bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                  >
                    Ver Todas
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-4">
                {/* Campaign Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-gradient-to-br from-pink-500/10 to-pink-600/5 border border-pink-500/20 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Heart className="h-4 w-4 text-pink-500" />
                      <span className="text-xs text-muted-foreground">Criadas</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold">{campaignStats.total}</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span className="text-xs text-muted-foreground">Ativas</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold">{campaignStats.active}</p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Trophy className="h-4 w-4 text-blue-500" />
                      <span className="text-xs text-muted-foreground">Contribuí</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold">{campaignStats.totalContributed}</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign className="h-4 w-4 text-purple-500" />
                      <span className="text-xs text-muted-foreground">Recebi</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold">{campaignStats.totalReceived}</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => navigate('/vaquinhas')}
                  >
                    <Heart className="h-4 w-4 mr-2 text-pink-500" />
                    <span className="text-xs sm:text-sm">Ver Vaquinhas Ativas</span>
                    <ArrowRight className="h-4 w-4 ml-auto" />
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => navigate('/minhas-vaquinhas')}
                  >
                    <Plus className="h-4 w-4 mr-2 text-purple-500" />
                    <span className="text-xs sm:text-sm">Gerenciar Minhas Vaquinhas</span>
                    <ArrowRight className="h-4 w-4 ml-auto" />
                  </Button>
                </div>

                <Button
                  variant="default"
                  className="w-full sm:hidden bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                  onClick={() => navigate('/vaquinhas')}
                >
                  Ver Todas as Vaquinhas
                </Button>

                {campaignStats.totalReceived > 0 && (
                  <div className="mt-4 p-3 bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-800 rounded-lg">
                    <p className="text-xs sm:text-sm text-pink-800 dark:text-pink-300 text-center">
                      💝 Você já recebeu{' '}
                      <span className="font-bold">{campaignStats.totalReceived.toLocaleString('pt-BR')} pontos</span>{' '}
                      através de suas vaquinhas!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Favorites and History Section */}
            <FavoritesHistory />

            {/* Notification Settings */}
            <NotificationSettings />

            {/* Tips Footer */}
            <TipsFooter />
          </div>
        </div>
      </div>

      {/* Chat Window */}
      {selectedChat && (
        <ChatWindow
          businessId={selectedChat.business_id}
          targetUserId={selectedChat.business_id ? undefined : (selectedChat.target_user_id === user?.id ? selectedChat.user_id : selectedChat.target_user_id)}
          businessName={showingUserName}
          onClose={() => setSelectedChat(null)}
        />
      )}
    </div>
  );
};

export default Profile;
