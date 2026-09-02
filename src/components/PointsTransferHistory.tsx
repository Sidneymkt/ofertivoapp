import { useEffect, useState, useCallback } from 'react';
import { ArrowUpRight, ArrowDownLeft, Calendar, RefreshCw } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { usePointsTransfer } from '@/hooks/usePointsTransfer';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ProfileData {
  full_name: string | null;
  avatar_url: string | null;
}

export const PointsTransferHistory = () => {
  const { transfers, loadTransfers, loading } = usePointsTransfer();
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Record<string, ProfileData>>({});
  const [loadingProfiles, setLoadingProfiles] = useState(false);

  const loadProfiles = useCallback(async () => {
    if (transfers.length === 0) return;

    setLoadingProfiles(true);
    try {
      const userIds = new Set<string>();
      transfers.forEach(t => {
        userIds.add(t.sender_id);
        userIds.add(t.receiver_id);
      });

      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', Array.from(userIds));

      if (error) throw error;

      if (data) {
        const profileMap: Record<string, ProfileData> = {};
        data.forEach(p => {
          profileMap[p.user_id] = {
            full_name: p.full_name,
            avatar_url: p.avatar_url
          };
        });
        setProfiles(profileMap);
      }
    } catch (error) {
      console.error('Error loading profiles:', error);
    } finally {
      setLoadingProfiles(false);
    }
  }, [transfers]);

  // Load transfers on mount
  useEffect(() => {
    loadTransfers();
  }, [loadTransfers]);

  // Load profiles when transfers change
  useEffect(() => {
    if (transfers.length > 0) {
      loadProfiles();
    }
  }, [transfers, loadProfiles]);

  // Real-time subscription for transfers
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('points-transfers-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'points_transfers'
        },
        (payload) => {
          // Only reload if the transfer involves the current user
          const newTransfer = payload.new as any;
          if (newTransfer.sender_id === user.id || newTransfer.receiver_id === user.id) {
            loadTransfers();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadTransfers]);

  const handleRefresh = () => {
    loadTransfers();
  };

  if (loading && transfers.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Carregando histórico...</span>
        </div>
      </Card>
    );
  }

  if (transfers.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-center text-muted-foreground">
          Nenhuma transferência realizada ainda
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg">📊 Histórico de Transferências</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>
      
      <div className="space-y-3">
        {transfers.map((transfer) => {
          const isSent = transfer.sender_id === user?.id;
          const otherUserId = isSent ? transfer.receiver_id : transfer.sender_id;
          const otherUser = profiles[otherUserId];

          return (
            <div
              key={transfer.id}
              className="flex items-center gap-3 p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
            >
              <div className={`p-2 rounded-full ${isSent ? 'bg-destructive/10' : 'bg-success/10'}`}>
                {isSent ? (
                  <ArrowUpRight className="w-4 h-4 text-destructive" />
                ) : (
                  <ArrowDownLeft className="w-4 h-4 text-success" />
                )}
              </div>

              <Avatar className="h-10 w-10">
                <AvatarImage src={otherUser?.avatar_url || undefined} />
                <AvatarFallback>
                  {otherUser?.full_name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">
                  {isSent ? 'Enviado para' : 'Recebido de'} {otherUser?.full_name || 'Usuário'}
                </p>
                {transfer.message && (
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    "{transfer.message}"
                  </p>
                )}
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(transfer.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>

              <div className="text-right flex-shrink-0">
                <Badge
                  variant={isSent ? 'destructive' : 'default'}
                  className={isSent ? '' : 'bg-success hover:bg-success/80'}
                >
                  {isSent ? '-' : '+'}{transfer.amount.toLocaleString('pt-BR')} pts
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">
                  {transfer.status === 'completed' ? 'Concluída' : transfer.status}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
