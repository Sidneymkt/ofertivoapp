import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { useAuth } from './useAuth';

export interface PointsTransfer {
  id: string;
  sender_id: string;
  receiver_id: string;
  amount: number;
  message: string | null;
  status: 'completed' | 'cancelled' | 'refunded';
  created_at: string;
}

export const usePointsTransfer = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [transfers, setTransfers] = useState<PointsTransfer[]>([]);
  const [lastTransferSuccess, setLastTransferSuccess] = useState(false);

  // Transferir pontos para outro usuário
  const transferPoints = useCallback(async (
    receiverId: string,
    amount: number,
    message?: string,
    onSuccess?: () => void
  ): Promise<boolean> => {
    if (!user) {
      toast({
        title: 'Erro',
        description: 'Você precisa estar autenticado',
        variant: 'destructive'
      });
      return false;
    }

    // Validate amount
    if (amount <= 0) {
      toast({
        title: 'Erro',
        description: 'A quantidade deve ser maior que zero',
        variant: 'destructive'
      });
      return false;
    }

    // Validate not sending to self
    if (receiverId === user.id) {
      toast({
        title: 'Erro',
        description: 'Você não pode enviar pontos para si mesmo',
        variant: 'destructive'
      });
      return false;
    }

    setLoading(true);
    setLastTransferSuccess(false);
    
    try {
      const { data, error } = await supabase.rpc('transfer_points', {
        p_sender_id: user.id,
        p_receiver_id: receiverId,
        p_amount: amount,
        p_message: message || null
      });

      if (error) throw error;

      const result = data as { success: boolean; message: string; transfer_id?: string };

      if (result.success) {
        setLastTransferSuccess(true);
        
        // Reload transfers history
        await loadTransfers();
        
        // Call success callback if provided
        onSuccess?.();
        
        toast({
          title: '✅ Transferência realizada!',
          description: `${amount} pontos enviados com sucesso`,
        });
        
        return true;
      } else {
        toast({
          title: 'Erro na transferência',
          description: result.message,
          variant: 'destructive'
        });
        return false;
      }
    } catch (error: any) {
      console.error('Error transferring points:', error);
      toast({
        title: 'Erro ao transferir pontos',
        description: error.message || 'Erro desconhecido',
        variant: 'destructive'
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  // Buscar histórico de transferências
  const loadTransfers = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('points_transfers')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setTransfers((data || []) as PointsTransfer[]);
    } catch (error: any) {
      console.error('Error loading transfers:', error);
    }
  }, [user]);

  // Buscar saldo atual do usuário
  const getCurrentBalance = useCallback(async (): Promise<number> => {
    if (!user) return 0;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('total_points')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      return data?.total_points || 0;
    } catch (error) {
      console.error('Error getting balance:', error);
      return 0;
    }
  }, [user]);

  return {
    transferPoints,
    loadTransfers,
    getCurrentBalance,
    transfers,
    loading,
    lastTransferSuccess
  };
};
