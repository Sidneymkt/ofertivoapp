import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Camera, Hash, MapPin, Trophy, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import QrScanner from 'qr-scanner';
import { supabase } from '@/lib/supabase';
import { calculateDistanceInMeters } from '@/lib/geo';

interface CheckinModalProps {
  isOpen: boolean;
  onClose: () => void;
  offerId: string;
  businessId: string;
  offerTitle: string;
}

interface CheckinResult {
  success: boolean;
  message: string;
  points?: number;
  alreadyValidated?: boolean;
}

interface ProcessQrResponse {
  success: boolean;
  message: string;
  points?: number;
  points_awarded?: number;
  checkinId?: string;
  checkin_id?: string;
  already_validated?: boolean;
}

const CheckinModal: React.FC<CheckinModalProps> = ({
  isOpen,
  onClose,
  offerId,
  businessId,
  offerTitle
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);

  const [validationMode, setValidationMode] = useState<'select' | 'qr' | 'manual'>('select');
  const [manualCode, setManualCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [result, setResult] = useState<CheckinResult | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isDeliveryOffer, setIsDeliveryOffer] = useState(false);

  useEffect(() => {
    if (!isOpen || !offerId) return;
    let active = true;
    supabase.from('offers').select('is_delivery').eq('id', offerId).maybeSingle().then(({ data }) => {
      if (active) setIsDeliveryOffer(!!(data as any)?.is_delivery);
    });
    return () => { active = false; };
  }, [isOpen, offerId]);


  // Capturar geolocalização quando modal abre
  useEffect(() => {
    if (isOpen && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.warn('Geolocation error:', error);
          // Continue without location - backend will handle this
        },
        { enableHighAccuracy: true, maximumAge: 30000, timeout: 10000 }
      );
    }
  }, [isOpen]);

  // Limpar estado quando modal fecha
  useEffect(() => {
    if (!isOpen) {
      setValidationMode('select');
      setManualCode('');
      setResult(null);
      stopScanner();
    }
  }, [isOpen]);

  const startQRScanner = async () => {
    if (!videoRef.current) return;

    try {
      scannerRef.current = new QrScanner(
        videoRef.current,
        async (result) => {
          await handleValidation(result.data);
          stopScanner();
        },
        {
          highlightScanRegion: true,
          highlightCodeOutline: true,
          maxScansPerSecond: 5,
        }
      );
      await scannerRef.current.start();
    } catch (error) {
      console.error('Erro ao iniciar scanner:', error);
      toast({
        title: 'Erro na câmera',
        description: 'Não foi possível acessar a câmera. Tente o código manual.',
        variant: 'destructive',
      });
      setValidationMode('manual');
    }
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop();
      scannerRef.current.destroy();
      scannerRef.current = null;
    }
  };

  const handleValidation = async (qrCodeData: string) => {
    if (!user) {
      toast({
        title: 'Erro de autenticação',
        description: 'Você precisa estar logado para fazer check-in.',
        variant: 'destructive',
      });
      return;
    }

    setIsValidating(true);

    try {
      // Verificar se é código manual (6 caracteres alfanuméricos) ou QR code (JSON)
      let isManualCode = false;
      let qrData;
      
      try {
        qrData = JSON.parse(qrCodeData);
        isManualCode = false;
      } catch {
        // Se não é JSON, é um código manual
        isManualCode = true;
      }

      // Se é código manual, usar a função específica de validação
      if (isManualCode) {
        const { data, error } = await supabase.rpc('validate_manual_checkin_code', {
          p_code: qrCodeData.trim().toUpperCase(),
          p_user_id: user.id
        });

        if (error) {
          console.error('Erro na validação manual:', error);
          setResult({
            success: false,
            message: error.message || 'Código inválido ou expirado.',
          });
        } else {
          const response = data as any;
          setResult({
            success: response.success,
            message: response.message,
            points: response.points_awarded || 0,
            alreadyValidated: !!response.already_validated,
          });

          if (response.success) {
            toast({
              title: 'Check-in confirmado! 🎉',
              description: `Você ganhou +${response.points_awarded || 0} pontos.`,
              className: 'bg-green-500 text-white border-green-600',
            });

            // Disparar eventos para atualização em tempo real (carteira + pontos)
            window.dispatchEvent(new CustomEvent('checkinValidated', {
              detail: {
                offerId,
                businessId,
                pointsAwarded: response.points_awarded || 0,
              }
            }));
            window.dispatchEvent(new CustomEvent('pointsUpdated'));
          }
        }
        setIsValidating(false);
        return;
      }

      // Se é QR code, seguir com a validação normal
      if (!qrData) {
        qrData = {
          offerId,
          businessId,
          code: qrCodeData,
          timestamp: new Date().toISOString(),
          type: 'offer_checkin'
        };
      }

          // Validação de geolocalização baseada no modo da oferta
          if (userLocation) {
            // Buscar coordenadas da oferta e verificar modo delivery
            const { data: offerData } = await supabase
              .from('offers')
              .select('latitude, longitude, is_delivery')
              .eq('id', offerId)
              .single();

            let targetLat: number | null = null;
            let targetLng: number | null = null;
            let locationLabel = 'do estabelecimento';

            if (offerData?.is_delivery) {
              // Modo Delivery: buscar endereço padrão do usuário
              const { data: userAddress } = await supabase
                .from('addresses')
                .select('latitude, longitude, formatted_address')
                .eq('user_id', user.id)
                .eq('is_active', true)
                .order('is_default', { ascending: false })
                .limit(1)
                .maybeSingle();

              if (userAddress?.latitude && userAddress?.longitude) {
                targetLat = userAddress.latitude;
                targetLng = userAddress.longitude;
                locationLabel = 'do seu endereço de entrega';
              } else {
                // Sem endereço cadastrado - permitir check-in com aviso
                toast({
                  title: 'Endereço não encontrado',
                  description: 'Cadastre um endereço de entrega no seu perfil para validações mais precisas.',
                  variant: 'default',
                });
              }
            } else {
              // Modo normal: usar coordenadas da oferta/estabelecimento
              if (offerData?.latitude && offerData?.longitude) {
                targetLat = offerData.latitude;
                targetLng = offerData.longitude;
              }
            }

            // Calcular distância se temos coordenadas alvo
            if (targetLat && targetLng) {
              const distance = calculateDistanceInMeters(
                userLocation.lat,
                userLocation.lng,
                targetLat,
                targetLng
              );

              // Raio de 150m para delivery, 100m para presencial
              const allowedRadius = offerData?.is_delivery ? 150 : 100;

              // Se está muito longe, mostrar aviso mas permitir check-in
              if (distance > allowedRadius) {
                toast({
                  title: 'Atenção! 📍',
                  description: `Você está a ${Math.round(distance)}m ${locationLabel}. Continue apenas se estiver realmente no local.`,
                  variant: 'default',
                });
              }
            }
          }

      // Chamar função RPC do Supabase para validar check-in
      const { data, error } = await supabase.rpc('process_qr_validation', {
        p_business_id: qrData.businessId || businessId,
        p_offer_id: qrData.offerId || offerId,
        p_user_id: user.id,
        p_qr_code: JSON.stringify(qrData),
        p_location_lat: userLocation?.lat ?? null,
        p_location_lng: userLocation?.lng ?? null,
      });

      if (error) {
        console.error('Erro na validação:', error);
        setResult({
          success: false,
          message: error.message || 'Erro interno. Tente novamente.',
        });
      } else {
        // Cast the data to the expected type through unknown
        const response = data as unknown as ProcessQrResponse;
        setResult({
          success: response.success,
          message: response.message,
          points: response.points_awarded ?? response.points ?? 0,
          alreadyValidated: !!response.already_validated,
        });

        if (response.success) {
          toast({
            title: 'Check-in confirmado! 🎉',
            description: `Você ganhou +${response.points_awarded ?? response.points ?? 0} pontos.`,
            className: 'bg-green-500 text-white border-green-600',
          });

          // Atualizar carteira + pontos do usuário em tempo real
          window.dispatchEvent(new CustomEvent('checkinValidated', {
            detail: {
              offerId: qrData.offerId || offerId,
              businessId: qrData.businessId || businessId,
              pointsAwarded: response.points_awarded ?? response.points ?? 0,
            }
          }));
          window.dispatchEvent(new CustomEvent('pointsUpdated'));
        }
      }
    } catch (error) {
      console.error('Erro inesperado:', error);
      setResult({
        success: false,
        message: 'Não foi possível validar o check-in. Confira se está no local ou se o código é válido.',
      });
    } finally {
      setIsValidating(false);
    }
  };


  const handleManualValidation = () => {
    if (!manualCode.trim()) {
      toast({
        title: 'Código obrigatório',
        description: 'Digite o código para continuar.',
        variant: 'destructive',
      });
      return;
    }
    handleValidation(manualCode);
  };

  const resetAndTryAgain = () => {
    setResult(null);
    setManualCode('');
    setValidationMode('select');
  };

  const handleClose = () => {
    stopScanner();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md w-[95vw] sm:w-full p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Check-in - {offerTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!result ? (
            <>
              {validationMode === 'select' && (
                <div className="space-y-4">
                  {isDeliveryOffer ? (
                    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-center">
                      <p className="text-sm font-medium">Oferta em modo delivery 🛵</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Seus pontos são creditados automaticamente assim que o estabelecimento confirmar a entrega.
                        Você também pode validar por código, se preferir.
                      </p>
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground">
                      Confirme sua presença no local para validar esta oferta
                    </p>
                  )}

                  
                  <div className="grid gap-3">
                    <Button
                      onClick={() => {
                        setValidationMode('qr');
                        setTimeout(startQRScanner, 100);
                      }}
                      className="h-12 flex items-center gap-3"
                      disabled={isValidating}
                    >
                      <Camera className="w-5 h-5" />
                      Escanear QR Code
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={() => setValidationMode('manual')}
                      className="h-12 flex items-center gap-3"
                      disabled={isValidating}
                    >
                      <Hash className="w-5 h-5" />
                      Digitar Código Manual
                    </Button>
                  </div>
                </div>
              )}

              {validationMode === 'qr' && (
                <div className="space-y-4">
                  <div className="relative aspect-square bg-black rounded-lg overflow-hidden">
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      autoPlay
                      playsInline
                      muted
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-48 h-48 border-2 border-white rounded-lg animate-pulse" />
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        stopScanner();
                        setValidationMode('select');
                      }}
                      className="flex-1"
                    >
                      Voltar
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        stopScanner();
                        setValidationMode('manual');
                      }}
                      className="flex-1"
                    >
                      Código Manual
                    </Button>
                  </div>
                </div>
              )}

              {validationMode === 'manual' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Código da Oferta</label>
                    <Input
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                      placeholder="Digite o código fornecido pelo atendente"
                      disabled={isValidating}
                      className="text-center text-lg font-mono"
                    />
                    <p className="text-xs text-muted-foreground text-center">
                      Peça o código ao atendente do estabelecimento
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setValidationMode('select')}
                      className="flex-1"
                      disabled={isValidating}
                    >
                      Voltar
                    </Button>
                    <Button
                      onClick={handleManualValidation}
                      className="flex-1"
                      disabled={isValidating || !manualCode.trim()}
                    >
                      {isValidating ? 'Validando...' : 'Confirmar'}
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center space-y-4">
              {result.success ? (
                <>
                  <div className="flex justify-center animate-in zoom-in duration-300">
                    <div className="w-20 h-20 rounded-full flex items-center justify-center bg-green-500/10 border-2 border-green-500">
                      <CheckCircle className="w-10 h-10 text-green-500" />
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="text-xl font-bold text-green-600">
                      {result.alreadyValidated ? 'Check-in já confirmado!' : 'Check-in confirmado! 🎉'}
                    </h3>
                    <p className="text-muted-foreground">{result.message}</p>
                    
                    {result.points && result.points > 0 && (
                      <div className="flex items-center justify-center gap-2 animate-in fade-in duration-500">
                        <Badge variant="secondary" className="text-base px-4 py-2 bg-green-500/10 text-green-600 border border-green-500/20">
                          <Trophy className="w-4 h-4 mr-2" />
                          +{result.points} pontos conquistados
                        </Badge>
                      </div>
                    )}
                    
                    <div className="mt-4 p-4 bg-green-500/10 rounded-lg border-2 border-green-500/30 animate-in slide-in-from-bottom duration-500">
                      <p className="text-sm text-green-600 text-center font-medium leading-relaxed">
                        ✓ Check-in registrado no sistema<br/>
                        ✓ Pontuação preservada sem duplicidade<br/>
                        ✓ Continue acumulando para trocar por prêmios!
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="outline"
                      onClick={handleClose}
                      className="flex-1"
                    >
                      Fechar
                    </Button>
                    <Button 
                      onClick={() => {
                        handleClose();
                        window.location.href = '/pontos';
                      }} 
                      className="flex-1"
                    >
                      Ver Pontos
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-center">
                    <div className="w-20 h-20 rounded-full flex items-center justify-center bg-destructive/10 border-2 border-destructive">
                      <AlertCircle className="w-10 h-10 text-destructive" />
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="text-xl font-bold text-destructive">
                      Check-in não validado ❌
                    </h3>
                    <p className="text-muted-foreground text-center">{result.message}</p>
                    
                    <div className="mt-4 p-4 bg-destructive/10 rounded-lg border border-destructive/30">
                      <p className="text-sm text-destructive text-center leading-relaxed">
                        Possíveis motivos:<br/>
                        • Código inválido, expirado ou já utilizado<br/>
                        • QR Code não corresponde a esta oferta<br/>
                        • Check-in já realizado hoje
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      onClick={handleClose}
                      className="flex-1"
                    >
                      Fechar
                    </Button>
                    <Button
                      onClick={resetAndTryAgain}
                      className="flex-1"
                    >
                      Tentar novamente
                    </Button>
                  </div>
                 </>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CheckinModal;
