
import React, { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Upload, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useStorageImageUrl } from '@/hooks/useStorageImageUrl';
import { removeStorageImage } from '@/lib/storageImages';

interface AvatarUploadProps {
  currentAvatarUrl?: string | null;
  onAvatarChange: (url: string) => void;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  showSizeHint?: boolean;
}

export const AvatarUpload: React.FC<AvatarUploadProps> = ({
  currentAvatarUrl,
  onAvatarChange,
  size = 'md',
  disabled = false,
  showSizeHint = false
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { url: storedAvatarUrl, handleError } = useStorageImageUrl(currentAvatarUrl);

  useEffect(() => () => {
    if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32'
  };

  const uploadAvatar = async (file: File) => {
    if (!user) return;

    setUploading(true);
    try {
      // Ensure we have a valid session (do not force refresh — it can fail transiently)
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: 'Sessão expirada',
          description: 'Por favor, faça login novamente.',
          variant: 'destructive',
        });
        setUploading(false);
        window.location.href = '/login';
        return;
      }


      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Apenas imagens são permitidas');
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('A imagem deve ter no máximo 5MB');
      }

      // Compress before upload (resize + re-encode JPEG)
      const { compressForAvatar } = await import('@/lib/imageCompression');
      const compressed = await compressForAvatar(file);

      const fileExt = compressed.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, compressed, {
          upsert: true,
          contentType: compressed.type,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const avatarUrl = data.publicUrl;

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      if (currentAvatarUrl && !currentAvatarUrl.includes(`/${fileName}`)) {
        await removeStorageImage(currentAvatarUrl);
      }

      onAvatarChange(avatarUrl);
      setPreviewUrl(null);
      // Notify header/other components to refresh avatar automatically
      window.dispatchEvent(new CustomEvent('user-profile-updated'));


      toast({
        title: 'Avatar atualizado',
        description: 'Sua foto foi atualizada com sucesso.'
      });
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast({
        title: 'Erro no upload',
        description: error.message || 'Erro ao fazer upload do avatar',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({ title: 'Arquivo inválido', description: 'Escolha uma imagem.', variant: 'destructive' });
        event.target.value = '';
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: 'Imagem muito grande', description: 'Escolha uma imagem de até 5 MB.', variant: 'destructive' });
        event.target.value = '';
        return;
      }
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUpload = () => {
    const file = fileInputRef.current?.files?.[0];
    if (file) {
      uploadAvatar(file);
    }
  };

  const handleCancel = () => {
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const displayUrl = previewUrl || storedAvatarUrl;

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <div className="relative z-0">
        <Avatar className={sizeClasses[size]}>
          <AvatarImage src={displayUrl || undefined} onError={handleError} />
          <AvatarFallback className="text-2xl bg-gradient-primary text-white">
            {user?.email?.charAt(0)?.toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        
        {!disabled && !previewUrl && (
          <Button
            size="sm"
            variant="secondary"
            className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0 z-10"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Camera className="w-4 h-4" />
          </Button>
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
          <Camera className="w-4 h-4 mr-2" />
          Alterar Foto
        </Button>
      )}

      {/* Recommended size hint - only show in edit mode */}
      {showSizeHint && (
        <p className="text-xs text-muted-foreground text-center">
          📐 Tamanho recomendado: 400 x 400 pixels (quadrado)
        </p>
      )}
    </div>
  );
};
