import QRCode from 'qrcode'
import QrScanner from 'qr-scanner'
import { supabase } from './supabase'

export interface QRCodeData {
  offerId: string
  businessId: string
  timestamp: string
  type: 'offer_checkin' | 'offer_redeem'
}

export class QRCodeService {
  async generateOfferQR(offerId: string, businessId: string, type: 'offer_checkin' | 'offer_redeem' = 'offer_checkin'): Promise<string> {
    const qrData: QRCodeData = {
      offerId,
      businessId,
      timestamp: new Date().toISOString(),
      type
    }

    try {
      const qrString = await QRCode.toDataURL(JSON.stringify(qrData), {
        width: 300,
        margin: 2,
        color: {
          dark: '#2D5A27', // Ofertivo green
          light: '#FFFFFF'
        }
      })

      // Save QR code to database
      await this.saveQRToDatabase(qrData, qrString)

      return qrString
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error)
      throw new Error('Não foi possível gerar o QR Code')
    }
  }

  async scanQRCode(videoElement: HTMLVideoElement): Promise<QRCodeData> {
    try {
      return new Promise((resolve, reject) => {
        const qrScanner = new QrScanner(
          videoElement,
          (result) => {
            try {
              const data = JSON.parse(result.data) as QRCodeData
              qrScanner.stop()
              qrScanner.destroy()
              resolve(data)
            } catch (error) {
              reject(new Error('QR Code inválido'))
            }
          },
          {
            highlightScanRegion: true,
            highlightCodeOutline: true,
          }
        )

        qrScanner.start().catch((error) => {
          reject(new Error('Não foi possível iniciar a câmera'))
        })

        // Timeout after 30 seconds
        setTimeout(() => {
          qrScanner.stop()
          qrScanner.destroy()
          reject(new Error('Timeout na leitura do QR Code'))
        }, 30000)
      })
    } catch (error) {
      console.error('Erro ao escanear QR Code:', error)
      throw new Error('Não foi possível escanear o QR Code')
    }
  }

  async processCheckin(qrData: QRCodeData, userId: string): Promise<{ success: boolean; points: number; message: string }> {
    try {
      // Verify QR code exists and is not used
      const { data: qrRecord, error: qrError } = await supabase
        .from('qr_codes')
        .select('*')
        .eq('offer_id', qrData.offerId)
        .eq('business_id', qrData.businessId)
        .eq('is_used', false)
        .single()

      if (qrError || !qrRecord) {
        return {
          success: false,
          points: 0,
          message: 'QR Code inválido ou já utilizado'
        }
      }

      // Mark QR as used
      await supabase
        .from('qr_codes')
        .update({
          is_used: true,
          used_by: userId,
          used_at: new Date().toISOString()
        })
        .eq('id', qrRecord.id)

      // Award points to user (apenas consumidores)
      const pointsAwarded = 50 // Default checkin points
      
      const { data: qrProfile } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('user_id', userId)
        .single()

      if (qrProfile?.user_type !== 'business') {
        await supabase
          .from('user_points')
          .insert({
            user_id: userId,
            points_earned: pointsAwarded,
            action_type: 'checkin',
            offer_id: qrData.offerId,
            business_id: qrData.businessId,
            description: `Check-in realizado via QR Code`
          })

        await supabase.rpc('update_user_points', {
          user_id: userId,
          points_to_add: pointsAwarded
        })
      }

      return {
        success: true,
        points: pointsAwarded,
        message: 'Check-in realizado com sucesso!'
      }
    } catch (error) {
      console.error('Erro ao processar check-in:', error)
      return {
        success: false,
        points: 0,
        message: 'Erro ao processar check-in'
      }
    }
  }

  private async saveQRToDatabase(qrData: QRCodeData, qrString: string): Promise<void> {
    try {
      await supabase
        .from('qr_codes')
        .insert({
          offer_id: qrData.offerId,
          business_id: qrData.businessId,
          code: JSON.stringify(qrData),
          is_used: false,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours from now
        })
    } catch (error) {
      console.error('Erro ao salvar QR Code no banco:', error)
    }
  }

  async validateQRCode(qrDataString: string): Promise<boolean> {
    try {
      const qrData = JSON.parse(qrDataString) as QRCodeData
      
      // Check if QR code exists in database and is not expired
      const { data, error } = await supabase
        .from('qr_codes')
        .select('*')
        .eq('offer_id', qrData.offerId)
        .eq('business_id', qrData.businessId)
        .eq('is_used', false)
        .single()

      if (error || !data) {
        return false
      }

      // Check if QR code is not older than 24 hours
      const createdAt = new Date(data.created_at)
      const now = new Date()
      const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)

      return hoursDiff <= 24
    } catch (error) {
      console.error('Erro ao validar QR Code:', error)
      return false
    }
  }
}

export const qrCodeService = new QRCodeService()