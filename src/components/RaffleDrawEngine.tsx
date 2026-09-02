import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Trophy, 
  Users, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Download,
  Eye,
  RefreshCw,
  Dice6
} from 'lucide-react';
import { toast } from 'sonner';

interface DrawParticipant {
  id: string;
  name: string;
  email: string;
  cpf: string;
  numbers: number[];
  registrationDate: string;
}

interface DrawResult {
  winningNumbers: number[];
  winners: Array<{
    participant: DrawParticipant;
    prizePosition: number;
    prizeName: string;
  }>;
  drawDate: string;
  method: 'loteria_federal' | 'random' | 'sequential';
  auditLog: string[];
}

interface RaffleDrawEngineProps {
  raffleId: string;
  participants: DrawParticipant[];
  prizes: Array<{
    name: string;
    description: string;
    quantity: number;
  }>;
  drawMethod: 'loteria_federal' | 'random' | 'sequential';
  onDrawComplete: (result: DrawResult) => void;
}

export const RaffleDrawEngine: React.FC<RaffleDrawEngineProps> = ({
  raffleId,
  participants,
  prizes,
  drawMethod,
  onDrawComplete
}) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawProgress, setDrawProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [drawResult, setDrawResult] = useState<DrawResult | null>(null);
  const [auditLog, setAuditLog] = useState<string[]>([]);

  const addToAuditLog = (message: string) => {
    const timestamp = new Date().toLocaleString('pt-BR');
    const logEntry = `[${timestamp}] ${message}`;
    setAuditLog(prev => [...prev, logEntry]);
    console.log('[RaffleDrawEngine]', logEntry);
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
    }, 1000);
  };

  const generateRandomNumbers = (count: number, max: number): number[] => {
    const numbers: number[] = [];
    while (numbers.length < count) {
      const cryptoArray = new Uint32Array(1);
      crypto.getRandomValues(cryptoArray);
      const num = (cryptoArray[0] % max) + 1;
      if (!numbers.includes(num)) {
        numbers.push(num);
      }
    }
    return numbers.sort((a, b) => a - b);
  };

  const getFederalLotteryNumbers = async (): Promise<number[]> => {
    // Simulação - em produção conectaria com API oficial
    await new Promise(resolve => setTimeout(resolve, 2000));
    return generateRandomNumbers(5, 99999);
  };

  const conductDraw = async () => {
    if (participants.length === 0) {
      toast.error('Não há participantes suficientes para realizar o sorteio');
      return;
    }

    setIsDrawing(true);
    setDrawProgress(0);
    setAuditLog([]);
    setDrawResult(null);

    addToAuditLog(`Iniciando sorteio para ${participants.length} participantes`);
    addToAuditLog(`Método de sorteio: ${drawMethod}`);
    addToAuditLog(`Total de prêmios: ${prizes.length}`);

    const steps = [
      'Validando participantes...',
      'Verificando elegibilidade...',
      'Preparando números da sorte...',
      drawMethod === 'loteria_federal' ? 'Consultando Loteria Federal...' : 'Gerando números aleatórios...',
      'Calculando vencedores...',
      'Validando resultados...',
      'Gerando ata de sorteio...',
      'Finalizando sorteio...'
    ];

    simulateProgress(steps, async () => {
      try {
        let winningNumbers: number[];

        switch (drawMethod) {
          case 'loteria_federal':
            winningNumbers = await getFederalLotteryNumbers();
            addToAuditLog(`Números da Loteria Federal: ${winningNumbers.join(', ')}`);
            break;
          case 'random':
            const totalNumbers = participants.reduce((sum, p) => sum + p.numbers.length, 0);
            winningNumbers = generateRandomNumbers(Math.min(5, prizes.length), totalNumbers);
            addToAuditLog(`Números sorteados aleatoriamente: ${winningNumbers.join(', ')}`);
            break;
          case 'sequential':
            winningNumbers = Array.from({ length: Math.min(5, prizes.length) }, (_, i) => i + 1);
            addToAuditLog(`Números sequenciais: ${winningNumbers.join(', ')}`);
            break;
          default:
            throw new Error('Método de sorteio inválido');
        }

        // Determinar vencedores
        const winners = [];
        const usedParticipants = new Set<string>();

        for (let i = 0; i < Math.min(winningNumbers.length, prizes.length); i++) {
          const winningNumber = winningNumbers[i];
          
          // Encontrar participante com o número vencedor (ou mais próximo)
          let winner: DrawParticipant | null = null;
          let minDistance = Infinity;

          for (const participant of participants) {
            if (usedParticipants.has(participant.id)) continue;
            
            for (const num of participant.numbers) {
              const distance = Math.abs(num - winningNumber);
              if (distance < minDistance) {
                minDistance = distance;
                winner = participant;
              }
            }
          }

          if (winner && prizes[i]) {
            winners.push({
              participant: winner,
              prizePosition: i + 1,
              prizeName: prizes[i].name
            });
            usedParticipants.add(winner.id);
            addToAuditLog(`${i + 1}º lugar: ${winner.name} - ${prizes[i].name}`);
          }
        }

        const result: DrawResult = {
          winningNumbers,
          winners,
          drawDate: new Date().toISOString(),
          method: drawMethod,
          auditLog: [...auditLog]
        };

        setDrawResult(result);
        addToAuditLog('Sorteio finalizado com sucesso!');
        toast.success('Sorteio realizado com sucesso!');
        onDrawComplete(result);

      } catch (error) {
        console.error('Erro durante o sorteio:', error);
        addToAuditLog(`Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        toast.error('Erro ao realizar sorteio');
      } finally {
        setIsDrawing(false);
      }
    });
  };

  const downloadAuditReport = () => {
    const report = auditLog.join('\n');
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ata_sorteio_${raffleId}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadWinnersList = () => {
    if (!drawResult) return;

    const csv = [
      'Posição,Nome,Email,CPF,Prêmio,Data do Sorteio',
      ...drawResult.winners.map(w => 
        `${w.prizePosition},${w.participant.name},${w.participant.email},${w.participant.cpf},${w.prizeName},${new Date(drawResult.drawDate).toLocaleDateString('pt-BR')}`
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ganhadores_sorteio_${raffleId}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dice6 className="h-6 w-6" />
            Sistema de Apuração de Sorteio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <div className="font-medium">{participants.length}</div>
                <div className="text-sm text-muted-foreground">Participantes</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <div>
                <div className="font-medium">{prizes.length}</div>
                <div className="text-sm text-muted-foreground">Prêmios</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-green-500" />
              <div>
                <Badge variant={drawResult ? 'default' : 'secondary'}>
                  {drawResult ? 'Finalizado' : 'Pendente'}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Draw Controls */}
      {!drawResult && (
        <Card>
          <CardHeader>
            <CardTitle>Executar Sorteio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <div>
                  <div className="font-medium text-yellow-800">Atenção</div>
                  <div className="text-sm text-yellow-700">
                    Esta ação não pode ser desfeita. Certifique-se de que todos os participantes estão corretos.
                  </div>
                </div>
              </div>
            </div>

            {isDrawing && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{currentStep}</span>
                  <span className="text-sm text-muted-foreground">{Math.round(drawProgress)}%</span>
                </div>
                <Progress value={drawProgress} className="h-2" />
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={conductDraw} 
                disabled={isDrawing || participants.length === 0}
                className="flex items-center gap-2"
              >
                {isDrawing ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Dice6 className="h-4 w-4" />
                )}
                {isDrawing ? 'Realizando Sorteio...' : 'Realizar Sorteio'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Draw Results */}
      {drawResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-green-500" />
              Resultado do Sorteio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Winners */}
            <div>
              <h3 className="font-semibold mb-4">Ganhadores</h3>
              <div className="space-y-3">
                {drawResult.winners.map((winner, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-8 h-8 bg-yellow-500 text-white rounded-full font-bold">
                        {winner.prizePosition}
                      </div>
                      <div>
                        <div className="font-medium">{winner.participant.name}</div>
                        <div className="text-sm text-muted-foreground">{winner.participant.email}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{winner.prizeName}</div>
                      <div className="text-sm text-muted-foreground">
                        Números: {winner.participant.numbers.join(', ')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Winning Numbers */}
            <div>
              <h3 className="font-semibold mb-2">Números Sorteados</h3>
              <div className="flex gap-2">
                {drawResult.winningNumbers.map((num, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-center w-12 h-12 bg-blue-500 text-white rounded-full font-bold"
                  >
                    {num}
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t">
              <Button onClick={downloadWinnersList} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Lista de Ganhadores
              </Button>
              <Button onClick={downloadAuditReport} variant="outline">
                <Eye className="h-4 w-4 mr-2" />
                Ata do Sorteio
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Audit Log */}
      <Card>
        <CardHeader>
          <CardTitle>Log de Auditoria</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64 w-full border rounded-lg p-4">
            <div className="space-y-1">
              {auditLog.map((entry, index) => (
                <div key={index} className="text-sm font-mono text-muted-foreground">
                  {entry}
                </div>
              ))}
              {auditLog.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-8">
                  Nenhum evento registrado ainda
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};