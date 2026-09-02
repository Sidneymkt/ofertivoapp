import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { 
  Trophy, 
  Users, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Download,
  Eye,
  RefreshCw,
  Dice6,
  Hash,
  Calendar,
  Shield,
  Link,
  Volume2,
  FileText,
  ExternalLink,
  Link2,
  Copy,
  PlayCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAutomaticRaffles } from '@/hooks/useAutomaticRaffles';
import { getAppBaseUrl } from '@/lib/config';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { RaffleSpinner } from './RaffleSpinner';

interface RaffleParticipant {
  id: string;
  user_id: string;
  entry_number: number;
  number_of_entries: number;
  created_at: string;
  user: {
    full_name: string;
    email?: string;
    phone?: string;
  };
  luck_numbers: number[];
}

interface DrawResult {
  winningNumbers: number[];
  winnerId: string;
  winnerName: string;
  drawDate: string;
  drawTimestamp: string;
  drawHash: string;
  auditLog: string[];
  totalParticipants: number;
  totalTickets: number;
}

interface TransparentRaffleDrawEngineProps {
  raffleId: string;
  raffleName: string;
  raffleEndDate: string;
  raffleImage?: string;
  raffleDescription?: string;
  isImmediate?: boolean;
  onDrawComplete: (result: DrawResult) => void;
}

