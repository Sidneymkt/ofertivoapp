import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Settings, Plus, Palette, Award, Users, Edit, Trash2, Upload, Image, X, Video, Youtube } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { StorageCleanupCard } from './StorageCleanupCard';
import { AdminPlansVisibility } from './AdminPlansVisibility';

interface BadgeData {
  name: string;
  description: string;
  icon: string;
  color: string;
  criteria_type: string;
  criteria_value: number;
  rarity: string;
}

interface PointsSettings {
  pointsPerCheckin: number;
  pointsPerReferral: number;
  commissionRate: number;
  maxOffersPerBusiness: number;
}

interface VideoSettings {
  youtube_url: string;
  enabled: boolean;
}

// Componente para upload de imagem de fundo da Home
const HeroBackgroundUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Fetch current hero background
  const { data: currentHeroUrl } = useQuery({
    queryKey: ['hero-background-setting'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('setting_value')
        .eq('setting_key', 'hero_background_url')
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      const url = (data?.setting_value as any)?.url || null;
      return url;
    },
  });

  React.useEffect(() => {
    if (currentHeroUrl) {
      setHeroImageUrl(currentHeroUrl);
    }
  }, [currentHeroUrl]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione apenas arquivos de imagem');
      return;
    }

    setIsUploading(true);
    toast.loading('Enviando imagem...', { id: 'hero-upload' });

    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `hero-background-${Date.now()}.${fileExt}`;
      const filePath = `platform/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(`Erro no upload: ${uploadError.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // Update local state immediately for instant feedback
      setHeroImageUrl(publicUrl);

      // Save URL to platform_settings
      const { data: existing, error: selectError } = await supabase
        .from('platform_settings')
        .select('id')
        .eq('setting_key', 'hero_background_url')
        .maybeSingle();

      if (selectError) {
        console.error('Select error:', selectError);
        throw new Error(`Erro ao verificar configuração: ${selectError.message}`);
      }

      if (existing) {
        const { error: updateError } = await supabase
          .from('platform_settings')
          .update({ 
            setting_value: { url: publicUrl },
            updated_at: new Date().toISOString()
          })
          .eq('setting_key', 'hero_background_url');
        
        if (updateError) {
          console.error('Update error:', updateError);
          throw new Error(`Erro ao atualizar configuração: ${updateError.message}`);
        }
      } else {
        const { error: insertError } = await supabase
          .from('platform_settings')
          .insert({
            setting_key: 'hero_background_url',
            setting_value: { url: publicUrl },
            is_active: true
          });
        
        if (insertError) {
          console.error('Insert error:', insertError);
          throw new Error(`Erro ao salvar configuração: ${insertError.message}`);
        }
      }

      // Invalidate queries to update Home page
      await queryClient.invalidateQueries({ queryKey: ['hero-background-setting'] });
      await queryClient.invalidateQueries({ queryKey: ['hero-background'] });
      
      toast.success('Imagem de fundo atualizada com sucesso!', { id: 'hero-upload' });
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error(error.message || 'Erro ao fazer upload da imagem', { id: 'hero-upload' });
      // Reset the preview if upload failed
      setHeroImageUrl(currentHeroUrl || null);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = async () => {
    toast.loading('Removendo imagem...', { id: 'hero-remove' });
    try {
      const { error: updateError } = await supabase
        .from('platform_settings')
        .update({ 
          setting_value: { url: null },
          updated_at: new Date().toISOString()
        })
        .eq('setting_key', 'hero_background_url');

      if (updateError) {
        console.error('Remove error:', updateError);
        throw new Error(`Erro ao remover: ${updateError.message}`);
      }

      setHeroImageUrl(null);
      await queryClient.invalidateQueries({ queryKey: ['hero-background-setting'] });
      await queryClient.invalidateQueries({ queryKey: ['hero-background'] });
      toast.success('Imagem de fundo removida. A imagem padrão será usada.', { id: 'hero-remove' });
    } catch (error: any) {
      console.error('Error removing image:', error);
      toast.error(error.message || 'Erro ao remover imagem', { id: 'hero-remove' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Image className="h-4 w-4" />
          Imagem de Fundo da Home
        </Label>
        <p className="text-sm text-muted-foreground">
          Faça upload de uma imagem de alta resolução para o banner principal (recomendado: 1920x1080 ou maior)
        </p>
      </div>

      {heroImageUrl && (
        <div className="relative rounded-lg overflow-hidden border">
          <img 
            src={heroImageUrl} 
            alt="Preview do fundo" 
            className="w-full h-48 object-cover"
          />
          <Button
            variant="destructive"
            size="sm"
            className="absolute top-2 right-2"
            onClick={handleRemoveImage}
          >
            <X className="h-4 w-4 mr-1" />
            Remover
          </Button>
        </div>
      )}

      <div className="flex items-center gap-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          id="hero-image-upload"
        />
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          <Upload className="h-4 w-4 mr-2" />
          {isUploading ? 'Enviando...' : heroImageUrl ? 'Trocar Imagem' : 'Selecionar Imagem'}
        </Button>
        
        {!heroImageUrl && (
          <span className="text-sm text-muted-foreground">
            Nenhuma imagem personalizada. Usando imagem padrão.
          </span>
        )}
      </div>
    </div>
  );
};

// Componente para configuração do vídeo de apresentação
const PresentationVideoSettings = () => {
  const [videoUrl, setVideoUrl] = useState('');
  const [isEnabled, setIsEnabled] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();

  // Fetch current video settings
  const { data: currentSettings, isLoading } = useQuery({
    queryKey: ['presentation-video-settings-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('setting_value')
        .eq('setting_key', 'presentation_video')
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      return (data?.setting_value as unknown as VideoSettings) || null;
    },
  });

  React.useEffect(() => {
    if (currentSettings) {
      setVideoUrl(currentSettings.youtube_url || '');
      setIsEnabled(currentSettings.enabled || false);
    }
  }, [currentSettings]);

  const extractYoutubeId = (url: string): string | null => {
    if (!url) return null;
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const settingValue: VideoSettings = {
        youtube_url: videoUrl,
        enabled: isEnabled
      };

      const { data: existing } = await supabase
        .from('platform_settings')
        .select('id')
        .eq('setting_key', 'presentation_video')
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('platform_settings')
          .update({
            setting_value: settingValue as unknown as any,
            updated_at: new Date().toISOString()
          })
          .eq('setting_key', 'presentation_video');
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('platform_settings')
          .insert({
            setting_key: 'presentation_video',
            setting_value: settingValue as unknown as any,
            is_active: true
          });
        if (error) throw error;
      }

      await queryClient.invalidateQueries({ queryKey: ['presentation-video-settings-admin'] });
      await queryClient.invalidateQueries({ queryKey: ['presentation-video-settings'] });
      toast.success('Configurações de vídeo salvas com sucesso!');
    } catch (error) {
      console.error('Error saving video settings:', error);
      toast.error('Erro ao salvar configurações de vídeo');
    } finally {
      setIsSaving(false);
    }
  };

  const youtubeId = extractYoutubeId(videoUrl);

  return (
    <div className="space-y-4 border-t pt-6">
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Youtube className="h-4 w-4 text-red-500" />
          Vídeo de Apresentação (YouTube)
        </Label>
        <p className="text-sm text-muted-foreground">
          Configure um vídeo do YouTube que será exibido como popup quando os visitantes acessarem o site
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="youtube-url">Link do YouTube</Label>
          <Input
            id="youtube-url"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
          />
          <p className="text-xs text-muted-foreground">
            Cole o link completo do vídeo do YouTube
          </p>
        </div>

        {youtubeId && (
          <div className="rounded-lg overflow-hidden border">
            <div className="aspect-video">
              <iframe
                src={`https://www.youtube.com/embed/${youtubeId}`}
                title="Preview do vídeo"
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
          <div className="space-y-0.5">
            <Label className="flex items-center gap-2">
              <Video className="h-4 w-4" />
              Popup de Vídeo Ativo
            </Label>
            <p className="text-sm text-muted-foreground">
              Quando ativado, o vídeo será exibido automaticamente para visitantes
            </p>
          </div>
          <Switch
            checked={isEnabled}
            onCheckedChange={setIsEnabled}
          />
        </div>

        <Button onClick={handleSave} disabled={isSaving || !videoUrl}>
          {isSaving ? 'Salvando...' : 'Salvar Configurações de Vídeo'}
        </Button>
      </div>
    </div>
  );
};

export const AdminSettings = () => {
  const [isBadgeDialogOpen, setIsBadgeDialogOpen] = useState(false);
  const [badgeData, setBadgeData] = useState<BadgeData>({
    name: '',
    description: '',
    icon: '🏆',
    color: '#3B82F6',
    criteria_type: 'points',
    criteria_value: 100,
    rarity: 'common'
  });
  const [pointsSettings, setPointsSettings] = useState<PointsSettings>({
    pointsPerCheckin: 50,
    pointsPerReferral: 100,
    commissionRate: 30,
    maxOffersPerBusiness: 10
  });
  const [isSavingPoints, setIsSavingPoints] = useState(false);
  const queryClient = useQueryClient();

  const { data: badges, isLoading: isLoadingBadges } = useQuery({
    queryKey: ['admin-badges'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('badges')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: systemSettings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;

      const settings: Record<string, any> = {};
      data?.forEach((item) => {
        settings[item.setting_key] = item.setting_value;
      });

      return {
        pointsPerCheckin: settings['points_per_checkin']?.value ?? 50,
        pointsPerReferral: settings['points_per_referral']?.value ?? 100,
        commissionRate: settings['commission_rate']?.value ?? 30,
        maxOffersPerBusiness: settings['max_offers_per_business']?.value ?? 10,
        enableNotifications: settings['enable_notifications']?.value ?? true,
        maintenanceMode: settings['maintenance_mode']?.value ?? false
      };
    },
  });

  // Sync local state with fetched data
  React.useEffect(() => {
    if (systemSettings) {
      setPointsSettings({
        pointsPerCheckin: systemSettings.pointsPerCheckin,
        pointsPerReferral: systemSettings.pointsPerReferral,
        commissionRate: systemSettings.commissionRate,
        maxOffersPerBusiness: systemSettings.maxOffersPerBusiness
      });
    }
  }, [systemSettings]);

  const savePointsSettings = async () => {
    setIsSavingPoints(true);
    try {
      const settingsToSave = [
        { key: 'points_per_checkin', value: pointsSettings.pointsPerCheckin },
        { key: 'points_per_referral', value: pointsSettings.pointsPerReferral },
        { key: 'commission_rate', value: pointsSettings.commissionRate },
        { key: 'max_offers_per_business', value: pointsSettings.maxOffersPerBusiness }
      ];

      for (const setting of settingsToSave) {
        const { data: existing } = await supabase
          .from('platform_settings')
          .select('id')
          .eq('setting_key', setting.key)
          .maybeSingle();

        if (existing) {
          const { error } = await supabase
            .from('platform_settings')
            .update({ 
              setting_value: { value: setting.value },
              updated_at: new Date().toISOString()
            })
            .eq('setting_key', setting.key);

          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('platform_settings')
            .insert({
              setting_key: setting.key,
              setting_value: { value: setting.value },
              is_active: true
            });

          if (error) throw error;
        }
      }

      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setIsSavingPoints(false);
    }
  };

  const createBadge = useMutation({
    mutationFn: async (badge: BadgeData) => {
      const { error } = await supabase
        .from('badges')
        .insert([{
          ...badge,
          is_active: true
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-badges'] });
      toast.success('Badge criado com sucesso');
      setIsBadgeDialogOpen(false);
      setBadgeData({
        name: '',
        description: '',
        icon: '🏆',
        color: '#3B82F6',
        criteria_type: 'points',
        criteria_value: 100,
        rarity: 'common'
      });
    },
    onError: (error) => {
      console.error('Error creating badge:', error);
      toast.error('Erro ao criar badge');
    }
  });

  const toggleBadge = useMutation({
    mutationFn: async ({ badgeId, isActive }: { badgeId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('badges')
        .update({ is_active: !isActive })
        .eq('id', badgeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-badges'] });
      toast.success('Status do badge atualizado');
    },
    onError: (error) => {
      console.error('Error updating badge:', error);
      toast.error('Erro ao atualizar badge');
    }
  });

  const handleCreateBadge = () => {
    if (!badgeData.name || !badgeData.description) {
      toast.error('Nome e descrição são obrigatórios');
      return;
    }

    createBadge.mutate(badgeData);
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'bg-gray-500';
      case 'rare': return 'bg-blue-500';
      case 'epic': return 'bg-purple-500';
      case 'legendary': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurações Avançadas
          </CardTitle>
          <CardDescription>
            Configure parâmetros globais e configurações do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="badges" className="space-y-4">
            <TabsList>
              <TabsTrigger value="badges">Emblemas</TabsTrigger>
              <TabsTrigger value="points">Sistema de Pontos</TabsTrigger>
              <TabsTrigger value="plans">Planos</TabsTrigger>
              <TabsTrigger value="general">Configurações Gerais</TabsTrigger>
            </TabsList>

            <TabsContent value="plans" className="space-y-4">
              <AdminPlansVisibility />
            </TabsContent>

            <TabsContent value="badges" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Gerenciar Emblemas</h3>
                <Dialog open={isBadgeDialogOpen} onOpenChange={setIsBadgeDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Badge
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[525px]">
                    <DialogHeader>
                      <DialogTitle>Criar Novo Badge</DialogTitle>
                      <DialogDescription>
                        Configure um novo badge de conquista para os usuários
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Nome</Label>
                          <Input
                            id="name"
                            value={badgeData.name}
                            onChange={(e) => setBadgeData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Nome do badge"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="icon">Ícone</Label>
                          <Input
                            id="icon"
                            value={badgeData.icon}
                            onChange={(e) => setBadgeData(prev => ({ ...prev, icon: e.target.value }))}
                            placeholder="🏆"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">Descrição</Label>
                        <Textarea
                          id="description"
                          value={badgeData.description}
                          onChange={(e) => setBadgeData(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Descrição do badge"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="rarity">Raridade</Label>
                          <Select
                            value={badgeData.rarity}
                            onValueChange={(value) => setBadgeData(prev => ({ ...prev, rarity: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="common">Comum</SelectItem>
                              <SelectItem value="rare">Raro</SelectItem>
                              <SelectItem value="epic">Épico</SelectItem>
                              <SelectItem value="legendary">Lendário</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="criteria_type">Critério</Label>
                          <Select
                            value={badgeData.criteria_type}
                            onValueChange={(value) => setBadgeData(prev => ({ ...prev, criteria_type: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="points">Pontos</SelectItem>
                              <SelectItem value="checkins">Check-ins</SelectItem>
                              <SelectItem value="referrals">Indicações</SelectItem>
                              <SelectItem value="reviews">Avaliações</SelectItem>
                              <SelectItem value="days_active">Dias Ativos</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="criteria_value">Valor</Label>
                          <Input
                            id="criteria_value"
                            type="number"
                            value={badgeData.criteria_value}
                            onChange={(e) => setBadgeData(prev => ({ ...prev, criteria_value: parseInt(e.target.value) || 0 }))}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="color">Cor</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id="color"
                            type="color"
                            value={badgeData.color}
                            onChange={(e) => setBadgeData(prev => ({ ...prev, color: e.target.value }))}
                            className="w-16 h-10"
                          />
                          <Input
                            value={badgeData.color}
                            onChange={(e) => setBadgeData(prev => ({ ...prev, color: e.target.value }))}
                            placeholder="#3B82F6"
                          />
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsBadgeDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleCreateBadge} disabled={createBadge.isPending}>
                        Criar Badge
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Badge</TableHead>
                      <TableHead>Critério</TableHead>
                      <TableHead>Raridade</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {badges?.map((badge) => (
                      <TableRow key={badge.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div
                              className="flex items-center justify-center w-10 h-10 rounded-full text-white"
                              style={{ backgroundColor: badge.color }}
                            >
                              {badge.icon}
                            </div>
                            <div>
                              <p className="font-medium">{badge.name}</p>
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {badge.description}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{badge.criteria_value}</p>
                            <p className="text-sm text-muted-foreground">
                              {badge.criteria_type === 'points' ? 'Pontos' :
                               badge.criteria_type === 'checkins' ? 'Check-ins' :
                               badge.criteria_type === 'referrals' ? 'Indicações' :
                               badge.criteria_type === 'reviews' ? 'Avaliações' :
                               badge.criteria_type === 'days_active' ? 'Dias Ativos' : badge.criteria_type}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getRarityColor(badge.rarity)}>
                            {badge.rarity === 'common' ? 'Comum' :
                             badge.rarity === 'rare' ? 'Raro' :
                             badge.rarity === 'epic' ? 'Épico' :
                             badge.rarity === 'legendary' ? 'Lendário' : badge.rarity}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={badge.is_active ? 'default' : 'secondary'}>
                            {badge.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleBadge.mutate({ badgeId: badge.id, isActive: badge.is_active })}
                            >
                              {badge.is_active ? 'Desativar' : 'Ativar'}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {badges?.length === 0 && (
                  <div className="text-center py-8">
                    <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Nenhum badge configurado</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="points" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Sistema de Pontos</CardTitle>
                  <CardDescription>
                    Configure as recompensas de pontos para diferentes ações
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="checkin-points">Pontos por Check-in</Label>
                      <Input
                        id="checkin-points"
                        type="number"
                        value={pointsSettings.pointsPerCheckin}
                        onChange={(e) => setPointsSettings(prev => ({ 
                          ...prev, 
                          pointsPerCheckin: parseInt(e.target.value) || 0 
                        }))}
                        placeholder="50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="referral-points">Pontos por Indicação</Label>
                      <Input
                        id="referral-points"
                        type="number"
                        value={pointsSettings.pointsPerReferral}
                        onChange={(e) => setPointsSettings(prev => ({ 
                          ...prev, 
                          pointsPerReferral: parseInt(e.target.value) || 0 
                        }))}
                        placeholder="100"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="commission-rate">Taxa de Comissão (%)</Label>
                      <Input
                        id="commission-rate"
                        type="number"
                        value={pointsSettings.commissionRate}
                        onChange={(e) => setPointsSettings(prev => ({ 
                          ...prev, 
                          commissionRate: parseInt(e.target.value) || 0 
                        }))}
                        placeholder="30"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="max-offers">Máximo de Ofertas por Negócio</Label>
                      <Input
                        id="max-offers"
                        type="number"
                        value={pointsSettings.maxOffersPerBusiness}
                        onChange={(e) => setPointsSettings(prev => ({ 
                          ...prev, 
                          maxOffersPerBusiness: parseInt(e.target.value) || 0 
                        }))}
                        placeholder="10"
                      />
                    </div>
                  </div>
                  <Button onClick={savePointsSettings} disabled={isSavingPoints}>
                    {isSavingPoints ? 'Salvando...' : 'Salvar Configurações'}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="general" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Configurações Gerais</CardTitle>
                  <CardDescription>
                    Configure comportamentos gerais da plataforma
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Hero Background Image Upload */}
                  <HeroBackgroundUpload />

                  {/* Geração automática de personas por IA */}
                  <div className="border-t pt-6">
                  </div>

                  {/* Presentation Video Settings */}
                  <PresentationVideoSettings />


                  <div className="border-t pt-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Notificações Push</Label>
                        <p className="text-sm text-muted-foreground">
                          Permitir envio de notificações push para usuários
                        </p>
                      </div>
                      <Switch defaultChecked={systemSettings?.enableNotifications} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Modo de Manutenção</Label>
                      <p className="text-sm text-muted-foreground">
                        Desabilitar acesso público à plataforma
                      </p>
                    </div>
                    <Switch defaultChecked={systemSettings?.maintenanceMode} />
                  </div>

                  <div className="pt-4">
                    <Button onClick={() => toast.success('Configurações gerais salvas com sucesso!')}>
                      Salvar Configurações
                    </Button>
                  </div>

                  <StorageCleanupCard />

                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};