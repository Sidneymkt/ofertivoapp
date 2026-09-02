import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { syncBusinessProfileUpdate } from '@/lib/businessProfileSync';

interface BusinessLogoUploadProps {
  businessId: string;
  currentLogoUrl?: string | null;
  onLogoChange: (url: string) => void;
  disabled?: boolean;
  showSizeHint?: boolean;
}

export const BusinessLogoUpload: React.FC<BusinessLogoUploadProps> = ({
  businessId,
  currentLogoUrl,
  onLogoChange,
  disabled = false,
  showSizeHint = false
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadLogo = async (file: File) => {
    if (!user) return;

    setUploading(true);
    try {
      // Ensure we have a valid session (do not force refresh — it can fail transiently)
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Sessão expirada. Por favor, faça login novamente.');
        setUploading(false);
        window.location.href = '/login';
        return;
      }


      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Apenas imagens são permitidas');
      }

      // No file size limit - any size is accepted

      const { compressForLogo } = await import('@/lib/imageCompression');
      const compressed = await compressForLogo(file);
      const fileExt = compressed.name.split('.').pop();
      const fileName = `${user.id}/logo.${fileExt}`;

      // Delete old logo if exists
      if (currentLogoUrl) {
        const oldPath = (() => {
          try {
            const pathname = new URL(currentLogoUrl).pathname;
            return pathname.split('/business-logos/')[1];
          } catch {
            return currentLogoUrl.split('/business-logos/')[1]?.split('?')[0];
          }
        })();
        if (oldPath && oldPath !== fileName) {
          await supabase.storage
            .from('business-logos')
            .remove([oldPath]);
        }
      }

      // Upload new logo
      const { error: uploadError } = await supabase.storage
        .from('business-logos')
        .upload(fileName, compressed, {
          upsert: true,
          contentType: compressed.type,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage
        .from('business-logos')
        .getPublicUrl(fileName);

      const logoUrl = `${data.publicUrl}?t=${Date.now()}`;

      // Update business with new logo URL
      const { data: updatedBusiness, error: updateError } = await supabase
        .from('businesses')
        .update({ logo_url: logoUrl })
        .eq('id', businessId)
        .eq('owner_id', user.id)
        .select('id, logo_url')
        .single();

      if (updateError) throw updateError;

      onLogoChange(updatedBusiness?.logo_url || logoUrl);
      setPreviewUrl(null);
      syncBusinessProfileUpdate({ queryClient, businessId, ownerId: user.id });
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      alert(error.message || 'Erro ao fazer upload do logo');
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = () => {
    const file = fileInputRef.current?.files?.[0];
    if (file) {
      uploadLogo(file);
    }
  };

  const handleCancel = () => {
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const displayUrl = previewUrl || currentLogoUrl;

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <div className="w-32 h-32 border-2 border-dashed border-border rounded-lg flex items-center justify-center overflow-hidden bg-muted/50 relative z-0">
        {displayUrl ? (
          <img 
            src={displayUrl} 
            alt="Logo do negócio" 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-center">
            <Building2 className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Logo da empresa</p>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />

      {previewUrl && (
        <div className="flex gap-2 w-full justify-center px-4 relative z-20 mt-2">
          <Button
            size="sm"
            onClick={handleUpload}
            disabled={uploading}
            className="bg-green-600 hover:bg-green-700 text-white flex-1 sm:flex-initial min-w-[100px] max-w-[140px]"
          >
            {uploading ? (
              <>
                <Upload className="w-4 h-4 sm:mr-2 animate-spin" />
                <span className="hidden sm:inline">Enviando...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 sm:mr-2" />
                <span className="sm:inline">Salvar</span>
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCancel}
            disabled={uploading}
            className="flex-1 sm:flex-initial min-w-[100px] max-w-[140px] border-2"
          >
            <X className="w-4 h-4 sm:mr-2" />
            <span className="sm:inline">Cancelar</span>
          </Button>
        </div>
      )}

      {!previewUrl && !disabled && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <Upload className="w-4 h-4 mr-2" />
          {currentLogoUrl ? 'Alterar Logo' : 'Adicionar Logo'}
        </Button>
      )}

      {/* Recommended size hint - only show in edit mode */}
      {showSizeHint && (
        <p className="text-xs text-muted-foreground text-center">
          📐 Tamanho recomendado: 512 x 512 pixels (quadrado)
        </p>
      )}
    </div>
  );
};