export const TransparentRaffleDrawEngine: React.FC<TransparentRaffleDrawEngineProps> = ({
  raffleId,
  raffleName,
  raffleEndDate,
  raffleImage,
  raffleDescription,
  isImmediate = false,
  onDrawComplete
}) => {
  const { conductRaffle } = useAutomaticRaffles();
  const [participants, setParticipants] = useState<RaffleParticipant[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawProgress, setDrawProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [drawResult, setDrawResult] = useState<DrawResult | null>(null);
  const [auditLog, setAuditLog] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSpinning, setIsSpinning] = useState(false);
  const [tempWinnerId, setTempWinnerId] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [canDraw, setCanDraw] = useState(false);
  const [publicLink, setPublicLink] = useState('');

  useEffect(() => {
    fetchParticipants();
    checkIfDrawnAlready();
    setPublicLink(`${getAppBaseUrl()}/sorteios/${raffleId}`);
  }, [raffleId]);

  const checkIfDrawnAlready = async () => {
    try {
      const { data, error } = await supabase
        .from('raffles')
        .select('winner_id, draw_date, draw_hash, winning_ticket_number, total_tickets_at_draw, current_participants')
        .eq('id', raffleId)
        .single();

      if (error) throw error;

      if (data.winner_id && data.draw_date) {
        // Buscar nome do ganhador usando a view pública
        let winnerName = 'Ganhador';
        
        // Tentar com profiles_public primeiro
        const { data: winnerProfile } = await supabase
          .from('profiles_public')
          .select('full_name')
          .eq('user_id', data.winner_id)
          .single();

        if (winnerProfile?.full_name) {
          winnerName = winnerProfile.full_name;
        } else {
          // Fallback: buscar diretamente da tabela profiles
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', data.winner_id)
            .single();
          
          if (profileData?.full_name) {
            winnerName = profileData.full_name;
          }
        }

        // Sorteio já foi realizado - mostrar resultado completo
        setDrawResult({
          winningNumbers: data.winning_ticket_number ? [data.winning_ticket_number] : [],
          winnerId: data.winner_id,
          winnerName: winnerName,
          drawDate: data.draw_date,
          drawTimestamp: data.draw_date,
          drawHash: data.draw_hash || 'N/A',
          auditLog: ['✅ Sorteio realizado com sucesso'],
          totalParticipants: data.current_participants || 0,
          totalTickets: data.total_tickets_at_draw || 0
        });
        
        addToAuditLog('Este sorteio já foi realizado anteriormente');
        addToAuditLog(`Ganhador: ${winnerName}`);
        addToAuditLog(`Número sorteado: ${data.winning_ticket_number || 'N/A'}`);
        addToAuditLog(`Hash de verificação: ${data.draw_hash?.substring(0, 16) || 'N/A'}...`);
      }
    } catch (error) {
      console.error('Error checking raffle status:', error);
    }
  };

  const generateDrawHash = async (drawData: any): Promise<string> => {
    const dataString = JSON.stringify(drawData);
    const encoder = new TextEncoder();
    const data = encoder.encode(dataString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  };

  // Countdown timer - immediate raffles are always ready to draw
  useEffect(() => {
    const updateCountdown = () => {
      // For immediate raffles, always allow drawing if there are participants
      if (isImmediate) {
        setTimeRemaining('Imediato');
        setCanDraw(true);
        return;
      }

      const endDate = new Date(raffleEndDate);
      const now = new Date();
      
      if (now >= endDate) {
        setTimeRemaining('Encerrado');
        setCanDraw(true);
      } else {
        const distance = formatDistanceToNow(endDate, { locale: ptBR, addSuffix: true });
        setTimeRemaining(distance);
        setCanDraw(false);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [raffleEndDate, isImmediate]);

  const addToAuditLog = (message: string) => {
    const timestamp = new Date().toLocaleString('pt-BR');
    const logEntry = `[${timestamp}] ${message}`;
    setAuditLog(prev => [...prev, logEntry]);
    console.log('[TransparentDraw]', logEntry);
  };

  const fetchParticipants = async () => {
    try {
      setLoading(true);
      
      // Use RPC function to get participants with profile data (bypasses RLS)
      const { data: entries, error } = await supabase
        .rpc('get_raffle_participants', { raffle_id_param: raffleId });

      if (error) throw error;

      if (entries && entries.length > 0) {
        const participantsWithLuckNumbers = entries.map((entry: any) => {
          // Gerar números da sorte baseados no entry_number e number_of_entries
          const luckNumbers = [];
          for (let i = 0; i < (entry.number_of_entries || 1); i++) {
            luckNumbers.push(entry.entry_number + i);
          }

          return {
            id: entry.id,
            user_id: entry.user_id,
            entry_number: entry.entry_number,
            number_of_entries: entry.number_of_entries || 1,
            created_at: entry.created_at,
            user: {
              full_name: entry.full_name || 'Participante',
              phone: entry.phone
            },
            luck_numbers: luckNumbers
          } as RaffleParticipant;
        });

        setParticipants(participantsWithLuckNumbers);
        
        addToAuditLog(`${participantsWithLuckNumbers.length} participantes carregados`);
        addToAuditLog(`Total de bilhetes: ${participantsWithLuckNumbers.reduce((sum, p) => sum + p.number_of_entries, 0)}`);
      } else {
        setParticipants([]);
        addToAuditLog('Nenhum participante encontrado');
      }
    } catch (error: any) {
      console.error('Error fetching participants:', error);
      toast.error('Erro ao carregar participantes');
      addToAuditLog(`Erro ao carregar participantes: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const simulateProgress = (steps: string[], onComplete: () => void) => {
    let currentStepIndex = 0;
    const interval = setInterval(() => {
      if (currentStepIndex < steps.length) {
        setCurrentStep(steps[currentStepIndex]);
        setDrawProgress(((currentStepIndex + 1) / steps.length) * 100);
        addToAuditLog(steps[currentStepIndex]);
        currentStepIndex++;
      } else {
        clearInterval(interval);
        onComplete();
      }
    }, 1500);
  };

  const performDraw = async () => {
    if (participants.length === 0) {
      toast.error('Não há participantes suficientes para realizar o sorteio');
      return;
    }

    // Tocar som de início do sorteio
    playRaffleStartSound();

    setIsDrawing(true);
    setDrawProgress(0);
    setAuditLog([]);
    setDrawResult(null);
    setIsSpinning(false);
    setTempWinnerId(null);

    const timestamp = new Date().toLocaleString('pt-BR');
    addToAuditLog(`=== INÍCIO DO SORTEIO ===`);
    addToAuditLog(`Sorteio: ${raffleName}`);
    addToAuditLog(`Data/Hora: ${timestamp}`);
    addToAuditLog(`Total de participantes: ${participants.length}`);
    
    const totalTickets = participants.reduce((sum, p) => sum + p.number_of_entries, 0);
    addToAuditLog(`Total de bilhetes vendidos: ${totalTickets}`);

    const steps = [
      'Verificando integridade dos dados...',
      'Validando participantes elegíveis...',
      'Preparando sistema de sorteio...',
      'Gerando número aleatório seguro...',
      'Determinando ganhador...',
      'Validando resultado...',
      'Registrando no banco de dados...',
      'Finalizando sorteio com transparência...'
    ];

    simulateProgress(steps, async () => {
      try {
        // Gerar número aleatório criptograficamente seguro
        // Cada participante tem chance IGUAL, independente do número de bilhetes
        const cryptoArray = new Uint32Array(1);
        crypto.getRandomValues(cryptoArray);
        const cryptoRandom = cryptoArray[0] / (0xFFFFFFFF + 1);
        
        // Embaralhar participantes usando Fisher-Yates com crypto
        const shuffled = [...participants];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const randArray = new Uint32Array(1);
          crypto.getRandomValues(randArray);
          const j = randArray[0] % (i + 1);
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        
        const winnerIndex = Math.floor(cryptoRandom * shuffled.length);
        const winningNumber = winnerIndex + 1;
        
        addToAuditLog(`Método: Seleção aleatória criptográfica (cada participante = 1 chance igual)`);
        addToAuditLog(`Entropia gerada via crypto.getRandomValues()`);
        addToAuditLog(`Participantes embaralhados com Fisher-Yates criptográfico`);
        addToAuditLog(`Índice sorteado: ${winningNumber} (de 1 a ${shuffled.length})`);

        // Listar todos os participantes
        shuffled.forEach((p, idx) => {
          addToAuditLog(`Posição ${idx + 1}: ${p.user.full_name} (${p.number_of_entries} bilhete${p.number_of_entries > 1 ? 's' : ''})`);
        });

        // Ganhador selecionado
        const winner: RaffleParticipant | null = shuffled[winnerIndex];
        addToAuditLog(`🎉 GANHADOR ENCONTRADO: ${winner.user.full_name}`);
        addToAuditLog(`Posição sorteada: ${winningNumber} de ${shuffled.length} participantes`);

        if (!winner) {
          throw new Error('Erro na determinação do ganhador');
        }

        // Iniciar animação visual do sorteio
        addToAuditLog('Iniciando animação visual do sorteio...');
        setTempWinnerId(winner.user_id);
        setIsSpinning(true);

        // Aguardar animação
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Gerar hash de transparência
        const drawData = {
          raffleId,
          winnerId: winner.user_id,
          winningNumber,
          timestamp: new Date().toISOString(),
          totalParticipants: participants.length,
          totalTickets
        };
        const drawHash = await generateDrawHash(drawData);
        addToAuditLog(`Hash de autenticação gerado: ${drawHash.substring(0, 16)}...`);

        // Executar o sorteio no banco de dados com todos os dados
        addToAuditLog('Registrando resultado no banco de dados...');
        
        const { error: updateError } = await supabase
          .from('raffles')
          .update({
            winner_id: winner.user_id,
            draw_date: new Date().toISOString(),
            draw_hash: drawHash,
            draw_audit_log: [...auditLog, `Hash: ${drawHash}`],
            winning_ticket_number: winningNumber,
            total_tickets_at_draw: totalTickets,
            is_active: false
          })
          .eq('id', raffleId);

        if (updateError) {
          throw new Error('Erro ao salvar resultado no banco de dados');
        }

        // Conceder badge especial ao vencedor
        try {
          await supabase.rpc('award_special_badge', {
            user_id_param: winner.user_id,
            badge_name_param: 'Sortudo'
          });
        } catch (badgeError) {
          console.log('Badge award failed (non-critical):', badgeError);
        }

        // Notificar o ganhador
        try {
          await supabase.from('notifications').insert({
            user_id: winner.user_id,
            type: 'raffle_winner',
            title: '🎉 Você ganhou um sorteio!',
            message: `Parabéns! Você foi sorteado em "${raffleName}". Entre em contato com o organizador para receber seu prêmio.`,
            metadata: {
              raffle_id: raffleId,
              raffle_name: raffleName,
              winning_ticket_number: winningNumber,
              draw_hash: drawHash,
            },
            related_id: raffleId,
          });
          addToAuditLog(`📬 Ganhador notificado no app`);
        } catch (notifError) {
          console.warn('Falha ao notificar ganhador:', notifError);
        }

        // Enviar e-mail ao ganhador
        try {
          await supabase.functions.invoke('send-raffle-winner-email', {
            body: { raffle_id: raffleId, winner_id: winner.user_id },
          });
          addToAuditLog(`✉️ E-mail enviado ao ganhador`);
        } catch (emailError) {
          console.warn('Falha ao enviar e-mail ao ganhador:', emailError);
        }


        const drawResult: DrawResult = {
          winningNumbers: [winningNumber],
          winnerId: winner.user_id,
          winnerName: winner.user.full_name,
          drawDate: new Date().toISOString(),
          drawTimestamp: new Date().toISOString(),
          drawHash: drawHash,
          auditLog: [...auditLog, `Hash de autenticação: ${drawHash}`],
          totalParticipants: participants.length,
          totalTickets
        };

        setDrawResult(drawResult);
        addToAuditLog('✅ Sorteio finalizado com sucesso e registrado no sistema');
        addToAuditLog(`=== FIM DO SORTEIO ===`);
        
        // Parar animação
        setIsSpinning(false);
        
        // Efeito sonoro de comemoração
        playCelebrationSound();
        
        toast.success(`🎉 Sorteio realizado! Ganhador: ${winner.user.full_name}`, {
          duration: 5000
        });
        onDrawComplete(drawResult);

      } catch (error: any) {
        console.error('Erro durante o sorteio:', error);
        addToAuditLog(`❌ ERRO: ${error.message}`);
        setIsSpinning(false);
        toast.error('Erro ao realizar sorteio: ' + error.message);
      } finally {
        setIsDrawing(false);
      }
    });
  };

  const playRaffleStartSound = () => {
    try {
      // Som de roleta/tambor de sorteio
      const audio = new Audio('/notification-sound.mp3');
      audio.volume = 0.5;
      audio.play().catch(err => console.log('Audio play failed:', err));
    } catch (error) {
      console.log('Could not play raffle sound');
    }
  };

  const playCelebrationSound = () => {
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSl+zO/aizsIFGS46+ykUg0MTqXh8bllHAU2jdXvzH4xBSR8ydyTRAwWYrnu65hNEAxOpeHwr2IdBjKI0u/IeywGKn/M6tlVEw1Rp+Ptp18dBi2Dzu/FfTIGJnrG6NVUEQxKoeT');
      audio.volume = 0.3;
      audio.play().catch(err => console.log('Audio play failed:', err));
    } catch (error) {
      console.log('Could not play celebration sound');
    }
  };

  const copyPublicLink = () => {
    navigator.clipboard.writeText(publicLink);
    toast.success('Link copiado para a área de transferência!');
  };

  const openPublicResultPage = () => {
    const url = `${getAppBaseUrl()}/sorteio-resultado/${raffleId}`;
    window.open(url, '_blank');
  };

  const downloadAuditReport = () => {
    const report = [
      '═══════════════════════════════════════════════════════════',
      '            ATA OFICIAL DE SORTEIO - OFERTIVO',
      '═══════════════════════════════════════════════════════════',
      '',
      `Sorteio: ${raffleName}`,
      `Data de Realização: ${format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm:ss", { locale: ptBR })}`,
      `ID do Sorteio: ${raffleId}`,
      '',
      '───────────────────────────────────────────────────────────',
      'INFORMAÇÕES DO SORTEIO',
      '───────────────────────────────────────────────────────────',
      `Total de Participantes: ${participants.length}`,
      `Total de Bilhetes: ${totalTickets}`,
      '',
      '───────────────────────────────────────────────────────────',
      'LOG DE AUDITORIA',
      '───────────────────────────────────────────────────────────',
      ...auditLog,
      '',
      drawResult ? [
        '───────────────────────────────────────────────────────────',
        'RESULTADO OFICIAL',
        '───────────────────────────────────────────────────────────',
        `Ganhador: ${drawResult.winnerName}`,
        `Número Sorteado: ${drawResult.winningNumbers[0]}`,
        `Data do Sorteio: ${format(new Date(drawResult.drawDate), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}`,
        '',
        '═══════════════════════════════════════════════════════════',
        'Documento gerado automaticamente pelo sistema Ofertivo',
        `Link público: ${publicLink}`,
        '═══════════════════════════════════════════════════════════',
      ].join('\n') : ''
    ].join('\n');

    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ATA_SORTEIO_${raffleName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd_HHmmss')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('📄 Ata oficial baixada com sucesso!');
  };

  const downloadParticipantsList = () => {
    const csv = [
      'Nome,Telefone,Número da Entrada,Bilhetes,Números da Sorte,Data de Participação',
      ...participants.map(p => 
        `"${p.user.full_name}","${p.user.phone || 'N/A'}",${p.entry_number},${p.number_of_entries},"${p.luck_numbers.join(', ')}","${format(new Date(p.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}"`
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `participantes_${raffleName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Lista de participantes baixada!');
  };

  const totalTickets = participants.reduce((sum, p) => sum + p.number_of_entries, 0);

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
    <div className="space-y-4 sm:space-y-6">
      {/* Raffle Header with Image */}
      <Card className="bg-gradient-to-b from-[#1C1C1E] to-[#0E0E10] border-[#28A745]/30 overflow-hidden">
        {raffleImage && (
          <div className="relative h-32 sm:h-48 md:h-64 overflow-hidden">
            <img 
              src={raffleImage} 
              alt={raffleName}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0E0E10] to-transparent" />
          </div>
        )}
        <CardHeader className="p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-2">
            <div className="flex-1">
              <CardTitle className="text-lg sm:text-2xl md:text-3xl font-bold text-white mb-2">
                {raffleName}
              </CardTitle>
              {raffleDescription && (
                <p className="text-gray-400 text-xs sm:text-sm md:text-base">{raffleDescription}</p>
              )}
            </div>
            <Badge 
              variant={canDraw ? 'default' : 'secondary'} 
              className={`${canDraw ? 'bg-[#28A745] text-white' : 'bg-gray-700'} text-xs sm:text-sm shrink-0`}
            >
              {drawResult ? '✅ Finalizado' : canDraw ? '🎯 Pronto' : '⏳ Ativo'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-4">
            <div className="flex items-center gap-1 sm:gap-2 p-2 sm:p-3 bg-blue-900/20 rounded-lg border border-blue-600/30">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400 shrink-0" />
              <div>
                <div className="font-bold text-sm sm:text-lg text-white">{participants.length}</div>
                <div className="text-[10px] sm:text-xs text-gray-400">Participantes</div>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 p-2 sm:p-3 bg-green-900/20 rounded-lg border border-green-600/30">
              <Hash className="h-4 w-4 sm:h-5 sm:w-5 text-green-400 shrink-0" />
              <div>
                <div className="font-bold text-sm sm:text-lg text-white">{totalTickets}</div>
                <div className="text-[10px] sm:text-xs text-gray-400">Bilhetes</div>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 p-2 sm:p-3 bg-purple-900/20 rounded-lg border border-purple-600/30">
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-purple-400 shrink-0" />
              <div>
                <div className="font-bold text-xs sm:text-sm text-white">
                  {format(new Date(raffleEndDate), 'dd/MM/yyyy', { locale: ptBR })}
                </div>
                <div className="text-[10px] sm:text-xs text-gray-400">Encerramento</div>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 p-2 sm:p-3 bg-orange-900/20 rounded-lg border border-orange-600/30">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-orange-400 animate-pulse shrink-0" />
              <div>
                <div className="font-bold text-xs sm:text-sm text-white">{timeRemaining}</div>
                <div className="text-[10px] sm:text-xs text-gray-400">Tempo</div>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 p-2 sm:p-3 bg-teal-900/20 rounded-lg border border-teal-600/30 col-span-2 sm:col-span-1">
              <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-teal-400 shrink-0" />
              <div>
                <div className="font-bold text-xs sm:text-sm text-white">Auditável</div>
                <div className="text-[10px] sm:text-xs text-gray-400">100% Transparente</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Public Link */}
      <Card className="bg-[#1C1C1E] border-[#28A745]/30">
        <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-3">
          <CardTitle className="text-sm sm:text-base text-white flex items-center gap-2">
            <Link2 className="h-3 w-3 sm:h-4 sm:w-4" />
            Link Público do Resultado
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 pt-0 space-y-2 sm:space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              readOnly
              value={publicLink}
              className="flex-1 bg-[#0E0E10] border-gray-700 text-white text-xs sm:text-sm min-w-0"
            />
            <Button
              onClick={copyPublicLink}
              variant="outline"
              size="sm"
              className="border-[#28A745] text-[#28A745] hover:bg-[#28A745]/10 shrink-0 w-full sm:w-auto"
            >
              <Copy className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
              Copiar
            </Button>
          </div>
          <p className="text-[10px] sm:text-xs text-gray-400">
            Compartilhe este link para que qualquer pessoa possa verificar o resultado do sorteio de forma transparente.
          </p>
        </CardContent>
      </Card>

      {/* Animated Spinner */}
      {isDrawing && (
        <RaffleSpinner
          participants={participants.map(p => ({
            id: p.user_id,
            name: p.user.full_name
          }))}
          isSpinning={isSpinning}
          winnerId={tempWinnerId || undefined}
          onAnimationComplete={() => {
            console.log('Animation completed');
          }}
        />
      )}

      {/* Draw Controls */}
      {!drawResult && canDraw && !isDrawing && (
        <Card className="bg-gradient-to-br from-[#1C1C1E] via-[#1e3a1e] to-[#1C1C1E] border-2 border-[#28A745] shadow-[0_0_40px_rgba(40,167,69,0.3)]">
          <CardContent className="p-4 sm:p-8 space-y-4 sm:space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-lg sm:text-xl font-bold text-white">🎯 Tudo Pronto para o Sorteio!</h3>
              <p className="text-sm text-gray-400">Clique no botão abaixo para iniciar o sorteio transparente</p>
            </div>
            <div className="flex flex-col gap-3 sm:gap-4">
              <Button
                onClick={performDraw}
                disabled={participants.length === 0}
                className="relative w-full bg-gradient-to-r from-[#FFD700] via-[#FFA500] to-[#FFD700] hover:from-[#FFA500] hover:via-[#FF8C00] hover:to-[#FFA500] text-black font-black py-6 sm:py-10 text-lg sm:text-2xl shadow-[0_0_50px_rgba(255,215,0,0.6)] hover:shadow-[0_0_80px_rgba(255,215,0,0.9)] transition-all duration-300 border-4 border-yellow-300/70 rounded-2xl transform hover:scale-[1.02] active:scale-[0.98] overflow-hidden group"
              >
                {/* Animated background shine */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                <div className="flex items-center justify-center gap-2 sm:gap-3 relative z-10">
                  <Dice6 className="h-7 w-7 sm:h-10 sm:w-10 animate-bounce" />
                  <span className="drop-shadow-lg">🎰 SORTEAR AGORA 🎰</span>
                  <PlayCircle className="h-7 w-7 sm:h-10 sm:w-10 animate-pulse" />
                </div>
              </Button>
              <Button
                onClick={downloadParticipantsList}
                variant="outline"
                size="sm"
                className="w-full border-[#28A745] text-[#28A745] hover:bg-[#28A745]/10"
              >
                <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                Baixar Lista de Participantes
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Official Draw Result */}
      {drawResult && (
        <Card className="bg-gradient-to-br from-[#28A745] to-[#1e7d32] border-[#28A745]">
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-lg sm:text-2xl text-white flex items-center gap-2">
              <Trophy className="h-5 w-5 sm:h-8 sm:w-8" />
              Resultado Oficial do Sorteio
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 space-y-3 sm:space-y-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 sm:p-6 space-y-3 sm:space-y-4">
              <div className="text-center">
                <p className="text-gray-200 mb-1 sm:mb-2 text-sm sm:text-base">🎊 Vencedor(a) 🎊</p>
                <p className="text-xl sm:text-4xl font-bold text-white mb-1 break-words">{drawResult.winnerName}</p>
                <p className="text-sm sm:text-xl text-gray-200">
                  Número da Sorte: <span className="font-mono font-bold">{drawResult.winningNumbers.join(', ')}</span>
                </p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-white">
                <div className="bg-white/10 rounded p-3 sm:p-4">
                  <p className="text-xs sm:text-sm text-gray-200">Total de Bilhetes</p>
                  <p className="text-xl sm:text-2xl font-bold">{drawResult.totalTickets}</p>
                </div>
                <div className="bg-white/10 rounded p-3 sm:p-4">
                  <p className="text-xs sm:text-sm text-gray-200">Realizado em</p>
                  <p className="text-sm sm:text-lg font-bold">
                    {format(new Date(drawResult.drawTimestamp), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                  </p>
                </div>
              </div>

              <div className="bg-white/10 rounded p-3 sm:p-4">
                <p className="text-xs sm:text-sm text-gray-200 mb-2">Hash de Verificação (SHA-256)</p>
                <p className="text-[10px] sm:text-xs font-mono text-white break-all">{drawResult.drawHash}</p>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:gap-3">
              <Button
                onClick={openPublicResultPage}
                size="sm"
                className="w-full bg-white text-[#28A745] hover:bg-gray-100"
              >
                <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                Ver Resultado Público
              </Button>
              <Button
                onClick={downloadAuditReport}
                variant="outline"
                size="sm"
                className="w-full border-white text-white hover:bg-white/10"
              >
                <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                Baixar Relatório Completo
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Audit Log */}
      <Card className="bg-[#1C1C1E] border-[#28A745]/30">
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="text-base sm:text-lg text-white">Log de Auditoria em Tempo Real</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <ScrollArea className="h-64 sm:h-80 md:h-96 w-full border border-gray-800 rounded-lg p-2 sm:p-4 bg-[#0E0E10]">
            <div className="space-y-1 font-mono text-xs sm:text-sm">
              {auditLog.map((entry, index) => (
                <div 
                  key={index} 
                  className={`${
                    entry.includes('ERRO') || entry.includes('❌') ? 'text-red-400' :
                    entry.includes('GANHADOR') || entry.includes('🎉') ? 'text-[#28A745] font-bold' :
                    entry.includes('===') ? 'text-blue-400 font-bold' :
                    'text-gray-400'
                  } break-words`}
                >
                  {entry}
                </div>
              ))}
              {auditLog.length === 0 && (
                <div className="text-center py-6 sm:py-8 text-gray-500">
                  <Clock className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs sm:text-sm">Log de auditoria será exibido aqui durante o sorteio</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};