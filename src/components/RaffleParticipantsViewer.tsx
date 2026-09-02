import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Users, 
  Search, 
  Hash, 
  Calendar,
  Download,
  Eye,
  Ticket,
  Trash2,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { DeleteConfirmationDialog } from '@/components/DeleteConfirmationDialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RaffleParticipant {
  id: string;
  user_id: string;
  raffle_id: string;
  entry_number: number;
  number_of_entries: number;
  created_at: string;
  user: {
    full_name: string;
    email?: string;
    phone?: string;
    avatar_url?: string;
  };
  luck_numbers: number[];
}

interface RaffleParticipantsViewerProps {
  raffleId: string;
  raffleName: string;
  isBusinessOwner?: boolean;
  canDeleteParticipants?: boolean;
}

export const RaffleParticipantsViewer: React.FC<RaffleParticipantsViewerProps> = ({
  raffleId,
  raffleName,
  isBusinessOwner = false,
  canDeleteParticipants = false
}) => {
  const [participants, setParticipants] = useState<RaffleParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<RaffleParticipant | null>(null);
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    fetchParticipants();
    
    // Realtime updates for participants
    const channel = supabase
      .channel(`raffle-participants-${raffleId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'raffle_entries',
          filter: `raffle_id=eq.${raffleId}`
        },
        () => {
          fetchParticipants();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [raffleId]);

  const fetchParticipants = async () => {
    try {
      setLoading(true);
      
      // Use RPC function to get participants with profile data (bypasses RLS)
      const { data: entries, error } = await supabase
        .rpc('get_raffle_participants', { raffle_id_param: raffleId });

      if (error) throw error;

      if (entries && entries.length > 0) {
        // Calcular números da sorte para cada participante
        const participantsWithLuckNumbers = entries.map((entry: any) => {
          // Gerar números da sorte baseados no entry_number e number_of_entries
          const luckNumbers = [];
          for (let i = 0; i < (entry.number_of_entries || 1); i++) {
            luckNumbers.push(entry.entry_number + i);
          }

          return {
            id: entry.id,
            user_id: entry.user_id,
            raffle_id: entry.raffle_id,
            entry_number: entry.entry_number,
            number_of_entries: entry.number_of_entries || 1,
            created_at: entry.created_at,
            user: {
              full_name: entry.full_name || 'Participante',
              phone: entry.phone,
              avatar_url: entry.avatar_url
            },
            luck_numbers: luckNumbers
          } as RaffleParticipant;
        });

        setParticipants(participantsWithLuckNumbers);
      } else {
        setParticipants([]);
      }
    } catch (error: any) {
      console.error('Error fetching participants:', error);
      toast.error('Erro ao carregar participantes');
    } finally {
      setLoading(false);
    }
  };

  const filteredParticipants = participants.filter(participant =>
    participant.user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    participant.luck_numbers.some(num => num.toString().includes(searchTerm))
  );

  const exportParticipants = () => {
    const csv = [
      'Nome,Telefone,Número da Entrada,Quantidade de Bilhetes,Números da Sorte,Data de Participação',
      ...participants.map(p => 
        `"${p.user.full_name}","${p.user.phone || 'N/A'}",${p.entry_number},${p.number_of_entries},"${p.luck_numbers.join(', ')}","${format(new Date(p.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}"`
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `participantes_sorteio_${raffleName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Lista de participantes exportada!');
  };

  const totalTickets = participants.reduce((sum, p) => sum + p.number_of_entries, 0);

  const handleDeleteParticipant = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      // Refund points to user
      const { data: profile } = await supabase
        .from('profiles')
        .select('total_points')
        .eq('user_id', deleteTarget.user_id)
        .single();

      // Get raffle entry cost
      const { data: raffleData } = await supabase
        .from('raffles')
        .select('entry_cost, current_participants')
        .eq('id', raffleId)
        .single();

      if (raffleData && profile) {
        const refundAmount = raffleData.entry_cost * deleteTarget.number_of_entries;
        
        // Refund points
        await supabase
          .from('profiles')
          .update({ total_points: (profile.total_points || 0) + refundAmount })
          .eq('user_id', deleteTarget.user_id);

        // Decrement participant count
        await supabase
          .from('raffles')
          .update({ current_participants: Math.max(0, (raffleData.current_participants || 1) - 1) })
          .eq('id', raffleId);
      }

      // Delete entry
      const { error } = await supabase
        .from('raffle_entries')
        .delete()
        .eq('id', deleteTarget.id);

      if (error) throw error;

      toast.success(`Participante ${deleteTarget.user.full_name} removido e pontos devolvidos`);
      setDeleteTarget(null);
      fetchParticipants();
    } catch (error) {
      console.error('Error deleting participant:', error);
      toast.error('Erro ao remover participante');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-muted rounded w-1/3 mx-auto"></div>
              <div className="h-32 bg-muted rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Users className="h-4 w-4 sm:h-5 sm:w-5" />
              Participantes do Sorteio
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {participants.length} participantes • {totalTickets} bilhetes vendidos
            </CardDescription>
          </div>
          {isBusinessOwner && participants.length > 0 && (
            <Button onClick={exportParticipants} variant="outline" size="sm" className="w-full sm:w-auto">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-1 gap-3">
          <Card className="p-3 sm:p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Total Participantes</p>
                <p className="text-xl sm:text-2xl font-bold">{participants.length}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-3 sm:p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Ticket className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Total Bilhetes</p>
                <p className="text-xl sm:text-2xl font-bold">{totalTickets}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-3 sm:p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Hash className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Último Número</p>
                <p className="text-xl sm:text-2xl font-bold">
                  {participants.length > 0 ? Math.max(...participants.flatMap(p => p.luck_numbers)) : 0}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Search */}
        {participants.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar por nome ou número..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 text-sm"
            />
          </div>
        )}

        {/* Participants List */}
        <div className="space-y-3">
          {filteredParticipants.length > 0 ? (
            <div className="space-y-3">
              {filteredParticipants.map((participant, index) => (
                <div 
                  key={participant.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 bg-card rounded-lg border hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-full">
                      <span className="text-sm sm:text-base font-bold text-primary">
                        {participant.user.full_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm sm:text-base font-medium truncate">{participant.user.full_name}</h4>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">
                        {participant.user.phone || 'Telefone não informado'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(participant.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 pl-11 sm:pl-0">
                    <div className="flex flex-col sm:text-right gap-2 flex-1">
                      <Badge variant="secondary" className="w-fit text-xs">
                        {participant.number_of_entries} bilhete{participant.number_of_entries > 1 ? 's' : ''}
                      </Badge>
                      <div className="text-xs sm:text-sm">
                        <span className="text-muted-foreground">Números: </span>
                        <span className="font-mono font-medium break-all">
                          {participant.luck_numbers.join(', ')}
                        </span>
                      </div>
                    </div>
                    {canDeleteParticipants && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                        onClick={() => setDeleteTarget(participant)}
                        title="Remover participante"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : participants.length > 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhum participante encontrado</p>
              <p className="text-sm">Tente buscar por outro termo</p>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">Nenhum participante ainda</p>
              <p className="text-sm">Aguarde os primeiros participantes se inscreverem no sorteio</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>

    <DeleteConfirmationDialog
      open={!!deleteTarget}
      onOpenChange={(open) => !open && setDeleteTarget(null)}
      title="Remover Participante"
      description={`Tem certeza que deseja remover ${deleteTarget?.user.full_name || 'este participante'} do sorteio? Os pontos gastos serão devolvidos automaticamente.`}
      onConfirm={handleDeleteParticipant}
      isLoading={deleting}
      confirmButtonText="Remover"
    />
    </>
  );
};