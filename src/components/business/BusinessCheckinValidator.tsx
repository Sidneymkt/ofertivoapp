import React, { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, QrCode, ScanLine, XCircle, Trophy, Users, LayoutDashboard, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import QrScanner from 'qr-scanner';
import { useCheckinValidation, QRCodeScannedData } from '@/hooks/useCheckinValidation';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const BusinessCheckinValidator: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);

  const { toast } = useToast();
  const { canValidate, isValidating, validate } = useCheckinValidation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [usingCamera, setUsingCamera] = useState(false);
  const [qrRaw, setQrRaw] = useState('');
  const [userIdInput, setUserIdInput] = useState('');
  const [lastResult, setLastResult] = useState<{
    success: boolean;
    message: string;
    points?: number;
    checkinId?: string;
  } | null>(null);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  const [geo, setGeo] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {
          setGeo({ lat: null, lng: null });
        },
        { enableHighAccuracy: true, maximumAge: 15000, timeout: 10000 }
      );
    }
  }, []);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const startScanner = async () => {
    if (!videoRef.current) return;
    try {
      setUsingCamera(true);
      scannerRef.current = new QrScanner(
        videoRef.current,
        (result) => {
          if (!result?.data) return;
          setQrRaw(result.data);
          stopScanner();
          toast({
            title: 'QR lido com sucesso! ✅',
            description: 'Clique em "Validar Check-in" para confirmar.',
          });
        },
        {
          highlightScanRegion: true,
          highlightCodeOutline: true,
          maxScansPerSecond: 8,
        }
      );
      await scannerRef.current.start();
    } catch (e) {
      console.error('[BusinessCheckinValidator] erro ao iniciar câmera:', e);
      toast({
        title: 'Não foi possível acessar a câmera',
        description: 'Verifique as permissões do navegador e tente novamente.',
        variant: 'destructive',
      });
      setUsingCamera(false);
    }
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop();
      scannerRef.current.destroy();
      scannerRef.current = null;
    }
    setUsingCamera(false);
  };

  const handleValidate = async () => {
    if (!canValidate) {
      toast({
        title: 'Negócio não pronto',
        description: 'Não foi possível identificar o seu negócio ativo.',
        variant: 'destructive',
      });
      return;
    }

    let parsed: QRCodeScannedData | string = qrRaw;
    if (qrRaw.trim().startsWith('{')) {
      try {
        parsed = JSON.parse(qrRaw);
      } catch {
        // mantém como string
      }
    }

    const result = await validate({
      qrData: parsed,
      fallbackUserId: userIdInput || null,
      location: geo,
    });

    setLastResult({
      success: result.success,
      message: result.message,
      points: result.points_awarded,
      checkinId: result.checkin_id,
    });

    if (result.success) {
      setShowSuccessAnimation(true);
      setQrRaw('');
      setUserIdInput('');
      
      toast({
        title: '✅ Check-in validado com sucesso!',
        description: `Cliente ganhou +${result.points_awarded || 0} pontos`,
        className: 'bg-green-500 text-white border-green-600',
        duration: 5000,
      });
      
      // Reset animation after 3 seconds
      setTimeout(() => setShowSuccessAnimation(false), 3000);
    }
  };

  const resetValidation = () => {
    setLastResult(null);
    setQrRaw('');
    setUserIdInput('');
    setShowSuccessAnimation(false);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="w-5 h-5" />
          Validação de Check-in
        </CardTitle>
        <CardDescription>
          Escaneie o QR Code do cliente para validar o check-in e creditar pontos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="rounded-lg overflow-hidden bg-black relative aspect-video">
              <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
              {!usingCamera ? (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
                  <Button variant="default" onClick={startScanner} className="flex items-center gap-2" size="lg">
                    <Camera className="w-5 h-5" />
                    Iniciar Câmera
                  </Button>
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-48 h-48 border-4 border-primary rounded-lg relative animate-pulse">
                    <ScanLine className="w-40 h-40 text-primary/70 absolute top-4 left-4" />
                  </div>
                  <Button variant="destructive" size="sm" onClick={stopScanner} className="absolute top-3 right-3">
                    Parar
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Conteúdo do QR Code</label>
              <Input
                value={qrRaw}
                onChange={(e) => setQrRaw(e.target.value)}
                placeholder="Escaneie ou cole o QR Code do cliente aqui"
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">ID do usuário (opcional)</label>
              <Input
                value={userIdInput}
                onChange={(e) => setUserIdInput(e.target.value)}
                placeholder="Apenas se o QR não contiver userId"
                className="text-xs"
              />
            </div>

            <Button 
              onClick={handleValidate} 
              disabled={isValidating || !qrRaw} 
              className="w-full h-12 text-base font-semibold"
              size="lg"
            >
              {isValidating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Validando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Validar Check-in
                </>
              )}
            </Button>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border p-4 bg-muted/30">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Instruções
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>1. Peça ao cliente para abrir o app Ofertivo</li>
                <li>2. O cliente deve acessar a oferta e clicar em "Check-in"</li>
                <li>3. Escaneie o QR Code exibido no celular do cliente</li>
                <li>4. Clique em "Validar Check-in" para confirmar</li>
              </ul>
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs text-muted-foreground">
                  📍 Localização: {geo.lat && geo.lng ? `${geo.lat.toFixed(4)}, ${geo.lng.toFixed(4)}` : 'não disponível'}
                </p>
                {user && (
                  <p className="text-xs text-muted-foreground mt-1">
                    👤 Operador: {user.email}
                  </p>
                )}
              </div>
            </div>

            {lastResult && (
              <>
                {lastResult.success ? (
                  <Alert className={`border-green-500/50 bg-green-500/10 ${showSuccessAnimation ? 'animate-in zoom-in-95 duration-300' : ''}`}>
                    <div className="flex items-start gap-3">
                      <div className={`rounded-full bg-green-500/20 p-2 ${showSuccessAnimation ? 'animate-bounce' : ''}`}>
                        <CheckCircle2 className="w-8 h-8 text-green-500" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <AlertTitle className="text-green-600 text-xl font-bold">
                          Check-in confirmado! 🎉
                        </AlertTitle>
                        <AlertDescription className="text-green-600/90">
                          {lastResult.message}
                        </AlertDescription>
                        
                        {lastResult.points !== undefined && lastResult.points > 0 && (
                          <Badge className="bg-green-500/20 text-green-600 border-green-500/30 hover:bg-green-500/30 text-lg px-4 py-2">
                            <Trophy className="w-4 h-4 mr-2" />
                            +{lastResult.points} pontos
                          </Badge>
                        )}
                        
                        <div className="pt-2 space-y-1 text-sm text-green-600/80">
                          <p>✓ Cliente presente confirmado</p>
                          <p>✓ Pontos creditados automaticamente</p>
                          <p>✓ Dados sincronizados em tempo real</p>
                          {lastResult.checkinId && (
                            <p className="text-muted-foreground text-xs mt-2">ID: {lastResult.checkinId.substring(0, 8)}...</p>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2 pt-4">
                          <Button 
                            size="default" 
                            onClick={resetValidation}
                            className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                          >
                            <QrCode className="w-4 h-4" />
                            Novo Check-in
                          </Button>
                          <Button 
                            size="default" 
                            variant="outline"
                            onClick={() => navigate('/business/crm')}
                            className="flex items-center gap-2"
                          >
                            <Users className="w-4 h-4" />
                            Ver CRM
                          </Button>
                          <Button 
                            size="default" 
                            variant="outline"
                            onClick={() => navigate('/business')}
                            className="flex items-center gap-2"
                          >
                            <LayoutDashboard className="w-4 h-4" />
                            Dashboard
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Alert>
                ) : (
                  <Alert className="border-destructive/50 bg-destructive/10">
                    <div className="flex items-start gap-3">
                      <div className="rounded-full bg-destructive/20 p-2">
                        <XCircle className="w-6 h-6 text-destructive" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <AlertTitle className="text-destructive text-lg font-bold">
                          Falha na validação ❌
                        </AlertTitle>
                        <AlertDescription className="text-destructive/90">
                          {lastResult.message}
                        </AlertDescription>
                        
                        <div className="pt-2 space-y-1 text-xs text-destructive/80">
                          <p>Possíveis causas:</p>
                          <p>• QR Code inválido ou expirado</p>
                          <p>• Check-in já realizado hoje</p>
                          <p>• Dados inconsistentes no QR Code</p>
                        </div>

                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={resetValidation}
                          className="mt-3"
                        >
                          Tentar Novamente
                        </Button>
                      </div>
                    </div>
                  </Alert>
                )}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BusinessCheckinValidator;

