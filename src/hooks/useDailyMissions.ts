import { useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { usePoints } from './usePoints';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const MISSION_POINTS: Record<string, number> = {
  view_3_offers: 50,
  visit_map: 30,
  favorite_offer: 40,
  share_offer: 60,
  visit_community: 20
};

export const useDailyMissions = () => {
  const { user, userProfile } = useAuth();
  const { awardPoints } = usePoints();
  const queryClient = useQueryClient();

  const completeMission = useCallback(async (missionKey: string) => {
    if (!user) return false;

    // Missões diárias são exclusivas para consumidores
    // Se o perfil ainda não carregou, bloqueia para evitar falsos positivos
    if (!userProfile || userProfile.user_type === 'business') return false;

    try {
      // Server-side validation + points award (SECURITY DEFINER RPC)
      const { data, error } = await supabase.rpc('complete_daily_mission' as any, {
        p_mission_key: missionKey,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; points?: number } | null;
      if (!result?.success) {
        return false;
      }

      // Invalidate query
      queryClient.invalidateQueries({ queryKey: ['daily-missions'] });

      toast.success(`🎯 Missão completa! +${result.points ?? 0} pontos`, {
        duration: 3000
      });

      return true;
    } catch (error) {
      console.error('Error completing mission:', error);
      return false;
    }
  }, [user, userProfile, awardPoints, queryClient]);

  return { completeMission };
};
