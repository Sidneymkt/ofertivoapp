import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { usePoints } from './usePoints';

interface Raffle {
  id: string;
  title: string;
  description?: string;
  prize: string;
  entry_cost: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  current_participants: number;
  max_participants?: number;
  business_id: string;
  business?: {
    id: string;
    name: string;
    logo_url?: string;
  };
  image_url?: string;
  winner_id?: string;
}

interface RaffleEntry {
  id: string;
  raffle_id: string;
  user_id: string;
  number_of_entries: number;
  entry_number: number;
  created_at: string;
}

export const useRaffles = () => {
  const [activeRaffles, setActiveRaffles] = useState<Raffle[]>([]);
  const [userEntries, setUserEntries] = useState<RaffleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchActiveRaffles();
    if (user) {
      fetchUserEntries();
    }
  }, [user]);

  const fetchActiveRaffles = async () => {
    try {
      const { data, error } = await supabase
        .from('raffles')
        .select(`
          *,
          business:businesses(id, name, logo_url)
        `)
        .eq('is_active', true)
        .gte('end_date', new Date().toISOString())
        .order('end_date', { ascending: true });

      if (error) throw error;
      
      setActiveRaffles(data || []);
    } catch (error) {
      console.error('Error fetching active raffles:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserEntries = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('raffle_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setUserEntries(data || []);
    } catch (error) {
      console.error('Error fetching user raffle entries:', error);
    }
  };

  const getUserRaffleEntries = (raffleId: string): RaffleEntry[] => {
    return userEntries.filter(entry => entry.raffle_id === raffleId);
  };

  const enterRaffle = async (raffleId: string, numberOfEntries: number = 1) => {
    if (!user) return { success: false, error: 'User not authenticated' };

    try {
      // Get raffle info first to get entry cost
      const raffle = await getRaffleById(raffleId);
      if (!raffle) {
        return { success: false, error: 'Raffle not found' };
      }

      const totalCost = raffle.entry_cost * numberOfEntries;

      // Check if user has enough points
      const { data: profile } = await supabase
        .from('profiles')
        .select('total_points')
        .eq('user_id', user.id)
        .single();

      if (!profile || profile.total_points < totalCost) {
        return { success: false, error: 'Pontos insuficientes' };
      }

      // Check if user already has an entry in this raffle
      const { data: existingEntry, error: existingEntryError } = await supabase
        .from('raffle_entries')
        .select('id, number_of_entries, entry_number')
        .eq('raffle_id', raffleId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingEntryError) throw existingEntryError;

      if (existingEntry) {
        const { error: updateEntryError } = await supabase
          .from('raffle_entries')
          .update({
            number_of_entries: (existingEntry.number_of_entries || 1) + numberOfEntries,
          })
          .eq('id', existingEntry.id);

        if (updateEntryError) throw updateEntryError;
      } else {
        const { error: entryError } = await supabase
          .from('raffle_entries')
          .insert({
            raffle_id: raffleId,
            user_id: user.id,
            number_of_entries: numberOfEntries,
            entry_number: Math.floor(100000 + Math.random() * 900000),
          });

        if (entryError) throw entryError;

        // Update raffle participant count only for first participation
        const { data: currentRaffle } = await supabase
          .from('raffles')
          .select('current_participants')
          .eq('id', raffleId)
          .single();

        if (currentRaffle) {
          await supabase
            .from('raffles')
            .update({ current_participants: (currentRaffle.current_participants || 0) + 1 })
            .eq('id', raffleId);
        }
      }

      // Deduct points
      const { error: pointsError } = await supabase
        .from('profiles')
        .update({ total_points: profile.total_points - totalCost })
        .eq('user_id', user.id);

      if (pointsError) throw pointsError;

      // Refresh data
      await fetchUserEntries();
      await fetchActiveRaffles();

      return { success: true };
    } catch (error: any) {
      console.error('Error entering raffle:', error);
      return {
        success: false,
        error: error?.message || 'Erro ao participar do sorteio',
      };
    }
  };

  const getRaffleById = async (raffleId: string): Promise<Raffle | null> => {
    try {
      const { data, error } = await supabase
        .from('raffles')
        .select(`
          *,
          business:businesses(id, name, logo_url)
        `)
        .eq('id', raffleId)
        .single();

      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error fetching raffle:', error);
      return null;
    }
  };

  const getRaffleEntries = async (raffleId: string): Promise<RaffleEntry[]> => {
    try {
      const { data, error } = await supabase
        .from('raffle_entries')
        .select(`
          *,
          user:profiles(full_name, avatar_url)
        `)
        .eq('raffle_id', raffleId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error fetching raffle entries:', error);
      return [];
    }
  };

  return {
    activeRaffles,
    userEntries,
    loading,
    getUserRaffleEntries,
    enterRaffle,
    getRaffleById,
    getRaffleEntries,
    refresh: () => {
      fetchActiveRaffles();
      if (user) fetchUserEntries();
    }
  };
};