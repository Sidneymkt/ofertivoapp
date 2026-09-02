import { useState } from 'react';
import { Plus, Upload, X, Youtube } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useCrowdfunding } from '@/hooks/useCrowdfunding';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './ui/use-toast';

interface CreateCampaignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const CreateCampaignModal = ({
  open,
  onOpenChange,
  onSuccess
}: CreateCampaignModalProps) => {
  const { createCampaign, loading } = useCrowdfunding();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    goal_points: '',
    category: 'community' as 'community' | 'business' | 'charity' | 'event' | 'other',
    end_date: '',
    image_url: '',
    video_url: ''
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Erro',
        description: 'Imagem muito grande. Máximo 5MB.',
        variant: 'destructive'
      });
      return;
    }

    setUploading(true);
    try {
      // Buscar ID do usuário autenticado
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('campaign-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('campaign-images')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, image_url: publicUrl }));
      
      toast({
        title: 'Imagem enviada!',
        description: 'Sua imagem foi carregada com sucesso.',
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Erro ao fazer upload',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.description || !formData.goal_points || !formData.end_date) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha todos os campos obrigatórios',
        variant: 'destructive'
      });
      return;
    }

    const goalPoints = parseInt(formData.goal_points);
    if (isNaN(goalPoints) || goalPoints < 100) {
      toast({
        title: 'Meta inválida',
        description: 'A meta deve ser no mínimo 100 pontos',
        variant: 'destructive'
      });
      return;
    }

    const endDate = new Date(formData.end_date);
    if (endDate <= new Date()) {
      toast({
        title: 'Data inválida',
        description: 'A data de término deve ser futura',
        variant: 'destructive'
      });
      return;
    }

    const success = await createCampaign({
      ...formData,
      goal_points: goalPoints
    });

    if (success) {
      setFormData({
        title: '',
        description: '',
        goal_points: '',
        category: 'community',
        end_date: '',
        image_url: '',
        video_url: ''
      });
      onSuccess?.();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>🎯 Criar Nova Vaquinha</DialogTitle>
          <DialogDescription>
            Crie uma campanha para arrecadar pontos da comunidade
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Imagem */}
          <div className="space-y-2">
            <Label>Imagem da campanha</Label>
            {formData.image_url ? (
              <div className="relative">
                <img
                  src={formData.image_url}
                  alt="Preview"
                  className="w-full h-48 object-cover rounded-lg"
                />
                <Button
                  size="sm"
                  variant="destructive"
                  className="absolute top-2 right-2"
                  onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-2">
                  Clique para fazer upload da imagem
                </p>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading}
                  className="max-w-xs mx-auto"
                />
              </div>
            )}
          </div>

          {/* Título */}
          <div className="space-y-2">
            <Label htmlFor="title">Título da campanha *</Label>
            <Input
              id="title"
              placeholder="Ex: Ajude a reforma do espaço comunitário"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              maxLength={100}
            />
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição *</Label>
            <Textarea
              id="description"
              placeholder="Descreva sua causa, como os pontos serão usados e por que as pessoas devem apoiar..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              {formData.description.length}/500 caracteres
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Categoria */}
            <div className="space-y-2">
              <Label htmlFor="category">Categoria *</Label>
              <Select
                value={formData.category}
                onValueChange={(value: any) => setFormData(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="community">Comunidade</SelectItem>
                  <SelectItem value="business">Negócio</SelectItem>
                  <SelectItem value="charity">Caridade</SelectItem>
                  <SelectItem value="event">Evento</SelectItem>
                  <SelectItem value="other">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Meta de pontos */}
            <div className="space-y-2">
              <Label htmlFor="goal">Meta de pontos *</Label>
              <Input
                id="goal"
                type="number"
                placeholder="Ex: 5000"
                value={formData.goal_points}
                onChange={(e) => setFormData(prev => ({ ...prev, goal_points: e.target.value }))}
                min="100"
              />
              {formData.goal_points && parseInt(formData.goal_points) >= 100 && (
                <p className="text-sm font-semibold text-primary mt-2">
                  Valor: {(parseInt(formData.goal_points) * 0.01).toLocaleString('pt-BR', { 
                    style: 'currency', 
                    currency: 'BRL' 
                  })}
                </p>
              )}
            </div>
          </div>

          {/* Data de término */}
          <div className="space-y-2">
            <Label htmlFor="end_date">Data de término *</Label>
            <Input
              id="end_date"
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          {/* Vídeo do YouTube */}
          <div className="space-y-2">
            <Label htmlFor="video_url" className="flex items-center gap-2">
              <Youtube className="w-4 h-4 text-red-500" />
              Vídeo do YouTube (opcional)
            </Label>
            <Input
              id="video_url"
              placeholder="Ex: https://www.youtube.com/watch?v=..."
              value={formData.video_url}
              onChange={(e) => setFormData(prev => ({ ...prev, video_url: e.target.value }))}
            />
            {formData.video_url && (() => {
              const match = formData.video_url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
              const videoId = match?.[1];
              return videoId ? (
                <div className="rounded-lg overflow-hidden border border-border aspect-video">
                  <iframe
                    src={`https://www.youtube.com/embed/${videoId}`}
                    className="w-full h-full"
                    allowFullScreen
                    title="Preview do vídeo"
                  />
                </div>
              ) : (
                <p className="text-xs text-destructive">URL do YouTube inválida</p>
              );
            })()}
          </div>

          {/* Preview da meta */}
          {formData.goal_points && (
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
              <p className="text-sm">
                <span className="font-semibold">Meta:</span> {parseInt(formData.goal_points).toLocaleString('pt-BR')} pontos
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Você está criando uma campanha para arrecadar {formData.goal_points} pontos da comunidade
              </p>
            </div>
          )}

          {/* Botões */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={loading || uploading}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={loading || uploading}
            >
              {loading ? 'Criando...' : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Vaquinha
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
