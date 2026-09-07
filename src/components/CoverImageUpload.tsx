import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Upload, X, Image as ImageIcon, Crop, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import ReactCrop, { Crop as CropType, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useQueryClient } from '@tanstack/react-query';
import { syncBusinessProfileUpdate } from '@/lib/businessProfileSync';
import { useStorageImageUrl } from '@/hooks/useStorageImageUrl';
import { removeStorageImage } from '@/lib/storageImages';

interface CoverImageUploadProps {
  currentCoverUrl?: string | null;
  onCoverChange: (url: string) => void;
  entityType: 'user' | 'business';
  entityId?: string;
  disabled?: boolean;
  className?: string;
  showSizeHint?: boolean;
}

export const CoverImageUpload: React.FC<CoverImageUploadProps> = ({
  currentCoverUrl,
  onCoverChange,
  entityType,
  entityId,
  disabled = false,
  className,
  showSizeHint = false
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState<CropType>({
    unit: '%',
    width: 100,
    height: 100,
    x: 0,
    y: 0
  });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { url: displayedCoverUrl, isLoading: coverLoading, handleError: handleCoverError } = useStorageImageUrl(currentCoverUrl);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    
    // Define crop inicial para cobrir toda a imagem com proporção 16:9 ou similar
    const aspectRatio = 16 / 9;
    const imageAspectRatio = width / height;
    
    let cropWidth = 100;
    let cropHeight = 100;
    let x = 0;
    let y = 0;

    if (imageAspectRatio > aspectRatio) {
      // Imagem mais larga
      cropWidth = (height * aspectRatio / width) * 100;
      x = (100 - cropWidth) / 2;
    } else {
      // Imagem mais alta
      cropHeight = (width / aspectRatio / height) * 100;
      y = (100 - cropHeight) / 2;
    }

    setCrop({
      unit: '%',
      width: cropWidth,
      height: cropHeight,
      x,
      y
    });
  }, []);

  const getCroppedImg = useCallback(
    async (image: HTMLImageElement, crop: PixelCrop): Promise<Blob> => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('No 2d context');
      }

      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;

      // Define tamanho otimizado para capa (1920x1080 max)
      const maxWidth = 1920;
      const maxHeight = 1080;
      
      let outputWidth = crop.width * scaleX;
      let outputHeight = crop.height * scaleY;

      // Redimensiona se necessário mantendo proporção
      if (outputWidth > maxWidth || outputHeight > maxHeight) {
        const ratio = Math.min(maxWidth / outputWidth, maxHeight / outputHeight);
        outputWidth *= ratio;
        outputHeight *= ratio;
      }

      canvas.width = outputWidth;
      canvas.height = outputHeight;

      ctx.imageSmoothingQuality = 'high';

      ctx.drawImage(
        image,
        crop.x * scaleX,
        crop.y * scaleY,
        crop.width * scaleX,
        crop.height * scaleY,
        0,
        0,
        outputWidth,
        outputHeight
      );

      return new Promise((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Canvas is empty'));
              return;
            }
            resolve(blob);
          },
          'image/jpeg',
          0.90
        );
      });
    },
    []
  );

  const uploadCover = async (croppedBlob: Blob) => {
    if (!user) return;

    setUploading(true);
    try {
      // Ensure we have a valid session without forcing refresh, which can fail transiently
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('[CoverUpload] Session error:', sessionError);
        toast({
          title: 'Sessão expirada',
          description: 'Por favor, faça login novamente.',
          variant: 'destructive',
        });
        setUploading(false);
        setShowCropDialog(false);
        window.location.href = '/login';
        return;
      }

      const fileExt = 'jpg';
      const fileName = `${user.id}/cover-${Date.now()}.${fileExt}`;
      const bucketName = entityType === 'business' ? 'business-covers' : 'user-covers';

      console.log('[CoverUpload] Starting upload:', { bucketName, fileName, entityType, entityId });

      // Upload new cover
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(fileName, croppedBlob, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (uploadError) {
        console.error('[CoverUpload] Upload error:', uploadError);
        throw uploadError;
      }

      console.log('[CoverUpload] Upload successful, getting public URL...');

      // Get public URL with cache busting
      const { data } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);

      const coverUrl = data.publicUrl;
      console.log('[CoverUpload] New cover URL:', coverUrl);

      // Update profile or business with new cover URL
      if (entityType === 'business' && entityId) {
        console.log('[CoverUpload] Updating business cover_image_url...');
        const { error: updateError } = await supabase
          .from('businesses')
          .update({ cover_image_url: coverUrl } as any)
          .eq('id', entityId)
          .eq('owner_id', user.id)
          .select('id, cover_image_url')
          .single();
        
        if (updateError) {
          console.error('[CoverUpload] Business update error:', updateError);
          throw updateError;
        }
        
      } else {
        console.log('[CoverUpload] Updating user profile cover_image_url...');
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ cover_image_url: coverUrl } as any)
          .eq('user_id', user.id);
        
        if (updateError) {
          console.error('[CoverUpload] Profile update error:', updateError);
          throw updateError;
        }
        
        // Verify update
        const { data: verifyData } = await supabase
          .from('profiles')
          .select('cover_image_url')
          .eq('user_id', user.id)
          .single();
        console.log('[CoverUpload] Profile cover verified:', verifyData);
      }

      if (currentCoverUrl && !currentCoverUrl.includes(`/${fileName}`)) {
        await removeStorageImage(currentCoverUrl);
      }

      console.log('[CoverUpload] Calling onCoverChange with URL:', coverUrl);
      // Update parent component immediately
      onCoverChange(coverUrl);

      // Invalidate React Query cache to force refresh public profiles
      if (entityType === 'business' && entityId) {
        console.log('[CoverUpload] Invalidating business profile cache');
        syncBusinessProfileUpdate({ queryClient, businessId: entityId, ownerId: user.id });
      } else {
        console.log('[CoverUpload] Invalidating user profile cache');
        queryClient.invalidateQueries({ queryKey: ['public-user-profile', user.id] });
        window.dispatchEvent(new CustomEvent('user-profile-updated'));
      }

      toast({
        title: 'Capa atualizada! ✓',
        description: 'Sua imagem de capa foi salva com sucesso.',
        duration: 3000
      });
    } catch (error: any) {
      console.error('[CoverUpload] Error uploading cover:', error);
      toast({
        title: 'Erro no upload',
        description: error.message || 'Erro ao fazer upload da capa',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      setShowCropDialog(false);
      setImageToCrop(null);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Arquivo inválido',
        description: 'Apenas imagens são permitidas',
        variant: 'destructive',
      });
      return;
    }

    // No file size limit - any size is accepted

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageToCrop(e.target?.result as string);
      setShowCropDialog(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropConfirm = async () => {
    if (!imgRef.current || !completedCrop || !selectedFile) return;

    try {
      const croppedBlob = await getCroppedImg(imgRef.current, completedCrop);
      await uploadCover(croppedBlob);
    } catch (error) {
      console.error('Error processing image:', error);
      toast({
        title: 'Erro ao processar',
        description: 'Erro ao processar a imagem',
        variant: 'destructive',
      });
    }
  };

  const handleCropCancel = () => {
    setShowCropDialog(false);
    setImageToCrop(null);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <div className={cn("relative", className)}>
        {/* Cover Image Display */}
        <div className="relative w-full h-48 sm:h-64 lg:h-80 overflow-hidden rounded-lg bg-gradient-to-br from-primary/10 to-accent/10">
          {displayedCoverUrl ? (
            <img
              key={displayedCoverUrl}
              src={displayedCoverUrl}
              alt="Imagem de capa"
              className="w-full h-full object-cover"
              onError={handleCoverError}
            />
          ) : (
            <div className={cn("w-full h-full flex items-center justify-center", coverLoading && "animate-pulse")}>
              <ImageIcon className="w-16 h-16 text-muted-foreground/30" />
            </div>
          )}
          
          {/* Overlay button - visible on hover (desktop) */}
          {!disabled && (
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity duration-200 hidden sm:flex items-center justify-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="shadow-lg"
              >
                <Camera className="w-4 h-4 mr-2" />
                {currentCoverUrl ? 'Alterar Capa' : 'Adicionar Capa'}
              </Button>
            </div>
          )}

          {/* Always-visible button on mobile - positioned top-right to avoid logo overlap */}
          {!disabled && (
            <div className="absolute top-2 right-2 z-30 sm:hidden">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="shadow-lg bg-background/80 backdrop-blur-sm"
              >
                <Camera className="w-4 h-4 mr-1" />
                {currentCoverUrl ? 'Alterar Capa' : 'Adicionar Capa'}
              </Button>
            </div>
          )}
          
          {/* Recommended size hint - only show in edit mode */}
          {showSizeHint && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              📐 Tamanho recomendado: 1920 x 1080 pixels (proporção 16:9)
            </p>
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
      </div>

      {/* Crop Dialog */}
      <Dialog open={showCropDialog} onOpenChange={setShowCropDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crop className="w-5 h-5" />
              Ajustar Imagem de Capa
            </DialogTitle>
            <p className="sr-only">Ajuste a área de seleção para escolher a parte da imagem desejada</p>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Arraste e redimensione a área de seleção para escolher a parte da imagem que deseja usar como capa.
            </p>
            
            <div className="flex justify-center">
              {imageToCrop && (
                <ReactCrop
                  crop={crop}
                  onChange={(c) => setCrop(c)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={16 / 9}
                  className="max-w-full"
                >
                  <img
                    ref={imgRef}
                    src={imageToCrop}
                    alt="Imagem para recortar"
                    onLoad={onImageLoad}
                    className="max-w-full h-auto"
                  />
                </ReactCrop>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={handleCropCancel}
              disabled={uploading}
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button
              onClick={handleCropConfirm}
              disabled={uploading || !completedCrop}
              className="bg-gradient-primary"
            >
              {uploading ? (
                <>
                  <Upload className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Salvar Capa
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
