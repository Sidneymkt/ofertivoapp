import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Camera } from 'lucide-react';
import { Button } from './ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface CommunityImageUploadProps {
  onImageUploaded: (url: string) => void;
  currentImageUrl?: string;
}

export const CommunityImageUpload = ({ onImageUploaded, currentImageUrl }: CommunityImageUploadProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validar tipo de arquivo
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: 'Formato inválido',
        description: 'Use apenas JPG, PNG, WEBP ou GIF',
        variant: 'destructive'
      });
      return;
    }

    // Validar tamanho (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: 'O tamanho máximo é 5MB',
        variant: 'destructive'
      });
      return;
    }

    setUploading(true);
    try {
      // Compress before upload
      const { compressForCommunity } = await import('@/lib/imageCompression');
      const compressed = await compressForCommunity(file);

      // Criar preview local
      const objectUrl = URL.createObjectURL(compressed);
      setPreviewUrl(objectUrl);

      // Gerar nome único para o arquivo
      const fileExt = compressed.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // Upload para o Supabase Storage
      const { error: uploadError, data } = await supabase.storage
        .from('community-posts')
        .upload(filePath, compressed, {
          cacheControl: '3600',
          upsert: false,
          contentType: compressed.type,
        });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('community-posts')
        .getPublicUrl(filePath);

      onImageUploaded(publicUrl);
      
      toast({
        title: '✅ Imagem carregada!',
        description: 'Sua imagem foi carregada com sucesso',
      });
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Erro ao enviar imagem',
        description: error.message,
        variant: 'destructive'
      });
      setPreviewUrl(null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setPreviewUrl(null);
    onImageUploaded('');
  };

  return (
    <div className="space-y-3">
      {previewUrl ? (
        <div className="relative rounded-lg overflow-hidden border border-border">
          <img 
            src={previewUrl} 
            alt="Preview" 
            className="w-full h-48 object-cover"
          />
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="absolute top-2 right-2"
            onClick={handleRemoveImage}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Input escondido para câmera */}
          <input
            ref={cameraInputRef}
            type="file"
            className="hidden"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            disabled={uploading}
          />
          
          {/* Input escondido para galeria */}
          <input
            ref={galleryInputRef}
            type="file"
            className="hidden"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFileSelect}
            disabled={uploading}
          />

          {uploading ? (
            <div className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg">
              <Upload className="w-8 h-8 animate-pulse text-muted-foreground" />
              <p className="text-sm text-muted-foreground mt-2">Enviando...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                className="h-32 flex flex-col gap-2"
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera className="w-8 h-8" />
                <span className="text-sm">Tirar Foto</span>
              </Button>
              
              <Button
                type="button"
                variant="outline"
                className="h-32 flex flex-col gap-2"
                onClick={() => galleryInputRef.current?.click()}
              >
                <ImageIcon className="w-8 h-8" />
                <span className="text-sm">Escolher da Galeria</span>
              </Button>
            </div>
          )}
          
          <p className="text-xs text-center text-muted-foreground">
            JPG, PNG, WEBP ou GIF (máx. 5MB)
          </p>
        </div>
      )}
    </div>
  );
};
