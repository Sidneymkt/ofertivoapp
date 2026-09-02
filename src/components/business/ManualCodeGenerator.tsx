import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Copy, Hash, RefreshCw, CheckCircle, Trophy, LayoutDashboard, QrCode } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

interface ManualCodeGeneratorProps {
  offerId: string;
  businessId: string;
  offerTitle: string;
  checkinPoints?: number;
}

interface CheckinSuccess {
  userId: string;
  pointsAwarded: number;
  checkinId: string;
}

const ManualCodeGenerator: React.FC<ManualCodeGeneratorProps> = ({
  offerId,
  businessId,
  offerTitle,
  checkinPoints = 50
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentCode, setCurrentCode] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [checkinSuccess, setCheckinSuccess] = useState<CheckinSuccess | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Subscribe to real-time checkin events for this offer
  useEffect(() => {
    if (!isOpen || !offerId) return;

    const channel = supabase
      .channel(`manual-checkins-${offerId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'offer_checkins',
          filter: `offer_id=eq.${offerId}`,
        },
        async (payload) => {
          console.log('New checkin detected (manual):', payload);
          
          const checkin = payload.new as { id: string; user_id: string; points_awarded: number };
          
          // Show success screen
          setCheckinSuccess({
            userId: checkin.user_id,
            pointsAwarded: checkin.points_awarded || checkinPoints,
            checkinId: checkin.id
          });

          toast({
            title: '✅ Check-in validado!',
            description: `Cliente ganhou +${checkin.points_awarded || checkinPoints} pontos`,
            className: 'bg-green-500 text-white border-green-600',
            duration: 5000,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, offerId, checkinPoints, toast]);

  // Reset success state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCheckinSuccess(null);
    }
  }, [isOpen]);

  const generateCode = async () => {
    setIsGenerating(true);
    
    try {
      // Gerar código alfanumérico de 6 dígitos
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      // Salvar código no banco de dados com expiração de 30 minutos
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 30);

      const { error } = await supabase
        .from('manual_checkin_codes')
        .insert({
          code,
          offer_id: offerId,
          business_id: businessId,
          expires_at: expiresAt.toISOString(),
          used: false
        });

      if (error) throw error;

      setCurrentCode(code);
      setIsOpen(true);
      
      toast({
        title: 'Código gerado com sucesso',
        description: 'O código é válido por 30 minutos.',
      });
    } catch (error) {
      console.error('Erro ao gerar código:', error);
      toast({
        title: 'Erro ao gerar código',
        description: 'Não foi possível gerar o código. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(currentCode);
    toast({
      title: 'Código copiado',
      description: 'O código foi copiado para a área de transferência.',
    });
  };

  const regenerateCode = async () => {
    setCheckinSuccess(null);
    await generateCode();
  };

  const handleClose = () => {
    setCheckinSuccess(null);
    setIsOpen(false);
  };

  return (
    <>
      <Button
        onClick={generateCode}
        disabled={isGenerating}
        variant="outline"
        size="sm"
        className="flex-1 flex items-center justify-center gap-2"
      >
        <Hash className="w-3 h-3" />
        {isGenerating ? 'Gerando...' : 'Código Manual'}
      </Button>

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md bg-gray-900 border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Hash className="w-5 h-5" />
              <span className="text-sm truncate max-w-72">{offerTitle}</span>
            </DialogTitle>
          </DialogHeader>

          {checkinSuccess ? (
            // Success Screen
            <div className="text-center space-y-4 relative overflow-hidden py-4">
              {/* Confetti Animation Background */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {[...Array(20)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-3 h-3 animate-bounce"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      backgroundColor: ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'][i % 5],
                      borderRadius: i % 2 === 0 ? '50%' : '0',
                      animationDelay: `${Math.random() * 0.5}s`,
                      animationDuration: `${1 + Math.random()}s`,
                      opacity: 0.7,
                    }}
                  />
                ))}
              </div>

              {/* Success Icon with Glow */}
              <div className="flex justify-center relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-24 h-24 rounded-full bg-green-500/20 animate-ping" />
                </div>
                <div className="w-20 h-20 rounded-full flex items-center justify-center bg-gradient-to-br from-green-400 to-green-600 shadow-2xl shadow-green-500/50 animate-in zoom-in-75 duration-500 relative z-10">
                  <CheckCircle className="w-12 h-12 text-white drop-shadow-lg" />
                </div>
              </div>
              
              <div className="space-y-4 relative z-10">
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent animate-in slide-in-from-bottom duration-300">
                    ✨ Check-in Validado! ✨
                  </h3>
                  <p className="text-base text-gray-400 font-medium">
                    Cliente recebeu os pontos com sucesso!
                  </p>
                </div>
                
                <div className="flex items-center justify-center gap-2 animate-in slide-in-from-bottom duration-500">
                  <div className="relative">
                    <div className="absolute inset-0 bg-green-500/30 blur-xl rounded-full" />
                    <Badge className="relative text-xl px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0 shadow-lg shadow-green-500/30">
                      <Trophy className="w-6 h-6 mr-3 animate-bounce" />
                      +{checkinSuccess.pointsAwarded} pontos
                    </Badge>
                  </div>
                </div>
                
                <div className="p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-xl border-2 border-green-500/30 backdrop-blur-sm animate-in fade-in duration-700">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 text-green-500">
                      <CheckCircle className="w-4 h-4" />
                      <p className="text-sm font-medium">Check-in registrado no sistema</p>
                    </div>
                    <div className="flex items-center gap-3 text-green-500">
                      <CheckCircle className="w-4 h-4" />
                      <p className="text-sm font-medium">Pontos creditados na conta do cliente</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-4">
                  <Button
                    onClick={regenerateCode}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
                  >
                    <Hash className="w-4 h-4 mr-2" />
                    Gerar Novo Código
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => {
                      handleClose();
                      navigate('/anunciante/dashboard');
                    }}
                    className="border-gray-600 text-gray-300 hover:bg-gray-800"
                  >
                    <LayoutDashboard className="w-4 h-4 mr-2" />
                    Voltar ao Dashboard
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            // Code Display
            <div className="space-y-4">
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-6 text-center">
                  <div className="space-y-4">
                    <div className="text-sm text-gray-400">
                      Código para Check-in Manual
                    </div>
                    
                    <div className="text-4xl font-bold font-mono tracking-widest text-green-400">
                      {currentCode}
                    </div>
                    
                    <div className="flex items-center justify-center gap-2">
                      <Badge variant="secondary" className="text-xs bg-gray-700 text-gray-300">
                        Válido por 30 minutos
                      </Badge>
                      <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">
                        +{checkinPoints} pontos
                      </Badge>
                    </div>
                    
                    <div className="text-xs text-gray-400">
                      Forneça este código ao cliente para<br />
                      validação manual do check-in
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-2">
                <Button
                  onClick={copyCode}
                  variant="outline"
                  className="flex-1 flex items-center gap-2 bg-transparent border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  <Copy className="w-4 h-4" />
                  Copiar
                </Button>
                
                <Button
                  onClick={regenerateCode}
                  className="flex-1 flex items-center gap-2 bg-green-600 hover:bg-green-700"
                >
                  <RefreshCw className="w-4 h-4" />
                  Novo Código
                </Button>
              </div>

              <div className="text-xs text-center text-yellow-500 flex items-start gap-2">
                <span>💡</span>
                <span>Dica: O cliente deve digitar este código no app para fazer check-in</span>
              </div>
              
              <div className="text-blue-400 text-xs text-center p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <span>🔄 Aguardando check-ins... A tela será atualizada automaticamente quando um cliente usar o código.</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ManualCodeGenerator;