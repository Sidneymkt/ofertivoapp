import { useCallback, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/hooks/useBusiness';

export interface QRCodeScannedData {
  offerId?: string;
  businessId?: string;
  userId?: string;
  timestamp?: string;
  type?: 'offer_checkin' | 'offer_redeem' | string;
  [key: string]: any;
}

export interface ValidationResult {
  success: boolean;
  message: string;
  points_awarded?: number;
  checkin_id?: string;
  raw?: any;
}

export const useCheckinValidation = () => {
  const { businessId, loading: loadingBusiness } = useBusiness();
  const [isValidating, setIsValidating] = useState(false);

  const canValidate = useMemo(() => !!businessId && !loadingBusiness, [businessId, loadingBusiness]);

  const validate = useCallback(
    async ({
      qrData,
      fallbackUserId,
      location,
    }: {
      qrData: QRCodeScannedData | string;
      fallbackUserId?: string | null;
      location?: { lat?: number | null; lng?: number | null };
    }): Promise<ValidationResult> => {
      if (!businessId) {
        return { success: false, message: 'Negócio não encontrado para o usuário atual.' };
      }

      let parsed: QRCodeScannedData | null = null;

      if (typeof qrData === 'string') {
        try {
          parsed = JSON.parse(qrData);
        } catch (e) {
          return { success: false, message: 'Conteúdo do QR inválido (não é um JSON válido).' };
        }
      } else {
        parsed = qrData;
      }

      if (!parsed || !parsed.offerId || !parsed.businessId) {
        return { success: false, message: 'QR Code sem dados suficientes (offerId/businessId ausentes).' };
      }

      if (parsed.businessId !== businessId) {
        return { success: false, message: 'Este QR Code pertence a outro negócio.' };
      }

      const userId = parsed.userId || fallbackUserId;
      if (!userId) {
        return { success: false, message: 'ID do usuário não informado. Escaneie um QR com userId ou preencha manualmente.' };
      }

      setIsValidating(true);
      try {
        const { data, error } = await supabase.rpc('validate_checkin', {
          p_business_id: businessId,
          p_offer_id: parsed.offerId,
          p_user_id: userId,
          p_qr_code: JSON.stringify(parsed),
          p_location_lat: location?.lat ?? null,
          p_location_lng: location?.lng ?? null,
        });

        if (error) {
          console.error('[useCheckinValidation] validate_checkin error:', error);
          return { success: false, message: error.message || 'Erro ao validar check-in', raw: error };
        }

        const result = data as Record<string, any> | null;

        if (result && typeof result === 'object' && result.success) {
          // Disparar evento para atualização em tempo real
          window.dispatchEvent(new CustomEvent('checkinValidated', { 
            detail: { 
              checkinId: result.checkin_id,
              pointsAwarded: result.points_awarded,
              userId,
              offerId: parsed.offerId
            } 
          }));
          
          return {
            success: true,
            message: result.message ?? 'Check-in validado com sucesso!',
            points_awarded: result.points_awarded,
            checkin_id: result.checkin_id,
            raw: result,
          };
        }

        return {
          success: false,
          message: result?.message ?? 'Não foi possível validar o check-in',
          raw: result,
        };
      } finally {
        setIsValidating(false);
      }
    },
    [businessId]
  );

  return {
    canValidate,
    isValidating,
    validate,
    businessId,
  };
};
