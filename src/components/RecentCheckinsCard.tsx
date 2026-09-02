import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Clock, MapPin, Trophy, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RecentCheckinsCardProps {
  businessId?: string;
}

interface CheckinData {
  id: string;
  created_at: string;
  points_awarded: number;
  user_id: string;
  offer_id?: string;
  location_latitude?: number;
  location_longitude?: number;
  user_full_name?: string;
  user_avatar_url?: string;
  offer_title?: string;
}

const RecentCheckinsCard: React.FC<RecentCheckinsCardProps> = ({ businessId }) => {
  const queryClient = useQueryClient();
  
  const { data: recentCheckins, isLoading } = useQuery({
    queryKey: ['recent-checkins', businessId],
    queryFn: async () => {
      if (!businessId) return [];

      console.log('[RecentCheckins] Fetching recent check-ins for business:', businessId);

      // Get checkin validations
      const { data: checkinValidations, error: validationsError } = await supabase
        .from('checkin_validations')
        .select('id, created_at, points_awarded, user_id, offer_id, location_latitude, location_longitude')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (validationsError) {
        console.error('Error fetching checkin validations:', validationsError);
      }

      // Get offer checkins
      const { data: offerCheckins, error: checkinsError } = await supabase
        .from('offer_checkins')
        .select('id, created_at, points_awarded, user_id, offer_id, location_latitude, location_longitude')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (checkinsError) {
        console.error('Error fetching offer checkins:', checkinsError);
      }

      // Combine all check-ins
      const allCheckins = [
        ...(checkinValidations || []),
        ...(offerCheckins || [])
      ];

      // Get user profiles using secure RPC
      const userIds = [...new Set(allCheckins.map(c => c.user_id))];
      const { data: profiles } = await (supabase as any).rpc('get_business_customer_profiles', {
        p_business_id: businessId,
        p_user_ids: userIds
      });

      const profileMap = new Map<string, any>((profiles as any[] | null)?.map(p => [p.user_id, p]) || []);

      // Get offer details
      const offerIds = [...new Set(allCheckins.filter(c => c.offer_id).map(c => c.offer_id))];
      let offerMap = new Map<string, string>();
      
      if (offerIds.length > 0) {
        const { data: offers } = await supabase
          .from('offers')
          .select('id, title')
          .in('id', offerIds);
        
        offerMap = new Map(offers?.map(o => [o.id, o.title]) || []);
      }

      const enrichedCheckins: CheckinData[] = allCheckins.map(checkin => {
        const profile = profileMap.get(checkin.user_id);
        return {
          ...checkin,
          user_full_name: profile?.full_name,
          user_avatar_url: profile?.avatar_url,
          offer_title: checkin.offer_id ? offerMap.get(checkin.offer_id) : undefined
        };
      });

      // Sort by creation date and return top 10
      return enrichedCheckins
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10);
    },
    enabled: !!businessId,
  });

  // Setup real-time subscriptions
  useEffect(() => {
    if (!businessId) return;

    console.log('[RecentCheckins] Setting up real-time subscriptions for business:', businessId);

    const channel = supabase
      .channel(`recent_checkins_${businessId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'offer_checkins',
          filter: `business_id=eq.${businessId}`,
        },
        (payload) => {
          console.log('[RecentCheckins Real-time] ✅ New offer check-in detected:', payload);
          queryClient.invalidateQueries({ queryKey: ['recent-checkins', businessId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'checkin_validations',
          filter: `business_id=eq.${businessId}`,
        },
        (payload) => {
          console.log('[RecentCheckins Real-time] ✅ New validation check-in detected:', payload);
          queryClient.invalidateQueries({ queryKey: ['recent-checkins', businessId] });
        }
      )
      .subscribe((status) => {
        console.log('[RecentCheckins Real-time] Subscription status:', status);
      });

    return () => {
      console.log('[RecentCheckins] Cleaning up real-time subscriptions');
      supabase.removeChannel(channel);
    };
  }, [businessId, queryClient]);

  if (!businessId) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Check-ins Recentes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4 animate-pulse">
                <div className="w-10 h-10 bg-muted rounded-full"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : recentCheckins && recentCheckins.length > 0 ? (
          <div className="space-y-4">
            {recentCheckins.map((checkin) => (
              <div key={checkin.id} className="flex items-start space-x-3 p-3 bg-muted/30 rounded-lg">
                <Link to={`/usuario/${checkin.user_id}`} className="shrink-0">
                  <Avatar className="w-10 h-10 cursor-pointer hover:opacity-80 transition-opacity">
                    <AvatarImage src={checkin.user_avatar_url} />
                    <AvatarFallback>
                      {checkin.user_full_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <Link to={`/usuario/${checkin.user_id}`} className="hover:underline">
                      <p className="font-medium text-sm cursor-pointer">
                        {checkin.user_full_name || 'Usuário Anônimo'}
                      </p>
                    </Link>
                    <Badge variant="secondary" className="text-xs">
                      <Trophy className="w-3 h-3 mr-1" />
                      +{checkin.points_awarded} pts
                    </Badge>
                  </div>
                  
                  {checkin.offer_title && (
                    <p className="text-sm text-muted-foreground">
                      Check-in na oferta: <span className="font-medium">{checkin.offer_title}</span>
                    </p>
                  )}
                  
                  <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                    <span className="flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {formatDistanceToNow(new Date(checkin.created_at), { 
                        addSuffix: true, 
                        locale: ptBR 
                      })}
                    </span>
                    
                    {checkin.location_latitude && checkin.location_longitude && (
                      <span className="flex items-center">
                        <MapPin className="w-3 h-3 mr-1" />
                        Localização confirmada
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground text-sm">
              Nenhum check-in registrado ainda.
            </p>
            <p className="text-muted-foreground text-xs mt-1">
              Os check-ins dos clientes aparecerão aqui em tempo real.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentCheckinsCard;