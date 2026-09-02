
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Download, QrCode, Printer, CheckCircle, Trophy, LayoutDashboard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import QRCodeLib from 'qrcode';
import { supabase } from '@/integrations/supabase/client';

interface OfferQRGeneratorProps {
  offerId: string;
  businessId: string;
  offerTitle: string;
  businessName: string;
  checkinPoints?: number;
}

interface CheckinSuccess {
  userId: string;
  pointsAwarded: number;
  checkinId: string;
}

const OfferQRGenerator: React.FC<OfferQRGeneratorProps> = ({
  offerId,
  businessId,
  offerTitle,
  businessName,
  checkinPoints = 50
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [checkinSuccess, setCheckinSuccess] = useState<CheckinSuccess | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Subscribe to real-time checkin events for this offer
  useEffect(() => {
    if (!isOpen || !offerId) return;

    const channel = supabase
      .channel(`offer-checkins-${offerId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'offer_checkins',
          filter: `offer_id=eq.${offerId}`,
        },
        async (payload) => {
          console.log('New checkin detected:', payload);
          
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

  const generateQRCode = async () => {
    setIsGenerating(true);
    
    try {
      const qrData = {
        offerId,
        businessId,
        timestamp: new Date().toISOString(),
        type: 'offer_checkin'
      };

      const qrDataUrl = await QRCodeLib.toDataURL(JSON.stringify(qrData), {
        width: 300,
        margin: 2,
        color: {
          dark: '#2D5A27', // Verde do Ofertivo
          light: '#FFFFFF'
        }
      });

      setQrDataUrl(qrDataUrl);
      setIsOpen(true);
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error);
      toast({
        title: 'Erro ao gerar QR Code',
        description: 'Não foi possível gerar o QR Code. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadQR = () => {
    if (!qrDataUrl) return;

    const link = document.createElement('a');
    link.download = `qr-code-${offerTitle.replace(/\s+/g, '-').toLowerCase()}.png`;
    link.href = qrDataUrl;
    link.click();

    toast({
      title: 'QR Code baixado',
      description: 'O arquivo foi salvo em seus downloads.',
    });
  };

  const printQR = () => {
    if (!qrDataUrl) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>QR Code - ${offerTitle}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              padding: 20px;
            }
            .qr-container {
              border: 2px solid #2D5A27;
              border-radius: 10px;
              padding: 20px;
              margin: 20px auto;
              max-width: 400px;
            }
            .qr-code {
              margin: 20px 0;
            }
            .title {
              color: #2D5A27;
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .business {
              color: #666;
              font-size: 14px;
              margin-bottom: 20px;
            }
            .instructions {
              color: #888;
              font-size: 12px;
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <h2>🎯 OFERTIVO</h2>
            <div class="title">${offerTitle}</div>
            <div class="business">${businessName}</div>
            <div class="qr-code">
              <img src="${qrDataUrl}" alt="QR Code" />
            </div>
            <div class="instructions">
              Escaneie este QR Code com o app Ofertivo<br/>
              para fazer check-in e ganhar pontos!
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.print();

    toast({
      title: 'Enviado para impressão',
      description: 'O QR Code foi enviado para a impressora.',
    });
  };

  const resetAndWait = () => {
    setCheckinSuccess(null);
  };

  const handleClose = () => {
    setCheckinSuccess(null);
    setIsOpen(false);
  };

  return (
    <>
      <Button
        onClick={generateQRCode}
        disabled={isGenerating}
        variant="outline"
        size="sm"
        className="flex-1 flex items-center justify-center gap-2"
      >
        <QrCode className="w-3 h-3" />
        {isGenerating ? 'Gerando...' : 'QR Code'}
      </Button>

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md bg-gray-900 border-gray-800 text-white">
          <DialogHeader className="text-center">
            <DialogTitle className="flex items-center gap-2 justify-center">
              <QrCode className="w-5 h-5" />
              <span className="text-sm truncate max-w-72">{offerTitle}</span>
            </DialogTitle>
          </DialogHeader>

          {checkinSuccess ? (
            // Success Screen - similar to CheckinValidationModal
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
                    onClick={resetAndWait}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
                  >
                    <QrCode className="w-4 h-4 mr-2" />
                    Validar Outro Cliente
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
            // QR Code Display
            <div className="space-y-6 pb-4">
              <div className="text-center">
                <div className="text-green-400 font-medium mb-4">
                  {businessName}
                </div>
                
                {qrDataUrl && (
                  <div className="flex justify-center mb-4">
                    <div className="bg-white p-4 rounded-lg">
                      <img
                        src={qrDataUrl}
                        alt="QR Code"
                        className="w-48 h-48"
                      />
                    </div>
                  </div>
                )}
                
                <div className="text-gray-400 text-sm mb-2">
                  Clientes podem escanear este QR Code<br />
                  para fazer check-in e ganhar pontos
                </div>
                
                <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">
                  +{checkinPoints} pontos por check-in
                </Badge>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={downloadQR}
                  variant="outline"
                  className="flex-1 bg-transparent border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Baixar
                </Button>
                
                <Button
                  onClick={printQR}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Imprimir
                </Button>
              </div>

              <div className="text-yellow-500 text-xs text-center flex items-start gap-2">
                <span>💡</span>
                <span>Dica: Cole este QR Code no balcão ou vitrine para que seus clientes possam fazer check-in facilmente</span>
              </div>
              
              <div className="text-blue-400 text-xs text-center p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <span>🔄 Aguardando check-ins... A tela será atualizada automaticamente quando um cliente escanear o QR Code.</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default OfferQRGenerator;
