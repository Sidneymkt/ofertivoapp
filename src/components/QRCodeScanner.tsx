
import React, { useRef, useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, X, CheckCircle } from 'lucide-react';
import { qrCodeService } from '@/lib/qrcode';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface QRCodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  offerId: string;
}

const QRCodeScanner: React.FC<QRCodeScannerProps> = ({ isOpen, onClose, offerId }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);

  useEffect(() => {
    if (isOpen && videoRef.current) {
      startScanning();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startScanning = async () => {
    if (!videoRef.current || !user) return;

    try {
      setIsScanning(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      videoRef.current.srcObject = stream;
      
      const qrData = await qrCodeService.scanQRCode(videoRef.current);
      
      if (qrData.offerId === offerId) {
        const result = await qrCodeService.processCheckin(qrData, user.id);
        setScanResult(result);
        
        if (result.success) {
          toast({ 
            title: "Check-in realizado!", 
            description: `Você ganhou ${result.points} pontos!` 
          });
        } else {
          toast({ 
            title: "Erro no check-in", 
            description: result.message,
            variant: "destructive" 
          });
        }
      } else {
        toast({ 
          title: "QR Code inválido", 
          description: "Este QR Code não corresponde a esta oferta",
          variant: "destructive" 
        });
      }
    } catch (error) {
      console.error('Error scanning QR code:', error);
      toast({ 
        title: "Erro ao escanear", 
        description: "Não foi possível ler o QR Code",
        variant: "destructive" 
      });
    } finally {
      setIsScanning(false);
      stopCamera();
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const handleClose = () => {
    stopCamera();
    setScanResult(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md w-[95vw] sm:w-full p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Camera className="w-5 h-5 mr-2" />
            Scanner QR Code
          </DialogTitle>
        </DialogHeader>

        {!scanResult ? (
          <div className="space-y-4">
            <div className="relative aspect-square bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              {isScanning && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-48 h-48 border-2 border-white rounded-lg">
                    <div className="w-full h-full border border-dashed border-white/50 rounded-lg animate-pulse" />
                  </div>
                </div>
              )}
            </div>
            
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Posicione o QR Code dentro da moldura para fazer o check-in
              </p>
              <Button variant="outline" onClick={handleClose} className="w-full">
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-4">
            {scanResult.success ? (
              <>
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
                <h3 className="text-lg font-semibold">Check-in realizado!</h3>
                <p className="text-muted-foreground">
                  Você ganhou {scanResult.points} pontos!
                </p>
              </>
            ) : (
              <>
                <X className="w-16 h-16 text-red-500 mx-auto" />
                <h3 className="text-lg font-semibold">Erro no check-in</h3>
                <p className="text-muted-foreground">{scanResult.message}</p>
              </>
            )}
            <Button onClick={handleClose} className="w-full">
              Fechar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default QRCodeScanner;
