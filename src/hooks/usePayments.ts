import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

export type Transaction = Database['public']['Tables']['transactions']['Row'];

export const usePayments = (businessId?: string) => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    if (businessId) {
      fetchTransactions();
      
      // Realtime subscription para transações
      const channel = supabase
        .channel('transactions-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'transactions',
            filter: `business_id=eq.${businessId}`
          },
          (payload) => {
            console.log('Transaction update:', payload);
            
            if (payload.eventType === 'INSERT') {
              setTransactions(prev => [payload.new as Transaction, ...prev]);
            } else if (payload.eventType === 'UPDATE') {
              setTransactions(prev => 
                prev.map(t => t.id === payload.new.id ? payload.new as Transaction : t)
              );
              
              // Notificar quando pagamento for confirmado
              const newTransaction = payload.new as Transaction;
              if (newTransaction.status === 'paid' && payload.old?.status !== 'paid') {
                toast.success('Pagamento Confirmado! 💳', {
                  description: `Seu pagamento de R$ ${newTransaction.amount.toFixed(2)} foi confirmado.`
                });
              }
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [businessId]);

  const fetchTransactions = async () => {
    if (!businessId) return;
    
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Erro ao carregar histórico de pagamentos');
    } finally {
      setLoading(false);
    }
  };

  const createPayment = async (planId: string, gateway: 'abacatepay' | 'mercadopago') => {
    if (!businessId || !user) {
      toast.error('Usuário ou negócio não identificado');
      return { success: false, error: 'Usuário ou negócio não identificado' };
    }

    setProcessingPayment(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          planId,
          gateway,
          businessId
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      if (!data) {
        throw new Error('Resposta vazia do servidor');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      return {
        success: true,
        transaction_id: data.transaction_id,
        payment_url: data.payment_url,
        pix_code: data.pix_code,
        pix_qr_code: data.pix_qr_code,
        gateway: data.gateway
      };
    } catch (error) {
      console.error('Error creating payment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error(`Erro ao criar pagamento: ${errorMessage}`);
      return { success: false, error: errorMessage };
    } finally {
      setProcessingPayment(false);
    }
  };

  const checkPaymentStatus = async (transactionId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('check-payment-status', {
        body: { transactionId }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error checking payment status:', error);
      return null;
    }
  };

  const retryPaymentWithFallback = async (transactionId: string) => {
    const transaction = transactions.find(t => t.id === transactionId);
    if (!transaction) return null;

    // Se o pagamento original foi PIX (AbacatePay), tentar Cartão (Mercado Pago)
    const fallbackGateway = transaction.gateway === 'abacatepay' ? 'mercadopago' : 'abacatepay';
    
    // Extrair plan_id do metadata (que é do tipo Json)
    let planId: string | undefined;
    if (transaction.metadata && typeof transaction.metadata === 'object') {
      planId = (transaction.metadata as any).plan_id;
    }
    
    if (!planId) {
      toast.error('Não foi possível recuperar informações do plano');
      return null;
    }

    toast.info(`Tentando pagamento alternativo via ${fallbackGateway === 'mercadopago' ? 'Cartão de Crédito' : 'PIX'}...`);
    
    return await createPayment(planId, fallbackGateway);
  };

  return {
    transactions,
    loading,
    processingPayment,
    createPayment,
    checkPaymentStatus,
    retryPaymentWithFallback,
    refetch: fetchTransactions
  };
};
